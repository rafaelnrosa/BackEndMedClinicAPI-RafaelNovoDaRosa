import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UsersService } from './users.service';
import { AppError } from '../../errors/AppError';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  roles: z.array(z.enum(['admin', 'secretary', 'doctor'])).min(1),
});

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }

      const user = await this.usersService.create(parsed.data);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.sub;
      const user = await this.usersService.findMe(userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  };
}
