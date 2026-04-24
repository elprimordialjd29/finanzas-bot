import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvGOmCph1_L8Ds5gmEN4wGjA4teqtwsLfk423nkfYWRgHEgJNvAmVrfl54FKyNg0ON/exec"

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
    logger.info("Apps Script payload: %s", payload)
    r = requests.post(SCRIPT_URL, json=payload)
    logger.info("Apps Script response: %s", r.text)
    return r.json()

def obtener_resumen_mes():
    mes = datetime.now().strftime("%m/%Y")
    r = requests.get(SCRIPT_URL, params={"action": "resumen", "mes": mes})
    data = r.json()
    if data.get("status") != "ok":
        return 0, 0, 0
    return data.get("ingresos", 0), data.get("gastos", 0), data.get("balance", 0)

def obtener_historial():
    r = requests.get(SCRIPT_URL, params={"action": "historial"})
    data = r.json()
    if data.get("status") != "ok":
        return []
    return data.get("registros", [])
