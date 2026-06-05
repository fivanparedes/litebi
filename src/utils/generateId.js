/**
 * Genera un identificador único con un prefijo opcional.
 *
 * @param {string} [prefix='id'] - Prefijo para el identificador generado.
 * @returns {string} Identificador único con formato `prefix_xxxxxxxx`.
 *
 * @example
 * generateId('tab')  // → 'tab_a1b2c3d4'
 * generateId('w')    // → 'w_e5f6g7h8'
 * generateId()       // → 'id_9a8b7c6d'
 */
export const generateId = (prefix = 'id') => {
  const unique = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
    : (Date.now().toString(36) + Math.random().toString(36).slice(2, 6))

  return `${prefix}_${unique}`
}
