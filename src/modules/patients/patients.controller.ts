import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PatientsService } from './patients.service';
import { AppError } from '../../errors/AppError';
import { parsePagination } from '../../utils/pagination';

const createSchema = z.object({
  name: z.string().min(1),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter exatamente 11 dígitos numéricos'),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
});

export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }
      const patient = await this.patientsService.create(parsed.data);
      res.status(201).json(patient);
    } catch (err) {
      next(err);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, pageSize } = parsePagination(req.query);
      const name = typeof req.query.name === 'string' ? req.query.name : undefined;
      const result = await this.patientsService.findAll({ name, page, pageSize });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new AppError('DADOS_INVALIDOS', 400, 'ID inválido.');
      const patient = await this.patientsService.findById(id);
      res.json(patient);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new AppError('DADOS_INVALIDOS', 400, 'ID inválido.');
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('DADOS_INVALIDOS', 400, parsed.error.errors.map((e) => e.message).join('; '));
      }
      const patient = await this.patientsService.update(id, parsed.data);
      res.json(patient);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new AppError('DADOS_INVALIDOS', 400, 'ID inválido.');
      await this.patientsService.remove(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
