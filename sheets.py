import requests
import os
import re
from datetime import datetime

def limpiar_texto(texto):
    return re.sub(r'[^\w\s\-.,áéíóúñÁÉÍÓÚÑ]', '', texto).strip()

API_URL    = os.environ.get("SHEETDB_URL")
SHEET_NAME = "Hoja 1"
DATA_URL   = f"{API_URL}?sheet={SHEET_NAME}"

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    payload = {
        "data": {
            "Fecha": now.strftime("%d/%m/%Y"),
            "Hora": now.strftime("%H:%M"),
            "Tipo": tipo,
            "Monto": monto,
            "Descripcion": "",
            "Mes": now.strftime("%m/%Y"),
        }
    }
    descripcion_limpia = limpiar_texto(descripcion)
    payload["data"]["Descripcion"] = descripcion_limpia
    r = requests.post(f"{API_URL}?sheet={SHEET_NAME}", json=payload)
    return r.json()

def obtener_resumen_mes():
    mes = datetime.now().strftime("%m/%Y")
    r = requests.get(DATA_URL)
    records = r.json()
    if not isinstance(records, list):
        return 0, 0, 0
    del_mes = [rec for rec in records if rec.get("Mes") == mes]
    ingresos = sum(float(r["Monto"]) for r in del_mes if r.get("Tipo") == "INGRESO")
    gastos   = sum(float(r["Monto"]) for r in del_mes if r.get("Tipo") == "GASTO")
    return ingresos, gastos, ingresos - gastos

def obtener_historial():
    r = requests.get(DATA_URL)
    records = r.json()
    if not isinstance(records, list):
        return []
    return records[-10:]
