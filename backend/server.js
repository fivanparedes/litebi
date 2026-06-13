const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const mysql = require('mysql2/promise');
const parquet = require('parquetjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to infer Parquet schema from a sample row
const inferParquetSchema = (row) => {
  const schema = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'number') {
      schema[key] = { type: Number.isInteger(value) ? 'INT64' : 'DOUBLE', optional: true };
    } else if (typeof value === 'boolean') {
      schema[key] = { type: 'BOOLEAN', optional: true };
    } else if (value instanceof Date) {
      schema[key] = { type: 'TIMESTAMP_MILLIS', optional: true };
    } else {
      schema[key] = { type: 'UTF8', optional: true };
    }
  }
  return new parquet.ParquetSchema(schema);
};

app.post('/api/query', async (req, res) => {
  const { type, credentials, query } = req.body;
  
  if (!['postgres', 'mysql'].includes(type)) {
    return res.status(400).json({ error: 'Unsupported database type' });
  }

  const { host, port, user, password, db: dbName } = credentials;
  const fileName = `export_${uuidv4()}.parquet`;
  const filePath = path.join(__dirname, fileName);

  try {
    let rows = [];

    // Extract data from Source DB
    if (type === 'postgres') {
      const client = new Client({
        host, port: port || 5432, database: dbName, user, password
      });
      await client.connect();
      const result = await client.query(query);
      rows = result.rows;
      await client.end();
    } else if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host, port: port || 3306, database: dbName, user, password
      });
      const [resultRows] = await connection.execute(query);
      rows = resultRows;
      await connection.end();
    }

    if (rows.length === 0) {
      return res.status(200).json({ message: 'No rows returned', empty: true });
    }

    // Export to Parquet
    const pSchema = inferParquetSchema(rows[0]);
    const writer = await parquet.ParquetWriter.openFile(pSchema, filePath);
    
    for (const row of rows) {
      // Stringify objects/nulls to avoid parquetjs crashes
      const safeRow = {};
      for (const [k, v] of Object.entries(row)) {
        safeRow[k] = v === null ? undefined : (typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);
      }
      await writer.appendRow(safeRow);
    }
    
    await writer.close();

    // Stream to client
    res.setHeader('Content-Type', 'application/vnd.apache.parquet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      fs.unlink(filePath, () => {});
    });

  } catch (err) {
    console.error("Backend Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LiteBI Micro-Backend running on port ${PORT}`);
});
