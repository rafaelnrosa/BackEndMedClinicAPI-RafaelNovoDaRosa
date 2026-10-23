import { AppError } from '../../errors/AppError';
import { IAppointmentsRepository } from './appointments.repository';
import { IDoctorsRepository } from '../doctors/doctors.repository';
import { IPatientsRepository } from '../patients/patients.repository';
import { IWorkScheduleRepository } from '../work-schedule/work-schedule.repository';
import { AppDataSource } from '../../config/database';
import { Appointment, AppointmentStatus } from '../../entities/Appointment.entity';
import { getLocalWeekDayAndMinutes, findMatchingShift } from '../../utils/schedule';
import { PaginatedResult } from '../patients/patients.repository';
import { UserRole } from '../../entities/User.entity';

export interface CreateAppointmentDto {
  doctorId: number;
  patientId: number;
  startsAt: string; // ISO 8601
}

export interface AppointmentResponseDto {
  id: number;
  doctorId: number;
  patientId: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
}

export interface UpdateAppointmentStatusDto {
  status: AppointmentStatus;
}

export interface ListAppointmentsDto {
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
  // Contexto do usuário autenticado (filtro forçado por perfil)
  currentUserRoles: UserRole[];
  currentUserDoctorId?: number;
}

// Tabela de transições: de → { para, quem pode }
const TRANSITIONS: Record<
  string,
  Array<{ to: AppointmentStatus; roles: string[] }>
> = {
  scheduled: [
    { to: 'in_progress', roles: ['admin', 'doctor-own'] },
    { to: 'cancelled', roles: ['admin', 'secretary', 'doctor-own'] },
  ],
  in_progress: [
    { to: 'done', roles: ['admin', 'doctor-own'] },
    { to: 'cancelled', roles: ['admin', 'doctor-own'] },
  ],
  done: [],
  cancelled: [],
};

export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly workScheduleRepository: IWorkScheduleRepository,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    // 1. Valida existência de médico e paciente
    const doctor = await this.doctorsRepository.findById(dto.doctorId);
    if (!doctor) throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Médico não encontrado.');

    const patient = await this.patientsRepository.findById(dto.patientId);
    if (!patient) throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Paciente não encontrado.');

    const startsAt = new Date(dto.startsAt);
    if (isNaN(startsAt.getTime())) {
      throw new AppError('DADOS_INVALIDOS', 400, 'startsAt inválido.');
    }

    // Busca escala
    const shifts = await this.workScheduleRepository.findByDoctorId(dto.doctorId);

    // 2, 3, 4. Valida horário contra a escala (RN07)
    const { weekDay, minutesSinceMidnight } = getLocalWeekDayAndMinutes(startsAt);
    const matchingShift = findMatchingShift(shifts, weekDay, minutesSinceMidnight);

    if (!matchingShift) {
      throw new AppError('HORARIO_FORA_DA_ESCALA', 422, 'O horário não existe na escala do médico.');
    }

    const endsAt = new Date(startsAt.getTime() + matchingShift.slotDurationMinutes * 60 * 1000);

    // 5, 6. Verificação de conflito com lock pessimista (RF07 / RN10)
    return AppDataSource.transaction(async (em) => {
      // Trava a linha do médico antes de verificar + gravar
      await this.appointmentsRepository.lockDoctorRow(em, dto.doctorId);

      // 5. Conflito com médico (RN08)
      const doctorConflict = await this.appointmentsRepository.findOverlappingForDoctor(
        em,
        dto.doctorId,
        startsAt,
        endsAt,
      );
      if (doctorConflict.length > 0) {
        throw new AppError('HORARIO_INDISPONIVEL', 409, 'Este horário acabou de ser ocupado.');
      }

      // 6. Conflito com paciente (RN09)
      const patientConflict = await this.appointmentsRepository.findOverlappingForPatient(
        em,
        dto.patientId,
        startsAt,
        endsAt,
      );
      if (patientConflict.length > 0) {
        throw new AppError('PACIENTE_INDISPONIVEL', 409, 'O paciente já tem uma consulta neste horário.');
      }

      const appointment = await this.appointmentsRepository.createInTransaction(em, {
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        startsAt,
        endsAt,
      });

      return this.toResponse(appointment);
    });
  }

  async findAll(dto: ListAppointmentsDto): Promise<PaginatedResult<AppointmentResponseDto>> {
    let forcedDoctorId: number | undefined;

    // Filtro forçado: doctor só enxerga os próprios (RF10)
    if (dto.currentUserRoles.includes('doctor') && !dto.currentUserRoles.includes('admin')) {
      forcedDoctorId = dto.currentUserDoctorId;
    }

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (dto.from) {
      fromDate = new Date(dto.from + 'T00:00:00-03:00');
    }
    if (dto.to) {
      // fim do dia
      toDate = new Date(dto.to + 'T23:59:59-03:00');
    }

    const result = await this.appointmentsRepository.findAll({
      doctorId: forcedDoctorId ?? dto.doctorId,
      patientId: dto.patientId,
      status: dto.status,
      from: fromDate,
      to: toDate,
      page: dto.page,
      pageSize: dto.pageSize,
    });

    return {
      data: result.data.map(this.toResponse),
      meta: result.meta,
    };
  }

  async findById(
    id: number,
    currentUserId: number,
    currentUserRoles: UserRole[],
    currentUserDoctorId?: number,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
    }

    // Doctor só acessa o próprio agendamento
    if (currentUserRoles.includes('doctor') && !currentUserRoles.includes('admin')) {
      if (appointment.doctorId !== currentUserDoctorId) {
        throw new AppError('ACESSO_NEGADO', 403, 'Você não tem acesso a este agendamento.');
      }
    }

    return this.toResponse(appointment);
  }

  async updateStatus(
    id: number,
    dto: UpdateAppointmentStatusDto,
    currentUserRoles: UserRole[],
    currentUserDoctorId?: number,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
    }

    const validStatuses: AppointmentStatus[] = ['scheduled', 'in_progress', 'done', 'cancelled'];
    if (!validStatuses.includes(dto.status)) {
      throw new AppError('DADOS_INVALIDOS', 400, 'Status inválido.');
    }

    const transitions = TRANSITIONS[appointment.status] ?? [];
    const transition = transitions.find((t) => t.to === dto.status);

    // Transição não existe no ciclo de vida
    if (!transition) {
      throw new AppError('TRANSICAO_INVALIDA', 422, `Não é possível alterar de ${appointment.status} para ${dto.status}.`);
    }

    // Verifica se o usuário tem autoridade para a transição (RN12)
    const isOwnDoctor = appointment.doctorId === currentUserDoctorId;
    const userRole = this.resolveEffectiveRole(currentUserRoles, isOwnDoctor);

    if (!transition.roles.includes(userRole)) {
      throw new AppError('ACESSO_NEGADO', 403, 'Você não tem permissão para esta transição.');
    }

    const updated = await this.appointmentsRepository.updateStatus(id, dto.status);
    return this.toResponse(updated!);
  }

  /**
   * Resolve o papel efetivo do usuário para verificação de transição.
   * 'doctor-own' representa o médico dono do agendamento.
   */
  private resolveEffectiveRole(roles: UserRole[], isOwnDoctor: boolean): string {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('secretary')) return 'secretary';
    if (roles.includes('doctor') && isOwnDoctor) return 'doctor-own';
    return 'doctor-other';
  }

  private toResponse(appointment: Appointment): AppointmentResponseDto {
    return {
      id: appointment.id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      status: appointment.status,
    };
  }
}
