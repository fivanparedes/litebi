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
    // Si es choropleth, necesitamos cargar el geojson en MapLibre y colorear los polígonos
    // MapLibre no trae un map-mundo por defecto en GeoJSON como echarts, 
    // Por simplicidad, implementamos la base lógica, pero el usuario debe proveer el GeoJSON en 'custom'
    // O conectar a un vector tile de polígonos.
    console.warn("Choropleth nativo requiere un GeoJSON válido en MapLibre.")
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
  <div class="map-container" ref="mapContainer"></div>
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
