// businessThemeDark.js
export const businessThemeDark = {
  color: [
    '#3B82F6', // Blue 500
    '#8B5CF6', // Violet 500
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#EF4444', // Red 500
    '#06B6D4', // Cyan 500
    '#6366F1', // Indigo 500
    '#84CC16'  // Lime 500
  ],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  title: {
    textStyle: {
      color: '#F8FAFC', // slate-50
      fontWeight: 600
    }
  },
  legend: {
    textStyle: {
      color: '#94A3B8' // slate-400
    }
  },
  line: {
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    itemStyle: {
      borderWidth: 2
    }
  },
  bar: {
    itemStyle: {
      borderRadius: [4, 4, 0, 0] // Rounded top corners
    }
  },
  pie: {
    itemStyle: {
      borderWidth: 2,
      borderColor: '#1E293B' // slate-800 for dark mode
    }
  },
  tooltip: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)', // slate-800
    borderColor: '#475569', // slate-600
    textStyle: {
      color: '#F8FAFC' // slate-50
    },
    padding: [8, 12],
    extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3); border-radius: 8px;'
  },
  categoryAxis: {
    axisLine: {
      lineStyle: { color: '#475569' } // slate-600
    },
    axisTick: {
      lineStyle: { color: '#475569' }
    },
    axisLabel: {
      color: '#94A3B8' // slate-400
    },
    splitLine: {
      show: false
    }
  },
  valueAxis: {
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#94A3B8' // slate-400
    },
    splitLine: {
      lineStyle: {
        color: ['#334155'], // slate-700
        type: 'dashed'
      }
    }
  }
}
