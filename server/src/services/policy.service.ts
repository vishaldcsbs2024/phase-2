import { policyModel } from '../models/Policy.js';
import { claimModel } from '../models/Claim.js';
import { disruptionModel } from '../models/Disruption.js';
import { payoutModel } from '../models/Payout.js';

const WEEKLY_PREMIUM = 50; // ₹50 per week default
const COVERAGE_MULTIPLIER = 500; // Coverage = Premium * 500

export const policyService = {
  async createPolicy(partnerId: string, premiumWeekly: number = WEEKLY_PREMIUM) {
    const existingPolicy = await policyModel.getActivePolicy(partnerId);
    if (existingPolicy) {
      throw new Error('Active policy already exists');
    }

    const coverage = premiumWeekly * COVERAGE_MULTIPLIER;
    const policy = await policyModel.create({
      partner_id: partnerId,
      premium_weekly: premiumWeekly,
      coverage_amount: coverage,
      status: 'active',
      active_from: new Date(),
    });

    return policy;
  },

  async getActivePolicy(partnerId: string) {
    const policy = await policyModel.getActivePolicy(partnerId);
    if (!policy) {
      throw new Error('No active policy found');
    }
    return policy;
  },

  async renewPolicy(partnerId: string, premiumWeekly?: number) {
    const current = await policyModel.getActivePolicy(partnerId);
    if (current) {
      await policyModel.update(current.id, { status: 'expired' });
    }

    return this.createPolicy(partnerId, premiumWeekly);
  },

  async getPolicyClaims(policyId: string) {
    return claimModel.findByPolicyId(policyId);
  },

  async calculatePolicyStats(policyId: string) {
    const claims = await claimModel.findByPolicyId(policyId);
    const totalClaims = claims.length;
    const totalPayouts = claims.reduce((sum, c) => sum + (c.daily_payout || 0), 0);

    return {
      total_claims: totalClaims,
      total_payout: totalPayouts,
      claims,
    };
  },
};
