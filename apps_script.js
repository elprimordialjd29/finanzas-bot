const SPREADSHEET_ID = "1BKx9wor71zAYmd4NPQGDpcTshNA0oQZvHKA4LdjhLX4";
const SHEET_NAME = "Movimientos";

function getSheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet();
    const now = new Date();
    const mes = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/yyyy");

    if (data.action === "registrar") {
      sheet.appendRow([data.fecha, data.hora, data.tipo, data.monto, data.descripcion, mes]);
      return ok({mensaje: "Registrado correctamente"});
    }

    return error("Acción no reconocida");
  } catch(e) {
    return error(e.message);
  }
}

function doGet(e) {
  try {
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const records = rows.slice(1).map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    const action = e.parameter.action;
    const mes = e.parameter.mes || "";

    if (action === "resumen") {
      const [mm, yyyy] = mes.split("/");
      const del_mes = records.filter(r => {
        const fecha = r["Fecha"] ? r["Fecha"].toString() : "";
        const partes = fecha.split("/");
        return partes.length === 3 && partes[1] === mm && partes[2] === yyyy;
      });

      const ingresos = del_mes.filter(r => r["Tipo"] === "INGRESO").reduce((s, r) => s + Number(r["Monto"]), 0);
      const gastos   = del_mes.filter(r => r["Tipo"] === "GASTO").reduce((s, r) => s + Number(r["Monto"]), 0);

      return ok({ingresos, gastos, balance: ingresos - gastos});
    }

    if (action === "historial") {
      return ok({registros: records.slice(-10)});
    }

    return error("Acción no reconocida");
  } catch(e) {
    return error(e.message);
  }
}

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify({status: "ok", ...data}))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return ContentService.createTextOutput(JSON.stringify({status: "error", mensaje: msg}))
    .setMimeType(ContentService.MimeType.JSON);
}
