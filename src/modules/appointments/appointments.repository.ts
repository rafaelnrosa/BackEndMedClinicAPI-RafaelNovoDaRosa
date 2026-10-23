import { EntityManager, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from '../../entities/Appointment.entity';
import { AppDataSource } from '../../config/database';
import { PaginatedResult } from '../patients/patients.repository';

export interface FindAppointmentsOptions {
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface IAppointmentsRepository {
  createInTransaction(
    em: EntityManager,
    data: {
      doctorId: number;
      patientId: number;
      startsAt: Date;
      endsAt: Date;
    },
  ): Promise<Appointment>;

  findOverlappingForDoctor(
    em: EntityManager,
    doctorId: number,
    startsAt: Date,
    endsAt: Date,
    excludeId?: number,
  ): Promise<Appointment[]>;

  findOverlappingForPatient(
    em: EntityManager,
    patientId: number,
    startsAt: Date,
    endsAt: Date,
    excludeId?: number,
  ): Promise<Appointment[]>;

  lockDoctorRow(em: EntityManager, doctorId: number): Promise<void>;

  findAll(options: FindAppointmentsOptions): Promise<PaginatedResult<Appointment>>;
  findById(id: number): Promise<Appointment | null>;
  updateStatus(id: number, status: AppointmentStatus): Promise<Appointment | null>;

  findActiveByPeriod(
    doctorId: number,
    from: Date,
    to: Date,
  ): Promise<Appointment[]>;
}

export class AppointmentsRepository implements IAppointmentsRepository {
  private get repo(): Repository<Appointment> {
    return AppDataSource.getRepository(Appointment);
  }

  async createInTransaction(
    em: EntityManager,
    data: {
      doctorId: number;
      patientId: number;
      startsAt: Date;
      endsAt: Date;
    },
  ): Promise<Appointment> {
    const appointment = em.create(Appointment, {
      ...data,
      status: 'scheduled',
    });
    return em.save(Appointment, appointment);
  }

  /**
   * Trava a linha do médico para impedir corrida (RN10 / RF07).
   * Deve ser chamado dentro de uma transação ativa.
   */
  async lockDoctorRow(em: EntityManager, doctorId: number): Promise<void> {
    await em.query(
      'SELECT id FROM doctors WHERE id = $1 FOR UPDATE',
      [doctorId],
    );
  }

  async findOverlappingForDoctor(
    em: EntityManager,
    doctorId: number,
    startsAt: Date,
    endsAt: Date,
    excludeId?: number,
  ): Promise<Appointment[]> {
    const qb = em
      .createQueryBuilder(Appointment, 'a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere("a.status != 'cancelled'")
      .andWhere('a.starts_at < :endsAt', { endsAt })
      .andWhere('a.ends_at > :startsAt', { startsAt });

    if (excludeId) {
      qb.andWhere('a.id != :excludeId', { excludeId });
    }

    return qb.getMany();
  }

  async findOverlappingForPatient(
    em: EntityManager,
    patientId: number,
    startsAt: Date,
    endsAt: Date,
    excludeId?: number,
  ): Promise<Appointment[]> {
    const qb = em
      .createQueryBuilder(Appointment, 'a')
      .where('a.patient_id = :patientId', { patientId })
      .andWhere("a.status != 'cancelled'")
      .andWhere('a.starts_at < :endsAt', { endsAt })
      .andWhere('a.ends_at > :startsAt', { startsAt });

    if (excludeId) {
      qb.andWhere('a.id != :excludeId', { excludeId });
    }

    return qb.getMany();
  }

  async findAll(options: FindAppointmentsOptions): Promise<PaginatedResult<Appointment>> {
    const { doctorId, patientId, status, from, to, page, pageSize } = options;

    const qb = this.repo.createQueryBuilder('a');

    if (doctorId !== undefined) {
      qb.andWhere('a.doctor_id = :doctorId', { doctorId });
    }
    if (patientId !== undefined) {
      qb.andWhere('a.patient_id = :patientId', { patientId });
    }
    if (status) {
      qb.andWhere('a.status = :status', { status });
    }
    if (from) {
      qb.andWhere('a.starts_at >= :from', { from });
    }
    if (to) {
      // final do dia
      qb.andWhere('a.starts_at < :to', { to });
    }

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('a.starts_at', 'ASC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: number): Promise<Appointment | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: number, status: AppointmentStatus): Promise<Appointment | null> {
    const appointment = await this.findById(id);
    if (!appointment) return null;
    appointment.status = status;
    return this.repo.save(appointment);
  }

  async findActiveByPeriod(doctorId: number, from: Date, to: Date): Promise<Appointment[]> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere("a.status != 'cancelled'")
      .andWhere('a.starts_at >= :from', { from })
      .andWhere('a.starts_at < :to', { to })
      .orderBy('a.starts_at', 'ASC')
      .getMany();
  }
}
