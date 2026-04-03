import { query } from '../db/index.js';

export interface Partner {
  id: string;
  phone_number: string;
  password_hash: string;
  full_name: string;
  email?: string;
  platforms: string[];
  kyc_verified: boolean;
  bank_account?: string;
  ifsc_code?: string;
  upi_id?: string;
  created_at: Date;
  updated_at: Date;
}

export const partnerModel = {
  async create(data: Omit<Partner, 'id' | 'created_at' | 'updated_at'>) {
    const result = await query(
      `INSERT INTO partners (phone_number, password_hash, full_name, email, platforms, kyc_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.phone_number, data.password_hash, data.full_name, data.email, data.platforms, data.kyc_verified]
    );
    return result.rows[0];
  },

  async findById(id: string) {
    const result = await query(`SELECT * FROM partners WHERE id = $1`, [id]);
    return result.rows[0];
  },

  async findByPhone(phoneNumber: string) {
    const result = await query(`SELECT * FROM partners WHERE phone_number = $1`, [phoneNumber]);
    return result.rows[0];
  },

  async update(id: string, data: Partial<Partner>) {
    const updates = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([key], idx) => `${key} = $${idx + 1}`)
      .join(', ');

    const values = Object.entries(data)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([, value]) => value);

    const result = await query(
      `UPDATE partners SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  },

  async getProfileWithPolicies(partnerId: string) {
    const result = await query(
      `SELECT p.*, 
              JSON_AGG(JSON_BUILD_OBJECT('id', pl.id, 'premium_weekly', pl.premium_weekly, 'status', pl.status)) AS policies
       FROM partners p
       LEFT JOIN policies pl ON p.id = pl.partner_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [partnerId]
    );
    return result.rows[0];
  },
};
