const duckdb = require('@duckdb/duckdb-wasm');
const fs = require('fs');
async function test() {
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), new Worker());
  await db.instantiate(); // Need a worker... Actually duckdb-wasm in node is hard.
}
test();
