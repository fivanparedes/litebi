const { Client } = require('pg');

async function test() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'ecommerce',
    user: 'admin',
    password: 'password123'
  });
  
  try {
    await client.connect();
    console.log("Connected successfully");
    await client.end();
  } catch (err) {
    console.error("Connection error:", err);
  }
}

test();
