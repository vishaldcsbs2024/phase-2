import { query } from '../db/index.js';

export interface Payout {
  id: string;
  claim_id: string;
  partner_id: string;
  payout_amount: number;
  payout_date?: Date;
  status: string;
  bank_reference?: string;
  created_at: Date;
  updated_at: Date;
}

export const payoutModel = {
  async create(data: Omit<Payout, 'id' | 'created_at' | 'updated_at'>) {
    const result = await query(
      `INSERT INTO payouts (claim_id, partner_id, payout_amount, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.claim_id, data.partner_id, data.payout_amount, data.status]
    );
    return result.rows[0];
  },

  async findById(id: string) {
    const result = await query(`SELECT * FROM payouts WHERE id = $1`, [id]);
    return result.rows[0];
  },

  async findByPartnerId(partnerId: string) {
    const result = await query(
      `SELECT * FROM payouts WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [partnerId]
    );
    return result.rows;
  },

  async getPendingPayouts() {
    const result = await query(
      `SELECT * FROM payouts WHERE status = 'pending' ORDER BY created_at ASC`
    );
    return result.rows;
  },

  async processPayout(id: string, bankReference: string) {
    const result = await query(
      `UPDATE payouts SET status = 'completed', payout_date = CURRENT_TIMESTAMP, bank_reference = $1 WHERE id = $2 RETURNING *`,
      [bankReference, id]
    );
    return result.rows[0];
  },

  async getTotalPayoutsByPartner(partnerId: string) {
    const result = await query(
      `SELECT SUM(payout_amount) as total_payout FROM payouts WHERE partner_id = $1 AND status = 'completed'`,
      [partnerId]
    );
    return result.rows[0]?.total_payout || 0;
  },
};
