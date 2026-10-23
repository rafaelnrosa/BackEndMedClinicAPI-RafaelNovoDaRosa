import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DoctorsService } from './doctors.service';
import { AppError } from '../../errors/AppError';
import { parsePagination } from '../../utils/pagination';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  crm: z.string().min(1),
});

export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }
      const doctor = await this.doctorsService.create(parsed.data);
      res.status(201).json(doctor);
    } catch (err) {
      next(err);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize } = parsePagination(req.query);
      const name = typeof req.query.name === 'string' ? req.query.name : undefined;
      const result = await this.doctorsService.findAll({ name, page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new AppError('DADOS_INVALIDOS', 400, 'ID inválido.');
      const doctor = await this.doctorsService.findById(id);
      res.json(doctor);
    } catch (err) {
      next(err);
    }
  };
}
