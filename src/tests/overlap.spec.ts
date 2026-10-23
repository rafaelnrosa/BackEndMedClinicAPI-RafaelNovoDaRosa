import { describe, it, expect } from 'vitest';

/**
 * Verifica sobreposição de períodos.
 * sobrepõe(a, b) ⇔ a.início < b.fim e b.início < a.fim (RN08/RN09)
 */
function periodsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

const d = (iso: string) => new Date(iso);

describe('Sobreposição de períodos (RN08/RN09)', () => {
  // Caso 1: A completamente antes de B — sem sobreposição
  it('A termina antes de B começar → sem sobreposição', () => {
    expect(periodsOverlap(d('2026-10-13T08:00Z'), d('2026-10-13T08:30Z'), d('2026-10-13T09:00Z'), d('2026-10-13T09:30Z'))).toBe(false);
  });

  // Caso 2: A completamente depois de B — sem sobreposição
  it('A começa depois de B terminar → sem sobreposição', () => {
    expect(periodsOverlap(d('2026-10-13T10:00Z'), d('2026-10-13T10:30Z'), d('2026-10-13T08:00Z'), d('2026-10-13T08:30Z'))).toBe(false);
  });

  // Caso 3: Encostados — não conflitam (RN08: comparação estrita)
  it('A termina exatamente quando B começa → encostados, sem sobreposição', () => {
    expect(periodsOverlap(d('2026-10-13T08:00Z'), d('2026-10-13T08:30Z'), d('2026-10-13T08:30Z'), d('2026-10-13T09:00Z'))).toBe(false);
  });

  // Caso 4: A dentro de B — sobrepõe
  it('A está completamente dentro de B → sobreposição', () => {
    expect(periodsOverlap(d('2026-10-13T08:10Z'), d('2026-10-13T08:20Z'), d('2026-10-13T08:00Z'), d('2026-10-13T08:30Z'))).toBe(true);
  });

  // Caso 5: A cruza a borda de B — sobrepõe
  it('A começa dentro de B e termina depois → sobreposição', () => {
    expect(periodsOverlap(d('2026-10-13T08:20Z'), d('2026-10-13T08:50Z'), d('2026-10-13T08:00Z'), d('2026-10-13T08:30Z'))).toBe(true);
  });
});
