import bcrypt from 'bcryptjs';
import { AppError } from '../../errors/AppError';
import { IDoctorsRepository } from './doctors.repository';
import { IUsersRepository } from '../users/users.repository';
import { AppDataSource } from '../../config/database';
import { PaginatedResult } from '../patients/patients.repository';

export interface CreateDoctorDto {
  name: string;
  email: string;
  password: string;
  crm: string;
}

export interface DoctorResponseDto {
  id: number;
  crm: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles: string[];
  };
}

export interface ListDoctorsDto {
  name?: string;
  page: number;
  pageSize: number;
}

export class DoctorsService {
  constructor(
    private readonly doctorsRepository: IDoctorsRepository,
    private readonly usersRepository: IUsersRepository,
  ) {}

  async create(dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    if (!dto.name || dto.name.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo name é obrigatório.');
    }
    if (!dto.email || dto.email.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo email é obrigatório.');
    }
    if (!dto.password || dto.password.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo password é obrigatório.');
    }
    if (!dto.crm || dto.crm.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo crm é obrigatório.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Operação atômica: usuário + médico na mesma transação (RN03 / RF03)
    return AppDataSource.transaction(async (em) => {
      const user = await this.usersRepository.createWithManager(em, {
        name: dto.name.trim(),
        email: dto.email.trim(),
        passwordHash,
        roles: ['doctor'],
      });

      const doctor = await this.doctorsRepository.createWithManager(em, {
        crm: dto.crm.trim(),
        userId: user.id,
      });

      return {
        id: doctor.id,
        crm: doctor.crm,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles,
        },
      };
    });
  }

  async findAll(dto: ListDoctorsDto): Promise<PaginatedResult<DoctorResponseDto>> {
    const result = await this.doctorsRepository.findAll({
      name: dto.name,
      page: dto.page,
      pageSize: dto.pageSize,
    });

    return {
      data: result.data.map((d) => this.toResponse(d)),
      meta: result.meta,
    };
  }

  async findById(id: number): Promise<DoctorResponseDto> {
    const doctor = await this.doctorsRepository.findById(id);
    if (!doctor) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Médico não encontrado.');
    }
    return this.toResponse(doctor);
  }

  private toResponse(doctor: {
    id: number;
    crm: string;
    user: { id: number; name: string; email: string; roles: string[] };
  }): DoctorResponseDto {
    return {
      id: doctor.id,
      crm: doctor.crm,
      user: {
        id: doctor.user.id,
        name: doctor.user.name,
        email: doctor.user.email,
        roles: doctor.user.roles,
      },
    };
  }
}
