const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const mysql = require('mysql2/promise');
const sqlserver = require('mssql');
const parquet = require('parquetjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { kmeans } = require('ml-kmeans');
const { SimpleLinearRegression, ExponentialRegression, PolynomialRegression } = require('ml-regression');
const API_KEY = process.env.LITEBI_API_KEY || 'litebi-dev-key';

const app = express();
app.use(cors());
app.use(express.json());

// Basic API Key Authentication Middleware
app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
  }
  next();
});

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
  console.log("RECEIVED CREDENTIALS:", credentials);
  
  if (!['postgres', 'mysql', 'sqlserver', 'salesforce', 'google-analytics'].includes(type)) {
    return res.status(400).json({ error: 'Unsupported database type' });
  }

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid or missing SQL query' });
  }
  
  // Basic query sanitization (prevent destructive actions if needed, though usually read-only credentials should be used)
  const upperQuery = query.toUpperCase();
  if (upperQuery.includes('DROP TABLE') || upperQuery.includes('TRUNCATE') || upperQuery.includes('DELETE FROM')) {
    return res.status(403).json({ error: 'Destructive queries are not allowed via this connector' });
  }

  const { host, port, user, password } = credentials;
  const dbName = credentials.database || credentials.db;
  const fileName = `export_${uuidv4()}.parquet`;
  const filePath = path.join(__dirname, fileName);

  try {
    let rows = [];

    // Extract data from Source DB
    if (type === 'postgres') {
      if (!dbName) {
        return res.status(400).json({ error: 'Database name is required for PostgreSQL connection' });
      }
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
    } else if (type === 'sqlserver') {
      const pool = await sqlserver.connect({
        user, password, server: host, database: dbName, port: port ? parseInt(port) : 1433,
        options: { encrypt: true, trustServerCertificate: true }
      });
      const result = await pool.request().query(query);
      rows = result.recordset;
      await pool.close();
    } else if (type === 'salesforce') {
      rows = [
        { id: 1, name: 'Acme Corp', industry: 'Technology', annual_revenue: 1000000 },
        { id: 2, name: 'Globex', industry: 'Manufacturing', annual_revenue: 500000 }
      ];
    } else if (type === 'google-analytics') {
      rows = [
        { date: new Date().toISOString().split('T')[0], sessions: 1500, users: 1200, bounce_rate: 45.2 },
        { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], sessions: 1600, users: 1250, bounce_rate: 44.1 }
      ];
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

app.post('/api/ml/cluster', (req, res) => {
  try {
    const { data, clusterCount } = req.body;
    if (!data || !Array.isArray(data) || !clusterCount) {
      return res.status(400).json({ error: 'Missing data or clusterCount' });
    }
    const k = parseInt(clusterCount, 10);
    const result = kmeans(data, k, { initialization: 'kmeans++' });
    res.json({ clusters: result.clusters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ml/regression', (req, res) => {
  try {
    const { data, type } = req.body;
    if (!data || !Array.isArray(data) || !type) {
      return res.status(400).json({ error: 'Missing data or type' });
    }
    const x = data.map(d => Number(d[0]));
    const y = data.map(d => Number(d[1]));
    
    let reg;
    let formula = '';
    if (type === 'linear') {
      reg = new SimpleLinearRegression(x, y);
      formula = reg.toString();
    } else if (type === 'exponential') {
      reg = new ExponentialRegression(x, y);
      formula = reg.toString();
    } else if (type === 'polynomial') {
      reg = new PolynomialRegression(x, y, 2);
      formula = reg.toString();
    } else {
      return res.status(400).json({ error: 'Unsupported regression type' });
    }
    
    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const step = (maxX - minX) / 100;
    const points = [];
    if (step > 0) {
      for (let i = minX; i <= maxX; i += step) {
        points.push([i, reg.predict(i)]);
      }
      points.push([maxX, reg.predict(maxX)]);
    } else {
      points.push([minX, reg.predict(minX)]);
    }
    
    res.json({ points, formula });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LiteBI Micro-Backend running on port ${PORT}`);
});
