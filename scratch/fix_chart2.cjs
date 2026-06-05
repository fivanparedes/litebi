const fs = require('fs');

let content = fs.readFileSync('c:\\Users\\admin\\litebi\\src\\modules\\visualization\\ChartRenderer.vue', 'utf8');

// Fix the regex bug in formatLabel
content = content.replace(/name\.replace\(\/\^\[\|\]\$\/g, ''\)/g, "name.replace(/^\\[|\\]$/g, '')");
content = content.replace(/name\.replace\(\/\\^\\\[\|\\\]\\\$\/g, ''\)/g, "name.replace(/^\\[|\\]$/g, '')"); // Just in case it was double escaped

// We want to replace props.config.yAxis with yLabel.value ONLY inside echartOptions = computed(() => { ... })
// It starts at `const echartOptions = computed(() => {` and ends before `</script>`
const startIdx = content.indexOf('const echartOptions = computed(() => {');
const endIdx = content.indexOf('</script>');

if (startIdx !== -1 && endIdx !== -1) {
  let echartOptionsSection = content.substring(startIdx, endIdx);
  
  // Replace only exact matches, and avoid replacing properties that are just `props.config.yAxis` inside an if statement if possible.
  // Actually, replacing all `props.config.yAxis` inside `echartOptions` is safe because `echartOptions` only accesses them to read names.
  echartOptionsSection = echartOptionsSection.split('props.config.yAxis').join('yLabel.value');
  echartOptionsSection = echartOptionsSection.split('props.config.xAxis').join('xLabel.value');
  echartOptionsSection = echartOptionsSection.split('props.config.secondaryYAxis').join('y2Label.value');
  
  content = content.substring(0, startIdx) + echartOptionsSection + content.substring(endIdx);
}

fs.writeFileSync('c:\\Users\\admin\\litebi\\src\\modules\\visualization\\ChartRenderer.vue', content);
console.log('Fixed file');
