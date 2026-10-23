import { Router } from 'express';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsRepository } from './appointments.repository';
import { DoctorsRepository } from '../doctors/doctors.repository';
import { PatientsRepository } from '../patients/patients.repository';
import { WorkScheduleRepository } from '../work-schedule/work-schedule.repository';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/roles.middleware';

const router = Router();

const appointmentsRepo = new AppointmentsRepository();
const doctorsRepo = new DoctorsRepository();
const patientsRepo = new PatientsRepository();
const workScheduleRepo = new WorkScheduleRepository();

const service = new AppointmentsService(appointmentsRepo, doctorsRepo, patientsRepo, workScheduleRepo);
const controller = new AppointmentsController(service);

router.post('/', authMiddleware, requireRoles('admin', 'secretary'), controller.create);
router.get('/', authMiddleware, controller.findAll);
router.get('/:id', authMiddleware, controller.findById);
router.patch('/:id/status', authMiddleware, controller.updateStatus);

export { router as appointmentsRouter };
