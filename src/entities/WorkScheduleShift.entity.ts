import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Doctor } from './Doctor.entity';

@Entity('work_schedule_shifts')
export class WorkScheduleShift {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'doctor_id' })
  doctorId!: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.shifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'week_day', type: 'smallint' })
  weekDay!: number;

  @Column({ name: 'start_time', length: 5 })
  startTime!: string;

  @Column({ name: 'end_time', length: 5 })
  endTime!: string;

  @Column({ name: 'slot_duration_minutes', type: 'int' })
  slotDurationMinutes!: number;
}
