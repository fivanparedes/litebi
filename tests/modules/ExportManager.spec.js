import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportToPNG, exportToPDF, exportToPPTX } from '../../src/modules/project/ExportManager'

// Mock dynamic imports
vi.mock('html2canvas', () => {
  return {
    default: vi.fn(() => Promise.resolve({
      toDataURL: () => 'data:image/png;base64,mock',
      width: 100,
      height: 100
    }))
  }
})

vi.mock('jspdf', () => {
  const MockJsPDF = class {
    addPage = vi.fn()
    addImage = vi.fn()
    save = vi.fn()
  }
  return { jsPDF: MockJsPDF }
})

vi.mock('pptxgenjs', () => {
  const MockPPTX = class {
    layout = ''
    addSlide = vi.fn(() => ({ addText: vi.fn(), addImage: vi.fn() }))
    writeFile = () => Promise.resolve()
  }
  return { default: MockPPTX }
})

vi.mock('@/stores/settingsStore', () => {
  return {
    useSettingsStore: () => ({
      companyLogo: 'data:image/png;base64,logo',
      chartPaletteId: 'corporate',
      currentChartColors: ['#ff0000', '#00ff00']
    })
  }
})

vi.mock('echarts/core', () => {
  return {
    getInstanceByDom: vi.fn().mockReturnValue(null),
    init: vi.fn()
  }
})

describe('ExportManager', () => {
  let mockElement

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockElement = document.createElement('div')
    mockElement.id = 'export-container'
    mockElement.classList.add('grid-stack-item-content') // For PPTX test
    document.body.appendChild(mockElement)

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return { click: vi.fn() }
      }
      return originalCreateElement(tagName)
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  describe('exportToPNG', () => {
    it('should throw error if element not found', async () => {
      await expect(exportToPNG('non-existent')).rejects.toThrow('Canvas element not found')
    })

    it('should successfully export element to PNG', async () => {
      // Create a mock anchor to capture click
      const mockAnchor = { click: vi.fn() }
      const createElementSpy = vi.spyOn(document, 'createElement')
      createElementSpy.mockReturnValueOnce(mockAnchor)

      await exportToPNG('export-container', 'test-file')

      expect(mockElement.classList.contains('is-exporting')).toBe(false) // Cleanup should happen
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockAnchor.download).toBe('test-file.png')
      expect(mockAnchor.href).toBe('data:image/png;base64,mock')
      expect(mockAnchor.click).toHaveBeenCalled()
    })
  })

  describe('exportToPDF', () => {
    it('should throw error if container not found', async () => {
      await expect(exportToPDF('non-existent')).rejects.toThrow('Container element not found')
    })

    it('should successfully export single dashboard to PDF', async () => {
      await exportToPDF('export-container', 'test-pdf')
      
      // Since jsPDF is mocked, we verify that the cleanup happens without errors
      expect(mockElement.classList.contains('is-exporting')).toBe(false)
    })

    it('should handle multi-page reports', async () => {
      const page1 = document.createElement('div')
      page1.classList.add('report-page-wrapper')
      const page2 = document.createElement('div')
      page2.classList.add('report-page-wrapper')
      mockElement.appendChild(page1)
      mockElement.appendChild(page2)

      await exportToPDF('export-container', 'test-pdf')
      
      expect(mockElement.classList.contains('is-exporting')).toBe(false)
    })
  })

  describe('exportToPPTX', () => {
    it('should throw error if element not found', async () => {
      await expect(exportToPPTX('non-existent')).rejects.toThrow('Canvas element not found')
    })

    it('should successfully export element to PPTX', async () => {
      await exportToPPTX('export-container', 'Test Title', 'test-pptx')
      
      expect(mockElement.classList.contains('is-exporting')).toBe(false)
    })
  })
})
