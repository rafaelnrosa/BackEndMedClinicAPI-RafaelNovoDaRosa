import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../modules/auth/auth.service';
import { IUsersRepository } from '../modules/users/users.repository';

// Mock do bcryptjs para não depender de computação real nos testes
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(async () => 'hashed'),
  },
}));

// Mock do jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mocked.jwt.token'),
  },
}));

import bcrypt from 'bcryptjs';

const mockUsersRepo: IUsersRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  createWithManager: vi.fn(),
};

const validUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@medclinic.com',
  passwordHash: '$2a$10$hashedpassword',
  roles: ['admin'] as ['admin'],
  createdAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '8h';
    service = new AuthService(mockUsersRepo);
  });

  describe('Login com credencial correta', () => {
    it('retorna accessToken quando e-mail e senha estão corretos', async () => {
      (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(validUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await service.login({
        email: 'admin@medclinic.com',
        password: 'SenhaForte@123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('mocked.jwt.token');
    });

    it('a senha é comparada pelo hash (bcrypt.compare chamado)', async () => {
      (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(validUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await service.login({ email: 'admin@medclinic.com', password: 'SenhaForte@123' });

      expect(bcrypt.compare).toHaveBeenCalledWith('SenhaForte@123', validUser.passwordHash);
    });
  });

  describe('Login com credencial inválida', () => {
    it('e-mail inexistente retorna CREDENCIAIS_INVALIDAS (não informa qual campo)', async () => {
      (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.login({ email: 'inexistente@medclinic.com', password: 'qualquer' }),
      ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS', statusCode: 401 });
    });

    it('senha errada retorna CREDENCIAIS_INVALIDAS (mesma mensagem)', async () => {
      (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(validUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@medclinic.com', password: 'senhaErrada' }),
      ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS', statusCode: 401 });
    });

    it('a mensagem de erro não revela se foi o e-mail ou a senha', async () => {
      (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      let msgEmailInexistente = '';
      try {
        await service.login({ email: 'nao@existe.com', password: 'abc' });
      } catch (e: unknown) {
        if (e instanceof Error) msgEmailInexistente = e.message;
      }

      (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(validUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      let msgSenhaErrada = '';
      try {
        await service.login({ email: 'admin@medclinic.com', password: 'senhaErrada' });
      } catch (e: unknown) {
        if (e instanceof Error) msgSenhaErrada = e.message;
      }

      expect(msgEmailInexistente).toBe(msgSenhaErrada);
    });
  });
});
