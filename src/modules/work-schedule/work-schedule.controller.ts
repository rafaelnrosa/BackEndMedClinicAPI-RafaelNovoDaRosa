import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WorkScheduleService } from './work-schedule.service';
import { AppError } from '../../errors/AppError';

const shiftSchema = z.object({
  weekDay: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  slotDurationMinutes: z.number().int().positive(),
});

const setScheduleSchema = z.object({
  shifts: z.array(shiftSchema),
});

export class WorkScheduleController {
  constructor(private readonly workScheduleService: WorkScheduleService) {}

  setSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctorId = parseInt(req.params.doctorId, 10);
      if (isNaN(doctorId)) throw new AppError('DADOS_INVALIDOS', 400, 'doctorId inválido.');

      const parsed = setScheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }

      const result = await this.workScheduleService.setSchedule(doctorId, parsed.data);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctorId = parseInt(req.params.doctorId, 10);
      if (isNaN(doctorId)) throw new AppError('DADOS_INVALIDOS', 400, 'doctorId inválido.');

      const result = await this.workScheduleService.getSchedule(doctorId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
