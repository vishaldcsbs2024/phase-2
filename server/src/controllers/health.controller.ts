import { Request, Response } from 'express';
import { successResponse } from '../utils/response.js';

export const healthController = {
  async check(req: Request, res: Response) {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json(
      successResponse({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)} minutes`,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        },
      })
    );
  },
};
