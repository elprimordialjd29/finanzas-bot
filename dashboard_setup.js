let SS_ID = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";

function setupDashboard() {
  let ss = SpreadsheetApp.openById(SS_ID);
  crearEstructura(ss);
  actualizarDashboard();
  crearTrigger();
}

// ── Leer datos de Hoja 1 ─────────────────────────────────────────────
function getDatos() {
  let ss = SpreadsheetApp.openById(SS_ID);
  let sh = ss.getSheetByName("Hoja 1");
  if (!sh) return [];
  let rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return [];
  let headers = rows[0];
  return rows.slice(1).map(r => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  }).filter(r => r["Fecha"] !== "");
}

function getMes(r) {
  let f = r["Fecha"];
  if (f instanceof Date) {
    return String(f.getMonth() + 1).padStart(2,"0") + "/" + f.getFullYear();
  }
  let p = (f || "").toString().split("/");
  return p.length === 3 ? p[1] + "/" + p[2] : "";
}

function formatHora(val) {
  if (val instanceof Date) {
    return String(val.getHours()).padStart(2,"0") + ":" + String(val.getMinutes()).padStart(2,"0");
  }
  return val ? val.toString() : "";
}

function mesActual() {
  let now = new Date();
  return String(now.getMonth() + 1).padStart(2,"0") + "/" + now.getFullYear();
}

function parseMonto(val) {
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/[$\.,]/g, "")) || 0;
}

// ── Actualizar valores ───────────────────────────────────────────────
function actualizarDashboard() {
  let ss  = SpreadsheetApp.openById(SS_ID);
  let mes = mesActual();
  let datos = getDatos();
  let delMes = datos.filter(r => getMes(r) === mes);

  let ingresos = delMes.filter(r => r["Tipo"] === "INGRESO").reduce((s, r) => s + parseMonto(r["Monto"]), 0);
  let gastos   = delMes.filter(r => r["Tipo"] === "GASTO").reduce((s, r)   => s + parseMonto(r["Monto"]), 0);
  let balance  = ingresos - gastos;
  let pct      = ingresos > 0 ? (gastos / ingresos) : 0;

  // ── Dashboard KPIs
  let dash = ss.getSheetByName("Dashboard");
  if (dash) {
    dash.getRange("C4").setValue(ingresos);
    dash.getRange("D4").setValue(gastos);
    dash.getRange("E4").setValue(balance);
    dash.getRange("F4").setValue(pct);

    // Últimos movimientos
    let ultimos = datos.slice(-10).reverse();
    for (let i = 0; i < 10; i++) {
      let row = 9 + i;
      let r   = ultimos[i];
      dash.getRange(`B${row}`).setValue(r ? r["Fecha"]        : "");
      dash.getRange(`C${row}`).setValue(r ? formatHora(r["Hora"]) : "");
      dash.getRange(`D${row}`).setValue(r ? r["Tipo"]         : "");
      dash.getRange(`E${row}`).setValue(r ? parseMonto(r["Monto"]) : "");
      dash.getRange(`F${row}`).setValue(r ? r["Descripcion"]  : "");
    }

    // Fecha actualización
    dash.getRange("B20").setValue("Actualizado: " + new Date().toLocaleString());
  }

  // ── Por Mes
  let porMes = ss.getSheetByName("Por Mes");
  if (porMes) {
    let meses = [...new Set(datos.map(r => getMes(r)).filter(m => m))].sort();
    meses.forEach((m, i) => {
      let row = i + 3;
      let ing = datos.filter(r => getMes(r) === m && r["Tipo"] === "INGRESO").reduce((s, r) => s + parseMonto(r["Monto"]), 0);
      let gas = datos.filter(r => getMes(r) === m && r["Tipo"] === "GASTO").reduce((s, r)   => s + parseMonto(r["Monto"]), 0);
      porMes.getRange(`B${row}`).setValue(m);
      porMes.getRange(`C${row}`).setValue(ing);
      porMes.getRange(`D${row}`).setValue(gas);
      porMes.getRange(`E${row}`).setValue(ing - gas);
    });
  }

  // ── Estadísticas por categoría
  let est = ss.getSheetByName("Estadisticas");
  if (est) {
    let cats = {};
    datos.filter(r => r["Tipo"] === "GASTO").forEach(r => {
      let cat = r["Descripcion"] || "Varios";
      cats[cat] = (cats[cat] || 0) + parseMonto(r["Monto"]);
    });
    let sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([cat, total], i) => {
      est.getRange(`B${i + 3}`).setValue(cat);
      est.getRange(`C${i + 3}`).setValue(total);
    });
  }

  SpreadsheetApp.flush();
}

// ── Crear estructura visual ──────────────────────────────────────────
function crearEstructura(ss) {
  ["Dashboard","Por Mes","Estadisticas"].forEach(n => {
    let s = ss.getSheetByName(n);
    if (s) ss.deleteSheet(s);
  });

  let AZUL = "#1A5276"; let VERDE = "#1E8449"; let ROJO = "#C0392B";
  let NARANJA = "#7D6808"; let BLANCO = "#FFFFFF"; let GRIS = "#F2F3F4";

  // ── Dashboard
  let dash = ss.insertSheet("Dashboard", 0);
  dash.setColumnWidths(1, 7, 10);
  [2,3,4,5,6].forEach((c, i) => dash.setColumnWidth(c, [180,160,160,160,160][i]));

  dash.setRowHeight(1, 55);
  let t = dash.getRange("B1:F1");
  t.merge(); t.setValue("FINANZAS JESUS VANEGAS");
  t.setBackground(AZUL).setFontColor(BLANCO).setFontSize(16).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

  dash.setRowHeight(2, 8);
  let labels = [["C","INGRESOS DEL MES",VERDE],["D","GASTOS DEL MES",ROJO],["E","BALANCE",AZUL],["F","% GASTADO",NARANJA]];
  labels.forEach(([col, lbl, color]) => {
    dash.setRowHeight(3, 22); dash.setRowHeight(4, 55); dash.setRowHeight(5, 8);
    dash.getRange(`${col}3`).setValue(lbl).setBackground(color).setFontColor(BLANCO).setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center");
    let v = dash.getRange(`${col}4`);
    v.setBackground(color).setFontColor(BLANCO).setFontSize(20).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
    v.setNumberFormat(col === "F" ? "0.0%" : '$#,##0');
  });

  dash.setRowHeight(6, 8);
  let mh = dash.getRange("B7:F7");
  mh.merge(); mh.setValue("ULTIMOS MOVIMIENTOS");
  mh.setBackground("#2C3E50").setFontColor(BLANCO).setFontSize(11).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  dash.setRowHeight(7, 32);

  ["Fecha","Hora","Tipo","Monto","Descripcion"].forEach((h, i) => {
    dash.getRange(8, i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold").setHorizontalAlignment("center").setFontSize(9);
  });
  dash.setRowHeight(8, 22);

  for (let i = 0; i < 10; i++) {
    let row = 9 + i;
    dash.setRowHeight(row, 24);
    dash.getRange(`B${row}:F${row}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
    dash.getRange(`E${row}`).setNumberFormat('$#,##0');
  }

  // ── Por Mes
  let pm = ss.insertSheet("Por Mes", 1);
  pm.setColumnWidths(1, 6, 10);
  [2,3,4,5].forEach((c, i) => pm.setColumnWidth(c, [150,140,140,140][i]));
  let pt = pm.getRange("B1:E1");
  pt.merge(); pt.setValue("RESUMEN POR MES");
  pt.setBackground(AZUL).setFontColor(BLANCO).setFontSize(13).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  pm.setRowHeight(1, 42);
  ["Mes","Ingresos","Gastos","Balance"].forEach((h,i) => {
    pm.getRange(2,i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold").setHorizontalAlignment("center");
  });
  pm.setRowHeight(2, 26);
  for (let i = 3; i <= 26; i++) {
    pm.setRowHeight(i, 26);
    pm.getRange(`B${i}:E${i}`).setBackground(i%2===0 ? GRIS : BLANCO);
    pm.getRange(`C${i}`).setNumberFormat('$#,##0');
    pm.getRange(`D${i}`).setNumberFormat('$#,##0');
    pm.getRange(`E${i}`).setNumberFormat('$#,##0');
  }

  // Gráfica por mes
  let chart = pm.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(pm.getRange("B2:D14")).setPosition(3,7,0,0)
    .setOption("title","Ingresos vs Gastos").setOption("width",500).setOption("height",300)
    .setOption("colors",["#1E8449","#C0392B"]).build();
  pm.insertChart(chart);

  // ── Estadísticas
  let est = ss.insertSheet("Estadisticas", 2);
  est.setColumnWidths(1,4,10);
  est.setColumnWidth(2,220); est.setColumnWidth(3,160);
  let et = est.getRange("B1:C1");
  et.merge(); et.setValue("GASTOS POR CATEGORIA");
  et.setBackground(AZUL).setFontColor(BLANCO).setFontSize(13).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  est.setRowHeight(1,42);
  ["Categoria","Total"].forEach((h,i) => est.getRange(2,i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold").setHorizontalAlignment("center"));
  est.setRowHeight(2,24);
  for (let i=3;i<=32;i++) { est.setRowHeight(i,24); est.getRange(`B${i}:C${i}`).setBackground(i%2===0?GRIS:BLANCO); est.getRange(`C${i}`).setNumberFormat('$#,##0'); }

  // Gráfica pastel
  let pie = est.newChart().setChartType(Charts.ChartType.PIE)
    .addRange(est.getRange("B2:C32")).setPosition(3,5,0,0)
    .setOption("title","Distribucion de Gastos").setOption("width",460).setOption("height",360).build();
  est.insertChart(pie);
}

// ── Trigger diario ───────────────────────────────────────────────────
function crearTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("actualizarDashboard").timeBased().everyDays(1).atHour(7).create();
}
