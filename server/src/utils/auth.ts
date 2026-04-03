import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../utils/config.js';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (partnerId: string): string => {
  return jwt.sign({ partnerId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

export const verifyToken = (token: string): { partnerId: string } => {
  try {
    return jwt.verify(token, config.jwt.secret) as { partnerId: string };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
