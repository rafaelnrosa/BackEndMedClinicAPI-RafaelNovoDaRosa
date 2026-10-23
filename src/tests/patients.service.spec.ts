import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientsService } from '../modules/patients/patients.service';
import { IPatientsRepository } from '../modules/patients/patients.repository';

const mockPatientsRepo: IPatientsRepository = {
  create: vi.fn(async (data) => ({
    id: 1,
    ...data,
    createdAt: new Date(),
  })),
  findAll: vi.fn(async () => ({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } })),
  findById: vi.fn(async (id) => (id === 1 ? { id: 1, name: 'Carlos', cpf: '12345678901', createdAt: new Date() } : null)),
  update: vi.fn(async (id, data) => ({ id, ...data, cpf: '12345678901', createdAt: new Date() })),
  softDelete: vi.fn(async (id) => id === 1),
};

describe('PatientsService (RN02)', () => {
  let service: PatientsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PatientsService(mockPatientsRepo);
    (mockPatientsRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      name: 'Carlos',
      cpf: '12345678901',
      createdAt: new Date(),
    });
  });

  it('cria paciente com CPF válido', async () => {
    const result = await service.create({ name: 'Carlos', cpf: '12345678901' });
    expect(result.cpf).toBe('12345678901');
  });

  it('CPF com menos de 11 dígitos é rejeitado com DADOS_INVALIDOS', async () => {
    await expect(service.create({ name: 'Carlos', cpf: '1234567890' })).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
      statusCode: 400,
    });
  });

  it('CPF com mais de 11 dígitos é rejeitado', async () => {
    await expect(service.create({ name: 'Carlos', cpf: '123456789012' })).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
    });
  });

  it('CPF com letras é rejeitado', async () => {
    await expect(service.create({ name: 'Carlos', cpf: '1234567890a' })).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
    });
  });

  it('name vazio é rejeitado', async () => {
    await expect(service.create({ name: '', cpf: '12345678901' })).rejects.toMatchObject({
      code: 'DADOS_INVALIDOS',
    });
  });

  it('busca por ID inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    await expect(service.findById(99)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('findAll retorna envelope paginado', async () => {
    (mockPatientsRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 1, name: 'Carlos', cpf: '12345678901', createdAt: new Date() }],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });
    const result = await service.findAll({ page: 1, pageSize: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('update retorna paciente atualizado', async () => {
    (mockPatientsRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      name: 'Carlos Editado',
      cpf: '12345678901',
      createdAt: new Date(),
    });
    const result = await service.update(1, { name: 'Carlos Editado' });
    expect(result.name).toBe('Carlos Editado');
  });

  it('update com ID inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    (mockPatientsRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.update(99, { name: 'X' })).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('remove paciente existente com sucesso', async () => {
    (mockPatientsRepo.softDelete as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    await expect(service.remove(1)).resolves.not.toThrow();
  });

  it('remove paciente inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
    (mockPatientsRepo.softDelete as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    await expect(service.remove(99)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });
});
