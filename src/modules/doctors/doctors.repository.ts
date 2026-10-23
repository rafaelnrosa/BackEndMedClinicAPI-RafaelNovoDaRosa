import { EntityManager, Like, Repository } from 'typeorm';
import { Doctor } from '../../entities/Doctor.entity';
import { AppDataSource } from '../../config/database';
import { PaginatedResult, FindPatientsOptions } from '../patients/patients.repository';

export interface IDoctorsRepository {
  createWithManager(em: EntityManager, data: { crm: string; userId: number }): Promise<Doctor>;
  findAll(options: FindPatientsOptions): Promise<PaginatedResult<Doctor>>;
  findById(id: number): Promise<Doctor | null>;
  findByUserId(userId: number): Promise<Doctor | null>;
}

export class DoctorsRepository implements IDoctorsRepository {
  private get repo(): Repository<Doctor> {
    return AppDataSource.getRepository(Doctor);
  }

  async createWithManager(em: EntityManager, data: { crm: string; userId: number }): Promise<Doctor> {
    const doctor = em.create(Doctor, { crm: data.crm, userId: data.userId });
    return em.save(Doctor, doctor);
  }

  async findAll(options: FindPatientsOptions): Promise<PaginatedResult<Doctor>> {
    const { name, page, pageSize } = options;

    const qb = this.repo
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user');

    if (name) {
      qb.where('LOWER(user.name) LIKE LOWER(:name)', { name: `%${name}%` });
    }

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
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

  async findById(id: number): Promise<Doctor | null> {
    return this.repo.findOne({ where: { id }, relations: ['user'] });
  }

  async findByUserId(userId: number): Promise<Doctor | null> {
    return this.repo.findOne({ where: { userId }, relations: ['user'] });
  }
}
