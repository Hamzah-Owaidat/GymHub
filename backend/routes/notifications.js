const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware');
const notificationController = require('../controllers/web/notificationController');

// All notification routes require authentication but are not restricted by role.
router.use(requireAuth);

router.get('/', notificationController.list);
router.post('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);

module.exports = router;

