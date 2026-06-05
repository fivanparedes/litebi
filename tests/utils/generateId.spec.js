import { describe, it, expect, vi } from 'vitest'
import { generateId } from '../../src/utils/generateId'

describe('generateId utility', () => {
  it('generates an id starting with the provided prefix', () => {
    const id = generateId('test')
    expect(id.startsWith('test_')).toBe(true)
  })

  it('generates a fallback prefix if none is provided', () => {
    const id = generateId()
    expect(id.startsWith('id_')).toBe(true)
  })

  it('generates unique ids', () => {
    const id1 = generateId('test')
    const id2 = generateId('test')
    expect(id1).not.toBe(id2)
  })

  it('works with crypto.randomUUID', () => {
    const mockUUID = '12345678-1234-1234-1234-1234567890ab'
    const cryptoSpy = vi.spyOn(global.crypto, 'randomUUID').mockReturnValue(mockUUID)
    
    const id = generateId('test')
    expect(id).toBe('test_12345678')
    
    cryptoSpy.mockRestore()
  })

  it('falls back to Math.random if crypto is not available', () => {
    // Hide crypto
    const originalCrypto = global.crypto
    Object.defineProperty(global, 'crypto', { value: undefined, configurable: true })
    
    const id = generateId('test')
    expect(id).toMatch(/^test_[a-z0-9]+$/)
    
    // Restore
    Object.defineProperty(global, 'crypto', { value: originalCrypto, configurable: true })
  })
})
