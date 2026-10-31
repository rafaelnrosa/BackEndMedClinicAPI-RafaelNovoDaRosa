/**
 * Verifica sobreposição estrita de dois períodos.
 * Períodos encostados (aEnd === bStart) NÃO se sobrepõem (RN08/RN09).
 *
 * sobrepõe(a, b) ⇔ a.start < b.end && b.start < a.end
 */
export function periodsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
