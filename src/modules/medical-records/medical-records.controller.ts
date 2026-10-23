import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MedicalRecordsService } from './medical-records.service';
import { AppError } from '../../errors/AppError';
import { parsePagination } from '../../utils/pagination';

const createSchema = z.object({
  text: z.string().min(1),
});

export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) throw new AppError('DADOS_INVALIDOS', 400, 'patientId inválido.');

      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }

      const user = req.user!;
      const record = await this.medicalRecordsService.create(
        patientId,
        parsed.data,
        user.sub,
        user.roles,
      );

      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  };

  findByPatient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) throw new AppError('DADOS_INVALIDOS', 400, 'patientId inválido.');

      const { page, pageSize } = parsePagination(req.query);
      const user = req.user!;

      const result = await this.medicalRecordsService.findByPatient(
        patientId,
        page,
        pageSize,
        user.sub,
        user.roles,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
