import { Router } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/roles.middleware';

const router = Router();

const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

router.post('/', authMiddleware, requireRoles('admin'), usersController.create);
router.get('/me', authMiddleware, usersController.me);

export { router as usersRouter };
