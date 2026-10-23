import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { UserRole } from '../entities/User.entity';

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('NAO_AUTENTICADO', 401, 'Não autenticado.');
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      throw new AppError('ACESSO_NEGADO', 403, 'Você não tem permissão para esta operação.');
    }

    next();
  };
}
