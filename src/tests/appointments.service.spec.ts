import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentsService } from '../modules/appointments/appointments.service';
import { IAppointmentsRepository } from '../modules/appointments/appointments.repository';
import { IDoctorsRepository } from '../modules/doctors/doctors.repository';
import { IPatientsRepository } from '../modules/patients/patients.repository';
import { IWorkScheduleRepository } from '../modules/work-schedule/work-schedule.repository';
import { Appointment } from '../entities/Appointment.entity';
import { EntityManager } from 'typeorm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeDate = (iso: string) => new Date(iso);

// Médico no turno de terça (weekDay=2), 08:00–12:00, slot 30min
// A data 2026-10-13 é terça-feira (UTC-3 = America/Sao_Paulo)
// 08:00 BRT = 11:00 UTC
const DOCTOR_ID = 1;
const PATIENT_ID = 10;
const STARTS_AT_VALID = '2026-10-13T11:00:00.000Z'; // 08:00 BRT — válido

const mockShifts = [
  { weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
];

// ─── Dublês ──────────────────────────────────────────────────────────────────

const mockEM = {
  save: vi.fn(),
  create: vi.fn(),
  query: vi.fn(),
  createQueryBuilder: vi.fn(),
  getRepository: vi.fn(),
} as unknown as EntityManager;

const mockAppointmentsRepo: IAppointmentsRepository = {
  createInTransaction: vi.fn(async (_em, data) => ({
    id: 99,
    ...data,
    status: 'scheduled',
    createdAt: new Date(),
  })) as unknown as IAppointmentsRepository['createInTransaction'],
  lockDoctorRow: vi.fn(async () => {}),
  findOverlappingForDoctor: vi.fn(async () => []),
  findOverlappingForPatient: vi.fn(async () => []),
  findAll: vi.fn(async () => ({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } })),
  findById: vi.fn(async () => null),
  updateStatus: vi.fn(async () => null),
  findActiveByPeriod: vi.fn(async () => []),
};

const mockDoctorsRepo: IDoctorsRepository = {
  createWithManager: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => ({
    id: DOCTOR_ID,
    crm: 'CRM-SC-1',
    userId: 1,
    user: { id: 1, name: 'Dr', email: 'dr@test.com', roles: ['doctor'] },
  })),
  findByUserId: vi.fn(),
};

const mockPatientsRepo: IPatientsRepository = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => ({
    id: PATIENT_ID,
    name: 'Carlos',
    cpf: '12345678901',
    createdAt: new Date(),
  })),
  update: vi.fn(),
  softDelete: vi.fn(),
};

const mockWorkScheduleRepo: IWorkScheduleRepository = {
  replaceSchedule: vi.fn(),
  findByDoctorId: vi.fn(async () => mockShifts),
};

// ─── Função para substituir AppDataSource.transaction nos testes ──────────────
// O service chama AppDataSource.transaction(async em => {...}).
// Vamos mockar esse módulo para chamar o callback com o mockEM.
vi.mock('../config/database', () => ({
  AppDataSource: {
    transaction: vi.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb(mockEM)),
  },
}));

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AppointmentsService(
      mockAppointmentsRepo,
      mockDoctorsRepo,
      mockPatientsRepo,
      mockWorkScheduleRepo,
    );

    // Restaura comportamentos padrão
    (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: DOCTOR_ID,
      crm: 'CRM-SC-1',
      userId: 1,
      user: { id: 1, name: 'Dr', email: 'dr@test.com', roles: ['doctor'] },
    });
    (mockPatientsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PATIENT_ID,
      name: 'Carlos',
      cpf: '12345678901',
      createdAt: new Date(),
    });
    (mockWorkScheduleRepo.findByDoctorId as ReturnType<typeof vi.fn>).mockResolvedValue(mockShifts);
    (mockAppointmentsRepo.findOverlappingForDoctor as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockAppointmentsRepo.findOverlappingForPatient as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (mockAppointmentsRepo.createInTransaction as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 99,
      doctorId: DOCTOR_ID,
      patientId: PATIENT_ID,
      startsAt: new Date(STARTS_AT_VALID),
      endsAt: new Date(new Date(STARTS_AT_VALID).getTime() + 30 * 60 * 1000),
      status: 'scheduled',
      createdAt: new Date(),
    });
  });

  describe('Caso 1: Caminho feliz', () => {
    it('cria o agendamento com sucesso', async () => {
      const result = await service.create({
        doctorId: DOCTOR_ID,
        patientId: PATIENT_ID,
        startsAt: STARTS_AT_VALID,
      });

      expect(result.status).toBe('scheduled');
      expect(result.doctorId).toBe(DOCTOR_ID);
      expect(mockAppointmentsRepo.createInTransaction).toHaveBeenCalledOnce();
    });
  });

  describe('Caso 2: Médico não encontrado', () => {
    it('retorna RECURSO_NAO_ENCONTRADO quando o médico não existe', async () => {
      (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.create({ doctorId: 99, patientId: PATIENT_ID, startsAt: STARTS_AT_VALID }),
      ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO', statusCode: 404 });
    });
  });

  describe('Caso 3: Horário fora de qualquer turno', () => {
    it('retorna HORARIO_FORA_DA_ESCALA quando não há turno no horário', async () => {
      (mockWorkScheduleRepo.findByDoctorId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await expect(
        service.create({ doctorId: DOCTOR_ID, patientId: PATIENT_ID, startsAt: STARTS_AT_VALID }),
      ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA', statusCode: 422 });
    });
  });

  describe('Caso 4: Horário desalinhado da grade', () => {
    it('retorna HORARIO_FORA_DA_ESCALA para horário não múltiplo do slot', async () => {
      // 08:20 BRT = 11:20 UTC — desalinhado de um turno com slot 30min
      const startsAt = '2026-10-13T11:20:00.000Z'; // 08:20 BRT

      await expect(
        service.create({ doctorId: DOCTOR_ID, patientId: PATIENT_ID, startsAt }),
      ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA', statusCode: 422 });
    });
  });

  describe('Caso 5: Consulta não cabe no fim do turno', () => {
    it('retorna HORARIO_FORA_DA_ESCALA quando a consulta ultrapassa o fim do turno', async () => {
      // 11:50 BRT (turno até 12:00, slot 30min → não cabe)
      // 11:50 BRT = 14:50 UTC
      const startsAt = '2026-10-13T14:50:00.000Z'; // 11:50 BRT

      await expect(
        service.create({ doctorId: DOCTOR_ID, patientId: PATIENT_ID, startsAt }),
      ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA', statusCode: 422 });
    });
  });

  describe('Caso 6: Conflito com agendamento existente do médico (RN08)', () => {
    it('retorna HORARIO_INDISPONIVEL quando o médico já tem consulta sobrepondo o período', async () => {
      (mockAppointmentsRepo.findOverlappingForDoctor as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 1, doctorId: DOCTOR_ID, patientId: 5, startsAt: new Date(STARTS_AT_VALID), endsAt: new Date(), status: 'scheduled' } as Appointment,
      ]);

      await expect(
        service.create({ doctorId: DOCTOR_ID, patientId: PATIENT_ID, startsAt: STARTS_AT_VALID }),
      ).rejects.toMatchObject({ code: 'HORARIO_INDISPONIVEL', statusCode: 409 });
    });
  });

  describe('Caso 7: Conflito com agendamento existente do paciente (RN09)', () => {
    it('retorna PACIENTE_INDISPONIVEL quando o paciente já tem consulta sobrepondo o período', async () => {
      (mockAppointmentsRepo.findOverlappingForPatient as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 2, doctorId: 5, patientId: PATIENT_ID, startsAt: new Date(STARTS_AT_VALID), endsAt: new Date(), status: 'scheduled' } as Appointment,
      ]);

      await expect(
        service.create({ doctorId: DOCTOR_ID, patientId: PATIENT_ID, startsAt: STARTS_AT_VALID }),
      ).rejects.toMatchObject({ code: 'PACIENTE_INDISPONIVEL', statusCode: 409 });
    });
  });
});
