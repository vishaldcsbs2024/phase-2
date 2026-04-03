import { query } from '../db/index.js';

export interface Claim {
  id: string;
  policy_id: string;
  partner_id: string;
  claim_date: Date;
  disruption_type: string;
  location: string;
  daily_payout: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export const claimModel = {
  async create(data: Omit<Claim, 'id' | 'created_at' | 'updated_at'>) {
    const result = await query(
      `INSERT INTO claims (policy_id, partner_id, claim_date, disruption_type, location, daily_payout, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.policy_id, data.partner_id, data.claim_date, data.disruption_type, data.location, data.daily_payout, data.status]
    );
    return result.rows[0];
  },

  async findById(id: string) {
    const result = await query(`SELECT * FROM claims WHERE id = $1`, [id]);
    return result.rows[0];
  },

  async findByPartnerId(partnerId: string) {
    const result = await query(
      `SELECT * FROM claims WHERE partner_id = $1 ORDER BY claim_date DESC LIMIT 20`,
      [partnerId]
    );
    return result.rows;
  },

  async findByPolicyId(policyId: string) {
    const result = await query(
      `SELECT * FROM claims WHERE policy_id = $1 ORDER BY claim_date DESC`,
      [policyId]
    );
    return result.rows;
  },

  async update(id: string, data: Partial<Claim>) {
    const updates = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([key], idx) => `${key} = $${idx + 1}`)
      .join(', ');

    const values = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([, value]) => value);

    const result = await query(
      `UPDATE claims SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  },

  async getClaimsByLocation(location: string, disruption_type: string) {
    const result = await query(
      `SELECT * FROM claims WHERE location = $1 AND disruption_type = $2 AND status = 'pending'`,
      [location, disruption_type]
    );
    return result.rows;
  },
};
