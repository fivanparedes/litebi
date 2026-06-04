// businessTheme.js
export const businessTheme = {
  color: [
    '#2563EB', // Blue
    '#7C3AED', // Purple
    '#059669', // Emerald
    '#D97706', // Amber
    '#DC2626', // Red
    '#0891B2', // Cyan
    '#4F46E5', // Indigo
    '#65A30D'  // Lime
  ],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  title: {
    textStyle: {
      color: '#1E293B', // slate-800
      fontWeight: 600
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
      borderColor: '#ffffff'
    }
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#E2E8F0',
    textStyle: {
      color: '#334155'
    },
    padding: [8, 12],
    extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 8px;'
  },
  categoryAxis: {
    axisLine: {
      lineStyle: { color: '#CBD5E1' }
    },
    axisTick: {
      lineStyle: { color: '#CBD5E1' }
    },
    axisLabel: {
      color: '#64748B'
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
      color: '#64748B'
    },
    splitLine: {
      lineStyle: {
        color: ['#F1F5F9'],
        type: 'dashed'
      }
    }
  }
}
