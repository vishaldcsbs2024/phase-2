const { query } = require('../config/database');

const defaultRuleMap = {
  risk_threshold: 65,
  fraud_threshold: 55,
  payout_limit: 500,
};

const getAdminRules = async () => {
  const result = await query('SELECT key, value, description FROM admin_rules');
  const rules = result.rows.reduce((acc, row) => {
    acc[row.key] = Number(row.value);
    return acc;
  }, {});

  return {
    risk_threshold: Number.isFinite(rules.risk_threshold) ? rules.risk_threshold : defaultRuleMap.risk_threshold,
    fraud_threshold: Number.isFinite(rules.fraud_threshold) ? rules.fraud_threshold : defaultRuleMap.fraud_threshold,
    payout_limit: Number.isFinite(rules.payout_limit) ? rules.payout_limit : defaultRuleMap.payout_limit,
  };
};

const listAdminRules = async () => {
  const result = await query('SELECT id, key, value, description, updated_at FROM admin_rules ORDER BY key ASC');
  return result.rows;
};

const updateAdminRule = async ({ key, value, description }) => {
  await query(
    `UPDATE admin_rules
     SET value = ?, description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP
     WHERE key = ?`,
    [Number(value), description || null, key],
  );

  const refreshed = await query('SELECT id, key, value, description, updated_at FROM admin_rules WHERE key = ?', [key]);
  return refreshed.rows[0] || null;
};

module.exports = {
  getAdminRules,
  listAdminRules,
  updateAdminRule,
};
