/**
 * Formatea importes en centavos a pesos argentinos formateados
 * Ej: 650000 -> "$ 6.500" o "$ 6.500,50"
 */
export function formatearCentavos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '$ 0'
  const pesos = centavos / 100
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: centavos % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(pesos)
}

/**
 * Convierte un valor de input de pesos (string o number) a centavos enteros
 * Ej: "6500" -> 650000, "12.50" -> 1250
 */
export function pesosACentavos(valor: string | number): number {
  if (typeof valor === 'string') {
    const normalizado = valor.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(normalizado)
    return isNaN(n) ? 0 : Math.round(n * 100)
  }
  return Math.round(valor * 100)
}

/**
 * Formatea fechas ISO a formato argentino legible
 * Ej: "2026-10-29T14:30:00Z" -> "29 oct 2026 · 11:30 h"
 */
export function formatearFecha(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    const dia = d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    const hora = d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    return `${dia} · ${hora} h`
  } catch {
    return isoString
  }
}
