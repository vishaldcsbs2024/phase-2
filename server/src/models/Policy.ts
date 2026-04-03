import { query } from '../db/index.js';

export interface Policy {
  id: string;
  partner_id: string;
  premium_weekly: number;
  coverage_amount: number;
  disrupted_days: number;
  status: string;
  active_from: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export const policyModel = {
  async create(data: Omit<Policy, 'id' | 'created_at' | 'updated_at' | 'disrupted_days'>) {
    const result = await query(
      `INSERT INTO policies (partner_id, premium_weekly, coverage_amount, status, active_from, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.partner_id, data.premium_weekly, data.coverage_amount, data.status, data.active_from, data.expires_at]
    );
    return result.rows[0];
  },

  async findById(id: string) {
    const result = await query(`SELECT * FROM policies WHERE id = $1`, [id]);
    return result.rows[0];
  },

  async findByPartnerId(partnerId: string) {
    const result = await query(
      `SELECT * FROM policies WHERE partner_id = $1 AND status = 'active' ORDER BY created_at DESC`,
      [partnerId]
    );
    return result.rows;
  },

  async update(id: string, data: Partial<Policy>) {
    const updates = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([key], idx) => `${key} = $${idx + 1}`)
      .join(', ');

    const values = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([, value]) => value);

    const result = await query(
      `UPDATE policies SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  },

  async getActivePolicy(partnerId: string) {
    const result = await query(
      `SELECT * FROM policies WHERE partner_id = $1 AND status = 'active' LIMIT 1`,
      [partnerId]
    );
    return result.rows[0];
  },

  async getPoliciesByPlatform(platforms: string[]) {
    const result = await query(
      `SELECT p.* FROM policies p
       JOIN partners pa ON p.partner_id = pa.id
       WHERE pa.platforms && $1::text[] AND p.status = 'active'`,
      [platforms]
    );
    return result.rows;
  },
};
