const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware');
const roleController = require('../controllers/web/dashboard/roleController');
const permissionController = require('../controllers/web/dashboard/permissionController');

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

module.exports = router;

