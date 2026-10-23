import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AppError } from '../../errors/AppError';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, 'E-mail e senha são obrigatórios e devem ser válidos.');
      }

      const result = await this.authService.login(parsed.data);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
