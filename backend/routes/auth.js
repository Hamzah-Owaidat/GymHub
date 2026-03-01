const express = require('express');
const authController = require('../controllers/api/authController');
const authValidator = require('../validators/authValidator');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authValidator.registerRules, authValidator.validate, authController.register);
router.post('/login', authValidator.loginRules, authValidator.validate, authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
