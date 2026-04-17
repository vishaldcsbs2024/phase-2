const { v4: uuidv4 } = require('uuid');

const notifications = [];

const pushNotification = ({
  type = 'info',
  title,
  message,
  amount = null,
  claimId = null,
  payoutId = null,
  disruptionId = null,
}) => {
  const notification = {
    id: uuidv4(),
    type,
    title,
    message,
    amount,
    claimId,
    payoutId,
    disruptionId,
    timestamp: new Date().toISOString(),
  };

  notifications.unshift(notification);
  return notification;
};

const getNotifications = (limit = 20) => notifications.slice(0, limit);

const clearNotifications = () => {
  notifications.length = 0;
  return true;
};

module.exports = {
  pushNotification,
  getNotifications,
  clearNotifications,
};