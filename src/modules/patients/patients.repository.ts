import { Repository, Like, FindManyOptions } from 'typeorm';
import { Patient } from '../../entities/Patient.entity';
import { AppDataSource } from '../../config/database';

export interface FindPatientsOptions {
  name?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface IPatientsRepository {
  create(data: { name: string; cpf: string }): Promise<Patient>;
  findAll(options: FindPatientsOptions): Promise<PaginatedResult<Patient>>;
  findById(id: number): Promise<Patient | null>;
  update(id: number, data: Partial<{ name: string }>): Promise<Patient | null>;
  softDelete(id: number): Promise<boolean>;
}

export class PatientsRepository implements IPatientsRepository {
  private get repo(): Repository<Patient> {
    return AppDataSource.getRepository(Patient);
  }

  async create(data: { name: string; cpf: string }): Promise<Patient> {
    const patient = this.repo.create(data);
    return this.repo.save(patient);
  }

  async findAll(options: FindPatientsOptions): Promise<PaginatedResult<Patient>> {
    const { name, page, pageSize } = options;

    const where: FindManyOptions<Patient>['where'] = name
      ? { name: Like(`%${name}%`) }
      : {};

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'ASC' },
    });

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

  async findById(id: number): Promise<Patient | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<{ name: string }>): Promise<Patient | null> {
    const patient = await this.findById(id);
    if (!patient) return null;
    Object.assign(patient, data);
    return this.repo.save(patient);
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await this.repo.softDelete(id);
    return (result.affected ?? 0) > 0;
  }
}
