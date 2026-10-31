import { AppError } from '../../errors/AppError';
import { IPatientsRepository, PaginatedResult } from './patients.repository';
import { isValidCpfFormat } from '../../utils/cpf';

export interface CreatePatientDto {
  name: string;
  cpf: string;
}

export interface UpdatePatientDto {
  name?: string;
}

export interface PatientResponseDto {
  id: number;
  name: string;
  cpf: string;
  createdAt: Date;
}

export interface ListPatientsDto {
  name?: string;
  page: number;
  pageSize: number;
}

export class PatientsService {
  constructor(private readonly patientsRepository: IPatientsRepository) {}

  async create(dto: CreatePatientDto): Promise<PatientResponseDto> {
    if (!dto.name || dto.name.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo name é obrigatório.');
    }

    if (!dto.cpf || !isValidCpfFormat(dto.cpf)) {
      throw new AppError('DADOS_INVALIDOS', 400, 'O CPF deve ter exatamente 11 dígitos numéricos.');
    }

    const patient = await this.patientsRepository.create({
      name: dto.name.trim(),
      cpf: dto.cpf,
    });

    return this.toResponse(patient);
  }

  async findAll(dto: ListPatientsDto): Promise<PaginatedResult<PatientResponseDto>> {
    const result = await this.patientsRepository.findAll({
      name: dto.name,
      page: dto.page,
      pageSize: dto.pageSize,
    });

    return {
      data: result.data.map(this.toResponse),
      meta: result.meta,
    };
  }

  async findById(id: number): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.findById(id);
    if (!patient) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Paciente não encontrado.');
    }
    return this.toResponse(patient);
  }

  async update(id: number, dto: UpdatePatientDto): Promise<PatientResponseDto> {
    const patient = await this.patientsRepository.update(id, dto);
    if (!patient) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Paciente não encontrado.');
    }
    return this.toResponse(patient);
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.patientsRepository.softDelete(id);
    if (!deleted) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Paciente não encontrado.');
    }
  }

  private toResponse(patient: {
    id: number;
    name: string;
    cpf: string;
    createdAt: Date;
  }): PatientResponseDto {
    return {
      id: patient.id,
      name: patient.name,
      cpf: patient.cpf,
      createdAt: patient.createdAt,
    };
  }
}
