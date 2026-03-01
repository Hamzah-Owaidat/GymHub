const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'GymHub API',
    version: '1.0',
    docs: '/health',
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
