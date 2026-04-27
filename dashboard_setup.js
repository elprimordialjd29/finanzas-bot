// ════════════════════════════════════════════════════════════════
//  FINANZAS JESUS VANEGAS — Dashboard Setup
//  Ejecutar: setupDashboard()   ← crea todo desde cero
//  Ejecutar: actualizarDashboard() ← actualiza Estadísticas y últimos movs
// ════════════════════════════════════════════════════════════════

let SS_ID      = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";
let HOJA_DATOS = "Movimientos";

// Paleta de colores
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
  SpreadsheetApp.getUi().alert("✅ Dashboard listo. Los KPIs se actualizan solos con fórmulas.");
}

// ════════════════════════════════════════════════════════════════
//  HOJA MOVIMIENTOS
// ════════════════════════════════════════════════════════════════
function setupMovimientos(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SS_ID);

  let vieja = ss.getSheetByName("Hoja 1");
  if (vieja) vieja.setName(HOJA_DATOS);

  let sh = ss.getSheetByName(HOJA_DATOS);
  if (!sh) sh = ss.insertSheet(HOJA_DATOS);

  if (sh.getLastRow() === 0) {
    sh.appendRow(["Fecha", "Hora", "Tipo", "Monto", "Descripcion", "Mes"]);
  }

  sh.setFrozenRows(1);
  sh.getRange("A1:F1")
    .setBackground(AZUL).setFontColor(BLANCO).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setFontSize(10).setFontFamily("Arial");
  sh.setRowHeight(1, 32);

  sh.setColumnWidth(1, 110);
  sh.setColumnWidth(2, 70);
  sh.setColumnWidth(3, 100);
  sh.setColumnWidth(4, 130);
  sh.setColumnWidth(5, 300);
  sh.setColumnWidth(6, 85);
  sh.hideColumns(7, 10);

  sh.getRange("D2:D2000").setNumberFormat('$#,##0');
  sh.getRange("A2:A2000").setHorizontalAlignment("center");
  sh.getRange("B2:B2000").setHorizontalAlignment("center");
  sh.getRange("C2:C2000").setHorizontalAlignment("center");
  sh.getRange("D2:D2000").setHorizontalAlignment("right");
  sh.getRange("F2:F2000").setHorizontalAlignment("center");

  let rIngreso = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C2="INGRESO"')
    .setBackground("#EAFAF1").setFontColor("#1E8449")
    .setRanges([sh.getRange("A2:F2000")]).build();

  let rGasto = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C2="GASTO"')
    .setBackground("#FDEDEC").setFontColor("#C0392B")
    .setRanges([sh.getRange("A2:F2000")]).build();

  sh.setConditionalFormatRules([rIngreso, rGasto]);
  sh.setTabColor(AZUL);
  SpreadsheetApp.flush();
}

// ════════════════════════════════════════════════════════════════
//  UTILIDADES
// ════════════════════════════════════════════════════════════════
function getMes(r) {
  let f = r["Fecha"];
  if (f instanceof Date) {
    return String(f.getMonth() + 1).padStart(2, "0") + "/" + f.getFullYear();
  }
  let p = (f || "").toString().split("/");
  return p.length === 3 ? p[1] + "/" + p[2] : "";
}

function formatFecha(f) {
  if (f instanceof Date) {
    return String(f.getDate()).padStart(2, "0") + "/" +
           String(f.getMonth() + 1).padStart(2, "0") + "/" +
           f.getFullYear();
  }
  return (f || "").toString();
}

function formatHora(val) {
  if (val instanceof Date) {
    return String(val.getHours()).padStart(2, "0") + ":" +
           String(val.getMinutes()).padStart(2, "0");
  }
  return val ? val.toString() : "";
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
//  ACTUALIZAR (Estadísticas + últimos movs + barra progreso)
//  Los KPIs y Por Mes ya se actualizan solos con fórmulas.
// ════════════════════════════════════════════════════════════════
function actualizarDashboard() {
  let ss    = SpreadsheetApp.openById(SS_ID);
  let datos = getDatos();

  // ── DASHBOARD ─────────────────────────────────────────────────
  let dash = ss.getSheetByName("Dashboard");
  if (dash) {
    // Leer valores computados por fórmula
    let ingresos = dash.getRange("C5").getValue() || 0;
    let gastos   = dash.getRange("D5").getValue() || 0;
    let balance  = dash.getRange("E5").getValue() || 0;
    let pct      = ingresos > 0 ? gastos / ingresos : 0;

    // Color del balance (no se puede hacer con fórmula)
    dash.getRange("E5").setFontColor(balance >= 0 ? BLANCO : "#FFD700");

    // Color del estado B6
    dash.getRange("B6:F6")
        .setBackground(balance >= 0 ? "#EAFAF1" : "#FDEDEC")
        .setFontColor(balance >= 0 ? VERDE : ROJO)
        .setFontWeight("bold");

    // Barra de progreso
    dash.getRange("B7:F7").setValue("📊  Nivel de gasto:  " + barraProgreso(pct));

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

  // Estadísticas ahora usa fórmulas QUERY (auto-actualiza sola, no se toca aquí)

  SpreadsheetApp.flush();
}

// ════════════════════════════════════════════════════════════════
//  ESTRUCTURA VISUAL
// ════════════════════════════════════════════════════════════════
function crearEstructura(ss) {
  ["Dashboard", "Por Mes", "Estadisticas"].forEach(n => {
    let s = ss.getSheetByName(n);
    if (s) ss.deleteSheet(s);
  });

  // ── DASHBOARD ─────────────────────────────────────────────────
  let dash = ss.insertSheet("Dashboard", 0);
  dash.setTabColor(AZUL);

  [10, 180, 90, 140, 160, 200, 10].forEach((w, i) => dash.setColumnWidth(i + 1, w));

  // Fila 1: Título
  dash.setRowHeight(1, 65);
  dash.getRange("B1:F1").merge()
      .setValue("💰  FINANZAS JESÚS VANEGAS  💰")
      .setBackground(AZUL).setFontColor(BLANCO).setFontSize(20).setFontWeight("bold")
      .setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 2: Mes actual — FÓRMULA (se actualiza sola) — separadores locale ES (;)
  dash.setRowHeight(2, 30);
  dash.getRange("B2:F2").merge()
      .setFormula('="📅  "&UPPER(CHOOSE(MONTH(TODAY());"Enero";"Febrero";"Marzo";"Abril";"Mayo";"Junio";"Julio";"Agosto";"Septiembre";"Octubre";"Noviembre";"Diciembre"))&"  "&YEAR(TODAY())')
      .setBackground(CELESTE).setFontColor(AZUL).setFontSize(12).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 3: separador
  dash.setRowHeight(3, 6);
  dash.getRange("B3:F3").setBackground(AZUL);

  // Filas 4-5: KPI labels + valores (fórmulas auto-actualizables)
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
    dash.getRange(`${col}5`)
        .setBackground(color).setFontColor(BLANCO)
        .setFontSize(22).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle")
        .setNumberFormat(col === "F" ? "0.0%" : '$#,##0');
  });

  // Fórmulas SUMPRODUCT — locale ES usa ; en vez de ,
  let mesFml = 'TEXT(MONTH(TODAY());"00")&"/"&YEAR(TODAY())';
  dash.getRange("C5").setFormula(
    `=SUMPRODUCT((Movimientos!F2:F2000=${mesFml})*(Movimientos!C2:C2000="INGRESO")*Movimientos!D2:D2000)`
  );
  dash.getRange("D5").setFormula(
    `=SUMPRODUCT((Movimientos!F2:F2000=${mesFml})*(Movimientos!C2:C2000="GASTO")*Movimientos!D2:D2000)`
  );
  dash.getRange("E5").setFormula("=C5-D5");
  dash.getRange("F5").setFormula("=IFERROR(D5/C5;0)");

  // Fila 6: Estado financiero — FÓRMULA (locale ES)
  dash.setRowHeight(6, 26);
  dash.getRange("B6:F6").merge()
      .setFormula('=IF(E5>=0;"✅  BALANCE POSITIVO";"⚠️  BALANCE NEGATIVO")')
      .setBackground(GRIS).setFontSize(11).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Fila 7: Barra de progreso (actualizada por actualizarDashboard)
  dash.setRowHeight(7, 24);
  dash.getRange("B7:F7").merge()
      .setValue("📊  Cargando nivel de gasto...")
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

  // Fila 10: Encabezados tabla
  dash.setRowHeight(10, 24);
  ["📅 Fecha", "🕐 Hora", "🔄 Tipo", "💵 Monto", "📝 Descripción"].forEach((h, i) => {
    dash.getRange(10, i + 2).setValue(h)
        .setBackground(CELESTE).setFontWeight("bold").setFontColor(OSCURO)
        .setHorizontalAlignment("center").setFontSize(9);
  });

  // Filas 11-20: datos últimos movimientos
  for (let i = 0; i < 10; i++) {
    dash.setRowHeight(11 + i, 26);
    dash.getRange(`B${11 + i}:F${11 + i}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
    dash.getRange(`E${11 + i}`).setNumberFormat('$#,##0').setHorizontalAlignment("right");
    dash.getRange(`B${11 + i}`).setHorizontalAlignment("center");
    dash.getRange(`C${11 + i}`).setHorizontalAlignment("center");
    dash.getRange(`D${11 + i}`).setHorizontalAlignment("center");
  }

  // Fila 21: separador
  dash.setRowHeight(21, 6);
  dash.getRange("B21:F21").setBackground(AZUL);

  // Fila 22: timestamp
  dash.setRowHeight(22, 20);
  dash.getRange("B22:F22").merge()
      .setBackground(GRIS).setFontColor("#7F8C8D").setFontSize(8)
      .setHorizontalAlignment("right");

  dash.getRange("B1:F22").setBorder(
    true, true, true, true, null, null,
    "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID
  );
  dash.getRange("B10:F20").setBorder(
    true, true, true, true, true, true,
    "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID
  );

  // ── POR MES ───────────────────────────────────────────────────
  let pm = ss.insertSheet("Por Mes", 1);
  pm.setTabColor(VERDE);
  [10, 160, 140, 140, 140, 10].forEach((w, i) => pm.setColumnWidth(i + 1, w));

  pm.setRowHeight(1, 55);
  pm.getRange("B1:E1").merge()
    .setValue("📅  RESUMEN POR MES")
    .setBackground(AZUL).setFontColor(BLANCO).setFontSize(15).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  pm.setRowHeight(2, 28);
  ["📅 Mes", "💵 Ingresos", "💸 Gastos", "💰 Balance"].forEach((h, i) => {
    pm.getRange(2, i + 2).setValue(h)
      .setBackground(CELESTE).setFontWeight("bold").setFontColor(OSCURO)
      .setHorizontalAlignment("center").setFontSize(10);
  });

  // Fórmula QUERY — locale ES: \ separa columnas en arrays, ; separa argumentos
  pm.getRange("B3").setFormula(
    '=IFERROR(QUERY({Movimientos!F2:F2000\\IF(Movimientos!C2:C2000="INGRESO";Movimientos!D2:D2000;0)\\IF(Movimientos!C2:C2000="GASTO";Movimientos!D2:D2000;0)};' +
    '"SELECT Col1,SUM(Col2),SUM(Col3) WHERE Col1<>\'\' GROUP BY Col1 ORDER BY Col1 ' +
    'LABEL Col1 \'\',SUM(Col2) \'\',SUM(Col3) \'\'";0);"")'
  );

  // Balance = Ingresos - Gastos para cada fila (locale ES: ; en IFERROR)
  for (let i = 3; i <= 26; i++) {
    pm.setRowHeight(i, 28);
    pm.getRange(`C${i}`).setNumberFormat('$#,##0').setHorizontalAlignment("right");
    pm.getRange(`D${i}`).setNumberFormat('$#,##0').setHorizontalAlignment("right");
    pm.getRange(`E${i}`).setFormula(`=IFERROR(C${i}-D${i};"")`).setNumberFormat('$#,##0').setHorizontalAlignment("right");
    pm.getRange(`B${i}:E${i}`).setBackground(i % 2 === 0 ? GRIS : BLANCO);
  }

  // Fila de totales — FÓRMULAS acumuladas
  pm.setRowHeight(27, 32);
  pm.getRange("B27").setValue("💰 TOTAL HISTÓRICO");
  pm.getRange("C27").setFormula('=SUMPRODUCT((Movimientos!C2:C2000="INGRESO")*Movimientos!D2:D2000)').setNumberFormat('$#,##0');
  pm.getRange("D27").setFormula('=SUMPRODUCT((Movimientos!C2:C2000="GASTO")*Movimientos!D2:D2000)').setNumberFormat('$#,##0');
  pm.getRange("E27").setFormula("=C27-D27").setNumberFormat('$#,##0');
  pm.getRange("B27:E27").setBackground("#D5D8DC").setFontWeight("bold");

  pm.getRange("B1:E27").setBorder(true, true, true, true, null, null, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);
  pm.getRange("B2:E27").setBorder(true, true, true, true, true, true, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);

  // Gráfica de barras (rango dinámico de 24 meses máx)
  let chart = pm.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(pm.getRange("B2:D26"))
    .setPosition(3, 7, 0, 0)
    .setOption("title", "Ingresos vs Gastos por Mes")
    .setOption("titleTextStyle", { fontSize: 13, bold: true, color: AZUL })
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
  [10, 260, 150, 20, 110, 150, 10].forEach((w, i) => est.setColumnWidth(i + 1, w));

  est.setRowHeight(1, 55);
  est.getRange("B1:C1").merge()
     .setValue("📈  GASTOS POR CATEGORÍA")
     .setBackground(AZUL).setFontColor(BLANCO).setFontSize(15).setFontWeight("bold")
     .setHorizontalAlignment("center").setVerticalAlignment("middle");

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

  // Fórmula QUERY: agrupa gastos por categoría (extrae texto antes de " - ")
  // Locale ES: \\ = separador de columna en array, ; = separador de argumentos
  est.getRange("B3").setFormula(
    '=IFERROR(QUERY({IF(Movimientos!C2:C2000="GASTO";IFERROR(REGEXEXTRACT(Movimientos!E2:E2000;"^(.+?) - ");"Sin categoria");"")\\IF(Movimientos!C2:C2000="GASTO";Movimientos!D2:D2000;0)};"SELECT Col1,SUM(Col2) WHERE Col1<>\'\' GROUP BY Col1 ORDER BY SUM(Col2) DESC LABEL Col1 \'\',SUM(Col2) \'\'";0);"")'
  );
  // Fórmula QUERY: top 10 días con más gastos
  est.getRange("E3").setFormula(
    '=IFERROR(QUERY({IF(Movimientos!C2:C2000="GASTO";Movimientos!A2:A2000;"")\\IF(Movimientos!C2:C2000="GASTO";Movimientos!D2:D2000;0)};"SELECT Col1,SUM(Col2) WHERE Col1<>\'\' GROUP BY Col1 ORDER BY SUM(Col2) DESC LIMIT 10 LABEL Col1 \'\',SUM(Col2) \'\'";0);"")'
  );

  est.getRange("B1:C32").setBorder(true, true, true, true, null, null, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);
  est.getRange("B2:C32").setBorder(true, true, true, true, true, true, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);
  est.getRange("E1:F12").setBorder(true, true, true, true, null, null, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);
  est.getRange("E2:F12").setBorder(true, true, true, true, true, true, "#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);

  // Gráfica pastel de categorías (rango reducido B2:C22 para 20 categorías)
  let pie = est.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(est.getRange("B2:C22"))
    .setPosition(3, 8, 0, 0)
    .setOption("title", "Distribución de Gastos por Categoría")
    .setOption("titleTextStyle", { fontSize: 13, bold: true, color: AZUL })
    .setOption("width", 520).setOption("height", 400)
    .setOption("pieSliceText", "percentage")
    .setOption("legend.position", "right")
    .setOption("pieHole", 0.35)
    .build();
  est.insertChart(pie);
}

// ════════════════════════════════════════════════════════════════
//  TRIGGER DIARIO (7am)
// ════════════════════════════════════════════════════════════════
function crearTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("actualizarDashboard").timeBased().everyDays(1).atHour(7).create();
}
