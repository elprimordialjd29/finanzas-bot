import os
import logging
import requests as req_lib
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, ConversationHandler, ContextTypes, filters
)
from datetime import time
import sheets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TOKEN   = os.environ.get("TELEGRAM_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

CATEGORIAS_INGRESO = [
    "💼 Ingreso Fijo",
    "💵 Otros Ingresos",
]

CATEGORIAS_GASTO = [
    "🏠 Arriendo",
    "💡 Luz",
    "💧 Agua",
    "🔥 Gas",
    "📶 Internet",
    "📱 Plan Celular",
    "🛒 Mercado",
    "🚗 Transporte",
    "🏥 Salud",
    "💊 Medicamentos",
    "📚 Educación",
    "👕 Ropa",
    "🍽️ Restaurante",
    "🎬 Entretenimiento",
    "💳 Deudas / Créditos",
    "🛡️ Seguros",
    "🐾 Mascotas",
    "🎁 Regalos",
    "🔧 Reparaciones",
    "📦 Varios",
]

ELIGIENDO_TIPO, ELIGIENDO_CATEGORIA, ESPERANDO_MONTO, CONFIRMANDO_MONTO, ESPERANDO_DESCRIPCION = range(5)

MENU = ReplyKeyboardMarkup(
    [
        [KeyboardButton("💰 Ingreso"),  KeyboardButton("💸 Gasto")],
        [KeyboardButton("📊 Resumen"), KeyboardButton("💳 Saldo")],
        [KeyboardButton("📋 Historial"), KeyboardButton("🔧 Sistema")],
    ],
    resize_keyboard=True,
    is_persistent=True,
)

def formato_pesos(monto):
    return f"${monto:,.0f}".replace(",", ".")

def teclado_categorias(categorias):
    botones = []
    fila = []
    for i, cat in enumerate(categorias):
        fila.append(InlineKeyboardButton(cat, callback_data=cat))
        if len(fila) == 2:
            botones.append(fila)
            fila = []
    if fila:
        botones.append(fila)
    botones.append([InlineKeyboardButton("❌ Cancelar", callback_data="cancelar")])
    return InlineKeyboardMarkup(botones)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    from datetime import datetime
    hora = datetime.now().hour
    if hora < 12:
        saludo = "🌅 ¡Buenos días"
    elif hora < 18:
        saludo = "☀️ ¡Buenas tardes"
    else:
        saludo = "🌙 ¡Buenas noches"

    try:
        ingresos, gastos, balance = sheets.obtener_resumen_mes()
        emoji = "🟢" if balance >= 0 else "🔴"
        estado = (
            f"\n\n📊 *Este mes vas así:*\n"
            f"💵 Ingresos: {formato_pesos(ingresos)}\n"
            f"💸 Gastos:   {formato_pesos(gastos)}\n"
            f"{emoji} Balance: {formato_pesos(balance)}"
        )
    except Exception:
        estado = ""

    await update.message.reply_text(
        f"{saludo}, jefe! 👋*\n¿Cómo están tus finanzas hoy?*{estado}\n\nUsa los botones del menú 👇",
        parse_mode="Markdown",
        reply_markup=MENU,
    )

# ── Diagnóstico y reparación ──────────────────────────────────────────
async def sistema(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = await update.message.reply_text("🔍 Revisando el sistema...", reply_markup=MENU)

    checks  = []
    errores = []

    # 1. Verificar SheetDB — lectura
    try:
        r = req_lib.get(sheets.SHEETDB_URL, params={"sheet": sheets.SHEET_NAME}, timeout=10)
        if r.status_code == 200 and isinstance(r.json(), list):
            checks.append("✅ SheetDB lectura — OK")
        else:
            checks.append(f"❌ SheetDB lectura — HTTP {r.status_code}")
            errores.append("sheetdb_lectura")
    except Exception as e:
        checks.append(f"❌ SheetDB lectura — {e}")
        errores.append("sheetdb_lectura")

    # 2. Verificar SheetDB — escritura de prueba
    from datetime import datetime
    try:
        prueba = {
            "data": {
                "Fecha":       "TEST",
                "Hora":        "00:00",
                "Tipo":        "TEST",
                "Monto":       0,
                "Descripcion": "diagnostico-auto",
                "Mes":         "00/0000",
            }
        }
        r2 = req_lib.post(sheets.SHEETDB_URL, json=prueba,
                          params={"sheet": sheets.SHEET_NAME}, timeout=10)
        if r2.status_code in (200, 201):
            checks.append("✅ SheetDB escritura — OK")
            # Borrar la fila de prueba
            try:
                req_lib.delete(
                    f"{sheets.SHEETDB_URL}/Descripcion/diagnostico-auto",
                    params={"sheet": sheets.SHEET_NAME}, timeout=10
                )
            except Exception:
                pass
        else:
            checks.append(f"❌ SheetDB escritura — HTTP {r2.status_code}: {r2.text[:80]}")
            errores.append("sheetdb_escritura")
    except Exception as e:
        checks.append(f"❌ SheetDB escritura — {e}")
        errores.append("sheetdb_escritura")

    # 3. Verificar variables de entorno
    if TOKEN:
        checks.append("✅ TELEGRAM_TOKEN — OK")
    else:
        checks.append("❌ TELEGRAM_TOKEN — no configurado")
        errores.append("token")

    if CHAT_ID:
        checks.append("✅ TELEGRAM_CHAT_ID — OK")
    else:
        checks.append("❌ TELEGRAM_CHAT_ID — no configurado")
        errores.append("chat_id")

    # 4. Verificar resumen del mes
    try:
        ing, gas, bal = sheets.obtener_resumen_mes()
        checks.append(f"✅ Datos del mes — Ingresos: {formato_pesos(ing)} | Gastos: {formato_pesos(gas)}")
    except Exception as e:
        checks.append(f"❌ Resumen mes — {e}")
        errores.append("resumen")

    # Armar respuesta
    lineas = "\n".join(checks)
    if not errores:
        resultado = (
            f"🟢 *Sistema 100% operativo*\n\n"
            f"{lineas}\n\n"
            f"_Todo funciona correctamente_ ✨"
        )
    else:
        resultado = (
            f"🔴 *Se encontraron {len(errores)} problema(s)*\n\n"
            f"{lineas}\n\n"
            f"🔧 *Intentando reparar...*"
        )

    teclado_repair = None
    if errores:
        teclado_repair = InlineKeyboardMarkup([[
            InlineKeyboardButton("🔄 Reparar ahora", callback_data="reparar")
        ]])

    await msg.edit_text(resultado, parse_mode="Markdown", reply_markup=teclado_repair)

async def reparar_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("🔧 Reparando... un momento.")

    pasos = []

    # Intentar reconectar SheetDB
    try:
        r = req_lib.get(sheets.SHEETDB_URL, params={"sheet": sheets.SHEET_NAME}, timeout=10)
        if r.status_code == 200:
            pasos.append("✅ SheetDB reconectado")
        else:
            pasos.append(f"⚠️ SheetDB responde {r.status_code} — verifica tu cuenta en sheetdb.io")
    except Exception as e:
        pasos.append(f"❌ No se pudo conectar a SheetDB: {e}")

    # Verificar hoja "Movimientos"
    try:
        r2 = req_lib.get(sheets.SHEETDB_URL, params={"sheet": "Movimientos"}, timeout=10)
        if isinstance(r2.json(), list):
            pasos.append('✅ Hoja "Movimientos" encontrada')
        else:
            pasos.append('⚠️ Hoja "Movimientos" no responde — verifica el nombre en Google Sheets')
    except Exception:
        pasos.append('❌ No se pudo verificar la hoja')

    resumen_pasos = "\n".join(pasos)
    await query.edit_message_text(
        f"🔧 *Resultado de reparación:*\n\n{resumen_pasos}\n\n"
        f"Si persiste el error, escribe /start para reiniciar el bot.",
        parse_mode="Markdown",
    )

# ── Inicio del flujo de registro ─────────────────────────────────────
async def iniciar_ingreso(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["tipo"] = "INGRESO"
    await update.message.reply_text(
        "💰 *¿Qué tipo de ingreso?*",
        parse_mode="Markdown",
        reply_markup=teclado_categorias(CATEGORIAS_INGRESO),
    )
    return ELIGIENDO_CATEGORIA

async def iniciar_gasto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["tipo"] = "GASTO"
    await update.message.reply_text(
        "💸 *¿Qué tipo de gasto?*",
        parse_mode="Markdown",
        reply_markup=teclado_categorias(CATEGORIAS_GASTO),
    )
    return ELIGIENDO_CATEGORIA

async def elegir_categoria(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "cancelar":
        await query.edit_message_text("❌ Cancelado.")
        return ConversationHandler.END

    context.user_data["categoria"] = query.data
    tipo = context.user_data["tipo"]
    emoji = "💵" if tipo == "INGRESO" else "💸"

    await query.edit_message_text(
        f"{emoji} *{query.data}*\n\n¿Cuánto? Escribe el monto:",
        parse_mode="Markdown",
    )
    return ESPERANDO_MONTO

async def recibir_monto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    texto = update.message.text.strip().replace("$", "").replace(" ", "")
    if texto.count(".") > 1:
        texto = texto.replace(".", "")
    elif texto.count(",") > 1:
        texto = texto.replace(",", "")
    else:
        texto = texto.replace(",", "").replace(".", "")
    try:
        monto = float(texto)
    except ValueError:
        await update.message.reply_text("❌ Solo el número. Ej: `150000` o `4.500.000`", parse_mode="Markdown")
        return ESPERANDO_MONTO

    context.user_data["monto"] = monto
    teclado = InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Correcto", callback_data="monto_ok"),
         InlineKeyboardButton("✏️ Modificar", callback_data="monto_modificar")]
    ])
    await update.message.reply_text(
        f"💵 Monto: *{formato_pesos(monto)}*\n\n¿Está correcto?",
        parse_mode="Markdown",
        reply_markup=teclado,
    )
    return CONFIRMANDO_MONTO

async def confirmar_monto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "monto_modificar":
        await query.edit_message_text("✏️ Escribe el nuevo monto:")
        return ESPERANDO_MONTO

    await query.edit_message_text(
        f"💵 Monto: *{formato_pesos(context.user_data['monto'])}* ✅",
        parse_mode="Markdown",
    )
    await query.message.reply_text(
        "📝 ¿Descripción? _(ej: mercado del lunes, pago nómina...)_",
        parse_mode="Markdown",
    )
    return ESPERANDO_DESCRIPCION

async def recibir_descripcion(update: Update, context: ContextTypes.DEFAULT_TYPE):
    descripcion = update.message.text.strip()
    tipo        = context.user_data["tipo"]
    categoria   = context.user_data["categoria"]
    monto       = context.user_data["monto"]

    try:
        sheets.registrar_movimiento(tipo, monto, f"{categoria} - {descripcion}")
        emoji = "✅ Ingreso" if tipo == "INGRESO" else "✅ Gasto"
        texto = (
            f"{emoji} registrado\n"
            f"📂 {categoria}\n"
            f"📝 {descripcion}\n"
            f"💰 {formato_pesos(monto)}"
        )
    except Exception as e:
        logger.error("Error guardando movimiento: %s", e)
        texto = f"⚠️ Error al guardar. Toca *🔧 Sistema* para diagnosticar."

    await update.message.reply_text(texto, parse_mode="Markdown", reply_markup=MENU)
    return ConversationHandler.END

async def cancelar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ Cancelado.", reply_markup=MENU)
    return ConversationHandler.END

# ── Consultas ────────────────────────────────────────────────────────
async def saldo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    ingresos, gastos, balance = sheets.obtener_resumen_mes()
    emoji = "🟢" if balance >= 0 else "🔴"
    await update.message.reply_text(
        f"{emoji} *Saldo del mes*\n\n"
        f"💵 Ingresos: {formato_pesos(ingresos)}\n"
        f"💸 Gastos:   {formato_pesos(gastos)}\n"
        f"━━━━━━━━━━━━━━\n"
        f"💰 Balance:  {formato_pesos(balance)}",
        parse_mode="Markdown",
        reply_markup=MENU,
    )

async def resumen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    ingresos, gastos, balance = sheets.obtener_resumen_mes()
    porcentaje = (gastos / ingresos * 100) if ingresos > 0 else 0
    emoji = "🟢" if balance >= 0 else "🔴"
    await update.message.reply_text(
        f"📊 *Resumen del mes*\n\n"
        f"💵 Ingresos:  {formato_pesos(ingresos)}\n"
        f"💸 Gastos:    {formato_pesos(gastos)}\n"
        f"📉 Gastado:   {porcentaje:.1f}%\n"
        f"━━━━━━━━━━━━━━\n"
        f"{emoji} Balance: {formato_pesos(balance)}",
        parse_mode="Markdown",
        reply_markup=MENU,
    )

async def historial(update: Update, context: ContextTypes.DEFAULT_TYPE):
    registros = sheets.obtener_historial()
    if not registros:
        await update.message.reply_text("📭 Sin movimientos.", reply_markup=MENU)
        return
    texto = "📋 *Últimos movimientos*\n\n"
    for r in reversed(registros):
        emoji = "💵" if r.get("Tipo") == "INGRESO" else "💸"
        texto += f"{emoji} {r.get('Fecha')} — {formato_pesos(sheets._monto(r.get('Monto', 0)))} — {r.get('Descripcion')}\n"
    await update.message.reply_text(texto, parse_mode="Markdown", reply_markup=MENU)

async def alerta_diaria(context: ContextTypes.DEFAULT_TYPE):
    ingresos, gastos, balance = sheets.obtener_resumen_mes()
    emoji = "🟢" if balance >= 0 else "🔴"
    await context.bot.send_message(
        chat_id=CHAT_ID,
        text=(
            f"🌙 *¡Buenas noches, jefe!*\n\n"
            f"🔔 Aquí está tu resumen del día:\n\n"
            f"💵 Ingresos: {formato_pesos(ingresos)}\n"
            f"💸 Gastos:   {formato_pesos(gastos)}\n"
            f"{emoji} Balance: {formato_pesos(balance)}\n\n"
            f"_Sigue así, vas bien_ 💪"
        ),
        parse_mode="Markdown",
    )

def main():
    app = Application.builder().token(TOKEN).build()

    conv = ConversationHandler(
        entry_points=[
            CommandHandler("ingreso", iniciar_ingreso),
            CommandHandler("gasto",   iniciar_gasto),
            MessageHandler(filters.TEXT & filters.Regex("💰 Ingreso"),  iniciar_ingreso),
            MessageHandler(filters.TEXT & filters.Regex("💸 Gasto"),    iniciar_gasto),
        ],
        states={
            ELIGIENDO_CATEGORIA: [
                CallbackQueryHandler(elegir_categoria),
            ],
            ESPERANDO_MONTO: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, recibir_monto),
            ],
            CONFIRMANDO_MONTO: [
                CallbackQueryHandler(confirmar_monto, pattern="^monto_"),
            ],
            ESPERANDO_DESCRIPCION: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, recibir_descripcion),
            ],
        },
        fallbacks=[
            CommandHandler("cancelar", cancelar),
            MessageHandler(filters.TEXT & filters.Regex("❌"), cancelar),
        ],
        per_message=False,
    )

    app.add_handler(CommandHandler("start",    start))
    app.add_handler(CommandHandler("saldo",    saldo))
    app.add_handler(CommandHandler("resumen",  resumen))
    app.add_handler(CommandHandler("historial",historial))
    app.add_handler(CommandHandler("sistema",  sistema))
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex("📊 Resumen"),  resumen))
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex("💳 Saldo"),    saldo))
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex("📋 Historial"),historial))
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex("🔧 Sistema"),  sistema))
    app.add_handler(CallbackQueryHandler(reparar_callback, pattern="^reparar$"))
    app.add_handler(conv)

    app.job_queue.run_daily(alerta_diaria, time=time(20, 0))

    logger.info("Bot iniciado...")
    app.run_polling()

if __name__ == "__main__":
    main()
