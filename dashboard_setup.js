const SS_ID = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";
const DATA_SHEET = "Hoja 1";

function setupDashboard() {
  const ss = SpreadsheetApp.openById(SS_ID);
  crearDashboard(ss);
  crearResumenMensual(ss);
  crearEstadisticas(ss);
  SpreadsheetApp.flush();
}

// ─── DASHBOARD PRINCIPAL ───────────────────────────────────────────────
function crearDashboard(ss) {
  let sh = ss.getSheetByName("📊 Dashboard");
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("📊 Dashboard", 0);

  const verde  = "#1E8449";
  const rojo   = "#C0392B";
  const azul   = "#1A5276";
  const gris   = "#F2F3F4";
  const blanco = "#FFFFFF";

  // ── Título
  sh.setColumnWidth(1, 30);
  sh.setColumnWidth(2, 200);
  sh.setColumnWidth(3, 160);
  sh.setColumnWidth(4, 160);
  sh.setColumnWidth(5, 160);
  sh.setColumnWidth(6, 160);
  sh.setColumnWidth(7, 30);

  const titulo = sh.getRange("B1:F1");
  titulo.merge();
  titulo.setValue("💰 FINANZAS JESÚS VANEGAS");
  titulo.setBackground(azul).setFontColor(blanco).setFontSize(16)
        .setFontWeight("bold").setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
  sh.setRowHeight(1, 50);

  // ── Subtítulo mes actual
  const sub = sh.getRange("B2:F2");
  sub.merge();
  sub.setFormula('=TEXT(TODAY(),"MMMM YYYY")');
  sub.setBackground(azul).setFontColor("#AED6F1").setFontSize(11)
     .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(2, 28);

  // ── Tarjetas KPI (fila 4-6)
  sh.setRowHeight(3, 15);
  sh.setRowHeight(4, 20);
  sh.setRowHeight(5, 45);
  sh.setRowHeight(6, 30);

  const kpis = [
    ["C", "💵 INGRESOS", verde,
     `=SUMPRODUCT((TEXT(INDIRECT("'${DATA_SHEET}'!A2:A1000"),"MM/YYYY")=TEXT(TODAY(),"MM/YYYY"))*(INDIRECT("'${DATA_SHEET}'!C2:C1000")="INGRESO")*IFERROR(VALUE(INDIRECT("'${DATA_SHEET}'!D2:D1000")),0))`],
    ["D", "💸 GASTOS", rojo,
     `=SUMPRODUCT((TEXT(INDIRECT("'${DATA_SHEET}'!A2:A1000"),"MM/YYYY")=TEXT(TODAY(),"MM/YYYY"))*(INDIRECT("'${DATA_SHEET}'!C2:C1000")="GASTO")*IFERROR(VALUE(INDIRECT("'${DATA_SHEET}'!D2:D1000")),0))`],
    ["E", "💰 BALANCE", azul,
     `=C5-D5`],
    ["F", "📉 % GASTADO", "#7D6608",
     `=IFERROR(D5/C5,0)`],
  ];

  kpis.forEach(([col, label, color, formula]) => {
    const labelCell = sh.getRange(`${col}4`);
    labelCell.setValue(label).setBackground(color).setFontColor(blanco)
             .setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center");

    const valCell = sh.getRange(`${col}5`);
    valCell.setFormula(formula).setBackground(color).setFontColor(blanco)
           .setFontSize(18).setFontWeight("bold").setHorizontalAlignment("center")
           .setVerticalAlignment("middle");
    if (col === "F") {
      valCell.setNumberFormat("0.0%");
    } else {
      valCell.setNumberFormat('$#,##0');
    }

    const subCell = sh.getRange(`${col}6`);
    subCell.setBackground(color).setFontColor(blanco);
  });

  // ── Estadísticas rápidas (fila 8-14)
  sh.setRowHeight(7, 15);
  const secHeader = sh.getRange("B8:F8");
  secHeader.merge().setValue("📈 ESTADÍSTICAS DEL MES")
           .setBackground("#2C3E50").setFontColor(blanco)
           .setFontWeight("bold").setHorizontalAlignment("center")
           .setFontSize(11);

  const stats = [
    ["Día con más gastos",
     `=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!A2:A1000"),MATCH(MAXIFS(INDIRECT("'${DATA_SHEET}'!D2:D1000"),INDIRECT("'${DATA_SHEET}'!C2:C1000"),"GASTO",TEXT(INDIRECT("'${DATA_SHEET}'!A2:A1000"),"MM/YYYY"),TEXT(TODAY(),"MM/YYYY")),INDIRECT("'${DATA_SHEET}'!D2:D1000"),0)),"Sin datos")`],
    ["Día con menos gastos",
     `=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!A2:A1000"),MATCH(MINIFS(INDIRECT("'${DATA_SHEET}'!D2:D1000"),INDIRECT("'${DATA_SHEET}'!C2:C1000"),"GASTO",TEXT(INDIRECT("'${DATA_SHEET}'!A2:A1000"),"MM/YYYY"),TEXT(TODAY(),"MM/YYYY")),INDIRECT("'${DATA_SHEET}'!D2:D1000"),0)),"Sin datos")`],
    ["Mayor gasto del mes",
     `=IFERROR('$'&TEXT(MAXIFS(INDIRECT("'${DATA_SHEET}'!D2:D1000"),INDIRECT("'${DATA_SHEET}'!C2:C1000"),"GASTO",TEXT(INDIRECT("'${DATA_SHEET}'!A2:A1000"),"MM/YYYY"),TEXT(TODAY(),"MM/YYYY")),"#,##0"),"Sin datos")`],
    ["Categoría top de gastos",
     `=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!E2:E1000"),MATCH(MAXIFS(INDIRECT("'${DATA_SHEET}'!D2:D1000"),INDIRECT("'${DATA_SHEET}'!C2:C1000"),"GASTO"),INDIRECT("'${DATA_SHEET}'!D2:D1000"),0)),"Sin datos")`],
    ["Total movimientos del mes",
     `=COUNTIFS(TEXT(INDIRECT("'${DATA_SHEET}'!A2:A1000"),"MM/YYYY"),TEXT(TODAY(),"MM/YYYY"),INDIRECT("'${DATA_SHEET}'!A2:A1000"),"<>")`],
  ];

  stats.forEach(([label, formula], i) => {
    const row = 9 + i;
    sh.setRowHeight(row, 28);
    const bg = i % 2 === 0 ? gris : blanco;
    sh.getRange(`B${row}`).setValue(label).setBackground(bg)
      .setFontWeight("bold").setFontSize(10).setVerticalAlignment("middle");
    sh.getRange(`C${row}:F${row}`).merge().setFormula(formula)
      .setBackground(bg).setFontSize(10).setVerticalAlignment("middle");
  });

  // ── Últimos movimientos (fila 16+)
  sh.setRowHeight(15, 15);
  const movHeader = sh.getRange("B16:F16");
  movHeader.merge().setValue("📋 ÚLTIMOS MOVIMIENTOS")
           .setBackground("#2C3E50").setFontColor(blanco)
           .setFontWeight("bold").setHorizontalAlignment("center")
           .setFontSize(11);

  ["Fecha","Hora","Tipo","Monto","Descripción"].forEach((h, i) => {
    const cell = sh.getRange(17, i + 2);
    cell.setValue(h).setBackground("#D6EAF8").setFontWeight("bold")
        .setHorizontalAlignment("center").setFontSize(9);
  });

  for (let i = 0; i < 10; i++) {
    const row = 18 + i;
    sh.setRowHeight(row, 24);
    const bg = i % 2 === 0 ? gris : blanco;
    const offset = i + 1;
    const dataRange = `INDIRECT("'${DATA_SHEET}'!A2:E1000")`;
    sh.getRange(`B${row}:F${row}`).setBackground(bg);
    sh.getRange(`B${row}`).setFormula(`=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!A:A"),COUNTA(INDIRECT("'${DATA_SHEET}'!A:A"))-${offset}),"")`);
    sh.getRange(`C${row}`).setFormula(`=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!B:B"),COUNTA(INDIRECT("'${DATA_SHEET}'!A:A"))-${offset}),"")`);
    sh.getRange(`D${row}`).setFormula(`=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!C:C"),COUNTA(INDIRECT("'${DATA_SHEET}'!A:A"))-${offset}),"")`);
    sh.getRange(`E${row}`).setFormula(`=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!D:D"),COUNTA(INDIRECT("'${DATA_SHEET}'!A:A"))-${offset}),"")`).setNumberFormat('$#,##0');
    sh.getRange(`F${row}`).setFormula(`=IFERROR(INDEX(INDIRECT("'${DATA_SHEET}'!E:E"),COUNTA(INDIRECT("'${DATA_SHEET}'!A:A"))-${offset}),"")`);
  }

  // ── Bordes generales
  sh.getRange("B1:F28").setBorder(false,false,false,false,false,false);
}

// ─── RESUMEN MENSUAL ───────────────────────────────────────────────────
function crearResumenMensual(ss) {
  let sh = ss.getSheetByName("📅 Por Mes");
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("📅 Por Mes", 1);

  sh.setColumnWidth(1, 20);
  sh.setColumnWidth(2, 140);
  sh.setColumnWidth(3, 130);
  sh.setColumnWidth(4, 130);
  sh.setColumnWidth(5, 130);
  sh.setColumnWidth(6, 20);

  const azul  = "#1A5276";
  const blanco = "#FFFFFF";
  const gris   = "#F2F3F4";

  const titulo = sh.getRange("B1:E1");
  titulo.merge().setValue("📅 RESUMEN POR MES")
        .setBackground(azul).setFontColor(blanco)
        .setFontSize(14).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(1, 45);

  ["Mes","💵 Ingresos","💸 Gastos","💰 Balance"].forEach((h, i) => {
    const cell = sh.getRange(2, i + 2);
    cell.setValue(h).setBackground("#D6EAF8").setFontWeight("bold")
        .setHorizontalAlignment("center").setFontSize(10);
  });
  sh.setRowHeight(2, 28);

  sh.getRange("B3").setFormula(
    `=IFERROR(ARRAY_CONSTRAIN(SORT(UNIQUE(FILTER(INDIRECT("'${DATA_SHEET}'!F2:F1000"),INDIRECT("'${DATA_SHEET}'!F2:F1000")<>"")),1,0),24,1),"")`
  );

  for (let i = 3; i <= 26; i++) {
    const bg = (i % 2 === 0) ? gris : blanco;
    sh.setRowHeight(i, 26);
    sh.getRange(`B${i}:E${i}`).setBackground(bg);

    sh.getRange(`C${i}`).setFormula(
      `=IFERROR(SUMPRODUCT((INDIRECT("'${DATA_SHEET}'!F2:F1000")=B${i})*(INDIRECT("'${DATA_SHEET}'!C2:C1000")="INGRESO")*IFERROR(VALUE(INDIRECT("'${DATA_SHEET}'!D2:D1000")),0)),"")`
    ).setNumberFormat('$#,##0');

    sh.getRange(`D${i}`).setFormula(
      `=IFERROR(SUMPRODUCT((INDIRECT("'${DATA_SHEET}'!F2:F1000")=B${i})*(INDIRECT("'${DATA_SHEET}'!C2:C1000")="GASTO")*IFERROR(VALUE(INDIRECT("'${DATA_SHEET}'!D2:D1000")),0)),"")`
    ).setNumberFormat('$#,##0');

    sh.getRange(`E${i}`).setFormula(`=IFERROR(C${i}-D${i},"")`).setNumberFormat('$#,##0');
  }

  // Totales
  sh.setRowHeight(27, 32);
  sh.getRange("B27").setValue("TOTAL").setFontWeight("bold").setBackground("#D5D8DC");
  sh.getRange("C27").setFormula("=SUM(C3:C26)").setFontWeight("bold").setBackground("#D5D8DC").setNumberFormat('$#,##0');
  sh.getRange("D27").setFormula("=SUM(D3:D26)").setFontWeight("bold").setBackground("#D5D8DC").setNumberFormat('$#,##0');
  sh.getRange("E27").setFormula("=C27-D27").setFontWeight("bold").setBackground("#D5D8DC").setNumberFormat('$#,##0');

  // ── Gráfica ingresos vs gastos
  const chartData = sh.getRange("B2:D26");
  const chart = sh.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(chartData)
    .setPosition(3, 7, 0, 0)
    .setOption("title", "Ingresos vs Gastos por Mes")
    .setOption("width", 520)
    .setOption("height", 320)
    .setOption("colors", ["#1E8449", "#C0392B"])
    .setOption("legend.position", "bottom")
    .build();
  sh.insertChart(chart);
}

// ─── ESTADÍSTICAS AVANZADAS ────────────────────────────────────────────
function crearEstadisticas(ss) {
  let sh = ss.getSheetByName("📈 Estadísticas");
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("📈 Estadísticas", 2);

  sh.setColumnWidth(1, 20);
  sh.setColumnWidth(2, 200);
  sh.setColumnWidth(3, 160);
  sh.setColumnWidth(4, 20);

  const azul   = "#1A5276";
  const blanco = "#FFFFFF";
  const gris   = "#F2F3F4";

  const titulo = sh.getRange("B1:C1");
  titulo.merge().setValue("📈 GASTOS POR CATEGORÍA")
        .setBackground(azul).setFontColor(blanco)
        .setFontSize(13).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(1, 42);

  ["Categoría", "Total Gastado"].forEach((h, i) => {
    sh.getRange(2, i + 2).setValue(h).setBackground("#D6EAF8")
      .setFontWeight("bold").setHorizontalAlignment("center");
  });

  sh.getRange("B3").setFormula(
    `=IFERROR(ARRAY_CONSTRAIN(SORT(UNIQUE(FILTER(INDIRECT("'${DATA_SHEET}'!E2:E1000"),(INDIRECT("'${DATA_SHEET}'!C2:C1000")="GASTO")*(INDIRECT("'${DATA_SHEET}'!E2:E1000")<>""))),1,0),30,1),"")`
  );

  for (let i = 3; i <= 32; i++) {
    const bg = (i % 2 === 0) ? gris : blanco;
    sh.setRowHeight(i, 26);
    sh.getRange(`B${i}`).setBackground(bg);
    sh.getRange(`C${i}`).setFormula(
      `=IFERROR(SUMPRODUCT((INDIRECT("'${DATA_SHEET}'!E2:E1000")=B${i})*(INDIRECT("'${DATA_SHEET}'!C2:C1000")="GASTO")*IFERROR(VALUE(INDIRECT("'${DATA_SHEET}'!D2:D1000")),0)),"")`
    ).setBackground(bg).setNumberFormat('$#,##0');
  }

  // Gráfica pastel por categoría
  const pieRange = sh.getRange("B2:C32");
  const pie = sh.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(pieRange)
    .setPosition(3, 5, 0, 0)
    .setOption("title", "Distribución de Gastos por Categoría")
    .setOption("width", 480)
    .setOption("height", 380)
    .setOption("pieSliceText", "percentage")
    .setOption("legend.position", "right")
    .build();
  sh.insertChart(pie);
}
