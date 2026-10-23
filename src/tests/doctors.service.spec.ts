import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoctorsService } from '../modules/doctors/doctors.service';
import { IDoctorsRepository } from '../modules/doctors/doctors.repository';
import { IUsersRepository } from '../modules/users/users.repository';
import { EntityManager } from 'typeorm';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => '$2a$10$hashed'),
    compare: vi.fn(async () => true),
  },
}));

const mockUser = { id: 7, name: 'Dra. Helena', email: 'helena@medclinic.com', roles: ['doctor'], passwordHash: '$hash', createdAt: new Date() };
const mockDoctor = { id: 3, crm: 'CRM-SC-54321', userId: 7, user: mockUser };

vi.mock('../config/database', () => ({
  AppDataSource: {
    transaction: vi.fn(async (cb: (em: EntityManager) => Promise<unknown>) => {
      const fakEm = {} as EntityManager;
      return cb(fakEm);
    }),
  },
}));

const mockDoctorsRepo: IDoctorsRepository = {
  createWithManager: vi.fn(async () => mockDoctor),
  findAll: vi.fn(async () => ({ data: [mockDoctor], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } })),
  findById: vi.fn(async () => mockDoctor),
  findByUserId: vi.fn(async () => mockDoctor),
};

const mockUsersRepo: IUsersRepository = {
  findByEmail: vi.fn(async () => null),
  findById: vi.fn(async () => null),
  create: vi.fn(),
  createWithManager: vi.fn(async () => mockUser),
};

describe('DoctorsService', () => {
  let service: DoctorsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DoctorsService(mockDoctorsRepo, mockUsersRepo);
    (mockDoctorsRepo.createWithManager as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoctor);
    (mockUsersRepo.createWithManager as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoctor);
    (mockDoctorsRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [mockDoctor],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });
  });

  it('cria médico com sucesso (operação atômica RN03)', async () => {
    const result = await service.create({
      name: 'Dra. Helena',
      email: 'helena@medclinic.com',
      password: 'SenhaForte@123',
      crm: 'CRM-SC-54321',
    });

    expect(result.crm).toBe('CRM-SC-54321');
    expect(result.user.roles).toContain('doctor');
  });

  it('name vazio retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: '', email: 'h@test.com', password: '123', crm: 'CRM-SC-1' }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('crm vazio retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: 'Dr', email: 'h@test.com', password: '123', crm: '' }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('email vazio retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: 'Dr', email: '', password: '123', crm: 'CRM-SC-1' }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('password vazio retorna DADOS_INVALIDOS', async () => {
    await expect(
      service.create({ name: 'Dr', email: 'h@test.com', password: '', crm: 'CRM-SC-1' }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('listagem retorna envelope paginado', async () => {
    const result = await service.findAll({ page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('findById retorna médico', async () => {
    const result = await service.findById(3);
    expect(result.crm).toBe('CRM-SC-54321');
  });

  it('findById inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    (mockDoctorsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.findById(99)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
      statusCode: 404,
    });
  });
});
