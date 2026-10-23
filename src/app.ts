import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { patientsRouter } from './modules/patients/patients.routes';
import { doctorsRouter } from './modules/doctors/doctors.routes';
import { workScheduleRouter } from './modules/work-schedule/work-schedule.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';
import { medicalRecordsRouter } from './modules/medical-records/medical-records.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { CalendarController } from './modules/doctors/calendar.controller';
import { CalendarService } from './modules/doctors/calendar.service';
import { DoctorsRepository } from './modules/doctors/doctors.repository';
import { WorkScheduleRepository } from './modules/work-schedule/work-schedule.repository';
import { AppointmentsRepository } from './modules/appointments/appointments.repository';
import { authMiddleware } from './middlewares/auth.middleware';

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Saúde
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Rotas
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/patients', patientsRouter);
  app.use('/api/v1/doctors', doctorsRouter);

  // Work schedule aninhado em doctors
  app.use('/api/v1/doctors/:doctorId/work-schedule', workScheduleRouter);

  // Calendar aninhado em doctors
  const calendarService = new CalendarService(
    new DoctorsRepository(),
    new WorkScheduleRepository(),
    new AppointmentsRepository(),
  );
  const calendarController = new CalendarController(calendarService);
  app.get('/api/v1/doctors/:doctorId/calendar', authMiddleware, calendarController.getCalendar);

  app.use('/api/v1/appointments', appointmentsRouter);

  // Prontuário aninhado em patients
  app.use('/api/v1/patients/:patientId/medical-records', medicalRecordsRouter);

  // Tratamento centralizado de erros (RP03)
  app.use(errorMiddleware);

  return app;
}
