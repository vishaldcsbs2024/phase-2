import { Request, Response } from 'express';
import { disruptionService } from '../services/disruption.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const disruptionController = {
  async recordDisruption(req: Request, res: Response) {
    try {
      const { disruptionType, location, severity } = req.body;

      if (!disruptionType || !location) {
        return res.status(400).json(errorResponse('Missing required fields'));
      }

      const disruption = await disruptionService.recordDisruption(
        disruptionType,
        location,
        severity || 1
      );

      res.status(201).json(successResponse(disruption, 'Disruption recorded'));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  },

  async getActiveDisruptions(req: Request, res: Response) {
    try {
      const disruptions = await disruptionService.getActiveDisruptions();
      res.json(successResponse({ disruptions }));
    } catch (error: any) {
      res.status(500).json(errorResponse(error.message));
    }
  },

  async resolveDisruption(req: Request, res: Response) {
    try {
      const { disruptionId } = req.params;
      const disruption = await disruptionService.resolveDisruption(disruptionId);
      res.json(successResponse(disruption, 'Disruption resolved'));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  },
};
