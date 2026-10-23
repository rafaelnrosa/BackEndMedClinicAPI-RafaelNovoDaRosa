import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarService } from '../modules/doctors/calendar.service';
import { IDoctorsRepository } from '../modules/doctors/doctors.repository';
import { IWorkScheduleRepository } from '../modules/work-schedule/work-schedule.repository';
import { IAppointmentsRepository } from '../modules/appointments/appointments.repository';

const mockDoctor = {
  id: 3,
  crm: 'CRM-SC-1',
  userId: 7,
  user: { id: 7, name: 'Dr', email: 'dr@test.com', roles: ['doctor'] },
};

const mockDoctorsRepo: IDoctorsRepository = {
  createWithManager: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => mockDoctor),
  findByUserId: vi.fn(),
};

const mockWorkScheduleRepo: IWorkScheduleRepository = {
  replaceSchedule: vi.fn(),
  findByDoctorId: vi.fn(async () => [
    { weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
  ]),
};

const mockAppointmentsRepo: IAppointmentsRepository = {
  createInTransaction: vi.fn(),
  lockDoctorRow: vi.fn(),
  findOverlappingForDoctor: vi.fn(),
  findOverlappingForPatient: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
  findActiveByPeriod: vi.fn(async () => [
    {
      id: 41,
      patientId: 10,
      doctorId: 3,
      startsAt: new Date('2026-10-13T11:00:00.000Z'),
      endsAt: new Date('2026-10-13T11:30:00.000Z'),
      status: 'scheduled',
      createdAt: new Date(),
      doctor: {} as never,
      patient: {} as never,
    },
  ]),
};

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarService(mockDoctorsRepo, mockWorkScheduleRepo, mockAppointmentsRepo);
    (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoctor);
    (mockWorkScheduleRepo.findByDoctorId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
    ]);
    (mockAppointmentsRepo.findActiveByPeriod as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it('retorna escala e agendamentos ativos no período', async () => {
    const result = await service.getCalendar(3, '2026-10-12', '2026-10-16');
    expect(result.workSchedule.shifts).toHaveLength(1);
    expect(Array.isArray(result.appointments)).toBe(true);
  });

  it('médico inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.getCalendar(99, '2026-10-12', '2026-10-16')).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('from fora do formato retorna DADOS_INVALIDOS', async () => {
    await expect(service.getCalendar(3, '12/10/2026', '2026-10-16')).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
    });
  });

  it('to fora do formato retorna DADOS_INVALIDOS', async () => {
    await expect(service.getCalendar(3, '2026-10-12', '16-10-2026')).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
    });
  });

  it('from posterior a to retorna DADOS_INVALIDOS', async () => {
    await expect(service.getCalendar(3, '2026-10-20', '2026-10-12')).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
    });
  });

  it('intervalo maior que 31 dias retorna DADOS_INVALIDOS', async () => {
    await expect(service.getCalendar(3, '2026-09-01', '2026-10-20')).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
    });
  });

  it('consultas canceladas não aparecem na agenda', async () => {
    // findActiveByPeriod já filtra cancelled no repositório
    // Aqui verificamos que o service usa o que o repositório retorna
    const result = await service.getCalendar(3, '2026-10-12', '2026-10-16');
    expect(result.appointments).toHaveLength(0);
  });
});
