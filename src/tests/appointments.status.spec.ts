import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentsService } from '../modules/appointments/appointments.service';
import { IAppointmentsRepository } from '../modules/appointments/appointments.repository';
import { IDoctorsRepository } from '../modules/doctors/doctors.repository';
import { IPatientsRepository } from '../modules/patients/patients.repository';
import { IWorkScheduleRepository } from '../modules/work-schedule/work-schedule.repository';
import { Appointment } from '../entities/Appointment.entity';
import { EntityManager } from 'typeorm';

vi.mock('../config/database', () => ({
  AppDataSource: {
    transaction: vi.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb({} as EntityManager)),
  },
}));

const makeAppointment = (status: Appointment['status'], doctorId = 1): Appointment => ({
  id: 42,
  doctorId,
  patientId: 10,
  startsAt: new Date('2026-10-13T11:00:00.000Z'),
  endsAt: new Date('2026-10-13T11:30:00.000Z'),
  status,
  createdAt: new Date(),
  doctor: {} as never,
  patient: {} as never,
});

const mockAppointmentsRepo: IAppointmentsRepository = {
  createInTransaction: vi.fn(),
  lockDoctorRow: vi.fn(),
  findOverlappingForDoctor: vi.fn(),
  findOverlappingForPatient: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => null),
  updateStatus: vi.fn(async (id, status) => ({ ...makeAppointment(status), id })),
  findActiveByPeriod: vi.fn(),
};

const mockDoctorsRepo: IDoctorsRepository = {
  createWithManager: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(async () => ({ id: 1, crm: 'CRM-SC-1', userId: 1 })),
};

const mockPatientsRepo: IPatientsRepository = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
};

const mockWorkScheduleRepo: IWorkScheduleRepository = {
  replaceSchedule: vi.fn(),
  findByDoctorId: vi.fn(),
};

describe('AppointmentsService - transições de status (RN11/RN12)', () => {
  let service: AppointmentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AppointmentsService(
      mockAppointmentsRepo,
      mockDoctorsRepo,
      mockPatientsRepo,
      mockWorkScheduleRepo,
    );
  });

  describe('Transições válidas', () => {
    it('admin pode mudar scheduled → in_progress', async () => {
      (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAppointment('scheduled', 1));

      const result = await service.updateStatus(
        42,
        { status: 'in_progress' },
        ['admin'],
        undefined,
      );
      expect(result.status).toBe('in_progress');
    });

    it('doctor-own pode mudar in_progress → done', async () => {
      (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAppointment('in_progress', 1));

      const result = await service.updateStatus(
        42,
        { status: 'done' },
        ['doctor'],
        1, // mesmo doctorId do agendamento
      );
      expect(result.status).toBe('done');
    });

    it('secretary pode cancelar scheduled', async () => {
      (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAppointment('scheduled', 1));

      const result = await service.updateStatus(42, { status: 'cancelled' }, ['secretary'], undefined);
      expect(result.status).toBe('cancelled');
    });
  });

  describe('Transições inválidas', () => {
    it('done → qualquer → TRANSICAO_INVALIDA', async () => {
      (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAppointment('done'));

      await expect(
        service.updateStatus(42, { status: 'scheduled' }, ['admin'], undefined),
      ).rejects.toMatchObject({ code: 'TRANSICAO_INVALIDA', statusCode: 422 });
    });

    it('cancelled → qualquer → TRANSICAO_INVALIDA', async () => {
      (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAppointment('cancelled'));

      await expect(
        service.updateStatus(42, { status: 'scheduled' }, ['admin'], undefined),
      ).rejects.toMatchObject({ code: 'TRANSICAO_INVALIDA', statusCode: 422 });
    });

    it('secretary não pode cancelar in_progress → ACESSO_NEGADO', async () => {
      (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAppointment('in_progress', 1));

      await expect(
        service.updateStatus(42, { status: 'cancelled' }, ['secretary'], undefined),
      ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
    });

    it('doctor de outro agendamento não pode mudar o status → ACESSO_NEGADO', async () => {
      (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(makeAppointment('scheduled', 1));

      await expect(
        service.updateStatus(42, { status: 'in_progress' }, ['doctor'], 99), // outro doctorId
      ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
    });
  });

  it('agendamento inexistente → RECURSO_NAO_ENCONTRADO', async () => {
    (mockAppointmentsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.updateStatus(999, { status: 'in_progress' }, ['admin'], undefined),
    ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO', statusCode: 404 });
  });
});
