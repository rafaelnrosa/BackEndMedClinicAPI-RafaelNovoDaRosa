import { Router } from 'express';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { DoctorsRepository } from './doctors.repository';
import { UsersRepository } from '../users/users.repository';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/roles.middleware';

const router = Router();

const doctorsRepo = new DoctorsRepository();
const usersRepo = new UsersRepository();
const service = new DoctorsService(doctorsRepo, usersRepo);
const controller = new DoctorsController(service);

router.post('/', authMiddleware, requireRoles('admin'), controller.create);
router.get('/', authMiddleware, controller.findAll);
router.get('/:id', authMiddleware, controller.findById);

export { router as doctorsRouter };
