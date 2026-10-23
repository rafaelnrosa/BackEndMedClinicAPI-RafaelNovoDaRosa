import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

export class SeedAdmin1700000007 implements MigrationInterface {
  name = 'SeedAdmin1700000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const name = process.env.ADMIN_NAME ?? 'Administrador';
    const email = process.env.ADMIN_EMAIL ?? 'admin@medclinic.com';
    const password = process.env.ADMIN_PASSWORD ?? 'SenhaForte@123';

    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert: se o admin já existir (rerun de migration), não duplica
    await queryRunner.query(
      `
      INSERT INTO "users" ("name", "email", "password_hash", "roles")
      VALUES ($1, $2, $3, ARRAY['admin']::VARCHAR[])
      ON CONFLICT ("email") DO NOTHING
    `,
      [name, email, passwordHash],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.ADMIN_EMAIL ?? 'admin@medclinic.com';
    await queryRunner.query(`DELETE FROM "users" WHERE "email" = $1`, [email]);
  }
}
