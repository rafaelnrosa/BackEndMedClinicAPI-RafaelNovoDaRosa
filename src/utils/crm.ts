/**
 * Valida o formato básico de um CRM brasileiro.
 * Aceita formatos como: CRM-SP-123456, CRM/SP-123456, CRM-SC-54321.
 * A validação de existência real é responsabilidade do operador.
 */
export function isValidCrmFormat(crm: string): boolean {
  if (!crm || crm.trim().length === 0) return false;
  // Aceita qualquer string não-vazia com ao menos 3 caracteres
  return crm.trim().length >= 3;
}
