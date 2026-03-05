const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireAdmin } = require('../middleware');
const roleController = require('../controllers/web/dashboard/roleController');
const permissionController = require('../controllers/web/dashboard/permissionController');
const userController = require('../controllers/web/dashboard/userController');
const gymController = require('../controllers/web/dashboard/gymController');

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

router.use(requireAuth, requireAdmin);

// Roles CRUD + permissions
router.get('/roles', roleController.list);
router.get('/roles/export', roleController.exportExcel);
router.get('/roles/:id', roleController.getById);
router.post('/roles', roleController.create);
router.put('/roles/:id', roleController.update);
router.delete('/roles/:id', roleController.remove);
router.get('/roles/:id/permissions', roleController.getPermissions);

// Permissions CRUD
router.get('/permissions', permissionController.list);
router.get('/permissions/export', permissionController.exportExcel);
router.get('/permissions/:id', permissionController.getById);
router.post('/permissions', permissionController.create);
router.put('/permissions/:id', permissionController.update);
router.delete('/permissions/:id', permissionController.remove);

// Users CRUD
router.get('/users', userController.list);
router.get('/users/export', userController.exportExcel);
router.get('/users/:id', userController.getById);
router.post('/users', userController.create);
router.put('/users/:id', userController.update);
router.delete('/users/:id', userController.remove);

// Gyms CRUD + images + coaches
router.get('/gyms', gymController.list);
router.get('/gyms/export', gymController.exportExcel);
router.get('/gyms/:id', gymController.getById);
router.post('/gyms', upload.array('images', 5), gymController.create);
router.put('/gyms/:id', upload.array('images', 5), gymController.update);
router.delete('/gyms/:id', gymController.remove);

module.exports = router;

