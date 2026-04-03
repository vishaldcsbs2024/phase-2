const { query } = require('../config/database');

const calculatePayout = async (partnerId, claimId, disruptionData) => {
  try {
    const policyResult = await query(
      'SELECT coverage_amount FROM policies WHERE partner_id = $1 AND status = $2',
      [partnerId, 'active']
    );

    if (policyResult.rows.length === 0) {
      return null;
    }

    const coverageAmount = policyResult.rows[0].coverage_amount;

    // Simplified calculation: 10% of coverage per disruption day
    const payoutBase = (coverageAmount / 10);
    let payout = Math.min(payoutBase, 500); // Cap at ₹500

    // Adjust based on disruption severity
    if (disruptionData.severity && disruptionData.severity > 5) {
      payout = Math.min(payoutBase * 1.5, 500);
    }

    return Math.round(payout * 100) / 100; // Round to 2 decimals
  } catch (error) {
    console.error('Payout calculation error:', error.message);
    return 0;
  }
};

const generateUTR = () => {
  return 'UTR' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const processPayout = async (partnerId, claimId, payout) => {
  const utr = generateUTR();

  try {
    const result = await query(
      'INSERT INTO payouts (partner_id, claim_id, amount, utr, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [partnerId, claimId, payout, utr, 'completed']
    );

    console.log(`Payout processed: ${utr} for Partner ${partnerId} - ₹${payout}`);

    return {
      payout_id: result.rows[0].id,
      utr,
      amount: payout,
      status: 'completed'
    };
  } catch (error) {
    console.error('Payout processing error:', error.message);
    throw error;
  }
};

module.exports = { calculatePayout, generateUTR, processPayout };
