const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const Gym = require('../../../models/Gym');
const AppError = require('../../../utils/AppError');
const notificationService = require('../../../services/notificationService');

// Base directory for gym images:
// backend/public/storage/gym/<gymIndex>/<1..5>/<filename>
const STORAGE_BASE_DIR = path.join(__dirname, '..', '..', '..', 'public', 'storage', 'gym');

function parseListQuery(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const sortBy = query.sortBy || undefined;
  const sortDir = query.sortDir || undefined;
  const search = query.search || undefined;
  const owner_id = query.owner_id ? Number(query.owner_id) : undefined;

  let is_active;
  if (query.is_active === 'true') is_active = true;
  else if (query.is_active === 'false') is_active = false;

  return { page, limit, sortBy, sortDir, search, owner_id, is_active };
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getNextGymFolderIndex() {
  ensureDir(STORAGE_BASE_DIR);
  const entries = fs.readdirSync(STORAGE_BASE_DIR, { withFileTypes: true });
  const numbers = entries
    .filter((e) => e.isDirectory())
    .map((e) => parseInt(e.name, 10))
    .filter((n) => !Number.isNaN(n));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function moveImagesToStorage(files, folderIndex) {
  ensureDir(STORAGE_BASE_DIR);

  const effectiveIndex = folderIndex || getNextGymFolderIndex();
  const gymDir = path.join(STORAGE_BASE_DIR, String(effectiveIndex));
  ensureDir(gymDir);

  const urls = [];

  files.slice(0, 5).forEach((file, index) => {
    const imageFolderName = String(index + 1);
    const imageDir = path.join(gymDir, imageFolderName);

    // Clean previous image in this slot (if any)
    if (fs.existsSync(imageDir)) {
      fs.rmSync(imageDir, { recursive: true, force: true });
    }
    ensureDir(imageDir);

    const filename = file.filename;
    const targetPath = path.join(imageDir, filename);

    fs.renameSync(file.path, targetPath);

    const url = `/storage/gym/${effectiveIndex}/${imageFolderName}/${filename}`;
    urls.push(url);
  });

  return urls;
}

async function list(req, res, next) {
  try {
    const options = parseListQuery(req.query);
    if (req.ownerGymIds) {
      options.owner_id = req.user.id;
    }
    const result = await Gym.list(options);

    const dataWithRelations = await Promise.all(
      result.data.map(async (gym) => {
        const [images, coaches] = await Promise.all([
          Gym.getImages(gym.id),
          Gym.getCoaches(gym.id),
        ]);
        return { ...gym, images, coaches };
      })
    );

    res.json({
      success: true,
      data: dataWithRelations,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid gym id', 400));

    const gym = await Gym.findById(id);
    if (!gym) return next(new AppError('Gym not found', 404));

    if (req.ownerGymIds && !req.ownerGymIds.includes(id)) {
      return next(new AppError('You do not own this gym', 403));
    }

    const [images, coaches] = await Promise.all([
      Gym.getImages(id),
      Gym.getCoaches(id),
    ]);

    res.json({ success: true, gym, images, coaches });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      name,
      description,
      location,
      working_hours,
      working_days,
      phone,
      email,
      session_price,
      owner_id,
      is_active,
      coach_user_ids,
    } = req.body || {};

    if (!name || typeof name !== 'string') {
      return next(new AppError('Gym name is required', 400));
    }

    const effectiveOwnerId = req.user.role === 'owner' ? req.user.id : Number(owner_id);
    if (!effectiveOwnerId || Number.isNaN(effectiveOwnerId)) {
      return next(new AppError('owner_id is required', 400));
    }

    const id = await Gym.create({
      name: name.trim(),
      description: description || null,
      location: location || null,
      working_hours: working_hours || null,
      working_days: working_days || null,
      phone: phone || null,
      email: email || null,
      session_price: session_price != null && session_price !== '' ? Number(session_price) : null,
      owner_id: effectiveOwnerId,
      is_active: is_active !== undefined ? (is_active === true || is_active === 'true' || is_active === '1' || is_active === 1) : true,
    });

    // Handle up to 5 images via uploaded files, saved under:
    // public/storage/<folderIndex>/<1..5>/<filename>
    const files = Array.isArray(req.files) ? req.files.slice(0, 5) : [];
    if (files.length) {
      const imageUrls = moveImagesToStorage(files, null);
      await Gym.replaceImages(id, imageUrls);
    }

    // Optional: assign coaches by user ids
    if (Array.isArray(coach_user_ids)) {
      const userIds = coach_user_ids.map((v) => Number(v)).filter((v) => !Number.isNaN(v));
      await Gym.replaceCoaches(id, userIds);
    }

    const gym = await Gym.findById(id);
    const [images, coaches] = await Promise.all([
      Gym.getImages(id),
      Gym.getCoaches(id),
    ]);

    res.status(201).json({ success: true, gym, images, coaches });

    // Notify all users about the new gym.
    try {
      await notificationService.sendAndBroadcastToAll({
        title: 'New gym created',
        message: `Gym "${gym.name}" has been created.`,
        type: 'system',
      });
    } catch (notifyErr) {
      // Notification failures should not break the main request.
      // eslint-disable-next-line no-console
      console.error('Failed to send gym create notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid gym id', 400));

    if (req.ownerGymIds && !req.ownerGymIds.includes(id)) {
      return next(new AppError('You do not own this gym', 403));
    }

    const {
      name,
      description,
      location,
      working_hours,
      working_days,
      phone,
      email,
      session_price,
      owner_id,
      is_active,
      coach_user_ids,
    } = req.body || {};

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description || null;
    if (location !== undefined) data.location = location || null;
    if (working_hours !== undefined) data.working_hours = working_hours || null;
    if (working_days !== undefined) data.working_days = working_days || null;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (session_price !== undefined) data.session_price = session_price != null && session_price !== '' ? Number(session_price) : null;
    if (owner_id !== undefined && req.user.role === 'admin') data.owner_id = Number(owner_id);
    if (is_active !== undefined) data.is_active = is_active === true || is_active === 'true' || is_active === '1' || is_active === 1;

    const ok = await Gym.update(id, data);
    if (!ok) return next(new AppError('Gym not found or not updated', 404));

    // Replace images if new files provided
    const files = Array.isArray(req.files) ? req.files.slice(0, 5) : [];
    if (files.length) {
      // Try to reuse existing folder index (first segment after /storage/)
      const existingImages = await Gym.getImages(id);
      let folderIndex = null;
      if (existingImages.length && existingImages[0].image_url) {
        const parts = existingImages[0].image_url.split('/').filter(Boolean);
        // /storage/gym/<folderIndex>/<slot>/<filename>
        if (parts[0] === 'storage' && parts[1] === 'gym' && parts[2]) {
          const parsed = parseInt(parts[2], 10);
          if (!Number.isNaN(parsed)) folderIndex = parsed;
        }
      }

      const imageUrls = moveImagesToStorage(files, folderIndex);
      await Gym.replaceImages(id, imageUrls);
    }

    // Replace coaches if provided
    if (Array.isArray(coach_user_ids)) {
      const userIds = coach_user_ids.map((v) => Number(v)).filter((v) => !Number.isNaN(v));
      await Gym.replaceCoaches(id, userIds);
    }

    const gym = await Gym.findById(id);
    if (!gym) return next(new AppError('Gym not found', 404));

    const [images, coaches] = await Promise.all([
      Gym.getImages(id),
      Gym.getCoaches(id),
    ]);

    res.json({ success: true, gym, images, coaches });

    // Notify all users about the gym update.
    try {
      await notificationService.sendAndBroadcastToAll({
        title: 'Gym updated',
        message: `Gym "${gym.name}" has been updated.`,
        type: 'system',
      });
    } catch (notifyErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to send gym update notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return next(new AppError('Invalid gym id', 400));

    if (req.ownerGymIds && !req.ownerGymIds.includes(id)) {
      return next(new AppError('You do not own this gym', 403));
    }

    const gym = await Gym.findById(id);
    if (!gym) return next(new AppError('Gym not found', 404));
    const gymName = gym.name;

    const ok = await Gym.softDelete(id);
    if (!ok) return next(new AppError('Gym not found', 404));

    res.json({ success: true, message: 'Gym deleted' });

    try {
      await notificationService.sendAndBroadcastToAll({
        title: 'Gym deleted',
        message: `Gym "${gymName}" has been deleted.`,
        type: 'system',
      });
    } catch (notifyErr) {
      console.error('Failed to send gym delete notification:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
}

async function exportExcel(req, res, next) {
  try {
    const { sortBy, sortDir, search, owner_id, is_active } = parseListQuery(req.query);
    const effectiveOwnerId = req.ownerGymIds ? req.user.id : owner_id;
    const rows = await Gym.listAll({ sortBy, sortDir, search, owner_id: effectiveOwnerId, is_active });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Gyms');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Location', key: 'location', width: 30 },
      { header: 'Working Hours', key: 'working_hours', width: 20 },
      { header: 'Working Days', key: 'working_days', width: 20 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Owner ID', key: 'owner_id', width: 10 },
      { header: 'Rating Avg', key: 'rating_average', width: 12 },
      { header: 'Rating Count', key: 'rating_count', width: 12 },
      { header: 'Active', key: 'is_active', width: 10 },
      { header: 'Created At', key: 'created_at', width: 24 },
      { header: 'Updated At', key: 'updated_at', width: 24 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        id: row.id,
        name: row.name,
        description: row.description || '',
        location: row.location || '',
        working_hours: row.working_hours || '',
        working_days: row.working_days || '',
        phone: row.phone || '',
        email: row.email || '',
        owner_id: row.owner_id,
        rating_average: row.rating_average,
        rating_count: row.rating_count,
        is_active: row.is_active ? 'Yes' : 'No',
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gyms.xlsx"'
    );
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  exportExcel,
};

