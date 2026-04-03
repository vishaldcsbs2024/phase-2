import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
import { errorResponse } from '../utils/response.js';

declare global {
  namespace Express {
    interface Request {
      partnerId?: string;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json(errorResponse('No token provided'));
  }

  try {
    const decoded = verifyToken(token);
    req.partnerId = decoded.partnerId;
    next();
  } catch (error) {
    return res.status(401).json(errorResponse('Invalid token'));
  }
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json(
    errorResponse(err.message || 'Internal server error')
  );
};
