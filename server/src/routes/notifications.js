const express = require('express');
const { getNotifications, clearNotifications } = require('../services/notificationService');

const router = express.Router();

router.get('/feed', (req, res) => {
  res.status(200).json({
    success: true,
    data: { notifications: getNotifications(50) },
    error: '',
  });
});

router.post('/clear', (req, res) => {
  clearNotifications();
  res.status(200).json({
    success: true,
    data: { cleared: true },
    error: '',
  });
});

module.exports = router;