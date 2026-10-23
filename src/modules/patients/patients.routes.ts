import { Router } from 'express';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientsRepository } from './patients.repository';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/roles.middleware';

const router = Router();

const repo = new PatientsRepository();
const service = new PatientsService(repo);
const controller = new PatientsController(service);

router.post('/', authMiddleware, requireRoles('admin', 'secretary'), controller.create);
router.get('/', authMiddleware, controller.findAll);
router.get('/:id', authMiddleware, controller.findById);
router.patch('/:id', authMiddleware, requireRoles('admin', 'secretary'), controller.update);
router.delete('/:id', authMiddleware, requireRoles('admin'), controller.remove);

export { router as patientsRouter };
