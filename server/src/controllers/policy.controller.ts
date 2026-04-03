import { Request, Response } from 'express';
import { policyService } from '../services/policy.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const policyController = {
  async createPolicy(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { premiumWeekly } = req.body;
      const policy = await policyService.createPolicy(partnerId, premiumWeekly);
      res.status(201).json(successResponse(policy, 'Policy created successfully'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async getActivePolicy(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const policy = await policyService.getActivePolicy(partnerId);
      res.json(successResponse(policy));
    } catch (error: any) {
      res.status(404).json(errorResponse(error.message));
    }
  },

  async renewPolicy(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { premiumWeekly } = req.body;
      const policy = await policyService.renewPolicy(partnerId, premiumWeekly);
      res.json(successResponse(policy, 'Policy renewed'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },

  async getPolicyClaims(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { policyId } = req.params;
      const claims = await policyService.getPolicyClaims(policyId);
      res.json(successResponse({ claims }));
    } catch (error: any) {
      res.status(404).json(errorResponse(error.message));
    }
  },

  async getPolicyStats(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { policyId } = req.params;
      const stats = await policyService.calculatePolicyStats(policyId);
      res.json(successResponse(stats));
    } catch (error: any) {
      res.status(404).json(errorResponse(error.message));
    }
  },
};
