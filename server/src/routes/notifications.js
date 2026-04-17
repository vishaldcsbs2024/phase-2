const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getNotifications, clearNotifications, markNotificationRead } = require('../services/notificationService');

const router = express.Router();

router.get('/feed', verifyToken, async (req, res, next) => {
  try {
    const notifications = await getNotifications({ userId: req.user.id, limit: 50 });
    res.status(200).json({
      success: true,
      data: { notifications },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/clear', verifyToken, async (req, res, next) => {
  try {
    await clearNotifications({ userId: req.user.id });
    res.status(200).json({
      success: true,
      data: { cleared: true },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:notificationId/read', verifyToken, async (req, res, next) => {
  try {
    const updated = await markNotificationRead({
      notificationId: req.params.notificationId,
      userId: req.user.id,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { notification: updated },
      error: '',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;