import requests
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

API_URL    = os.environ.get("SHEETDB_URL")
SHEET_NAME = "Movimientos"

def _params():
    return {"sheet": SHEET_NAME}

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    payload = {
        "data": {
            "Fecha":       now.strftime("%d/%m/%Y"),
            "Hora":        now.strftime("%H:%M"),
            "Tipo":        tipo,
            "Monto":       int(monto),
            "Descripcion": descripcion.strip(),
            "Mes":         now.strftime("%m/%Y"),
        }
    }
    logger.info("SheetDB payload: %s", payload)
    r = requests.post(API_URL, json=payload, params=_params())
    logger.info("SheetDB response: %s", r.text)
    return r.json()

def obtener_resumen_mes():
    mes = datetime.now().strftime("%m/%Y")
    r = requests.get(API_URL, params=_params())
    records = r.json()
    if not isinstance(records, list):
        return 0, 0, 0
    del_mes = [rec for rec in records if rec.get("Mes") == mes]
    ingresos = sum(float(rec["Monto"]) for rec in del_mes if rec.get("Tipo") == "INGRESO")
    gastos   = sum(float(rec["Monto"]) for rec in del_mes if rec.get("Tipo") == "GASTO")
    return ingresos, gastos, ingresos - gastos

def obtener_historial():
    r = requests.get(API_URL, params=_params())
    records = r.json()
    if not isinstance(records, list):
        return []
    return records[-10:]
