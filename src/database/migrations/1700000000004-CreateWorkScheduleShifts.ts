import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkScheduleShifts1700000000004 implements MigrationInterface {
  name = 'CreateWorkScheduleShifts1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "work_schedule_shifts" (
        "id" SERIAL PRIMARY KEY,
        "doctor_id" INTEGER NOT NULL,
        "week_day" SMALLINT NOT NULL CHECK ("week_day" BETWEEN 0 AND 6),
        "start_time" VARCHAR(5) NOT NULL,
        "end_time" VARCHAR(5) NOT NULL,
        "slot_duration_minutes" INTEGER NOT NULL CHECK ("slot_duration_minutes" > 0),
        CONSTRAINT "FK_shifts_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_shifts_doctor_id" ON "work_schedule_shifts" ("doctor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "work_schedule_shifts"`);
  }
}
