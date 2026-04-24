import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXqIQovqriY_586OV6YN3Dyiu72u0asj5z8aknMwCwEz_m3pVaNJWwT6TKZH89YiIg/exec"

def _post(payload):
    # Apps Script redirige POST → hay que re-enviar POST a la URL de redirect
    try:
        r = requests.post(SCRIPT_URL, json=payload, allow_redirects=False, timeout=10)
        if r.status_code in (301, 302, 303, 307, 308):
            location = r.headers.get("Location", SCRIPT_URL)
            r = requests.post(location, json=payload, timeout=20)
        logger.info("Apps Script response [%s]: %s", r.status_code, r.text[:200])
        return r.json()
    except Exception as e:
        logger.error("Error en POST a Apps Script: %s", e)
        return {"status": "error", "mensaje": str(e)}

def _get(params):
    try:
        r = requests.get(SCRIPT_URL, params=params, timeout=15)
        return r.json()
    except Exception as e:
        logger.error("Error en GET a Apps Script: %s", e)
        return {"status": "error"}

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    payload = {
        "action":      "registrar",
        "fecha":       now.strftime("%d/%m/%Y"),
        "hora":        now.strftime("%H:%M"),
        "tipo":        tipo,
        "monto":       int(monto),
        "descripcion": descripcion.strip(),
    }
    logger.info("Registrando: %s", payload)
    return _post(payload)

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
