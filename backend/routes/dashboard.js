const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, requireAdmin } = require('../middleware');
const roleController = require('../controllers/web/dashboard/roleController');
const permissionController = require('../controllers/web/dashboard/permissionController');
const userController = require('../controllers/web/dashboard/userController');
const gymController = require('../controllers/web/dashboard/gymController');
const subscriptionPlanController = require('../controllers/web/dashboard/subscriptionPlanController');
const coachController = require('../controllers/web/dashboard/coachController');

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

// Gyms CRUD + images
router.get('/gyms', gymController.list);
router.get('/gyms/export', gymController.exportExcel);
router.get('/gyms/:id', gymController.getById);
router.post('/gyms', upload.array('images', 5), gymController.create);
router.put('/gyms/:id', upload.array('images', 5), gymController.update);
router.delete('/gyms/:id', gymController.remove);

// Subscription plans CRUD + export
router.get('/subscription-plans', subscriptionPlanController.list);
router.get('/subscription-plans/export', subscriptionPlanController.exportExcel);
router.get('/subscription-plans/:id', subscriptionPlanController.getById);
router.post('/subscription-plans', subscriptionPlanController.create);
router.put('/subscription-plans/:id', subscriptionPlanController.update);
router.delete('/subscription-plans/:id', subscriptionPlanController.remove);

// Coaches CRUD + export
router.get('/coaches', coachController.list);
router.get('/coaches/export', coachController.exportExcel);
router.get('/coaches/:id', coachController.getById);
router.post('/coaches', coachController.create);
router.put('/coaches/:id', coachController.update);
router.delete('/coaches/:id', coachController.remove);

module.exports = router;

