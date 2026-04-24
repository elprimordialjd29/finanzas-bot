const SHEET_NAME = "Movimientos";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const now = new Date();
    const mes = Utilities.formatDate(now, Session.getScriptTimeZone(), "MMMM yyyy");

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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
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
      const del_mes = records.filter(r => r["Mes"] === mes);
      const ingresos = del_mes.filter(r => r["Tipo"] === "INGRESO").reduce((s, r) => s + Number(r["Monto"]), 0);
      const gastos = del_mes.filter(r => r["Tipo"] === "GASTO").reduce((s, r) => s + Number(r["Monto"]), 0);

      const por_categoria = {};
      del_mes.filter(r => r["Tipo"] === "GASTO").forEach(r => {
        const cat = r["Descripcion"] || "Varios";
        por_categoria[cat] = (por_categoria[cat] || 0) + Number(r["Monto"]);
      });

      return ok({ingresos, gastos, balance: ingresos - gastos, por_categoria});
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
