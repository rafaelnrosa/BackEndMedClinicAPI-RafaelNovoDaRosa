import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentsService } from '../modules/appointments/appointments.service';
import { IAppointmentsRepository } from '../modules/appointments/appointments.repository';
import { IDoctorsRepository } from '../modules/doctors/doctors.repository';
import { IPatientsRepository } from '../modules/patients/patients.repository';
import { IWorkScheduleRepository } from '../modules/work-schedule/work-schedule.repository';
import { EntityManager } from 'typeorm';

vi.mock('../config/database', () => ({
  AppDataSource: {
    transaction: vi.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb({} as EntityManager)),
  },
}));

const mockAppointmentData = {
  id: 1,
  doctorId: 1,
  patientId: 10,
  startsAt: new Date('2026-10-13T11:00:00.000Z'),
  endsAt: new Date('2026-10-13T11:30:00.000Z'),
  status: 'scheduled' as const,
  createdAt: new Date(),
  doctor: {} as never,
  patient: {} as never,
};

const mockAppointmentsRepo: IAppointmentsRepository = {
  createInTransaction: vi.fn(),
  lockDoctorRow: vi.fn(),
  findOverlappingForDoctor: vi.fn(async () => []),
  findOverlappingForPatient: vi.fn(async () => []),
  findAll: vi.fn(async () => ({
    data: [mockAppointmentData],
    meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
  })),
  findById: vi.fn(async () => mockAppointmentData),
  updateStatus: vi.fn(async (_id, status) => ({ ...mockAppointmentData, status })),
  findActiveByPeriod: vi.fn(async () => []),
};

const mockDoctorsRepo: IDoctorsRepository = {
  createWithManager: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => ({ id: 1, crm: 'CRM-SC-1', userId: 1, user: {} as never })),
  findByUserId: vi.fn(async () => ({ id: 1, crm: 'CRM-SC-1', userId: 7 })),
};

const mockPatientsRepo: IPatientsRepository = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => ({ id: 10, name: 'Carlos', cpf: '12345678901', createdAt: new Date() })),
  update: vi.fn(),
  softDelete: vi.fn(),
};

const mockWorkScheduleRepo: IWorkScheduleRepository = {
  replaceSchedule: vi.fn(),
  findByDoctorId: vi.fn(async () => []),
};

describe('AppointmentsService - findAll e findById', () => {
  let service: AppointmentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AppointmentsService(
      mockAppointmentsRepo,
      mockDoctorsRepo,
      mockPatientsRepo,
      mockWorkScheduleRepo,
    );
    (mockAppointmentsRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockAppointmentData],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });
  });

  it('admin lista todos os agendamentos', async () => {
    const result = await service.findAll({
      page: 1,
      pageSize: 20,
      currentUserRoles: ['admin'],
    });
    expect(result.data).toHaveLength(1);
  });

  it('doctor só vê os próprios agendamentos (filtro forçado)', async () => {
    (mockDoctorsRepo.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    await service.findAll({
      page: 1,
      pageSize: 20,
      currentUserRoles: ['doctor'],
      currentUserDoctorId: 1,
      doctorId: 99, // tenta ver de outro médico
    });

    const callArgs = (mockAppointmentsRepo.findAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // O doctorId passado ao repo deve ser o do próprio médico (1), não o 99
    expect(callArgs.doctorId).toBe(1);
  });

  it('findById retorna o agendamento', async () => {
    (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointmentData);

    const result = await service.findById(1, 1, ['admin'], undefined);
    expect(result.id).toBe(1);
  });

  it('doctor sem ser dono do agendamento recebe ACESSO_NEGADO', async () => {
    (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAppointmentData);

    await expect(
      service.findById(1, 99, ['doctor'], 99), // doctorId 99, mas o agendamento é do 1
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
  });

  it('findById inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.findById(999, 1, ['admin'], undefined),
    ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
  });
});
