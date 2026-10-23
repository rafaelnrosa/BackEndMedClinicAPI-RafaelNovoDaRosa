import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';

const router = Router();

const usersRepository = new UsersRepository();
const authService = new AuthService(usersRepository);
const authController = new AuthController(authService);

router.post('/login', authController.login);

export { router as authRouter };
