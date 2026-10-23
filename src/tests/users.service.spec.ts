import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../modules/users/users.service';
import { IUsersRepository } from '../modules/users/users.repository';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => '$2a$10$hashed'),
    compare: vi.fn(async () => true),
  },
}));

const mockUsersRepo: IUsersRepository = {
  findByEmail: vi.fn(async () => null),
  findById: vi.fn(async () => null),
  create: vi.fn(async (data) => ({ id: 2, ...data, createdAt: new Date() })),
  createWithManager: vi.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(mockUsersRepo);
    (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockUsersRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2,
      name: 'Joana',
      email: 'joana@medclinic.com',
      passwordHash: '$2a$10$hashed',
      roles: ['secretary'],
      createdAt: new Date(),
    });
  });

  it('cria usuário com sucesso', async () => {
    const result = await service.create({
      name: 'Joana',
      email: 'joana@medclinic.com',
      password: 'SenhaForte@123',
      roles: ['secretary'],
    });
    expect(result.email).toBe('joana@medclinic.com');
    expect(result.roles).toContain('secretary');
  });

  it('e-mail duplicado retorna EMAIL_JA_CADASTRADO', async () => {
    (mockUsersRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      email: 'joana@medclinic.com',
      passwordHash: 'hash',
      roles: ['secretary'],
    });

    await expect(
      service.create({ name: 'Joana', email: 'joana@medclinic.com', password: '123', roles: ['secretary'] }),
    ).rejects.toMatchObject({ code: 'EMAIL_JA_CADASTRADO', statusCode: 409 });
  });

  it('role inválida retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: 'Joana', email: 'j@test.com', password: '123', roles: ['superadmin' as never] }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS', statusCode: 400 });
  });

  it('name vazio retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: '', email: 'j@test.com', password: '123', roles: ['secretary'] }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS', statusCode: 400 });
  });

  it('password vazio retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: 'Joana', email: 'j@test.com', password: '', roles: ['secretary'] }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS', statusCode: 400 });
  });

  it('roles vazias retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: 'Joana', email: 'j@test.com', password: '123', roles: [] }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS', statusCode: 400 });
  });

  it('findMe retorna usuário existente', async () => {
    (mockUsersRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@medclinic.com',
      passwordHash: '$2a$10$hash',
      roles: ['admin'],
      createdAt: new Date(),
    });

    const result = await service.findMe(1);
    expect(result.email).toBe('admin@medclinic.com');
  });

  it('findMe com ID inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    (mockUsersRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.findMe(99)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
      statusCode: 404,
    });
  });
});
