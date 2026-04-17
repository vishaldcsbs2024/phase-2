const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

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

  return completed.rows[0];
};

const finalizeWebhookPayment = async ({ payoutId, gatewayReference }) => {
  const result = await query(
    `UPDATE payouts
     SET status = ?, bank_reference = COALESCE(?, bank_reference), payout_date = CURRENT_TIMESTAMP, processed_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? RETURNING *`,
    ['completed', gatewayReference || null, payoutId],
  );

  return result.rows[0];
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