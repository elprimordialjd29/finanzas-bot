// ════════════════════════════════════════════════════════════════
//  FINANZAS JESUS VANEGAS — Apps Script
//  Ejecutar: setupDashboard()
// ════════════════════════════════════════════════════════════════

let SS_ID      = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";
let HOJA_DATOS = "Movimientos";

// Colores globales
let AZUL    = "#1A5276";
let VERDE   = "#1E8449";
let ROJO    = "#C0392B";
let NARANJA = "#D4880A";
let BLANCO  = "#FFFFFF";
let GRIS    = "#F2F3F4";
let OSCURO  = "#2C3E50";
let CELESTE = "#D6EAF8";

// ── Punto de entrada ──────────────────────────────────────────────────────
function setupDashboard() {
  let ss = SpreadsheetApp.openById(SS_ID);
  setupMovimientos(ss);
  crearEstructura(ss);
  actualizarDashboard();
  crearTrigger();
  SpreadsheetApp.getUi().alert("✅ Dashboard listo. Todo actualizado correctamente.");
}

// ════════════════════════════════════════════════════════════════
//  HOJA MOVIMIENTOS — Formateo y renombrado
// ════════════════════════════════════════════════════════════════
function setupMovimientos(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SS_ID);

  // Renombrar "Hoja 1" si aún existe
  let vieja = ss.getSheetByName("Hoja 1");
  if (vieja) vieja.setName(HOJA_DATOS);

  let sh = ss.getSheetByName(HOJA_DATOS);
  if (!sh) sh = ss.insertSheet(HOJA_DATOS);

  // Encabezados si la hoja está vacía
  if (sh.getLastRow() === 0) {
    sh.appendRow(["Fecha", "Hora", "Tipo", "Monto", "Descripcion", "Mes"]);
  }

  // Estilo encabezado
  sh.setFrozenRows(1);
  sh.getRange("A1:F1")
    .setBackground(AZUL).setFontColor(BLANCO).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontSize(10).setFontFamily("Arial");
  sh.setRowHeight(1, 32);

  // Anchos
  sh.setColumnWidth(1, 110); // Fecha
  sh.setColumnWidth(2, 70);  // Hora
  sh.setColumnWidth(3, 100); // Tipo
  sh.setColumnWidth(4, 120); // Monto
  sh.setColumnWidth(5, 280); // Descripcion
  sh.setColumnWidth(6, 85);  // Mes

  // Ocultar columna G en adelante (estética)
  sh.hideColumns(7, 10);

  // Formato pesos en Monto
  sh.getRange("D2:D2000").setNumberFormat('$#,##0');

  // Alineación de columnas de datos
  sh.getRange("A2:A2000").setHorizontalAlignment("center"); // Fecha
  sh.getRange("B2:B2000").setHorizontalAlignment("center"); // Hora
  sh.getRange("C2:C2000").setHorizontalAlignment("center"); // Tipo
  sh.getRange("D2:D2000").setHorizontalAlignment("right");  // Monto
  sh.getRange("F2:F2000").setHorizontalAlignment("center"); // Mes

  // Formato condicional: INGRESO = verde, GASTO = rojo
  let rIngreso = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C2="INGRESO"')
    .setBackground("#EAFAF1").setFontColor("#1E8449")
    .setRanges([sh.getRange("A2:F2000")]).build();

  let rGasto = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C2="GASTO"')
    .setBackground("#FDEDEC").setFontColor("#C0392B")
    .setRanges([sh.getRange("A2:F2000")]).build();

  sh.setConditionalFormatRules([rIngreso, rGasto]);

  // Bordes encabezado
  sh.getRange("A1:F1").setBorder(
    true, true, true, true, true, true,
    "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID_MEDIUM
  );

  // Nombre en pestaña con emoji
  sh.setTabColor("#1A5276");

  SpreadsheetApp.flush();
}

// ════════════════════════════════════════════════════════════════
//  UTILIDADES
// ════════════════════════════════════════════════════════════════
function getMes(r) {
  let f = r["Fecha"];
  if (f instanceof Date) {
    return String(f.getMonth()+1).padStart(2,"0") + "/" + f.getFullYear();
  }
  let p = (f || "").toString().split("/");
  return p.length === 3 ? p[1] + "/" + p[2] : "";
}

function formatFecha(f) {
  if (f instanceof Date) {
    return String(f.getDate()).padStart(2,"0") + "/" +
           String(f.getMonth()+1).padStart(2,"0") + "/" +
           f.getFullYear();
  }
  return (f || "").toString();
}

function formatHora(val) {
  if (val instanceof Date) {
    return String(val.getHours()).padStart(2,"0") + ":" +
           String(val.getMinutes()).padStart(2,"0");
  }
  return val ? val.toString() : "";
}

function mesActual() {
  let now = new Date();
  return String(now.getMonth()+1).padStart(2,"0") + "/" + now.getFullYear();
}

function nombreMesES(fecha) {
  let meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  let d = fecha || new Date();
  return meses[d.getMonth()] + " " + d.getFullYear();
}

function parseMonto(val) {
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/[$\.]/g, "").replace(",", ".")) || 0;
}

function getDatos() {
  let ss = SpreadsheetApp.openById(SS_ID);
  let sh = ss.getSheetByName(HOJA_DATOS);
  if (!sh || sh.getLastRow() <= 1) return [];
  let rows    = sh.getDataRange().getValues();
  let headers = rows[0];
  return rows.slice(1)
    .map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    })
    .filter(r => r["Fecha"] !== "" && r["Fecha"] !== null);
}

function barraProgreso(pct, total) {
  total = total || 10;
  let llenas = Math.round(Math.min(pct, 1) * total);
  return "▓".repeat(llenas) + "░".repeat(total - llenas) + "  " + Math.round(pct * 100) + "%";
}

// ════════════════════════════════════════════════════════════════
//  ACTUALIZAR DATOS
// ════════════════════════════════════════════════════════════════
function actualizarDashboard() {
  let ss     = SpreadsheetApp.openById(SS_ID);
  let mes    = mesActual();
  let datos  = getDatos();
  let delMes = datos.filter(r => getMes(r) === mes);

  let ingresos = delMes.filter(r => r["Tipo"] === "INGRESO")
                       .reduce((s, r) => s + parseMonto(r["Monto"]), 0);
  let gastos   = delMes.filter(r => r["Tipo"] === "GASTO")
                       .reduce((s, r) => s + parseMonto(r["Monto"]), 0);
  let balance  = ingresos - gastos;
  let pct      = ingresos > 0 ? gastos / ingresos : 0;
  let estado   = balance >= 0 ? "✅  BALANCE POSITIVO" : "⚠️  BALANCE NEGATIVO";

  // ── DASHBOARD ─────────────────────────────────────────────────
  let dash = ss.getSheetByName("Dashboard");
  if (dash) {
    // Mes en español
    dash.getRange("B2").setValue("📅  " + nombreMesES());

    // KPIs como valores computados (evita errores de locale)
    dash.getRange("C5").setValue(ingresos);
    dash.getRange("D5").setValue(gastos);
    dash.getRange("E5").setValue(balance).setFontColor(balance >= 0 ? BLANCO : "#FFD700");
    dash.getRange("F5").setValue(pct).setNumberFormat("0.0%");

    // Estado financiero — fila 6
    let estCell = dash.getRange("B6");
    estCell.setValue(estado)
           .setFontColor(balance >= 0 ? VERDE : ROJO)
           .setFontWeight("bold").setFontSize(11);

    // Barra de progreso — fila 7
    dash.getRange("B7").setValue("📊  Nivel de gasto:  " + barraProgreso(pct));

    // Últimos 10 movimientos
    let ultimos = datos.slice(-10).reverse();
    for (let i = 0; i < 10; i++) {
      let row   = 11 + i;
      let r     = ultimos[i];
      let icono = r ? (r["Tipo"] === "INGRESO" ? "💵" : "💸") : "";
      dash.getRange(`B${row}`).setValue(r ? formatFecha(r["Fecha"]) : "");
      dash.getRange(`C${row}`).setValue(r ? formatHora(r["Hora"])   : "");
      dash.getRange(`D${row}`).setValue(r ? icono + "  " + r["Tipo"] : "");
      dash.getRange(`E${row}`).setValue(r ? parseMonto(r["Monto"])  : "");
      dash.getRange(`F${row}`).setValue(r ? (r["Descripcion"] || "") : "");
      if (r) {
        dash.getRange(`B${row}:F${row}`)
            .setBackground(r["Tipo"] === "INGRESO" ? "#EAFAF1" : "#FDEDEC");
      } else {
        dash.getRange(`B${row}:F${row}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
      }
    }

    // Timestamp
    dash.getRange("B22").setValue("🔄  Actualizado: " + new Date().toLocaleString());
  }

  // ── POR MES ───────────────────────────────────────────────────
  let porMes = ss.getSheetByName("Por Mes");
  if (porMes) {
    let meses = [...new Set(datos.map(r => getMes(r)).filter(m => m))].sort();
    porMes.getRange("B3:E26").clearContent().setBackground(BLANCO);

    meses.forEach((m, i) => {
      let row = i + 3;
      let ing = datos.filter(r => getMes(r) === m && r["Tipo"] === "INGRESO")
                     .reduce((s, r) => s + parseMonto(r["Monto"]), 0);
      let gas = datos.filter(r => getMes(r) === m && r["Tipo"] === "GASTO")
                     .reduce((s, r) => s + parseMonto(r["Monto"]), 0);
      let bal = ing - gas;
      porMes.getRange(`B${row}`).setValue((bal >= 0 ? "🟢 " : "🔴 ") + m);
      porMes.getRange(`C${row}`).setValue(ing);
      porMes.getRange(`D${row}`).setValue(gas);
      porMes.getRange(`E${row}`).setValue(bal);
      porMes.getRange(`B${row}:E${row}`)
            .setBackground(bal >= 0 ? "#EAFAF1" : "#FDEDEC");
    });

    let totalIng = datos.filter(r => r["Tipo"] === "INGRESO")
                        .reduce((s, r) => s + parseMonto(r["Monto"]), 0);
    let totalGas = datos.filter(r => r["Tipo"] === "GASTO")
                        .reduce((s, r) => s + parseMonto(r["Monto"]), 0);
    porMes.getRange("B27").setValue("💰 TOTAL");
    porMes.getRange("C27").setValue(totalIng);
    porMes.getRange("D27").setValue(totalGas);
    porMes.getRange("E27").setValue(totalIng - totalGas);
  }

  // ── ESTADÍSTICAS ──────────────────────────────────────────────
  let est = ss.getSheetByName("Estadisticas");
  if (est) {
    // Por categoría (extrae la categoría de la descripción: "Categoría - detalle")
    let cats = {};
    datos.filter(r => r["Tipo"] === "GASTO").forEach(r => {
      let desc = (r["Descripcion"] || "📦 Varios").toString();
      let cat  = desc.includes(" - ") ? desc.split(" - ")[0].trim() : desc;
      cats[cat] = (cats[cat] || 0) + parseMonto(r["Monto"]);
    });
    let sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);

    est.getRange("B3:C32").clearContent().setBackground(BLANCO);
    sorted.forEach(([cat, total], i) => {
      let row = i + 3;
      est.getRange(`B${row}`).setValue(cat);
      est.getRange(`C${row}`).setValue(total);
      est.getRange(`B${row}:C${row}`)
         .setBackground(i === 0 ? "#FADBD8" : i % 2 === 0 ? "#F9EBEA" : BLANCO);
    });

    // Días con más gastos
    let porDia = {};
    datos.filter(r => r["Tipo"] === "GASTO").forEach(r => {
      let d = formatFecha(r["Fecha"]);
      porDia[d] = (porDia[d] || 0) + parseMonto(r["Monto"]);
    });
    let diasSort = Object.entries(porDia).sort((a, b) => b[1] - a[1]);

    est.getRange("E3:F12").clearContent().setBackground(BLANCO);
    diasSort.slice(0, 10).forEach(([dia, total], i) => {
      est.getRange(`E${i+3}`).setValue(dia);
      est.getRange(`F${i+3}`).setValue(total);
      est.getRange(`E${i+3}:F${i+3}`)
         .setBackground(i === 0 ? "#FADBD8" : i % 2 === 0 ? "#F9EBEA" : BLANCO);
    });
  }

  SpreadsheetApp.flush();
}

// ════════════════════════════════════════════════════════════════
//  ESTRUCTURA VISUAL
// ════════════════════════════════════════════════════════════════
function crearEstructura(ss) {
  // Borrar hojas de análisis anteriores (NO la de datos)
  ["Dashboard", "Por Mes", "Estadisticas"].forEach(n => {
    let s = ss.getSheetByName(n);
    if (s) ss.deleteSheet(s);
  });

  // ── DASHBOARD ─────────────────────────────────────────────────
  let dash = ss.insertSheet("Dashboard", 0);
  dash.setTabColor(AZUL);

  // Anchos
  [10, 180, 90, 140, 160, 200, 10].forEach((w, i) => dash.setColumnWidth(i+1, w));

  // Fila 1: Título
  dash.setRowHeight(1, 65);
  dash.getRange("B1:F1").merge()
      .setValue("💰  FINANZAS JESÚS VANEGAS  💰")
      .setBackground(AZUL).setFontColor(BLANCO).setFontSize(20).setFontWeight("bold")
      .setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 2: Mes actual
  dash.setRowHeight(2, 30);
  dash.getRange("B2:F2").merge()
      .setValue("📅  Cargando...")
      .setBackground(CELESTE).setFontColor(AZUL).setFontSize(12).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 3: separador
  dash.setRowHeight(3, 6);
  dash.getRange("B3:F3").setBackground(AZUL);

  // Filas 4-5: KPI labels + valores
  dash.setRowHeight(4, 22);
  dash.setRowHeight(5, 60);

  let kpis = [
    ["C", "💵 INGRESOS",  VERDE],
    ["D", "💸 GASTOS",    ROJO],
    ["E", "💰 BALANCE",   AZUL],
    ["F", "📉 % GASTADO", NARANJA],
  ];
  kpis.forEach(([col, lbl, color]) => {
    dash.getRange(`${col}4`).setValue(lbl)
        .setBackground(color).setFontColor(BLANCO)
        .setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center");
    dash.getRange(`${col}5`).setValue(0)
        .setBackground(color).setFontColor(BLANCO)
        .setFontSize(22).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle")
        .setNumberFormat(col === "F" ? "0.0%" : '$#,##0');
  });

  // Fila 6: Estado financiero
  dash.setRowHeight(6, 26);
  dash.getRange("B6:F6").merge()
      .setValue("⏳  Calculando estado...")
      .setBackground(GRIS).setFontSize(11).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 7: Barra de progreso
  dash.setRowHeight(7, 24);
  dash.getRange("B7:F7").merge()
      .setValue("▓▓▓▓▓░░░░░  0%")
      .setBackground(GRIS).setFontSize(10).setFontFamily("Courier New")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 8: separador
  dash.setRowHeight(8, 6);
  dash.getRange("B8:F8").setBackground(OSCURO);

  // Fila 9: Título últimos movimientos
  dash.setRowHeight(9, 34);
  dash.getRange("B9:F9").merge()
      .setValue("📋  ÚLTIMOS MOVIMIENTOS")
      .setBackground(OSCURO).setFontColor(BLANCO).setFontSize(12).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 10: Encabezados de tabla
  dash.setRowHeight(10, 24);
  ["📅 Fecha", "🕐 Hora", "🔄 Tipo", "💵 Monto", "📝 Descripción"].forEach((h, i) => {
    dash.getRange(10, i+2).setValue(h)
        .setBackground(CELESTE).setFontWeight("bold").setFontColor(OSCURO)
        .setHorizontalAlignment("center").setFontSize(9);
  });

  // Filas 11-20: datos
  for (let i = 0; i < 10; i++) {
    dash.setRowHeight(11+i, 26);
    dash.getRange(`B${11+i}:F${11+i}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
    dash.getRange(`E${11+i}`).setNumberFormat('$#,##0').setHorizontalAlignment("right");
    dash.getRange(`B${11+i}`).setHorizontalAlignment("center");
    dash.getRange(`C${11+i}`).setHorizontalAlignment("center");
    dash.getRange(`D${11+i}`).setHorizontalAlignment("center");
  }

  // Fila 21: separador
  dash.setRowHeight(21, 6);
  dash.getRange("B21:F21").setBackground(AZUL);

  // Fila 22: timestamp
  dash.setRowHeight(22, 20);
  dash.getRange("B22:F22").merge()
      .setBackground(GRIS).setFontColor("#7F8C8D").setFontSize(8)
      .setHorizontalAlignment("right");

  // Bordes generales
  dash.getRange("B1:F22").setBorder(
    true, true, true, true, null, null,
    "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID
  );
  // Borde interior de tabla
  dash.getRange("B10:F20").setBorder(
    true, true, true, true, true, true,
    "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID
  );

  // ── POR MES ───────────────────────────────────────────────────
  let pm = ss.insertSheet("Por Mes", 1);
  pm.setTabColor(VERDE);
  [10, 160, 140, 140, 140, 10].forEach((w, i) => pm.setColumnWidth(i+1, w));

  pm.setRowHeight(1, 55);
  pm.getRange("B1:E1").merge()
    .setValue("📅  RESUMEN POR MES")
    .setBackground(AZUL).setFontColor(BLANCO).setFontSize(15).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  pm.setRowHeight(2, 28);
  ["📅 Mes", "💵 Ingresos", "💸 Gastos", "💰 Balance"].forEach((h, i) => {
    pm.getRange(2, i+2).setValue(h)
      .setBackground(CELESTE).setFontWeight("bold").setFontColor(OSCURO)
      .setHorizontalAlignment("center").setFontSize(10);
  });

  for (let i = 3; i <= 26; i++) {
    pm.setRowHeight(i, 28);
    pm.getRange(`C${i}:E${i}`).setNumberFormat('$#,##0');
    pm.getRange(`B${i}:E${i}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
  }

  pm.setRowHeight(27, 32);
  pm.getRange("B27:E27").setBackground("#D5D8DC").setFontWeight("bold");
  pm.getRange("C27:E27").setNumberFormat('$#,##0');

  pm.getRange("B1:E27").setBorder(
    true, true, true, true, null, null,
    "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID
  );
  pm.getRange("B2:E27").setBorder(
    true, true, true, true, true, true,
    "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID
  );

  // Gráfica de barras
  let chart = pm.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(pm.getRange("B2:D14"))
    .setPosition(3, 7, 0, 0)
    .setOption("title", "Ingresos vs Gastos por Mes")
    .setOption("titleTextStyle", {fontSize: 13, bold: true, color: AZUL})
    .setOption("width", 540).setOption("height", 340)
    .setOption("colors", [VERDE, ROJO])
    .setOption("legend.position", "bottom")
    .setOption("vAxis.format", "$#,##0")
    .setOption("bar.groupWidth", "60%")
    .build();
  pm.insertChart(chart);

  // ── ESTADÍSTICAS ──────────────────────────────────────────────
  let est = ss.insertSheet("Estadisticas", 2);
  est.setTabColor(ROJO);
  [10, 260, 150, 20, 110, 150, 10].forEach((w, i) => est.setColumnWidth(i+1, w));

  est.setRowHeight(1, 55);
  est.getRange("B1:C1").merge()
     .setValue("📈  GASTOS POR CATEGORÍA")
     .setBackground(AZUL).setFontColor(BLANCO).setFontSize(15).setFontWeight("bold")
     .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Título días con más gastos
  est.getRange("E1:F1").merge()
     .setValue("📆  DÍAS CON MÁS GASTOS")
     .setBackground(ROJO).setFontColor(BLANCO).setFontSize(12).setFontWeight("bold")
     .setHorizontalAlignment("center").setVerticalAlignment("middle");

  est.setRowHeight(2, 26);
  [["B2", "🏷️ Categoría"], ["C2", "💸 Total"], ["E2", "📅 Fecha"], ["F2", "💸 Total"]].forEach(([cell, label]) => {
    est.getRange(cell).setValue(label)
       .setBackground(CELESTE).setFontWeight("bold").setHorizontalAlignment("center");
  });

  for (let i = 3; i <= 32; i++) {
    est.setRowHeight(i, 26);
    est.getRange(`B${i}:C${i}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
    est.getRange(`C${i}`).setNumberFormat('$#,##0').setHorizontalAlignment("right");
    est.getRange(`E${i}:F${i}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
    est.getRange(`F${i}`).setNumberFormat('$#,##0').setHorizontalAlignment("right");
  }

  est.getRange("B1:C32").setBorder(true, true, true, true, null, null, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);
  est.getRange("B2:C32").setBorder(true, true, true, true, true, true, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);
  est.getRange("E1:F12").setBorder(true, true, true, true, null, null, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);
  est.getRange("E2:F12").setBorder(true, true, true, true, true, true, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);

  // Gráfica pastel de categorías
  let pie = est.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(est.getRange("B2:C32"))
    .setPosition(3, 8, 0, 0)
    .setOption("title", "Distribución de Gastos por Categoría")
    .setOption("titleTextStyle", {fontSize: 13, bold: true, color: AZUL})
    .setOption("width", 520).setOption("height", 400)
    .setOption("pieSliceText", "percentage")
    .setOption("legend.position", "right")
    .setOption("pieHole", 0.35)
    .build();
  est.insertChart(pie);
}

// ════════════════════════════════════════════════════════════════
//  TRIGGER DIARIO
// ════════════════════════════════════════════════════════════════
function crearTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("actualizarDashboard").timeBased().everyDays(1).atHour(7).create();
}
