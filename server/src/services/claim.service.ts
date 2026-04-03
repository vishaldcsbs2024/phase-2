import { claimModel } from '../models/Claim.js';
import { payoutModel } from '../models/Payout.js';
import { disruptionModel } from '../models/Disruption.js';
import { policyModel } from '../models/Policy.js';

const DISRUPTION_PAYOUTS: Record<string, number> = {
  heavy_rain: 300,
  extreme_heat: 250,
  flood: 500,
  severe_aqi: 200,
  curfew: 400,
  strike: 350,
};

export const claimService = {
  async createClaim(partnerId: string, policyId: string, disruptionType: string, location: string) {
    if (!DISRUPTION_PAYOUTS[disruptionType]) {
      throw new Error(`Invalid disruption type: ${disruptionType}`);
    }

    const policy = await policyModel.findById(policyId);
    if (!policy || policy.partner_id !== partnerId) {
      throw new Error('Policy not found or not authorized');
    }

    const dailyPayout = DISRUPTION_PAYOUTS[disruptionType];
    const claim = await claimModel.create({
      policy_id: policyId,
      partner_id: partnerId,
      claim_date: new Date(),
      disruption_type: disruptionType,
      location,
      daily_payout: dailyPayout,
      status: 'pending',
    });

    // Create corresponding payout
    const payout = await payoutModel.create({
      claim_id: claim.id,
      partner_id: partnerId,
      payout_amount: dailyPayout,
      status: 'pending',
    });

    return { claim, payout };
  },

  async getPartnerClaims(partnerId: string) {
    return claimModel.findByPartnerId(partnerId);
  },

  async approveClaim(claimId: string) {
    const claim = await claimModel.findById(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const updatedClaim = await claimModel.update(claimId, { status: 'approved' });

    // Update payout to processing
    const payouts = await payoutModel.getPendingPayouts();
    const claimPayout = payouts.find(p => p.claim_id === claimId);
    if (claimPayout) {
      await payoutModel.processPayout(claimPayout.id, `GSHIELD-${Date.now()}`);
    }

    return updatedClaim;
  },

  async getClaimsByDisruption(disruptionType: string, location: string) {
    return claimModel.getClaimsByLocation(location, disruptionType);
  },

  async autoProcessClaimsForDisruption(disruptionType: string, location: string) {
    const activePolicies = await policyModel.getPoliciesByPlatform(['zomato', 'swiggy', 'zepto', 'blinkit', 'amazon', 'dunzo']);
    const claimsList: any[] = [];

    for (const policy of activePolicies) {
      // Check if policy covers this location (simple version - can be enhanced with geofencing)
      const claim = await this.createClaim(policy.partner_id, policy.id, disruptionType, location);
      claimsList.push(claim);
    }

    return claimsList;
  },
};
