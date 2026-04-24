import os
import logging
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
        [KeyboardButton("📋 Historial")],
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
    await update.message.reply_text(
        "💰 *Bot de Finanzas - Jesús Vanegas*\n\nUsa los botones del menú.",
        parse_mode="Markdown",
        reply_markup=MENU,
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
    # Soporta formato colombiano: 4.500.000 o 4,500,000 o 4500000
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

    sheets.registrar_movimiento(tipo, monto, f"{categoria} - {descripcion}")

    emoji = "✅ Ingreso" if tipo == "INGRESO" else "✅ Gasto"
    await update.message.reply_text(
        f"{emoji} registrado\n"
        f"📂 {categoria}\n"
        f"📝 {descripcion}\n"
        f"💰 {formato_pesos(monto)}",
        parse_mode="Markdown",
        reply_markup=MENU,
    )
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
        texto += f"{emoji} {r.get('Fecha')} — {formato_pesos(float(r.get('Monto', 0)))} — {r.get('Descripcion')}\n"
    await update.message.reply_text(texto, parse_mode="Markdown", reply_markup=MENU)

async def alerta_diaria(context: ContextTypes.DEFAULT_TYPE):
    ingresos, gastos, balance = sheets.obtener_resumen_mes()
    emoji = "🟢" if balance >= 0 else "🔴"
    await context.bot.send_message(
        chat_id=CHAT_ID,
        text=(
            f"🔔 *Resumen del día*\n\n"
            f"💵 Ingresos: {formato_pesos(ingresos)}\n"
            f"💸 Gastos:   {formato_pesos(gastos)}\n"
            f"{emoji} Balance: {formato_pesos(balance)}"
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
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex("📊 Resumen"), resumen))
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex("💳 Saldo"),   saldo))
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex("📋 Historial"), historial))
    app.add_handler(conv)

    app.job_queue.run_daily(alerta_diaria, time=time(20, 0))

    logger.info("Bot iniciado...")
    app.run_polling()

if __name__ == "__main__":
    main()
