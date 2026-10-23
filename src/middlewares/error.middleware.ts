import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { QueryFailedError } from 'typeorm';

interface PostgresError {
  code?: string;
  detail?: string;
  constraint?: string;
}

function mapUniqueConstraintError(error: QueryFailedError): AppError | null {
  const driverError = error.driverError as PostgresError;

  if (driverError?.code !== '23505') return null;

  const constraint = driverError.constraint ?? '';
  const detail = driverError.detail ?? '';

  if (constraint.includes('email') || detail.includes('email')) {
    return new AppError('EMAIL_JA_CADASTRADO', 409, 'Este e-mail já está em uso.');
  }
  if (constraint.includes('cpf') || detail.includes('cpf')) {
    return new AppError('CPF_JA_CADASTRADO', 409, 'Este CPF já está cadastrado.');
  }
  if (constraint.includes('crm') || detail.includes('crm')) {
    return new AppError('CRM_JA_CADASTRADO', 409, 'Este CRM já está cadastrado.');
  }

  return new AppError('DADOS_INVALIDOS', 409, 'Registro duplicado.');
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // AppError: erro de domínio mapeado
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      error: err.code,
      message: err.message,
    });
    return;
  }

  // QueryFailedError do TypeORM (violação de unicidade)
  if (err instanceof QueryFailedError) {
    const mapped = mapUniqueConstraintError(err);
    if (mapped) {
      res.status(mapped.statusCode).json({
        statusCode: mapped.statusCode,
        error: mapped.code,
        message: mapped.message,
      });
      return;
    }
  }

  // Erro desconhecido — não expõe stack
  const statusCode = 500;
  console.error('[ERRO INTERNO]', err);
  res.status(statusCode).json({
    statusCode,
    error: 'ERRO_INTERNO',
    message: 'Erro interno do servidor.',
  });
}
