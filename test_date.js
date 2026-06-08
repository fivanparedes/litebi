import alasql from 'alasql';
alasql.fn.DATE_DIFF = function(unit, date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2 - d1;
  const diffDays = diffTime / (1000 * 60 * 60 * 24); 
  return diffDays;
};
try {
  console.log(alasql("SELECT DATE_DIFF('day', '2023-01-01', '2023-01-10') AS res"));
} catch (e) {
  console.error("ERROR:");
  console.error(e.message);
}
