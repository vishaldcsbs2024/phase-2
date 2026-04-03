import { Request, Response } from 'express';
import { payoutService } from '../services/payout.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const payoutController = {
  async getPartnerPayouts(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const payouts = await payoutService.getPartnerPayouts(partnerId);
      res.json(successResponse({ payouts }));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  },

  async getPayoutStats(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const stats = await payoutService.getPayoutStats(partnerId);
      res.json(successResponse(stats));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  },

  async getTotalPayouts(req: Request, res: Response) {
    try {
      const partnerId = req.partnerId;
      if (!partnerId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const total = await payoutService.getTotalPayouts(partnerId);
      res.json(successResponse({ total_payouts: total }));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  },
};
