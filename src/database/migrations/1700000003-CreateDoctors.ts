import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDoctors1700000003 implements MigrationInterface {
  name = 'CreateDoctors1700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "doctors" (
        "id" SERIAL PRIMARY KEY,
        "crm" VARCHAR(50) NOT NULL,
        "user_id" INTEGER NOT NULL,
        CONSTRAINT "UQ_doctors_crm" UNIQUE ("crm"),
        CONSTRAINT "UQ_doctors_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_doctors_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "doctors"`);
  }
}
