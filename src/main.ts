import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from './config/database';
import { createApp } from './app';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('Banco de dados conectado.');

    // Roda migrations automaticamente em produção
    if (process.env.NODE_ENV === 'production') {
      await AppDataSource.runMigrations();
      console.log('Migrations executadas.');
    }

    const app = createApp();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`MedClinic API rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar a aplicação:', error);
    process.exit(1);
  }
}

bootstrap();
