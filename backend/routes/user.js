const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware');
const gymController = require('../controllers/web/user/gymController');
const subscriptionController = require('../controllers/web/user/subscriptionController');
const userSessionController = require('../controllers/web/user/sessionController');
const contactController = require('../controllers/web/user/contactController');
const ratingController = require('../controllers/web/user/ratingController');

const router = express.Router();

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

module.exports = router;
