import { AppError } from '../errors/AppError';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const pageRaw = query.page ?? 1;
  const pageSizeRaw = query.pageSize ?? 20;

  const page = parseInt(String(pageRaw), 10);
  const pageSize = parseInt(String(pageSizeRaw), 10);

  if (isNaN(page) || page < 1) {
    throw new AppError('DADOS_INVALIDOS', 400, 'O parâmetro page deve ser um número inteiro positivo.');
  }

  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new AppError('DADOS_INVALIDOS', 400, 'O parâmetro pageSize deve estar entre 1 e 100.');
  }

  return { page, pageSize };
}
