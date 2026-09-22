const express = require('express');
const urlRoutes = require('./urlRoutes');
const authRoutes = require('./authRoutes');
const analyticsRoutes = require('./analyticsRoutes');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Shortly API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      urls: '/api/v1/urls',
      analytics: '/api/v1/analytics',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/urls', urlRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;