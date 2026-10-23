import { AppError } from '../../errors/AppError';
import { IMedicalRecordsRepository } from './medical-records.repository';
import { IPatientsRepository } from '../patients/patients.repository';
import { IDoctorsRepository } from '../doctors/doctors.repository';
import { UserRole } from '../../entities/User.entity';
import { PaginatedResult } from '../patients/patients.repository';

export interface CreateMedicalRecordDto {
  text: string;
}

export interface MedicalRecordResponseDto {
  id: number;
  patientId: number;
  doctorId: number;
  text: string;
  createdAt: Date;
}

export class MedicalRecordsService {
  constructor(
    private readonly medicalRecordsRepository: IMedicalRecordsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly doctorsRepository: IDoctorsRepository,
  ) {}

  async create(
    patientId: number,
    dto: CreateMedicalRecordDto,
    currentUserId: number,
    currentUserRoles: UserRole[],
  ): Promise<MedicalRecordResponseDto> {
    // Só médico pode escrever (RN14)
    if (!currentUserRoles.includes('doctor') || currentUserRoles.includes('admin')) {
      throw new AppError('ACESSO_NEGADO', 403, 'Apenas médicos podem registrar no prontuário.');
    }

    if (!dto.text || dto.text.trim() === '') {
      throw new AppError('DADOS_INVALIDOS', 400, 'O campo text é obrigatório.');
    }

    // Valida existência do paciente
    const patient = await this.patientsRepository.findById(patientId);
    if (!patient) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Paciente não encontrado.');
    }

    // Resolve o médico autenticado
    const doctor = await this.doctorsRepository.findByUserId(currentUserId);
    if (!doctor) {
      throw new AppError('ACESSO_NEGADO', 403, 'Usuário autenticado não é um médico registrado.');
    }

    // Verifica vínculo (RN14)
    const hasVinculo = await this.medicalRecordsRepository.hasVinculo(doctor.id, patientId);
    if (!hasVinculo) {
      throw new AppError(
        'ACESSO_NEGADO',
        403,
        'Médico não tem vínculo com este paciente (nenhuma consulta em andamento ou concluída).',
      );
    }

    const record = await this.medicalRecordsRepository.create({
      patientId,
      doctorId: doctor.id,
      text: dto.text.trim(),
    });

    return this.toResponse(record);
  }

  async findByPatient(
    patientId: number,
    page: number,
    pageSize: number,
    currentUserId: number,
    currentUserRoles: UserRole[],
  ): Promise<PaginatedResult<MedicalRecordResponseDto>> {
    // Secretary não pode ler (RN14)
    if (currentUserRoles.includes('secretary') && !currentUserRoles.includes('admin') && !currentUserRoles.includes('doctor')) {
      throw new AppError('ACESSO_NEGADO', 403, 'Secretária não tem acesso ao prontuário.');
    }

    // Valida existência do paciente
    const patient = await this.patientsRepository.findById(patientId);
    if (!patient) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 404, 'Paciente não encontrado.');
    }

    // Admin pode ler sem vínculo; doctor precisa de vínculo
    if (currentUserRoles.includes('doctor') && !currentUserRoles.includes('admin')) {
      const doctor = await this.doctorsRepository.findByUserId(currentUserId);
      if (!doctor) {
        throw new AppError('ACESSO_NEGADO', 403, 'Usuário não é um médico registrado.');
      }

      const hasVinculo = await this.medicalRecordsRepository.hasVinculo(doctor.id, patientId);
      if (!hasVinculo) {
        throw new AppError(
          'ACESSO_NEGADO',
          403,
          'Médico não tem vínculo com este paciente.',
        );
      }
    }

    // Secretary puro (sem doctor/admin): bloqueia
    if (
      !currentUserRoles.includes('admin') &&
      !currentUserRoles.includes('doctor')
    ) {
      throw new AppError('ACESSO_NEGADO', 403, 'Acesso negado ao prontuário.');
    }

    const result = await this.medicalRecordsRepository.findByPatient(patientId, page, pageSize);

    return {
      data: result.data.map(this.toResponse),
      meta: result.meta,
    };
  }

  private toResponse(record: {
    id: number;
    patientId: number;
    doctorId: number;
    text: string;
    createdAt: Date;
  }): MedicalRecordResponseDto {
    return {
      id: record.id,
      patientId: record.patientId,
      doctorId: record.doctorId,
      text: record.text,
      createdAt: record.createdAt,
    };
  }
}
