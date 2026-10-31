/**
 * Valida se uma string é um CPF com exatamente 11 dígitos numéricos.
 * Não valida o dígito verificador (escopo fora do requisito RN02).
 */
export function isValidCpfFormat(cpf: string): boolean {
  return /^\d{11}$/.test(cpf);
}
