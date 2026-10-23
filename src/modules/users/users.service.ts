import bcrypt from 'bcryptjs';
import { AppError } from '../../errors/AppError';
import { UserRole } from '../../entities/User.entity';
import { IUsersRepository } from './users.repository';

const VALID_ROLES: UserRole[] = ['admin', 'secretary', 'doctor'];

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
}

export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
}

export class UsersService {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    if (!dto.name || dto.name.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo name é obrigatório.');
    }
    if (!dto.email || dto.email.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo email é obrigatório.');
    }
    if (!dto.password || dto.password.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo password é obrigatório.');
    }
    if (!dto.roles || dto.roles.length === 0) {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo roles é obrigatório.');
    }

    const invalidRoles = dto.roles.filter((r) => !VALID_ROLES.includes(r));
    if (invalidRoles.length > 0) {
      throw new AppError('DADOS_INVALIDOS', 400, `Perfil(s) inválido(s): ${invalidRoles.join(', ')}`);
    }

    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new AppError('EMAIL_JA_CADASTRADO', 409, 'Este e-mail já está em uso.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      roles: dto.roles,
    });

    return this.toResponse(user);
  }

  async findMe(userId: number): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Usuário não encontrado.');
    }
    return this.toResponse(user);
  }

  private toResponse(user: {
    id: number;
    name: string;
    email: string;
    roles: UserRole[];
  }): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    };
  }
}
