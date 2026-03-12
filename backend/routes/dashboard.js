const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireAdmin, requireAdminOrOwner, attachOwnerGyms, requireRole } = require('../middleware');
const roleController = require('../controllers/web/dashboard/roleController');
const permissionController = require('../controllers/web/dashboard/permissionController');
const userController = require('../controllers/web/dashboard/userController');
const gymController = require('../controllers/web/dashboard/gymController');
const subscriptionPlanController = require('../controllers/web/dashboard/subscriptionPlanController');
const coachController = require('../controllers/web/dashboard/coachController');
const sessionController = require('../controllers/web/dashboard/sessionController');
const paymentController = require('../controllers/web/dashboard/paymentController');
const statsController = require('../controllers/web/dashboard/statsController');

const tmpUploadDir = path.join(__dirname, '..', 'public', 'storage', 'tmp');
if (!fs.existsSync(tmpUploadDir)) {
  fs.mkdirSync(tmpUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, tmpUploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.use(requireAuth);

const requireCoach = requireRole('coach');

// ─── Admin-only routes ───────────────────────────────────────────────
router.get('/roles', requireAdmin, roleController.list);
router.get('/roles/export', requireAdmin, roleController.exportExcel);
router.get('/roles/:id', requireAdmin, roleController.getById);
router.post('/roles', requireAdmin, roleController.create);
router.put('/roles/:id', requireAdmin, roleController.update);
router.delete('/roles/:id', requireAdmin, roleController.remove);
router.get('/roles/:id/permissions', requireAdmin, roleController.getPermissions);

router.get('/permissions', requireAdmin, permissionController.list);
router.get('/permissions/export', requireAdmin, permissionController.exportExcel);
router.get('/permissions/:id', requireAdmin, permissionController.getById);
router.post('/permissions', requireAdmin, permissionController.create);
router.put('/permissions/:id', requireAdmin, permissionController.update);
router.delete('/permissions/:id', requireAdmin, permissionController.remove);

router.get('/users', requireAdmin, userController.list);
router.get('/users/export', requireAdmin, userController.exportExcel);
router.get('/users/:id', requireAdmin, userController.getById);
router.post('/users', requireAdmin, userController.create);
router.put('/users/:id', requireAdmin, userController.update);
router.delete('/users/:id', requireAdmin, userController.remove);

// ─── Shared routes (admin + owner) ──────────────────────────────────
const shared = [requireAdminOrOwner, attachOwnerGyms];

router.get('/stats/overview', ...shared, statsController.overview);

router.get('/gyms', ...shared, gymController.list);
router.get('/gyms/export', ...shared, gymController.exportExcel);
router.get('/gyms/:id', ...shared, gymController.getById);
router.post('/gyms', ...shared, upload.array('images', 5), gymController.create);
router.put('/gyms/:id', ...shared, upload.array('images', 5), gymController.update);
router.delete('/gyms/:id', ...shared, gymController.remove);

router.get('/subscription-plans', ...shared, subscriptionPlanController.list);
router.get('/subscription-plans/export', ...shared, subscriptionPlanController.exportExcel);
router.get('/subscription-plans/:id', ...shared, subscriptionPlanController.getById);
router.post('/subscription-plans', ...shared, subscriptionPlanController.create);
router.put('/subscription-plans/:id', ...shared, subscriptionPlanController.update);
router.delete('/subscription-plans/:id', ...shared, subscriptionPlanController.remove);

router.get('/coach-users', ...shared, coachController.listCoachUsers);
router.get('/coaches', ...shared, coachController.list);
router.get('/coaches/export', ...shared, coachController.exportExcel);
router.get('/coaches/:id', ...shared, coachController.getById);
router.post('/coaches', ...shared, coachController.create);
router.put('/coaches/:id', ...shared, coachController.update);
router.delete('/coaches/:id', ...shared, coachController.remove);

router.get('/sessions', ...shared, sessionController.list);
router.get('/sessions/export', ...shared, sessionController.exportExcel);
router.get('/sessions/:id', ...shared, sessionController.getById);
router.post('/sessions', ...shared, sessionController.create);
router.put('/sessions/:id', ...shared, sessionController.update);
router.delete('/sessions/:id', ...shared, sessionController.remove);

router.get('/payments', ...shared, paymentController.list);
router.get('/payments/export', ...shared, paymentController.exportExcel);
router.get('/payments/:id', ...shared, paymentController.getById);
router.post('/payments', ...shared, paymentController.create);
router.put('/payments/:id', ...shared, paymentController.update);
router.delete('/payments/:id', ...shared, paymentController.remove);

// ─── Coach-only routes ────────────────────────────────────────────────

router.get('/coach/me', requireCoach, coachController.getSelfProfile);
router.put('/coach/availability', requireCoach, coachController.updateMyAvailability);
router.get('/coach/sessions', requireCoach, coachController.listMySessions);

module.exports = router;
