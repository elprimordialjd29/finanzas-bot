import requests
import os
import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# SheetDB para escritura (probado, funciona sin redirect)
SHEETDB_URL = os.environ.get("SHEETDB_URL", "https://sheetdb.io/api/v1/manf9v5gmqz0w")
SHEET_NAME  = "Movimientos"

# Apps Script para lectura
SCRIPT_URL  = "https://script.google.com/macros/s/AKfycbyXqIQovqriY_586OV6YN3Dyiu72u0asj5z8aknMwCwEz_m3pVaNJWwT6TKZH89YiIg/exec"

def _limpiar(texto):
    """Elimina emojis y caracteres que SheetDB rechaza."""
    return re.sub(r'[^\w\s\-.,:/áéíóúñÁÉÍÓÚÑ]', '', str(texto)).strip()

def registrar_movimiento(tipo, monto, descripcion):
    now = datetime.now()
    payload = {
        "data": {
            "Fecha":       now.strftime("%d/%m/%Y"),
            "Hora":        now.strftime("%H:%M"),
            "Tipo":        tipo,
            "Monto":       int(monto),
            "Descripcion": _limpiar(descripcion),
            "Mes":         now.strftime("%m/%Y"),
        }
    }
    logger.info("SheetDB escribiendo: %s", payload)
    r = requests.post(
        SHEETDB_URL,
        json=payload,
        params={"sheet": SHEET_NAME},
        timeout=15,
    )
    logger.info("SheetDB respuesta: %s %s", r.status_code, r.text[:200])
    if r.status_code not in (200, 201):
        raise RuntimeError(f"SheetDB error {r.status_code}: {r.text[:100]}")
    return r.json()

def obtener_resumen_mes():
    mes = datetime.now().strftime("%m/%Y")
    try:
        r = requests.get(
            SHEETDB_URL,
            params={"sheet": SHEET_NAME},
            timeout=15,
        )
        records = r.json()
        if not isinstance(records, list):
            return 0, 0, 0
        del_mes  = [rec for rec in records if rec.get("Mes") == mes]
        ingresos = sum(float(rec["Monto"]) for rec in del_mes if rec.get("Tipo") == "INGRESO")
        gastos   = sum(float(rec["Monto"]) for rec in del_mes if rec.get("Tipo") == "GASTO")
        return ingresos, gastos, ingresos - gastos
    except Exception as e:
        logger.error("Error resumen: %s", e)
        return 0, 0, 0

def obtener_historial():
    try:
        r = requests.get(
            SHEETDB_URL,
            params={"sheet": SHEET_NAME},
            timeout=15,
        )
        records = r.json()
        if not isinstance(records, list):
            return []
        return records[-10:]
    except Exception as e:
        logger.error("Error historial: %s", e)
        return []
