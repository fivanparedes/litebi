import fs from 'fs';
const path = './src/modules/visualization/ChartRenderer.vue';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.startsWith('const chartStrategies = {'));
const endIndex = lines.findIndex(l => l.startsWith('const echartOptions = computed(() => {'));

console.log("Start:", startIndex, "End:", endIndex);

// Extract the content
let content = lines.slice(startIndex, endIndex).join('\n');

// Replace customMapLoaded.value with context.customMapLoaded
content = content.replace(/customMapLoaded\.value/g, 'context.customMapLoaded');
// Replace getMap with context.getMap
content = content.replace(/getMap\(/g, 'context.getMap(');
// Replace forecastData.value with context.forecastData
content = content.replace(/forecastData\.value/g, 'context.forecastData');

// Replace const chartStrategies = { with export const getChartStrategies = (context) => ({
content = content.replace('const chartStrategies = {', 'export const getChartStrategies = (context) => ({\n');
// Replace the matching } of chartStrategies which is before const getDefaultStrategy
// It's line: `  grid: () => null\n}`
content = content.replace(/ {2}grid: \(\) => null\n\}/, '  grid: () => null\n});');

content = content.replace('const getDefaultStrategy = (baseOption, data, props, xAxisData, seriesData, ctype) => {', 'export const getDefaultStrategy = (baseOption, data, props, xAxisData, seriesData, ctype, context) => {');

const header = `import { useSettingsStore } from '@/stores/settingsStore'\n\n`;

fs.writeFileSync('./src/modules/visualization/ChartStrategies.js', header + content);

// Now update ChartRenderer.vue
lines.splice(startIndex, endIndex - startIndex, 
`import { getChartStrategies, getDefaultStrategy } from './ChartStrategies'`,
`// Replaced strategies`
);

fs.writeFileSync('./src/modules/visualization/ChartRenderer.vue.new', lines.join('\n'));

