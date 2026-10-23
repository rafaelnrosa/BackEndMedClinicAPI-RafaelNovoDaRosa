import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../../errors/AppError';
import { IUsersRepository } from '../users/users.repository';

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
}

export class AuthService {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    if (!dto.email || !dto.password) {
      throw new AppError('DADOS_INVALIDOS', 400, 'E-mail e senha são obrigatórios.');
    }

    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError('CREDENCIAIS_INVALIDAS', 401, 'E-mail ou senha incorretos.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError('CREDENCIAIS_INVALIDAS', 401, 'E-mail ou senha incorretos.');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado.');

    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '8h') as string;

    const accessToken = jwt.sign(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
      secret,
      { expiresIn } as jwt.SignOptions,
    );

    return { accessToken };
  }
}
