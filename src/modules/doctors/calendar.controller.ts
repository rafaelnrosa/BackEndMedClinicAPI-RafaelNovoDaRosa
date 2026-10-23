import { Request, Response, NextFunction } from 'express';
import { CalendarService } from './calendar.service';
import { AppError } from '../../errors/AppError';

export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  getCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doctorId = parseInt(req.params.doctorId, 10);
      if (isNaN(doctorId)) throw new AppError('DADOS_INVALIDOS', 400, 'doctorId inválido.');

      const from = req.query.from as string;
      const to = req.query.to as string;

      if (!from || !to) {
        throw new AppError('DADOS_INVALIDOS', 400, 'Os parâmetros from e to são obrigatórios.');
      }

      const result = await this.calendarService.getCalendar(doctorId, from, to);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
