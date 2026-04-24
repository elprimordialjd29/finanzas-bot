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

function doPost(e) {
  try {
    let data  = JSON.parse(e.postData.contents);
    let sheet = getSheet();
    let now   = new Date();
    let mes   = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/yyyy");

    if (data.action === "registrar") {
      sheet.appendRow([data.fecha, data.hora, data.tipo, data.monto, data.descripcion, mes]);
      return ok({ mensaje: "Registrado correctamente" });
    }

    return error("Acción no reconocida");
  } catch(e) {
    return error(e.message);
  }
}

function doGet(e) {
  try {
    let sheet   = getSheet();
    let rows    = sheet.getDataRange().getValues();
    let headers = rows[0];
    let records = rows.slice(1).map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    let action = e.parameter.action;
    let mes    = e.parameter.mes || "";

    if (action === "resumen") {
      let [mm, yyyy] = mes.split("/");
      let del_mes = records.filter(r => {
        let fecha  = r["Fecha"] ? r["Fecha"].toString() : "";
        let partes = fecha.split("/");
        return partes.length === 3 && partes[1] === mm && partes[2] === yyyy;
      });
      let ingresos = del_mes.filter(r => r["Tipo"] === "INGRESO")
                            .reduce((s, r) => s + Number(r["Monto"]), 0);
      let gastos   = del_mes.filter(r => r["Tipo"] === "GASTO")
                            .reduce((s, r) => s + Number(r["Monto"]), 0);
      return ok({ ingresos, gastos, balance: ingresos - gastos });
    }

    if (action === "historial") {
      return ok({ registros: records.slice(-10) });
    }

    return error("Acción no reconocida");
  } catch(e) {
    return error(e.message);
  }
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
