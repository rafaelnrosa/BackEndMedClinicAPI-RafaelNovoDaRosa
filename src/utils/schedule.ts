import { ShiftData } from '../modules/work-schedule/work-schedule.repository';
import { timeToMinutes } from '../modules/work-schedule/work-schedule.service';

const CLINIC_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna o dia da semana e minutos desde meia-noite para um instante UTC,
 * no fuso horário da clínica.
 */
export function getLocalWeekDayAndMinutes(utcDate: Date): { weekDay: number; minutesSinceMidnight: number } {
  // Formata o instante no fuso da clínica
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minutePart = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const minutesSinceMidnight = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);

  // getDay() no fuso local
  const localDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);

  const weekDay = new Date(localDateStr + 'T00:00:00Z').getUTCDay();

  return { weekDay, minutesSinceMidnight };
}

/**
 * Encontra o turno da escala que contém o horário dado.
 * Verifica as três condições da RN07:
 * 1. cai dentro do turno;
 * 2. está alinhado à grade;
 * 3. a consulta inteira cabe no turno.
 */
export function findMatchingShift(
  shifts: ShiftData[],
  weekDay: number,
  minutesSinceMidnight: number,
): ShiftData | null {
  const shiftsOnDay = shifts.filter((s) => s.weekDay === weekDay);

  for (const shift of shiftsOnDay) {
    const shiftStart = timeToMinutes(shift.startTime);
    const shiftEnd = timeToMinutes(shift.endTime);

    // Condição 1: cai dentro do turno
    if (minutesSinceMidnight < shiftStart || minutesSinceMidnight >= shiftEnd) continue;

    // Condição 2: alinhado à grade
    const minutesFromStart = minutesSinceMidnight - shiftStart;
    if (minutesFromStart % shift.slotDurationMinutes !== 0) continue;

    // Condição 3: a consulta inteira cabe no turno
    if (minutesSinceMidnight + shift.slotDurationMinutes > shiftEnd) continue;

    return shift;
  }

  return null;
}
