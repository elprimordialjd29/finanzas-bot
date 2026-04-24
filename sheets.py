import requests
import os
from datetime import datetime

API_URL = os.environ.get("SHEETDB_URL")

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    payload = {
        "data": {
            "Fecha": now.strftime("%d/%m/%Y"),
            "Hora": now.strftime("%H:%M"),
            "Tipo": tipo,
            "Monto": monto,
            "Descripcion": descripcion,
            "Mes": now.strftime("%m/%Y"),
        }
    }
    r = requests.post(API_URL, json=payload)
    return r.json()

def obtener_resumen_mes():
    mes = datetime.now().strftime("%m/%Y")
    r = requests.get(API_URL)
    records = r.json()
    if not isinstance(records, list):
        return 0, 0, 0
    del_mes = [rec for rec in records if rec.get("Mes") == mes]
    ingresos = sum(float(r["Monto"]) for r in del_mes if r.get("Tipo") == "INGRESO")
    gastos   = sum(float(r["Monto"]) for r in del_mes if r.get("Tipo") == "GASTO")
    return ingresos, gastos, ingresos - gastos

def obtener_historial():
    r = requests.get(API_URL)
    records = r.json()
    if not isinstance(records, list):
        return []
    return records[-10:]
