const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { emitRealtimeEvent } = require('../realtime/socketBus');

const mapNotification = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  message: row.message,
  amount: row.amount,
  claimId: row.claim_id,
  payoutId: row.payout_id,
  disruptionId: row.disruption_id,
  read: Boolean(row.read),
  timestamp: row.created_at,
});

const pushNotification = async ({
  type = 'info',
  title,
  message,
  amount = null,
  claimId = null,
  payoutId = null,
  disruptionId = null,
  userId = null,
  partnerId = null,
}) => {
  const notificationId = uuidv4();
  await query(
    `INSERT INTO notifications (
      id, user_id, partner_id, type, title, message, amount, claim_id, payout_id, disruption_id, read, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [notificationId, userId, partnerId, type, title, message, amount, claimId, payoutId, disruptionId],
  );

  const result = await query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [notificationId]);
  const notification = mapNotification(result.rows[0]);
  emitRealtimeEvent('notification:new', notification);
  return notification;
};

const getNotifications = async ({ userId, limit = 20 } = {}) => {
  if (!userId) {
    return [];
  }

  const result = await query(
    `SELECT *
     FROM notifications
     WHERE user_id = ? OR partner_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, userId, Math.max(1, Number(limit) || 20)],
  );

  return result.rows.map(mapNotification);
};

const clearNotifications = async ({ userId } = {}) => {
  if (!userId) {
    return false;
  }

  await query(
    `UPDATE notifications
     SET read = 1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? OR partner_id = ?`,
    [userId, userId],
  );

  return true;
};

const markNotificationRead = async ({ notificationId, userId }) => {
  await query(
    `UPDATE notifications
     SET read = 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND (user_id = ? OR partner_id = ?)`,
    [notificationId, userId, userId],
  );

  const refreshed = await query(
    'SELECT * FROM notifications WHERE id = ? AND (user_id = ? OR partner_id = ?) LIMIT 1',
    [notificationId, userId, userId],
  );

  return refreshed.rows[0] ? mapNotification(refreshed.rows[0]) : null;
};

module.exports = {
  pushNotification,
  getNotifications,
  clearNotifications,
  markNotificationRead,
};