import { Router } from 'express';
import { WorkScheduleController } from './work-schedule.controller';
import { WorkScheduleService } from './work-schedule.service';
import { WorkScheduleRepository } from './work-schedule.repository';
import { DoctorsRepository } from '../doctors/doctors.repository';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/roles.middleware';

const router = Router({ mergeParams: true });

const workScheduleRepo = new WorkScheduleRepository();
const doctorsRepo = new DoctorsRepository();
const service = new WorkScheduleService(workScheduleRepo, doctorsRepo);
const controller = new WorkScheduleController(service);

router.put('/', authMiddleware, requireRoles('admin'), controller.setSchedule);
router.get('/', authMiddleware, controller.getSchedule);

export { router as workScheduleRouter };
