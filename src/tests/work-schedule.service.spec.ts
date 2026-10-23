import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkScheduleService } from '../modules/work-schedule/work-schedule.service';
import { IWorkScheduleRepository, ShiftData } from '../modules/work-schedule/work-schedule.repository';
import { IDoctorsRepository } from '../modules/doctors/doctors.repository';

// Dublê do repositório de escala
const mockWorkScheduleRepo: IWorkScheduleRepository = {
  replaceSchedule: vi.fn(async (_doctorId: number, shifts: ShiftData[]) => shifts),
  findByDoctorId: vi.fn(async () => []),
};

// Dublê do repositório de médico
const mockDoctorsRepo: IDoctorsRepository = {
  createWithManager: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => ({ id: 1, crm: 'CRM-SC-1', userId: 1, user: { id: 1, name: 'Dr', email: 'dr@test.com', roles: ['doctor'] } })),
  findByUserId: vi.fn(),
};

const service = new WorkScheduleService(mockWorkScheduleRepo, mockDoctorsRepo);

describe('WorkScheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Médico sempre encontrado por padrão
    (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, crm: 'CRM-SC-1', userId: 1, user: { id: 1, name: 'Dr', email: 'dr@test.com', roles: ['doctor'] } });
    (mockWorkScheduleRepo.replaceSchedule as ReturnType<typeof vi.fn>).mockImplementation(
      async (_id: number, shifts: ShiftData[]) => shifts,
    );
  });

  describe('Validação de sobreposição de turnos (RN05)', () => {
    it('turnos sobrepostos no mesmo dia são rejeitados', async () => {
      await expect(
        service.setSchedule(1, {
          shifts: [
            { weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
            { weekDay: 2, startTime: '11:00', endTime: '15:00', slotDurationMinutes: 30 },
          ],
        }),
      ).rejects.toThrow('sobrepõem');
    });

    it('turnos encostados no mesmo dia são aceitos', async () => {
      await expect(
        service.setSchedule(1, {
          shifts: [
            { weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
            { weekDay: 2, startTime: '12:00', endTime: '18:00', slotDurationMinutes: 30 },
          ],
        }),
      ).resolves.not.toThrow();
    });

    it('turnos em dias diferentes não conflitam', async () => {
      await expect(
        service.setSchedule(1, {
          shifts: [
            { weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
            { weekDay: 4, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
          ],
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Validação de campos do turno', () => {
    it('weekDay fora de 0-6 é rejeitado', async () => {
      await expect(
        service.setSchedule(1, {
          shifts: [{ weekDay: 7, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 }],
        }),
      ).rejects.toThrow('weekDay');
    });

    it('startTime >= endTime é rejeitado', async () => {
      await expect(
        service.setSchedule(1, {
          shifts: [{ weekDay: 2, startTime: '12:00', endTime: '08:00', slotDurationMinutes: 30 }],
        }),
      ).rejects.toThrow('startTime');
    });

    it('slotDurationMinutes <= 0 é rejeitado', async () => {
      await expect(
        service.setSchedule(1, {
          shifts: [{ weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 0 }],
        }),
      ).rejects.toThrow('slotDurationMinutes');
    });
  });

  it('médico inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.setSchedule(99, { shifts: [] })).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });
});
