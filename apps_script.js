let SPREADSHEET_ID = "1m4zWkPYKFmHZk_bjL7Napo-fDrr_RtoymhwLvM1Q3bA";
let SHEET_NAME     = "Movimientos";

function getSheet() {
  let ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Fecha", "Hora", "Tipo", "Monto", "Descripcion", "Mes"]);
  }
  return sheet;
}

function doGet(e) {
  try {
    let action = e.parameter.action || "";

    // ── Registrar movimiento via GET (evita problemas de redirect con POST)
    if (action === "registrar") {
      let sheet = getSheet();
      let now   = new Date();
      let mes   = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/yyyy");
      sheet.appendRow([
        e.parameter.fecha       || "",
        e.parameter.hora        || "",
        e.parameter.tipo        || "",
        Number(e.parameter.monto) || 0,
        e.parameter.descripcion || "",
        mes
      ]);
      return ok({ mensaje: "Registrado correctamente" });
    }

    // ── Resumen del mes
    if (action === "resumen") {
      let registros = getRegistros();
      let mes       = e.parameter.mes || "";
      let [mm, yyyy] = mes.split("/");
      let del_mes = registros.filter(r => {
        let partes = (r["Fecha"] || "").toString().split("/");
        return partes.length === 3 && partes[1] === mm && partes[2] === yyyy;
      });
      let ingresos = del_mes.filter(r => r["Tipo"] === "INGRESO")
                            .reduce((s, r) => s + Number(r["Monto"]), 0);
      let gastos   = del_mes.filter(r => r["Tipo"] === "GASTO")
                            .reduce((s, r) => s + Number(r["Monto"]), 0);
      return ok({ ingresos, gastos, balance: ingresos - gastos });
    }

    // ── Historial
    if (action === "historial") {
      let registros = getRegistros();
      return ok({ registros: registros.slice(-10) });
    }

    return error("Acción no reconocida: " + action);
  } catch(err) {
    return error(err.message);
  }
}

function doPost(e) {
  // Redirige a doGet usando los datos del body
  try {
    let data = JSON.parse(e.postData.contents);
    e.parameter = e.parameter || {};
    Object.keys(data).forEach(k => e.parameter[k] = data[k]);
    return doGet(e);
  } catch(err) {
    return error(err.message);
  }
}

function getRegistros() {
  let sheet = getSheet();
  if (sheet.getLastRow() <= 1) return [];
  let rows    = sheet.getDataRange().getValues();
  let headers = rows[0];
  return rows.slice(1).map(r => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  }).filter(r => r["Fecha"] !== "");
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
