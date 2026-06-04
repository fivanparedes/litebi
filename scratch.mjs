import fs from 'fs'
import Papa from 'papaparse'
import alasql from 'alasql'

const csv = fs.readFileSync('./public/sample-data/ventas_ejemplo.csv', 'utf8')
const parsed = Papa.parse(csv, {header:true, dynamicTyping:true}).data

alasql.options.casesensitive = false
alasql('CREATE TABLE ventas_ejemplo')
alasql.tables.ventas_ejemplo.data = parsed

const expression = "CASE WHEN [cantidad] > 3 THEN true ELSE false END"
const columnName = "mayorista"

const res = alasql(`SELECT *, (${expression}) AS [${columnName}] FROM [ventas_ejemplo]`)
console.log(res.slice(0, 5).map(r => r.mayorista))
