const SS_ID     = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";
const SRC       = "'Hoja 1'";

function setupDashboard() {
  const ss = SpreadsheetApp.openById(SS_ID);
  crearDashboard(ss);
  crearPorMes(ss);
  crearEstadisticas(ss);
}

function bg(sh, rango, color) {
  sh.getRange(rango).setBackground(color);
}

function titulo(sh, rango, texto, bg_color) {
  const r = sh.getRange(rango);
  r.merge();
  r.setValue(texto);
  r.setBackground(bg_color)
   .setFontColor("#FFFFFF")
   .setFontSize(13)
   .setFontWeight("bold")
   .setHorizontalAlignment("center")
   .setVerticalAlignment("middle");
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
function crearDashboard(ss) {
  let sh = ss.getSheetByName("Dashboard");
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("Dashboard", 0);

  sh.setColumnWidths(1, 6, 10);
  sh.setColumnWidth(2, 180);
  sh.setColumnWidth(3, 160);
  sh.setColumnWidth(4, 160);
  sh.setColumnWidth(5, 160);
  sh.setColumnWidth(6, 160);
  sh.setColumnWidth(7, 10);

  // Título
  sh.setRowHeight(1, 55);
  titulo(sh, "B1:F1", "FINANZAS JESUS VANEGAS", "#1A5276");

  // KPIs
  const AZUL = "#1A5276"; const VERDE = "#1E8449"; const ROJO = "#C0392B"; const NARANJA = "#7D6608";
  const kpis = [
    ["C", "INGRESOS DEL MES", VERDE,
     `=SUMPRODUCT((TEXT(${SRC}!A$2:A$1000,"MM/YYYY")=TEXT(TODAY(),"MM/YYYY"))*(${SRC}!C$2:C$1000="INGRESO")*IFERROR(VALUE(${SRC}!D$2:D$1000),0))`,
     '$#,##0'],
    ["D", "GASTOS DEL MES", ROJO,
     `=SUMPRODUCT((TEXT(${SRC}!A$2:A$1000,"MM/YYYY")=TEXT(TODAY(),"MM/YYYY"))*(${SRC}!C$2:C$1000="GASTO")*IFERROR(VALUE(${SRC}!D$2:D$1000),0))`,
     '$#,##0'],
    ["E", "BALANCE", AZUL,
     `=C4-D4`,
     '$#,##0'],
    ["F", "% GASTADO", NARANJA,
     `=IFERROR(D4/C4,0)`,
     '0.0%'],
  ];

  sh.setRowHeight(2, 10);
  sh.setRowHeight(3, 22);
  sh.setRowHeight(4, 50);
  sh.setRowHeight(5, 10);

  kpis.forEach(([col, label, color, formula, fmt]) => {
    sh.getRange(`${col}3`).setValue(label).setBackground(color).setFontColor("#FFFFFF")
      .setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center");
    sh.getRange(`${col}4`).setFormula(formula).setBackground(color).setFontColor("#FFFFFF")
      .setFontSize(20).setFontWeight("bold").setHorizontalAlignment("center")
      .setVerticalAlignment("middle").setNumberFormat(fmt);
  });

  // Últimos movimientos
  sh.setRowHeight(6, 10);
  titulo(sh, "B7:F7", "ULTIMOS MOVIMIENTOS", "#2C3E50");
  sh.setRowHeight(7, 32);

  const hdrs = ["Fecha","Hora","Tipo","Monto","Descripcion"];
  hdrs.forEach((h, i) => {
    sh.getRange(8, i+2).setValue(h).setBackground("#D6EAF8")
      .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(9);
  });
  sh.setRowHeight(8, 24);

  for (let i = 0; i < 10; i++) {
    const row = 9 + i;
    sh.setRowHeight(row, 24);
    const color = i % 2 === 0 ? "#F2F3F4" : "#FFFFFF";
    sh.getRange(`B${row}:F${row}`).setBackground(color);
    const n = `COUNTA(${SRC}!A:A)-${i}`;
    sh.getRange(`B${row}`).setFormula(`=IFERROR(INDEX(${SRC}!A:A,${n}),"")`);
    sh.getRange(`C${row}`).setFormula(`=IFERROR(INDEX(${SRC}!B:B,${n}),"")`);
    sh.getRange(`D${row}`).setFormula(`=IFERROR(INDEX(${SRC}!C:C,${n}),"")`);
    sh.getRange(`E${row}`).setFormula(`=IFERROR(INDEX(${SRC}!D:D,${n}),"")`).setNumberFormat('$#,##0');
    sh.getRange(`F${row}`).setFormula(`=IFERROR(INDEX(${SRC}!E:E,${n}),"")`);
  }
}

// ── POR MES ────────────────────────────────────────────────────────────
function crearPorMes(ss) {
  let sh = ss.getSheetByName("Por Mes");
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("Por Mes", 1);

  sh.setColumnWidth(1, 10);
  sh.setColumnWidth(2, 150);
  sh.setColumnWidth(3, 140);
  sh.setColumnWidth(4, 140);
  sh.setColumnWidth(5, 140);
  sh.setColumnWidth(6, 10);

  titulo(sh, "B1:E1", "RESUMEN POR MES", "#1A5276");
  sh.setRowHeight(1, 45);

  ["Mes","Ingresos","Gastos","Balance"].forEach((h, i) => {
    sh.getRange(2, i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold")
      .setHorizontalAlignment("center").setFontSize(10);
  });
  sh.setRowHeight(2, 28);

  // Lista única de meses usando fórmula simple
  sh.getRange("B3").setFormula(`=IFERROR(${SRC}!F2,"")`);
  for (let i = 3; i <= 26; i++) {
    const row = i;
    const bg_color = i % 2 === 0 ? "#F2F3F4" : "#FFFFFF";
    sh.setRowHeight(row, 26);

    if (i > 3) {
      sh.getRange(`B${row}`).setFormula(`=IFERROR(${SRC}!F${i-1},"")`);
    }

    sh.getRange(`C${row}`).setFormula(
      `=IFERROR(SUMPRODUCT((${SRC}!F$2:F$1000=B${row})*(${SRC}!C$2:C$1000="INGRESO")*IFERROR(VALUE(${SRC}!D$2:D$1000),0)),"")`
    ).setBackground(bg_color).setNumberFormat('$#,##0');

    sh.getRange(`D${row}`).setFormula(
      `=IFERROR(SUMPRODUCT((${SRC}!F$2:F$1000=B${row})*(${SRC}!C$2:C$1000="GASTO")*IFERROR(VALUE(${SRC}!D$2:D$1000),0)),"")`
    ).setBackground(bg_color).setNumberFormat('$#,##0');

    sh.getRange(`E${row}`).setFormula(`=IFERROR(C${row}-D${row},"")`).setBackground(bg_color).setNumberFormat('$#,##0');
    sh.getRange(`B${row}`).setBackground(bg_color);
  }

  // Totales
  sh.setRowHeight(27, 32);
  sh.getRange("B27").setValue("TOTAL").setFontWeight("bold").setBackground("#D5D8DC");
  sh.getRange("C27").setFormula("=IFERROR(SUM(C3:C26),0)").setFontWeight("bold").setBackground("#D5D8DC").setNumberFormat('$#,##0');
  sh.getRange("D27").setFormula("=IFERROR(SUM(D3:D26),0)").setFontWeight("bold").setBackground("#D5D8DC").setNumberFormat('$#,##0');
  sh.getRange("E27").setFormula("=C27-D27").setFontWeight("bold").setBackground("#D5D8DC").setNumberFormat('$#,##0');

  // Gráfica
  const chart = sh.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sh.getRange("B2:D14"))
    .setPosition(3, 7, 0, 0)
    .setOption("title", "Ingresos vs Gastos por Mes")
    .setOption("width", 500).setOption("height", 300)
    .setOption("colors", ["#1E8449","#C0392B"])
    .build();
  sh.insertChart(chart);
}

// ── ESTADÍSTICAS ────────────────────────────────────────────────────────
function crearEstadisticas(ss) {
  let sh = ss.getSheetByName("Estadisticas");
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet("Estadisticas", 2);

  sh.setColumnWidth(1, 10);
  sh.setColumnWidth(2, 220);
  sh.setColumnWidth(3, 160);
  sh.setColumnWidth(4, 10);

  titulo(sh, "B1:C1", "GASTOS POR CATEGORIA", "#1A5276");
  sh.setRowHeight(1, 42);

  ["Categoria","Total Gastado"].forEach((h, i) => {
    sh.getRange(2, i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold")
      .setHorizontalAlignment("center");
  });

  for (let i = 3; i <= 32; i++) {
    const bg_color = i % 2 === 0 ? "#F2F3F4" : "#FFFFFF";
    sh.setRowHeight(i, 26);
    sh.getRange(`B${i}`).setFormula(`=IFERROR(${SRC}!E${i-1},"")`).setBackground(bg_color);
    sh.getRange(`C${i}`).setFormula(
      `=IFERROR(SUMPRODUCT((${SRC}!E$2:E$1000=B${i})*(${SRC}!C$2:C$1000="GASTO")*IFERROR(VALUE(${SRC}!D$2:D$1000),0)),"")`
    ).setBackground(bg_color).setNumberFormat('$#,##0');
  }

  const pie = sh.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(sh.getRange("B2:C32"))
    .setPosition(3, 5, 0, 0)
    .setOption("title", "Distribucion de Gastos")
    .setOption("width", 460).setOption("height", 360)
    .build();
  sh.insertChart(pie);
}
