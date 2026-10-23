import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';
import { UserRole } from '../entities/User.entity';

export interface JwtPayload {
  sub: number;
  name: string;
  email: string;
  roles: UserRole[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('NAO_AUTENTICADO', 401, 'Token de autenticação não fornecido.');
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado.');

    const payload = jwt.verify(token, secret) as unknown as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError('NAO_AUTENTICADO', 401, 'Token inválido ou expirado.');
  }
}
