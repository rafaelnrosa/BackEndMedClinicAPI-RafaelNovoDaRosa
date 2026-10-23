import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalRecordsService } from '../modules/medical-records/medical-records.service';
import { IMedicalRecordsRepository } from '../modules/medical-records/medical-records.repository';
import { IPatientsRepository } from '../modules/patients/patients.repository';
import { IDoctorsRepository } from '../modules/doctors/doctors.repository';

const mockMedicalRecordsRepo: IMedicalRecordsRepository = {
  create: vi.fn(async (data) => ({
    id: 5,
    ...data,
    createdAt: new Date(),
  })),
  findByPatient: vi.fn(async () => ({
    data: [],
    meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
  })),
  hasVinculo: vi.fn(async () => true),
};

const mockPatientsRepo: IPatientsRepository = {
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(async () => ({ id: 10, name: 'Carlos', cpf: '12345678901', createdAt: new Date() })),
  update: vi.fn(),
  softDelete: vi.fn(),
};

const mockDoctorsRepo: IDoctorsRepository = {
  createWithManager: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByUserId: vi.fn(async () => ({
    id: 3,
    crm: 'CRM-SC-1',
    userId: 7,
    user: { id: 7, name: 'Dr. Helena', email: 'helena@test.com', roles: ['doctor'] },
  })),
};

describe('MedicalRecordsService (RN14)', () => {
  let service: MedicalRecordsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MedicalRecordsService(mockMedicalRecordsRepo, mockPatientsRepo, mockDoctorsRepo);

    (mockMedicalRecordsRepo.hasVinculo as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (mockDoctorsRepo.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 3,
      crm: 'CRM-SC-1',
      userId: 7,
      user: { id: 7, name: 'Dr. Helena', email: 'helena@test.com', roles: ['doctor'] },
    });
    (mockPatientsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      name: 'Carlos',
      cpf: '12345678901',
      createdAt: new Date(),
    });
  });

  describe('Criar prontuário', () => {
    it('médico com vínculo escreve no prontuário com sucesso', async () => {
      const result = await service.create(
        10,
        { text: 'Paciente relata dor lombar.' },
        7, // userId do médico
        ['doctor'],
      );
      expect(result.doctorId).toBe(3);
      expect(result.text).toBe('Paciente relata dor lombar.');
    });

    it('médico sem vínculo recebe ACESSO_NEGADO', async () => {
      (mockMedicalRecordsRepo.hasVinculo as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.create(10, { text: 'Texto.' }, 7, ['doctor']),
      ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
    });

    it('admin não pode escrever no prontuário (ato médico)', async () => {
      await expect(
        service.create(10, { text: 'Texto.' }, 1, ['admin']),
      ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
    });

    it('secretary não pode escrever no prontuário', async () => {
      await expect(
        service.create(10, { text: 'Texto.' }, 2, ['secretary']),
      ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
    });

    it('text vazio retorna DADOS_INVALIDOS', async () => {
      await expect(
        service.create(10, { text: '' }, 7, ['doctor']),
      ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS', statusCode: 400 });
    });

    it('paciente inexistente retorna RECURSO_NAO_ENCONTRADO', async () => {
      (mockPatientsRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.create(99, { text: 'Texto.' }, 7, ['doctor']),
      ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO', statusCode: 404 });
    });
  });

  describe('Ler prontuário', () => {
    it('admin pode ler sem vínculo', async () => {
      await expect(
        service.findByPatient(10, 1, 20, 1, ['admin']),
      ).resolves.toBeDefined();
    });

    it('secretary não pode ler o prontuário', async () => {
      await expect(
        service.findByPatient(10, 1, 20, 2, ['secretary']),
      ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
    });

    it('doctor sem vínculo recebe ACESSO_NEGADO ao ler', async () => {
      (mockMedicalRecordsRepo.hasVinculo as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(
        service.findByPatient(10, 1, 20, 7, ['doctor']),
      ).rejects.toMatchObject({ code: 'ACESSO_NEGADO', statusCode: 403 });
    });
  });
});
