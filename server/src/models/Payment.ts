import { query } from '../db/index.js';

export interface Payment {
  id: string;
  partner_id: string;
  policy_id?: string;
  amount: number;
  payment_method: string;
  transaction_id?: string;
  status: string;
  payment_date: Date;
  created_at: Date;
  updated_at: Date;
}

export const paymentModel = {
  async create(data: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) {
    const result = await query(
      `INSERT INTO payments (partner_id, policy_id, amount, payment_method, transaction_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.partner_id, data.policy_id, data.amount, data.payment_method, data.transaction_id, data.status]
    );
    return result.rows[0];
  },

  async findByPartnerId(partnerId: string) {
    const result = await query(
      `SELECT * FROM payments WHERE partner_id = $1 ORDER BY payment_date DESC LIMIT 20`,
      [partnerId]
    );
    return result.rows;
  },

  async updateStatus(id: string, status: string) {
    const result = await query(
      `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  },

  async getMonthlyRevenue() {
    const result = await query(
      `SELECT SUM(amount) as total_revenue FROM payments 
       WHERE status = 'completed' AND payment_date >= NOW() - INTERVAL '1 month'`
    );
    return result.rows[0]?.total_revenue || 0;
  },
};
