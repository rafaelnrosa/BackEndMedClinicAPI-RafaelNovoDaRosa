/**
 * Tipos de status de agendamento que geram vínculo médico-paciente (RN14).
 * Um médico tem vínculo com um paciente quando existe ao menos uma consulta
 * com status 'in_progress' ou 'done' entre os dois.
 */
export const VINCULO_STATUSES = ['in_progress', 'done'] as const;

export type VinculoStatus = (typeof VINCULO_STATUSES)[number];
