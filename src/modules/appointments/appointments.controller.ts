import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppointmentsService } from './appointments.service';
import { AppError } from '../../errors/AppError';
import { parsePagination } from '../../utils/pagination';
import { AppointmentStatus } from '../../entities/Appointment.entity';
import { DoctorsRepository } from '../doctors/doctors.repository';

const createSchema = z.object({
  doctorId: z.number().int().positive(),
  patientId: z.number().int().positive(),
  startsAt: z.string().min(1),
});

const updateStatusSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'done', 'cancelled']),
});

const VALID_STATUSES: AppointmentStatus[] = ['scheduled', 'in_progress', 'done', 'cancelled'];

export class AppointmentsController {
  private readonly doctorsRepo = new DoctorsRepository();

  constructor(private readonly appointmentsService: AppointmentsService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }
      const appointment = await this.appointmentsService.create(parsed.data);
      res.status(201).json(appointment);
    } catch (err) {
      next(err);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize } = parsePagination(req.query);
      const user = req.user!;

      const doctorId = req.query.doctorId ? parseInt(String(req.query.doctorId), 10) : undefined;
      const patientId = req.query.patientId ? parseInt(String(req.query.patientId), 10) : undefined;
      const status = req.query.status as AppointmentStatus | undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;

      if (status && !VALID_STATUSES.includes(status)) {
        throw new AppError('DADOS_INVALIDOS', 400, 'Status inválido.');
      }

      // Resolve doctorId do médico autenticado (se perfil doctor)
      let currentUserDoctorId: number | undefined;
      if (user.roles.includes('doctor') && !user.roles.includes('admin')) {
        const doctor = await this.doctorsRepo.findByUserId(user.sub);
        currentUserDoctorId = doctor?.id;
      }

      const result = await this.appointmentsService.findAll({
        doctorId,
        patientId,
        status,
        from,
        to,
        page,
        pageSize,
        currentUserRoles: user.roles,
        currentUserDoctorId,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new AppError('DADOS_INVALIDOS', 400, 'ID inválido.');

      const user = req.user!;
      let currentUserDoctorId: number | undefined;
      if (user.roles.includes('doctor') && !user.roles.includes('admin')) {
        const doctor = await this.doctorsRepo.findByUserId(user.sub);
        currentUserDoctorId = doctor?.id;
      }

      const appointment = await this.appointmentsService.findById(id, user.sub, user.roles, currentUserDoctorId);
      res.json(appointment);
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new AppError('DADOS_INVALIDOS', 400, 'ID inválido.');

      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }

      const user = req.user!;
      let currentUserDoctorId: number | undefined;
      if (user.roles.includes('doctor') && !user.roles.includes('admin')) {
        const doctor = await this.doctorsRepo.findByUserId(user.sub);
        currentUserDoctorId = doctor?.id;
      }

      const appointment = await this.appointmentsService.updateStatus(
        id,
        parsed.data,
        user.roles,
        currentUserDoctorId,
      );
      res.json(appointment);
    } catch (err) {
      next(err);
    }
  };
}
