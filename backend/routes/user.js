const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth, optionalAuth } = require('../middleware');
const gymController = require('../controllers/web/user/gymController');
const subscriptionController = require('../controllers/web/user/subscriptionController');
const userSessionController = require('../controllers/web/user/sessionController');
const contactController = require('../controllers/web/user/contactController');
const ratingController = require('../controllers/web/user/ratingController');
const cardController = require('../controllers/web/user/cardController');
const chatController = require('../controllers/web/user/chatController');

const router = express.Router();
const chatTmpDir = path.join(__dirname, '..', 'public', 'storage', 'tmp', 'chat');
if (!fs.existsSync(chatTmpDir)) fs.mkdirSync(chatTmpDir, { recursive: true });

const chatUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, chatTmpDir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname || '');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const mime = (file.mimetype || '').toLowerCase();
    const allowed =
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      mime === 'application/pdf' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!allowed) return cb(new Error('Unsupported attachment type'));
    cb(null, true);
  },
});

router.get('/gyms', optionalAuth, gymController.list);
router.get('/gyms/:id', optionalAuth, gymController.getById);
router.post('/contact', optionalAuth, contactController.create);

router.get('/gyms/:gymId/ratings', optionalAuth, ratingController.listForGym);

router.use(requireAuth);

router.get('/subscriptions', subscriptionController.list);
router.post('/subscriptions', subscriptionController.create);

router.get('/sessions', userSessionController.list);
router.get('/coaches/:coachId/availability', userSessionController.getCoachAvailability);
router.post('/sessions/book', userSessionController.book);

router.get('/gyms/:gymId/my-rating', ratingController.getMyRating);
router.post('/gyms/:gymId/rate', ratingController.rate);

router.get('/cards', cardController.list);
router.post('/cards', cardController.create);
router.patch('/cards/:id/default', cardController.setDefault);
router.delete('/cards/:id', cardController.remove);

router.get('/chats', chatController.listConversations);
router.get('/chats/:sessionId/messages', chatController.listMessages);
router.post('/chats/:sessionId/messages', chatUpload.single('attachment'), chatController.sendMessage);
router.post('/chats/:sessionId/read', chatController.markRead);

module.exports = router;
