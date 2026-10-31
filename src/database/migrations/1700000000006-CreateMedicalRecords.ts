import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMedicalRecords1700000000006 implements MigrationInterface {
  name = 'CreateMedicalRecords1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "medical_records" (
        "id" SERIAL PRIMARY KEY,
        "patient_id" INTEGER NOT NULL,
        "doctor_id" INTEGER NOT NULL,
        "text" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_records_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_records_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_records_patient_id" ON "medical_records" ("patient_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "medical_records"`);
  }
}
