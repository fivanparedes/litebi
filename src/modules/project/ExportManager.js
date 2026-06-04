import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const prepareForExport = async (element) => {
  element.classList.add('is-exporting')
  // Pequeño delay para asegurar que los estilos apliquen (opcional pero seguro)
  await new Promise(r => setTimeout(r, 100))
}

const cleanupAfterExport = (element) => {
  element.classList.remove('is-exporting')
}

export const exportToPNG = async (elementId, filename = 'dashboard') => {
  const element = document.getElementById(elementId)
  if (!element) throw new Error("Canvas element not found")
  
  await prepareForExport(element)
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Retained quality
      useCORS: true,
      backgroundColor: '#F8FAFC' // bg-primary de business theme
    })
    
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } finally {
    cleanupAfterExport(element)
  }
}

export const exportToPDF = async (elementId, filename = 'dashboard') => {
  const container = document.getElementById(elementId)
  if (!container) throw new Error("Container element not found")

  await prepareForExport(container)

  try {
    const pages = container.querySelectorAll('.report-page-wrapper')
    
    if (pages.length > 0) {
      // It's a multi-page report
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage()
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        // A4 dimension mapping
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      }
      pdf.save(`${filename}.pdf`)
    } else {
      // It's a single dashboard
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F8FAFC'
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height)
      pdf.save(`${filename}.pdf`)
    }
  } finally {
    cleanupAfterExport(container)
  }
}

import PptxGenJS from 'pptxgenjs'
import { getInstanceByDom, init } from 'echarts/core'

export const exportToPPTX = async (elementId, title = 'Dashboard Report', filename = 'dashboard') => {
  const element = document.getElementById(elementId)
  if (!element) throw new Error("Canvas element not found")

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  
  await prepareForExport(element)
  
  try {
    const widgets = element.querySelectorAll('.grid-stack-item-content')
    
    let slide = pptx.addSlide()
    slide.addText(title, { x: 1, y: 2, w: '80%', fontSize: 36, bold: true, align: 'center', color: '363636' })
    
    for (const widget of widgets) {
      if (widget.querySelector('.slicer-wrapper')) continue // No exportar segmentadores
      
      const headerTitle = widget.querySelector('.widget-title')?.textContent || 'Visualización'
      const echartWrapper = widget.querySelector('.echart-instance')
      let imgData = null
      
      if (echartWrapper) {
        // Re-renderizado de alta calidad específico para PowerPoint
        const instance = getInstanceByDom(echartWrapper)
        if (instance) {
          const option = instance.getOption()
          // Desactivar animaciones para la captura estática
          option.animation = false
          
          const hiddenDiv = document.createElement('div')
          hiddenDiv.style.width = '960px'
          hiddenDiv.style.height = '480px' // Proporción ideal para 16:9 dejando espacio para título
          hiddenDiv.style.position = 'absolute'
          hiddenDiv.style.top = '-9999px'
          document.body.appendChild(hiddenDiv)
          
          try {
            // Re-renderizar usando el mismo tema
            const hiddenChart = init(hiddenDiv, 'business')
            hiddenChart.setOption(option)
            // Pequeño delay para asegurar renderizado completo
            await new Promise(r => setTimeout(r, 100))
            imgData = hiddenChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#FFFFFF' })
            hiddenChart.dispose()
          } catch (e) {
            console.error("Error re-rendering chart for PPTX:", e)
          } finally {
            document.body.removeChild(hiddenDiv)
          }
        }
      }
      
      // Fallback para KPIs u otros elementos no-echarts
      if (!imgData) {
        const canvas = await html2canvas(widget, { scale: 3, useCORS: true, backgroundColor: '#FFFFFF' })
        imgData = canvas.toDataURL('image/png')
      }
      
      let wSlide = pptx.addSlide()
      wSlide.addText(headerTitle, { x: '5%', y: '5%', w: '90%', fontSize: 24, bold: true, color: '363636' })
      wSlide.addImage({ data: imgData, x: '5%', y: '15%', w: '90%', h: '80%', sizing: { type: 'contain' } })
    }
    
    await pptx.writeFile({ fileName: `${filename}.pptx` })
  } finally {
    cleanupAfterExport(element)
  }
}
