import requests
import os
import re
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SHEETDB_URL = os.environ.get("SHEETDB_URL", "https://sheetdb.io/api/v1/manf9v5gmqz0w")
SHEET_NAME  = "Movimientos"

# Apps Script — maneja TODO (lectura y escritura)
SCRIPT_URL = os.environ.get(
    "SCRIPT_URL",
    "https://script.google.com/macros/s/AKfycbwf8eeDXEzNR_iR4FMyXm7debqEVOCHYGFigywbYlswGcAKoTOP1pY63xStT1jDBx1c/exec",
)


def _limpiar(texto):
    """Elimina emojis y caracteres problemáticos."""
    return re.sub(r'[^\w\s\-.,:/áéíóúñÁÉÍÓÚÑ]', '', str(texto)).strip()


def _monto(val):
    """Convierte cualquier formato de monto a float."""
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace('$', '').replace(' ', '')
    if s.count('.') > 1:
        s = s.replace('.', '')
    elif s.count('.') == 1 and s.count(',') == 0:
        partes = s.split('.')
        if len(partes[1]) == 3:
            s = s.replace('.', '')
    s = s.replace(',', '.')
    try:
        return float(s)
    except Exception:
        return 0.0


def registrar_movimiento(tipo, monto, descripcion):
    """Registra en Google Sheets via Apps Script GET.
    Envía todos los datos como un solo parámetro JSON para evitar
    problemas de parsing de múltiples parámetros URL en Apps Script."""
    import json, urllib.parse
    now  = datetime.now()
    desc = _limpiar(descripcion)

    payload = {
        "fecha":       now.strftime("%d/%m/%Y"),
        "hora":        now.strftime("%H:%M"),
        "tipo":        tipo,
        "monto":       int(monto),
        "descripcion": desc,
        "mes":         now.strftime("%m/%Y"),
    }
    # Codificar datos como JSON en un único parámetro URL
    url = f"{SCRIPT_URL}?action=registrar&data={urllib.parse.quote(json.dumps(payload))}"
    logger.info("Apps Script registro → tipo=%s monto=%s desc='%s'", tipo, monto, desc)
    r = requests.get(url, timeout=20, allow_redirects=True)
    logger.info("Apps Script respuesta: %s %s", r.status_code, r.text[:300])
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Apps Script error {r.status_code}: {r.text[:100]}")
    data = r.json()
    if data.get("status") != "ok":
        raise RuntimeError(f"Apps Script error: {data.get('mensaje', 'desconocido')}")
    return data


def obtener_resumen_mes():
    mes = datetime.now().strftime("%m/%Y")
    try:
        r = requests.get(
            SCRIPT_URL,
            params={"action": "resumen", "mes": mes},
            timeout=15,
            allow_redirects=True,
        )
        data = r.json()
        if data.get("status") == "ok":
            ingresos = float(data.get("ingresos", 0))
            gastos   = float(data.get("gastos", 0))
            return ingresos, gastos, ingresos - gastos
        return 0, 0, 0
    except Exception as e:
        logger.error("Error resumen: %s", e)
        return 0, 0, 0


def obtener_historial():
    try:
        r = requests.get(
            SCRIPT_URL,
            params={"action": "historial"},
            timeout=15,
            allow_redirects=True,
        )
        data = r.json()
        if data.get("status") == "ok":
            return data.get("registros", [])
        return []
    except Exception as e:
        logger.error("Error historial: %s", e)
        return []
