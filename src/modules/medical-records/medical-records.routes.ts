import { Router } from 'express';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsRepository } from './medical-records.repository';
import { PatientsRepository } from '../patients/patients.repository';
import { DoctorsRepository } from '../doctors/doctors.repository';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

const medicalRecordsRepo = new MedicalRecordsRepository();
const patientsRepo = new PatientsRepository();
const doctorsRepo = new DoctorsRepository();
const service = new MedicalRecordsService(medicalRecordsRepo, patientsRepo, doctorsRepo);
const controller = new MedicalRecordsController(service);

router.post('/', authMiddleware, controller.create);
router.get('/', authMiddleware, controller.findByPatient);

export { router as medicalRecordsRouter };
