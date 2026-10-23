import { AppError } from '../../errors/AppError';
import { IDoctorsRepository } from './doctors.repository';
import { IWorkScheduleRepository } from '../work-schedule/work-schedule.repository';
import { IAppointmentsRepository } from '../appointments/appointments.repository';

export interface CalendarResponseDto {
  workSchedule: {
    shifts: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
    }>;
  };
  appointments: Array<{
    id: number;
    patientId: number;
    startsAt: string;
    endsAt: string;
    status: string;
  }>;
}

export class CalendarService {
  constructor(
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly workScheduleRepository: IWorkScheduleRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
  ) {}

  async getCalendar(doctorId: number, from: string, to: string): Promise<CalendarResponseDto> {
    // Valida o médico
    const doctor = await this.doctorsRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Médico não encontrado.');
    }

    // Valida datas
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new AppError('DADOS_INVALIDOS', 400, 'from e to devem estar no formato YYYY-MM-DD.');
    }

    const fromDate = new Date(from + 'T00:00:00-03:00');
    const toDate = new Date(to + 'T23:59:59-03:00');

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new AppError('DADOS_INVALIDOS', 400, 'Datas inválidas.');
    }

    if (fromDate > toDate) {
      throw new AppError('DADOS_INVALIDOS', 400, 'A data from deve ser anterior ou igual a to.');
    }

    // Máximo 31 dias
    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 31) {
      throw new AppError('DADOS_INVALIDOS', 400, 'O intervalo máximo é de 31 dias.');
    }

    const [shifts, appointments] = await Promise.all([
      this.workScheduleRepository.findByDoctorId(doctorId),
      this.appointmentsRepository.findActiveByPeriod(doctorId, fromDate, toDate),
    ]);

    return {
      workSchedule: { shifts },
      appointments: appointments.map((a) => ({
        id: a.id,
        patientId: a.patientId,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        status: a.status,
      })),
    };
  }
}
