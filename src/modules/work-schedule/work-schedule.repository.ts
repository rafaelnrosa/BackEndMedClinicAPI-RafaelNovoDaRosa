import { Repository } from 'typeorm';
import { WorkScheduleShift } from '../../entities/WorkScheduleShift.entity';
import { AppDataSource } from '../../config/database';

export interface ShiftData {
  weekDay: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface IWorkScheduleRepository {
  replaceSchedule(doctorId: number, shifts: ShiftData[]): Promise<ShiftData[]>;
  findByDoctorId(doctorId: number): Promise<ShiftData[]>;
}

export class WorkScheduleRepository implements IWorkScheduleRepository {
  private get repo(): Repository<WorkScheduleShift> {
    return AppDataSource.getRepository(WorkScheduleShift);
  }

  async replaceSchedule(doctorId: number, shifts: ShiftData[]): Promise<ShiftData[]> {
    return AppDataSource.transaction(async (em) => {
      // Remove escala anterior
      await em.delete(WorkScheduleShift, { doctorId });

      if (shifts.length === 0) return [];

      const entities = shifts.map((s) =>
        em.create(WorkScheduleShift, {
          doctorId,
          weekDay: s.weekDay,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes,
        }),
      );

      await em.save(WorkScheduleShift, entities);

      return shifts;
    });
  }

  async findByDoctorId(doctorId: number): Promise<ShiftData[]> {
    const shifts = await this.repo.find({ where: { doctorId }, order: { weekDay: 'ASC', startTime: 'ASC' } });
    return shifts.map((s) => ({
      weekDay: s.weekDay,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDurationMinutes: s.slotDurationMinutes,
    }));
  }
}
