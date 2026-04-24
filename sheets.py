import requests
import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXqIQovqriY_586OV6YN3Dyiu72u0asj5z8aknMwCwEz_m3pVaNJWwT6TKZH89YiIg/exec"

class _PostSession(requests.Session):
    """Session que preserva POST en todos los redirects (Apps Script usa 302)."""
    def rebuild_method(self, prepared_request, response):
        pass  # no cambiar el método

def _post(payload):
    try:
        session = _PostSession()
        r = session.post(SCRIPT_URL, json=payload, timeout=30)
        logger.info("POST status=%s body=%s", r.status_code, r.text[:300])
        return r.json()
    except Exception as e:
        logger.error("Error POST: %s", e)
        return {"status": "error", "mensaje": str(e)}

def _get(params):
    try:
        r = requests.get(SCRIPT_URL, params=params, timeout=15)
        logger.info("GET status=%s body=%s", r.status_code, r.text[:200])
        return r.json()
    except Exception as e:
        logger.error("Error GET: %s", e)
        return {"status": "error"}

def _limpiar(texto):
    """Elimina emojis y caracteres problemáticos."""
    return re.sub(r'[^\w\s\-.,:/áéíóúñÁÉÍÓÚÑ]', '', str(texto)).strip()

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    payload = {
        "action":      "registrar",
        "fecha":       now.strftime("%d/%m/%Y"),
        "hora":        now.strftime("%H:%M"),
        "tipo":        tipo,
        "monto":       int(monto),
        "descripcion": _limpiar(descripcion),
    }
    logger.info("Registrando: %s", payload)
    resultado = _post(payload)
    if resultado.get("status") != "ok":
        raise RuntimeError(resultado.get("mensaje", "Error en Apps Script"))
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
