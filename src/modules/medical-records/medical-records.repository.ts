import { Repository } from 'typeorm';
import { MedicalRecord } from '../../entities/MedicalRecord.entity';
import { AppDataSource } from '../../config/database';
import { PaginatedResult } from '../patients/patients.repository';
import { Appointment } from '../../entities/Appointment.entity';

export interface IMedicalRecordsRepository {
  create(data: { patientId: number; doctorId: number; text: string }): Promise<MedicalRecord>;
  findByPatient(patientId: number, page: number, pageSize: number): Promise<PaginatedResult<MedicalRecord>>;
  hasVinculo(doctorId: number, patientId: number): Promise<boolean>;
}

export class MedicalRecordsRepository implements IMedicalRecordsRepository {
  private get repo(): Repository<MedicalRecord> {
    return AppDataSource.getRepository(MedicalRecord);
  }

  private get appointmentsRepo(): Repository<Appointment> {
    return AppDataSource.getRepository(Appointment);
  }

  async create(data: { patientId: number; doctorId: number; text: string }): Promise<MedicalRecord> {
    const record = this.repo.create(data);
    return this.repo.save(record);
  }

  async findByPatient(
    patientId: number,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<MedicalRecord>> {
    const [data, total] = await this.repo.findAndCount({
      where: { patientId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Vínculo: existe ao menos uma consulta entre médico e paciente
   * com status in_progress ou done (RN14).
   */
  async hasVinculo(doctorId: number, patientId: number): Promise<boolean> {
    const count = await this.appointmentsRepo
      .createQueryBuilder('a')
      .where('a.doctor_id = :doctorId', { doctorId })
      .andWhere('a.patient_id = :patientId', { patientId })
      .andWhere("a.status IN ('in_progress', 'done')")
      .getCount();

    return count > 0;
  }
}
