let SPREADSHEET_ID = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";
let SHEET_NAME     = "Movimientos";

function getSheet() {
  let ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Fecha", "Hora", "Tipo", "Monto", "Descripcion", "Mes"]);
  }
  // Aplicar SIEMPRE (no solo al crear) — evita auto-conversión de hora/mes a número
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange("B:B").setNumberFormat("@");
  sheet.getRange("F:F").setNumberFormat("@");
  sheet.getRange("D:D").setNumberFormat("$#,##0");
  return sheet;
}

function doGet(e) {
  try {
    let action = (e.parameter && e.parameter.action) ? e.parameter.action : "";

    // ── REGISTRAR ─────────────────────────────────────────────────
    if (action === "registrar") {
      let sheet = getSheet();

      let fecha = e.parameter.fecha       || "";
      let hora  = e.parameter.hora        || "";
      let tipo  = e.parameter.tipo        || "";
      let monto = Number(e.parameter.monto) || 0;
      let desc  = e.parameter.descripcion || "";

      // Mes: usar el que viene del bot (ya formateado como MM/YYYY)
      // Si no viene, calcularlo en el servidor
      let mes = e.parameter.mes || "";
      if (!mes) {
        let now  = new Date();
        let mm   = String(now.getMonth() + 1).padStart(2, "0");
        mes = mm + "/" + now.getFullYear();
      }

      // Escritura celda a celda con setNumberFormat para evitar
      // que Google Sheets auto-convierta hora/mes a número
      let lastRow = sheet.getLastRow() + 1;
      sheet.getRange(lastRow, 1).setNumberFormat("@").setValue(fecha);
      sheet.getRange(lastRow, 2).setNumberFormat("@").setValue(hora);
      sheet.getRange(lastRow, 3).setValue(tipo);
      sheet.getRange(lastRow, 4).setNumberFormat("$#,##0").setValue(monto);
      sheet.getRange(lastRow, 5).setValue(desc);
      sheet.getRange(lastRow, 6).setNumberFormat("@").setValue(mes);

      return ok({ mensaje: "Registrado", fila: lastRow, desc: desc, mes: mes });
    }

    // ── RESUMEN ───────────────────────────────────────────────────
    if (action === "resumen") {
      let registros = getRegistros();
      let mes       = e.parameter.mes || "";

      // Filtrar por columna Mes (ya viene como "MM/YYYY" desde el bot)
      let del_mes = registros.filter(r => {
        let m = (r["Mes"] || "").toString().trim();
        return m === mes;
      });

      let ingresos = del_mes
        .filter(r => r["Tipo"] === "INGRESO")
        .reduce((s, r) => s + Number(r["Monto"]), 0);
      let gastos = del_mes
        .filter(r => r["Tipo"] === "GASTO")
        .reduce((s, r) => s + Number(r["Monto"]), 0);

      return ok({ ingresos, gastos, balance: ingresos - gastos });
    }

    // ── HISTORIAL ─────────────────────────────────────────────────
    if (action === "historial") {
      return ok({ registros: getRegistros().slice(-10) });
    }

    return error("Accion no reconocida: " + action);
  } catch(err) {
    return error(err.message);
  }
}

function doPost(e) {
  try {
    let data  = JSON.parse(e.postData.contents);
    let fakeE = { parameter: data };
    return doGet(fakeE);
  } catch(err) {
    return error(err.message);
  }
}

function getRegistros() {
  let sheet = getSheet();
  if (sheet.getLastRow() <= 1) return [];
  let rows    = sheet.getDataRange().getValues();
  let headers = rows[0];
  return rows.slice(1)
    .map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    })
    .filter(r => r["Fecha"] !== "" && r["Fecha"] !== null);
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "error", mensaje: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
