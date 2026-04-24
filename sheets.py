import requests
import os
from datetime import datetime

WEB_APP_URL = os.environ.get("APPS_SCRIPT_URL")

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    payload = {
        "action": "registrar",
        "fecha": now.strftime("%d/%m/%Y"),
        "hora": now.strftime("%H:%M"),
        "tipo": tipo,
        "monto": monto,
        "descripcion": descripcion,
    }
    r = requests.post(WEB_APP_URL, json=payload)
    return r.json()

def obtener_resumen_mes():
    mes = datetime.now().strftime("%B %Y")
    r = requests.get(WEB_APP_URL, params={"action": "resumen", "mes": mes})
    data = r.json()
    return data.get("ingresos", 0), data.get("gastos", 0), data.get("balance", 0)

def obtener_historial():
    r = requests.get(WEB_APP_URL, params={"action": "historial"})
    data = r.json()
    return data.get("registros", [])
