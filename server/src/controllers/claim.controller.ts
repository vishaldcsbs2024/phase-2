import { Request, Response } from 'express';
import { claimService } from '../services/claim.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const claimController = {
  async createClaim(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { policyId, disruptionType, location } = req.body;

      if (!policyId || !disruptionType || !location) {
        return res.status(400).json(errorResponse('Missing required fields'));
      }

      const { claim, payout } = await claimService.createClaim(
        partnerId,
        policyId,
        disruptionType,
        location
      );

      res.status(201).json(successResponse({ claim, payout }, 'Claim created successfully'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async getPartnerClaims(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const claims = await claimService.getPartnerClaims(partnerId);
      res.json(successResponse({ claims }));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  },

  async approveClaim(req: Request, res: Response) {
    try {
      const { claimId } = req.params;
      const claim = await claimService.approveClaim(claimId);
      res.json(successResponse(claim, 'Claim approved and payout initiated'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async processClaim(req: Request, res: Response) {
    try {
      const { claimId } = req.params;
      const result = await claimService.processExistingClaim(claimId, req.body || {});
      res.json(successResponse(result, 'Claim processed successfully'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async reportDisruption(req: Request, res: Response) {
    try {
      const { disruptionType, location } = req.body;

      if (!disruptionType || !location) {
        return res.status(400).json(errorResponse('Missing required fields'));
      }

      // Get valid disruption types
      const validTypes = ['heavy_rain', 'extreme_heat', 'flood', 'severe_aqi', 'curfew', 'strike'];
      if (!validTypes.includes(disruptionType)) {
        return res.status(400).json(errorResponse('Invalid disruption type'));
      }

      const claims = await claimService.autoProcessClaimsForDisruption(disruptionType, location);
      res.status(201).json(successResponse({ claims_created: claims.length }, 'Disruption reported and claims created'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  },
};
