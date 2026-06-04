const alasql = require('alasql');
alasql('CREATE TABLE test (Cantidad STRING)');
alasql('INSERT INTO test VALUES ("4"), ("2")');
console.log(alasql('SELECT *, CASE WHEN Cantidad > 3 THEN true ELSE false END AS mayorista FROM test'));

alasql('CREATE TABLE test2 (Cantidad INT)');
alasql('INSERT INTO test2 VALUES (4), (2)');
console.log(alasql('SELECT *, CASE WHEN Cantidad > 3 THEN true ELSE false END AS mayorista FROM test2'));
