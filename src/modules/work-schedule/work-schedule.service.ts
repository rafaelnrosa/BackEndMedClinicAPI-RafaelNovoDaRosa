import { AppError } from '../../errors/AppError';
import { IWorkScheduleRepository, ShiftData } from './work-schedule.repository';
import { IDoctorsRepository } from '../doctors/doctors.repository';

export interface SetWorkScheduleDto {
  shifts: ShiftData[];
}

export interface WorkScheduleResponseDto {
  shifts: ShiftData[];
}

/**
 * Converte "HH:MM" para minutos desde meia-noite.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Verifica se dois turnos do mesmo dia se sobrepõem.
 * Turnos encostados (um terminando onde o outro começa) NÃO se sobrepõem (RN05).
 */
export function shiftsOverlap(a: ShiftData, b: ShiftData): boolean {
  if (a.weekDay !== b.weekDay) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  // Sobreposição estrita: um começa antes do outro terminar
  return aStart < bEnd && bStart < aEnd;
}

export class WorkScheduleService {
  constructor(
    private readonly workScheduleRepository: IWorkScheduleRepository,
    private readonly doctorsRepository: IDoctorsRepository,
  ) {}

  async setSchedule(doctorId: number, dto: SetWorkScheduleDto): Promise<WorkScheduleResponseDto> {
    // Valida existência do médico
    const doctor = await this.doctorsRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Médico não encontrado.');
    }

    // Valida cada turno
    for (const shift of dto.shifts) {
      if (!Number.isInteger(shift.weekDay) || shift.weekDay < 0 || shift.weekDay > 6) {
        throw new AppError('DADOS_INVALIDOS', 400, 'weekDay deve ser um inteiro entre 0 e 6.');
      }

      if (!/^\d{2}:\d{2}$/.test(shift.startTime) || !/^\d{2}:\d{2}$/.test(shift.endTime)) {
        throw new AppError('DADOS_INVALIDOS', 400, 'startTime e endTime devem estar no formato HH:MM.');
      }

      const startMin = timeToMinutes(shift.startTime);
      const endMin = timeToMinutes(shift.endTime);

      if (startMin >= endMin) {
        throw new AppError('DADOS_INVALIDOS', 400, 'startTime deve ser anterior a endTime.');
      }

      if (!Number.isInteger(shift.slotDurationMinutes) || shift.slotDurationMinutes <= 0) {
        throw new AppError('DADOS_INVALIDOS', 400, 'slotDurationMinutes deve ser um inteiro positivo.');
      }
    }

    // Verifica sobreposição entre turnos do mesmo dia (RN05)
    for (let i = 0; i < dto.shifts.length; i++) {
      for (let j = i + 1; j < dto.shifts.length; j++) {
        if (shiftsOverlap(dto.shifts[i], dto.shifts[j])) {
          throw new AppError(
            'DADOS_INVALIDOS',
            400,
            `Turnos do mesmo dia se sobrepõem: dia ${dto.shifts[i].weekDay}.`,
          );
        }
      }
    }

    const saved = await this.workScheduleRepository.replaceSchedule(doctorId, dto.shifts);
    return { shifts: saved };
  }

  async getSchedule(doctorId: number): Promise<WorkScheduleResponseDto> {
    const doctor = await this.doctorsRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Médico não encontrado.');
    }

    const shifts = await this.workScheduleRepository.findByDoctorId(doctorId);
    return { shifts };
  }
}
