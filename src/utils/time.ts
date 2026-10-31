/**
 * Converte "HH:MM" para minutos desde meia-noite.
 * Exemplo: "08:30" → 510
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Converte minutos desde meia-noite para "HH:MM".
 * Exemplo: 510 → "08:30"
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Verifica se um horário HH:MM está no formato correto.
 */
export function isValidTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}
