const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { emitRealtimeEvent } = require('../realtime/socketBus');
const { pushNotification } = require('./notificationService');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createGatewayReference = () => `GSHIELD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const createPayoutRecord = async ({ claimId, partnerId = null, userId = null, amount }) => {
  const payoutId = uuidv4();
  const result = await query(
    `INSERT INTO payouts (
      id,
      claim_id,
      partner_id,
      user_id,
      payout_amount,
      amount,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
    [payoutId, claimId, partnerId, userId, amount, amount, 'pending'],
  );

  return result.rows[0];
};

const processPayout = async ({ claimId, partnerId = null, userId = null, amount }) => {
  const payout = await createPayoutRecord({ claimId, partnerId, userId, amount });
  const gatewayReference = createGatewayReference();

  await query(
    `UPDATE payouts
     SET status = ?, processing_started_at = CURRENT_TIMESTAMP, gateway_reference = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    ['processing', gatewayReference, payout.id],
  );

  await delay(1200);

  const completed = await query(
    `UPDATE payouts
     SET status = ?, payout_date = CURRENT_TIMESTAMP, processed_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP, bank_reference = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? RETURNING *`,
    ['completed', gatewayReference, payout.id],
  );

  const completedPayout = completed.rows[0];
  emitRealtimeEvent('payout:processed', {
    payoutId: completedPayout.id,
    claimId,
    amount: completedPayout.payout_amount || completedPayout.amount,
    status: completedPayout.status,
  });

  await pushNotification({
    type: 'success',
    title: 'Payout completed',
    message: `Payout of Rs ${Math.round(Number(completedPayout.payout_amount || completedPayout.amount || amount))} processed successfully.`,
    amount: Number(completedPayout.payout_amount || completedPayout.amount || amount),
    claimId,
    payoutId: completedPayout.id,
    userId,
    partnerId,
  });

  return completedPayout;
};

const finalizeWebhookPayment = async ({ payoutId, gatewayReference }) => {
  const result = await query(
    `UPDATE payouts
     SET status = ?, bank_reference = COALESCE(?, bank_reference), payout_date = CURRENT_TIMESTAMP, processed_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? RETURNING *`,
    ['completed', gatewayReference || null, payoutId],
  );

  const payout = result.rows[0];
  if (payout) {
    emitRealtimeEvent('payout:processed', {
      payoutId: payout.id,
      claimId: payout.claim_id,
      amount: payout.payout_amount || payout.amount,
      status: payout.status,
    });
  }

  return payout;
};

const getPayoutsByUser = async (userId) => {
  const result = await query(
    `SELECT * FROM payouts WHERE user_id = ? OR partner_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId, userId],
  );

  return result.rows;
};

const getPayoutByClaimId = async (claimId) => {
  const result = await query(`SELECT * FROM payouts WHERE claim_id = ? ORDER BY created_at DESC LIMIT 1`, [claimId]);
  return result.rows[0] || null;
};

module.exports = {
  createPayoutRecord,
  processPayout,
  finalizeWebhookPayment,
  getPayoutsByUser,
  getPayoutByClaimId,
};