let SS_ID = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";

function setupDashboard() {
  let ss = SpreadsheetApp.openById(SS_ID);
  crearEstructura(ss);
  actualizarDashboard();
  crearTrigger();
}

// ── Utilidades ────────────────────────────────────────────────────────
function getMes(r) {
  let f = r["Fecha"];
  if (f instanceof Date) return String(f.getMonth()+1).padStart(2,"0")+"/"+f.getFullYear();
  let p = (f||"").toString().split("/");
  return p.length === 3 ? p[1]+"/"+p[2] : "";
}

function formatHora(val) {
  if (val instanceof Date) return String(val.getHours()).padStart(2,"0")+":"+String(val.getMinutes()).padStart(2,"0");
  return val ? val.toString() : "";
}

function mesActual() {
  let now = new Date();
  return String(now.getMonth()+1).padStart(2,"0")+"/"+now.getFullYear();
}

function parseMonto(val) {
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/[$\.]/g,"").replace(",",".")) || 0;
}

function getDatos() {
  let ss = SpreadsheetApp.openById(SS_ID);
  let sh = ss.getSheetByName("Hoja 1");
  if (!sh) return [];
  let rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return [];
  let headers = rows[0];
  return rows.slice(1).map(r => {
    let obj = {};
    headers.forEach((h,i) => obj[h] = r[i]);
    return obj;
  }).filter(r => r["Fecha"] !== "");
}

function barraProgreso(pct, total=10) {
  let llenas = Math.round(Math.min(pct,1) * total);
  return "▓".repeat(llenas) + "░".repeat(total - llenas) + " " + Math.round(pct*100) + "%";
}

// ── Actualizar valores ────────────────────────────────────────────────
function actualizarDashboard() {
  let ss    = SpreadsheetApp.openById(SS_ID);
  let mes   = mesActual();
  let datos = getDatos();
  let delMes = datos.filter(r => getMes(r) === mes);

  let ingresos = delMes.filter(r=>r["Tipo"]==="INGRESO").reduce((s,r)=>s+parseMonto(r["Monto"]),0);
  let gastos   = delMes.filter(r=>r["Tipo"]==="GASTO").reduce((s,r)=>s+parseMonto(r["Monto"]),0);
  let balance  = ingresos - gastos;
  let pct      = ingresos > 0 ? gastos/ingresos : 0;
  let estado   = balance >= 0 ? "✅ POSITIVO" : "⚠️ NEGATIVO";

  // ── Dashboard
  let dash = ss.getSheetByName("Dashboard");
  if (dash) {
    // Mes actual en español
    let meses_es = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    let nowDate = new Date();
    dash.getRange("B2").setValue("📅 " + meses_es[nowDate.getMonth()] + " " + nowDate.getFullYear());

    // KPIs como valores (evita errores de fórmula en locale español)
    dash.getRange("C5").setValue(ingresos);
    dash.getRange("D5").setValue(gastos);
    dash.getRange("E5").setValue(balance);
    dash.getRange("F5").setValue(pct).setNumberFormat("0.0%");
    dash.getRange("E5").setFontColor(balance >= 0 ? "#FFFFFF" : "#FFD700");

    // Estado financiero — B6 (merged B6:F6)
    let estCell = dash.getRange("B6");
    estCell.setValue(estado);
    estCell.setFontColor(balance >= 0 ? "#1E8449" : "#C0392B").setFontWeight("bold").setFontSize(11);

    // Barra de progreso de gastos — B7 (merged B7:F7)
    dash.getRange("B7").setValue("📊 Nivel de gasto: " + barraProgreso(pct));

    // Últimos movimientos
    let ultimos = datos.slice(-10).reverse();
    for (let i = 0; i < 10; i++) {
      let row = 11 + i;
      let r   = ultimos[i];
      let icono = r ? (r["Tipo"]==="INGRESO" ? "💵" : "💸") : "";

      let fechaStr = "";
      if (r) {
        let f = r["Fecha"];
        if (f instanceof Date) {
          fechaStr = String(f.getDate()).padStart(2,"0")+"/"+String(f.getMonth()+1).padStart(2,"0")+"/"+f.getFullYear();
        } else {
          fechaStr = (f||"").toString();
        }
      }

      dash.getRange(`B${row}`).setValue(fechaStr);
      dash.getRange(`C${row}`).setValue(r ? formatHora(r["Hora"]) : "");
      dash.getRange(`D${row}`).setValue(r ? icono+" "+r["Tipo"] : "");
      dash.getRange(`E${row}`).setValue(r ? parseMonto(r["Monto"]) : "");
      dash.getRange(`F${row}`).setValue(r ? (r["Descripcion"]||"") : "");

      // Color por tipo
      if (r) {
        let bg = r["Tipo"]==="INGRESO" ? "#EAFAF1" : "#FDEDEC";
        dash.getRange(`B${row}:F${row}`).setBackground(bg);
      }
    }

    // Fecha actualización
    dash.getRange("B22").setValue("🔄 Actualizado: " + new Date().toLocaleString());
  }

  // ── Por Mes
  let porMes = ss.getSheetByName("Por Mes");
  if (porMes) {
    let meses = [...new Set(datos.map(r=>getMes(r)).filter(m=>m))].sort();
    // Limpiar filas anteriores
    porMes.getRange("B3:E26").clearContent();
    meses.forEach((m,i) => {
      let row = i+3;
      let ing = datos.filter(r=>getMes(r)===m&&r["Tipo"]==="INGRESO").reduce((s,r)=>s+parseMonto(r["Monto"]),0);
      let gas = datos.filter(r=>getMes(r)===m&&r["Tipo"]==="GASTO").reduce((s,r)=>s+parseMonto(r["Monto"]),0);
      let bal = ing - gas;
      let icon = bal >= 0 ? "🟢" : "🔴";
      porMes.getRange(`B${row}`).setValue(icon+" "+m);
      porMes.getRange(`C${row}`).setValue(ing);
      porMes.getRange(`D${row}`).setValue(gas);
      porMes.getRange(`E${row}`).setValue(bal);
      porMes.getRange(`B${row}:E${row}`).setBackground(bal >= 0 ? "#EAFAF1" : "#FDEDEC");
    });

    // Totales
    let totalIng = datos.filter(r=>r["Tipo"]==="INGRESO").reduce((s,r)=>s+parseMonto(r["Monto"]),0);
    let totalGas = datos.filter(r=>r["Tipo"]==="GASTO").reduce((s,r)=>s+parseMonto(r["Monto"]),0);
    porMes.getRange("B27").setValue("💰 TOTAL");
    porMes.getRange("C27").setValue(totalIng);
    porMes.getRange("D27").setValue(totalGas);
    porMes.getRange("E27").setValue(totalIng-totalGas);
  }

  // ── Estadísticas por categoría
  let est = ss.getSheetByName("Estadisticas");
  if (est) {
    let cats = {};
    datos.filter(r=>r["Tipo"]==="GASTO").forEach(r => {
      let cat = r["Descripcion"]||"📦 Varios";
      cats[cat] = (cats[cat]||0) + parseMonto(r["Monto"]);
    });
    let sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]);
    est.getRange("B3:C32").clearContent();
    est.getRange("B3:C32").setBackground("#FFFFFF");
    sorted.forEach(([cat,total],i) => {
      let row = i+3;
      est.getRange(`B${row}`).setValue(cat);
      est.getRange(`C${row}`).setValue(total);
      // Color degradado: más gasto = más rojo
      let intensity = Math.floor(255 - (i/sorted.length)*80);
      est.getRange(`B${row}:C${row}`).setBackground(i===0?"#FDEDEC":i%2===0?"#F2F3F4":"#FFFFFF");
    });
  }

  SpreadsheetApp.flush();
}

// ── Estructura visual ─────────────────────────────────────────────────
function crearEstructura(ss) {
  ["Dashboard","Por Mes","Estadisticas"].forEach(n => {
    let s = ss.getSheetByName(n);
    if (s) ss.deleteSheet(s);
  });

  let AZUL    = "#1A5276";
  let VERDE   = "#1E8449";
  let ROJO    = "#C0392B";
  let NARANJA = "#D4880A";
  let BLANCO  = "#FFFFFF";
  let GRIS    = "#F2F3F4";
  let OSCURO  = "#2C3E50";

  // ════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════
  let dash = ss.insertSheet("Dashboard", 0);

  // Anchos
  dash.setColumnWidth(1,10);
  dash.setColumnWidth(2,180);
  dash.setColumnWidth(3,90);
  dash.setColumnWidth(4,140);
  dash.setColumnWidth(5,160);
  dash.setColumnWidth(6,200);
  dash.setColumnWidth(7,10);

  // ── Fila 1: Título
  dash.setRowHeight(1,60);
  let tit = dash.getRange("B1:F1");
  tit.merge();
  tit.setValue("💰  FINANZAS JESUS VANEGAS  💰");
  tit.setBackground(AZUL).setFontColor(BLANCO).setFontSize(18).setFontWeight("bold")
     .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // ── Fila 2: Mes actual (valor estático — se actualiza con actualizarDashboard)
  dash.setRowHeight(2,28);
  let mesCell = dash.getRange("B2:F2");
  mesCell.merge();
  mesCell.setValue("📅 ...");
  mesCell.setBackground("#D6EAF8").setFontColor(AZUL).setFontSize(11)
         .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

  // ── Fila 3: espacio
  dash.setRowHeight(3,8);

  // ── Filas 4-5: KPIs con fórmulas
  dash.setRowHeight(4,20);
  dash.setRowHeight(5,55);

  let kpis = [
    ["C","💵 INGRESOS",  VERDE,
     `=SUMPRODUCT((MONTH('Hoja 1'!A$2:A$1000)=MONTH(TODAY()))*(YEAR('Hoja 1'!A$2:A$1000)=YEAR(TODAY()))*('Hoja 1'!C$2:C$1000="INGRESO")*('Hoja 1'!D$2:D$1000))`,
     '$#,##0'],
    ["D","💸 GASTOS",    ROJO,
     `=SUMPRODUCT((MONTH('Hoja 1'!A$2:A$1000)=MONTH(TODAY()))*(YEAR('Hoja 1'!A$2:A$1000)=YEAR(TODAY()))*('Hoja 1'!C$2:C$1000="GASTO")*('Hoja 1'!D$2:D$1000))`,
     '$#,##0'],
    ["E","💰 BALANCE",   AZUL,   `=C5-D5`,  '$#,##0'],
    ["F","📉 % GASTADO", NARANJA,`=IFERROR(D5/C5,0)`, '0.0%'],
  ];

  kpis.forEach(([col,lbl,color,formula,fmt]) => {
    dash.getRange(`${col}4`).setValue(lbl).setBackground(color).setFontColor(BLANCO)
        .setFontSize(9).setFontWeight("bold").setHorizontalAlignment("center");
    let v = dash.getRange(`${col}5`);
    v.setFormula(formula).setBackground(color).setFontColor(BLANCO)
     .setFontSize(20).setFontWeight("bold").setHorizontalAlignment("center")
     .setVerticalAlignment("middle").setNumberFormat(fmt);
  });

  // ── Fila 5-6: Estado y barra de progreso
  dash.setRowHeight(6,22);
  dash.setRowHeight(7,22);
  dash.setRowHeight(8,8);

  let estadoR = dash.getRange("B6:F6");
  estadoR.merge();
  estadoR.setValue("📊 Calculando...").setBackground(GRIS).setFontSize(10)
         .setHorizontalAlignment("center").setVerticalAlignment("middle");

  let barraR = dash.getRange("B7:F7");
  barraR.merge();
  barraR.setValue("▓▓▓▓▓░░░░░ ...").setBackground(GRIS).setFontSize(10).setFontFamily("Courier New")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");

  // ── Últimos movimientos
  dash.setRowHeight(9,32);
  let movTit = dash.getRange("B9:F9");
  movTit.merge().setValue("📋  ÚLTIMOS MOVIMIENTOS");
  movTit.setBackground(OSCURO).setFontColor(BLANCO).setFontSize(11).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");

  dash.setRowHeight(10,22);
  ["📅 Fecha","🕐 Hora","🔄 Tipo","💵 Monto","📝 Descripción"].forEach((h,i) => {
    dash.getRange(10,i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold")
        .setHorizontalAlignment("center").setFontSize(9);
  });

  for (let i=0; i<10; i++) {
    dash.setRowHeight(11+i, 24);
    dash.getRange(`B${11+i}:F${11+i}`).setBackground(i%2===0?GRIS:BLANCO);
    dash.getRange(`E${11+i}`).setNumberFormat('$#,##0');
  }

  // Fila actualización
  dash.setRowHeight(22,20);
  dash.getRange("B22:F22").merge().setBackground(GRIS).setFontColor("#7F8C8D").setFontSize(8)
      .setHorizontalAlignment("right");

  // Bordes generales
  dash.getRange("B1:F21").setBorder(true,true,true,true,null,null,"#BDC3C7", SpreadsheetApp.BorderStyle.SOLID);

  // ════════════════════════════════════════════
  // POR MES
  // ════════════════════════════════════════════
  let pm = ss.insertSheet("Por Mes", 1);
  pm.setColumnWidth(1,10); pm.setColumnWidth(2,160);
  pm.setColumnWidth(3,140); pm.setColumnWidth(4,140);
  pm.setColumnWidth(5,140); pm.setColumnWidth(6,10);

  dash.setRowHeight(1,50);
  let pmTit = pm.getRange("B1:E1");
  pmTit.merge().setValue("📅  RESUMEN POR MES");
  pmTit.setBackground(AZUL).setFontColor(BLANCO).setFontSize(14).setFontWeight("bold")
       .setHorizontalAlignment("center").setVerticalAlignment("middle");
  pm.setRowHeight(1,50);

  pm.setRowHeight(2,26);
  ["Mes","💵 Ingresos","💸 Gastos","💰 Balance"].forEach((h,i) => {
    pm.getRange(2,i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold")
      .setHorizontalAlignment("center").setFontSize(10);
  });

  for (let i=3; i<=26; i++) {
    pm.setRowHeight(i,26);
    pm.getRange(`C${i}`).setNumberFormat('$#,##0');
    pm.getRange(`D${i}`).setNumberFormat('$#,##0');
    pm.getRange(`E${i}`).setNumberFormat('$#,##0');
  }

  pm.setRowHeight(27,30);
  ["💰 TOTAL","","",""].forEach((v,i) => {
    let c = pm.getRange(27,i+2);
    c.setValue(v).setBackground("#D5D8DC").setFontWeight("bold").setFontSize(10);
  });
  pm.getRange("C27").setNumberFormat('$#,##0');
  pm.getRange("D27").setNumberFormat('$#,##0');
  pm.getRange("E27").setNumberFormat('$#,##0');

  pm.getRange("B1:E27").setBorder(true,true,true,true,null,null,"#BDC3C7",SpreadsheetApp.BorderStyle.SOLID);

  // Gráfica
  let chart = pm.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(pm.getRange("B2:D14")).setPosition(3,7,0,0)
    .setOption("title","📊 Ingresos vs Gastos por Mes")
    .setOption("width",520).setOption("height",320)
    .setOption("colors",["#1E8449","#C0392B"])
    .setOption("legend.position","bottom").build();
  pm.insertChart(chart);

  // ════════════════════════════════════════════
  // ESTADÍSTICAS
  // ════════════════════════════════════════════
  let est = ss.insertSheet("Estadisticas", 2);
  est.setColumnWidth(1,10); est.setColumnWidth(2,240);
  est.setColumnWidth(3,160); est.setColumnWidth(4,10);

  let estTit = est.getRange("B1:C1");
  estTit.merge().setValue("📈  GASTOS POR CATEGORÍA");
  estTit.setBackground(AZUL).setFontColor(BLANCO).setFontSize(14).setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
  est.setRowHeight(1,50);

  est.setRowHeight(2,24);
  ["🏷️ Categoría","💸 Total Gastado"].forEach((h,i) => {
    est.getRange(2,i+2).setValue(h).setBackground("#D6EAF8").setFontWeight("bold")
       .setHorizontalAlignment("center");
  });

  for (let i=3; i<=32; i++) {
    est.setRowHeight(i,26);
    est.getRange(`B${i}:C${i}`).setBackground(i%2===0?GRIS:BLANCO);
    est.getRange(`C${i}`).setNumberFormat('$#,##0');
  }

  est.getRange("B1:C32").setBorder(true,true,true,true,null,null,"#BDC3C7",SpreadsheetApp.BorderStyle.SOLID);

  // Gráfica pastel
  let pie = est.newChart().setChartType(Charts.ChartType.PIE)
    .addRange(est.getRange("B2:C32")).setPosition(3,5,0,0)
    .setOption("title","🍕 Distribución de Gastos")
    .setOption("width",480).setOption("height",380)
    .setOption("pieSliceText","percentage")
    .setOption("legend.position","right").build();
  est.insertChart(pie);
}

// ── Trigger diario ─────────────────────────────────────────────────────
function crearTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("actualizarDashboard").timeBased().everyDays(1).atHour(7).create();
}
