import { payoutModel } from '../models/Payout.js';
import { claimModel } from '../models/Claim.js';

export const payoutService = {
  async getPartnerPayouts(partnerId: string) {
    return payoutModel.findByPartnerId(partnerId);
  },

  async processPendingPayouts() {
    const pending = await payoutModel.getPendingPayouts();
    const processed = [];

    for (const payout of pending) {
      const bankRef = `GSHIELD-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
      const processed_payout = await payoutModel.processPayout(payout.id, bankRef);
      processed.push(processed_payout);
    }

    return processed;
  },

  async getTotalPayouts(partnerId: string) {
    return payoutModel.getTotalPayoutsByPartner(partnerId);
  },

  async getPayoutStats(partnerId: string) {
    const total = await this.getTotalPayouts(partnerId);
    const payouts = await this.getPartnerPayouts(partnerId);

    const byStatus = {
      pending: payouts.filter(p => p.status === 'pending').length,
      completed: payouts.filter(p => p.status === 'completed').length,
    };

    return {
      total_amount: total,
      by_status: byStatus,
      recent_payouts: payouts.slice(0, 5),
    };
  },
};
