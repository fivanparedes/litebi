import alasql from 'alasql';
try {
  alasql("CREATE TABLE [ventas_historicas_test] (Cantidad INT, Canal INT)");
  alasql("INSERT INTO [ventas_historicas_test] VALUES (10, 1), (20, 2)");
  
  // Outer table is ventas_historicas_test aliased as ventas_historicas
  // We subquery ventas_historicas_test (in the real app it queries the real dataset)
  // Wait, in testSqlExpression we query the real dataset `FROM [ventas_historicas] b` inside the subquery.
  // We need to make sure the real dataset `[ventas_historicas]` is available. Wait, testSqlExpression runs in the UI thread via `sqlClient.query`. The real dataset might NOT be available if `testSqlExpression` runs in the main thread (sqlClient connects to worker though).
  // Wait, testSqlExpression uses `sqlClient` which is connected to the worker! So `[ventas_historicas]` DOES exist in the worker!
  const sql = "SELECT (SELECT SUM([Cantidad]) FROM [ventas_historicas_test] b WHERE b.[Canal] <= [ventas_historicas].[Canal]) AS _test_result FROM [ventas_historicas_test] AS [ventas_historicas]";
  console.log(alasql(sql));
} catch (e) {
  console.error("ERROR:");
  console.error(e.message);
}
