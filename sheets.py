import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXqIQovqriY_586OV6YN3Dyiu72u0asj5z8aknMwCwEz_m3pVaNJWwT6TKZH89YiIg/exec"

def _get(params):
    try:
        r = requests.get(SCRIPT_URL, params=params, timeout=20)
        logger.info("Apps Script [%s]: %s", r.status_code, r.text[:300])
        return r.json()
    except Exception as e:
        logger.error("Error Apps Script: %s", e)
        return {"status": "error", "mensaje": str(e)}

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    data = _get({
        "action":      "registrar",
        "fecha":       now.strftime("%d/%m/%Y"),
        "hora":        now.strftime("%H:%M"),
        "tipo":        tipo,
        "monto":       int(monto),
        "descripcion": descripcion.strip(),
    })
    logger.info("Resultado registro: %s", data)
    return data

def obtener_resumen_mes():
    mes  = datetime.now().strftime("%m/%Y")
    data = _get({"action": "resumen", "mes": mes})
    if data.get("status") != "ok":
        return 0, 0, 0
    return data.get("ingresos", 0), data.get("gastos", 0), data.get("balance", 0)

def obtener_historial():
    data = _get({"action": "historial"})
    if data.get("status") != "ok":
        return []
    return data.get("registros", [])
