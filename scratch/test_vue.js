import { ref } from 'vue';

const credentials = ref({
  datasetName: '',
  host: 'localhost',
  port: '',
  database: 'ecommerce',
  user: 'admin',
  password: ''
});

console.log(JSON.stringify({ credentials: credentials.value }));
