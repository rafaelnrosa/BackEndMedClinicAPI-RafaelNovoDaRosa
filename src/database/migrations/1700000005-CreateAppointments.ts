import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointments1700000005 implements MigrationInterface {
  name = 'CreateAppointments1700000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" SERIAL PRIMARY KEY,
        "doctor_id" INTEGER NOT NULL,
        "patient_id" INTEGER NOT NULL,
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled'
          CHECK ("status" IN ('scheduled', 'in_progress', 'done', 'cancelled')),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_appointments_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_appointments_patient_id" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_doctor_id" ON "appointments" ("doctor_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_patient_id" ON "appointments" ("patient_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_appointments_starts_at" ON "appointments" ("starts_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "appointments"`);
  }
}
