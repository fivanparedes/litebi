import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Logger } from '../../src/utils/Logger'

describe('Logger', () => {
  beforeEach(() => {
    // Clear logs before each test
    Logger.logs = []
    
    // Mock console methods to keep test output clean
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock global alerts
    global.alert = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with empty logs', () => {
    expect(Logger.logs.length).toBe(0)
  })

  it('should log info messages', () => {
    Logger.info('TestContext', 'Test info message', { key: 'value' })
    expect(Logger.logs.length).toBe(1)
    expect(Logger.logs[0].level).toBe('INFO')
    expect(Logger.logs[0].context).toBe('TestContext')
    expect(Logger.logs[0].message).toBe('Test info message')
    expect(Logger.logs[0].details).toContain('value')
    expect(console.log).toHaveBeenCalled()
  })

  it('should log warn messages', () => {
    Logger.warn('TestContext', 'Test warn message')
    expect(Logger.logs.length).toBe(1)
    expect(Logger.logs[0].level).toBe('WARN')
    expect(console.warn).toHaveBeenCalled()
  })

  it('should log error messages', () => {
    Logger.error('TestContext', 'Test error message')
    expect(Logger.logs.length).toBe(1)
    expect(Logger.logs[0].level).toBe('ERROR')
    expect(console.error).toHaveBeenCalled()
  })

  it('should format object details as JSON string', () => {
    const details = { a: 1, b: 'test' }
    Logger.info('Ctx', 'Msg', details)
    expect(Logger.logs[0].details).toBe(JSON.stringify(details))
  })

  it('should respect MAX_LOGS limit by dropping oldest entries', () => {
    for (let i = 0; i < 1005; i++) {
      Logger.info('Ctx', `Msg ${i}`)
    }
    expect(Logger.logs.length).toBe(1000)
    // The first 5 should be dropped, so the first one remaining is Msg 5
    expect(Logger.logs[0].message).toBe('Msg 5')
    expect(Logger.logs[999].message).toBe('Msg 1004')
  })

  it('should clear logs', () => {
    Logger.info('Ctx', 'Msg')
    Logger.clear()
    expect(Logger.logs.length).toBe(0)
  })


  it('should download logs', () => {
    Logger.info('Ctx', 'Msg')
    
    const mockCreateObjectURL = vi.fn()
    const mockRevokeObjectURL = vi.fn()
    
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    
    const mockClick = vi.fn()
    const mockCreateElement = vi.fn().mockReturnValue({ click: mockClick })
    document.createElement = mockCreateElement
    
    Logger.downloadLogs()
    
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockCreateElement).toHaveBeenCalledWith('a')
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
})
