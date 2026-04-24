import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXqIQovqriY_586OV6YN3Dyiu72u0asj5z8aknMwCwEz_m3pVaNJWwT6TKZH89YiIg/exec"

def _post(payload):
    """POST a Apps Script siguiendo el redirect manualmente (requests cambia POST→GET en 302)."""
    try:
        # Paso 1: obtener URL de redirect sin seguirlo
        r1 = requests.post(SCRIPT_URL, json=payload, allow_redirects=False, timeout=10)
        logger.info("POST step1: status=%s location=%s", r1.status_code, r1.headers.get("Location",""))

        if r1.status_code in (301, 302, 303, 307, 308):
            location = r1.headers["Location"]
            # Paso 2: POST a la URL real manteniendo el método
            r2 = requests.post(location, json=payload, timeout=20)
            logger.info("POST step2: status=%s body=%s", r2.status_code, r2.text[:300])
            return r2.json()

        return r1.json()
    except Exception as e:
        logger.error("Error POST Apps Script: %s", e)
        return {"status": "error", "mensaje": str(e)}

def _get(params):
    try:
        r = requests.get(SCRIPT_URL, params=params, timeout=15)
        logger.info("GET status=%s body=%s", r.status_code, r.text[:200])
        return r.json()
    except Exception as e:
        logger.error("Error GET Apps Script: %s", e)
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
    resultado = _post(payload)
    if resultado.get("status") != "ok":
        raise RuntimeError(resultado.get("mensaje", "Error desconocido"))
    return resultado

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
