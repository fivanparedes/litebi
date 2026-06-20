<script setup>
import { ref, onMounted, watch, onUnmounted, shallowRef } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  chartData: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['chart-click'])

const mapContainer = ref(null)
const map = shallowRef(null)
let markers = []

const initMap = () => {
  if (map.value) return

  // Usar estilo de mapa base gratuito (CartoDB Positron u OpenStreetMap)
  const mapStyle = {
    version: 8,
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    },
    layers: [
      {
        id: 'osm-tiles-layer',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  }

  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: mapStyle,
    center: [0, 20],
    zoom: 1.5,
    pitchWithRotate: false,
    dragRotate: false
  })

  map.value.addControl(new maplibregl.NavigationControl(), 'top-right')

  map.value.on('load', () => {
    updateData()
  })
}

const clearMarkers = () => {
  markers.forEach(m => m.remove())
  markers = []
}

const updateData = () => {
  if (!map.value || !map.value.isStyleLoaded()) return

  // Limpiar capas previas si existen
  clearMarkers()
  if (map.value.getLayer('heatmap-layer')) map.value.removeLayer('heatmap-layer')
  if (map.value.getLayer('clusters')) map.value.removeLayer('clusters')
  if (map.value.getLayer('cluster-count')) map.value.removeLayer('cluster-count')
  if (map.value.getLayer('unclustered-point')) map.value.removeLayer('unclustered-point')
  if (map.value.getSource('points-data')) map.value.removeSource('points-data')

  const mode = props.config.mapMode || 'scatter'
  
  if (mode === 'scatter') {
    // Modo puntos (Burbujas o Marcadores HTML)
    // chartData tiene estructura: [ { name: lng, value: lat, value2: métrica } ] (Mapeado por ChartRenderer)
    
    // Convertir datos a GeoJSON
    const features = props.chartData.map(d => {
      // Intentamos obtener lat/lng. Si ECharts mandó name y value, hay que ver cómo se mapeó.
      // ECharts Scatter Map envía data como: name=X(Lng), value=Y(Lat), value2=Métrica
      const lng = Number(d.name)
      const lat = Number(d.value)
      const val2 = d.value2 ? Number(d.value2) : 1
      
      return {
        type: 'Feature',
        properties: { value: val2, label: d.name },
        geometry: { type: 'Point', coordinates: [lng, lat] }
      }
    }).filter(f => !isNaN(f.geometry.coordinates[0]) && !isNaN(f.geometry.coordinates[1]))

    const geoJsonData = {
      type: 'FeatureCollection',
      features
    }

    // Usar clustering si hay muchos puntos, o marcadores
    map.value.addSource('points-data', {
      type: 'geojson',
      data: geoJsonData,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    })

    map.value.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'points-data',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6', 100,
          '#f1f075', 750,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, 100,
          30, 750,
          40
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    })

    map.value.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'points-data',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    })

    map.value.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'points-data',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 8,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    })

    // Eventos
    map.value.on('click', 'unclustered-point', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice()
      const val = e.features[0].properties.value
      const label = e.features[0].properties.label
      
      emit('chart-click', { name: label, value: coordinates })
      
      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`<strong>Valor:</strong> ${val}`)
        .addTo(map.value)
    })
    
    // Cursor interactivo
    map.value.on('mouseenter', 'clusters', () => { map.value.getCanvas().style.cursor = 'pointer' })
    map.value.on('mouseleave', 'clusters', () => { map.value.getCanvas().style.cursor = '' })
    map.value.on('mouseenter', 'unclustered-point', () => { map.value.getCanvas().style.cursor = 'pointer' })
    map.value.on('mouseleave', 'unclustered-point', () => { map.value.getCanvas().style.cursor = '' })

  } else if (mode === 'choropleth' || mode === 'custom') {
    // Si es choropleth, cargamos un GeoJSON mundial por defecto y coloreamos los polígonos
    if (!map.value.getSource('world-geojson')) {
      map.value.addSource('world-geojson', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'
      })
    }

    const matchExpression = ['match', ['get', 'name']]
    let hasData = false
    
    // Scale colors based on values (simplified min/max approach)
    let min = Infinity, max = -Infinity
    props.chartData.forEach(row => {
      const val = Number(row.value)
      if (!isNaN(val)) {
        if (val < min) min = val
        if (val > max) max = val
      }
    })
    
    props.chartData.forEach(row => {
      if (row.name) {
        hasData = true
        // Simple color scale from blue-100 to blue-600
        const val = Number(row.value)
        const ratio = (max === min) ? 0.5 : (val - min) / (max - min)
        const color = ratio > 0.8 ? '#2563eb' : ratio > 0.6 ? '#3b82f6' : ratio > 0.4 ? '#60a5fa' : ratio > 0.2 ? '#93c5fd' : '#dbeafe'
        matchExpression.push(row.name, color)
      }
    })
    matchExpression.push('#e2e8f0') // Fallback color

    if (map.value.getLayer('heatmap-layer')) map.value.removeLayer('heatmap-layer')

    map.value.addLayer({
      id: 'heatmap-layer',
      type: 'fill',
      source: 'world-geojson',
      paint: {
        'fill-color': hasData ? matchExpression : '#e2e8f0',
        'fill-opacity': 0.7,
        'fill-outline-color': '#ffffff'
      }
    })
    
    map.value.on('click', 'heatmap-layer', (e) => {
      const prop = e.features[0].properties
      const matchedData = props.chartData.find(d => d.name === prop.name)
      const valStr = matchedData ? `Valor: ${matchedData.value}` : 'Sin datos'
      emit('chart-click', { name: prop.name, value: matchedData ? matchedData.value : null })
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${prop.name}</strong><br/>${valStr}`)
        .addTo(map.value)
    })
    map.value.on('mouseenter', 'heatmap-layer', () => { map.value.getCanvas().style.cursor = 'pointer' })
    map.value.on('mouseleave', 'heatmap-layer', () => { map.value.getCanvas().style.cursor = '' })
  }
}

watch(() => props.chartData, () => {
  updateData()
}, { deep: true })

watch(() => props.config, () => {
  updateData()
}, { deep: true })

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
