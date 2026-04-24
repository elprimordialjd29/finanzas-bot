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

TOKEN = os.environ.get("TELEGRAM_TOKEN")
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

ELIGIENDO_CATEGORIA, ESPERANDO_MONTO = range(2)

MENU_PRINCIPAL = ReplyKeyboardMarkup(
    [
        [KeyboardButton("💰 Registrar Ingreso"), KeyboardButton("💸 Registrar Gasto")],
        [KeyboardButton("📊 Resumen del Mes"),   KeyboardButton("💳 Saldo Actual")],
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
        "💰 *Bot de Finanzas - Jesús Vanegas*\n\n"
        "Usa los botones del menú para registrar movimientos y consultar tu balance.",
        parse_mode="Markdown",
        reply_markup=MENU_PRINCIPAL,
    )

async def cmd_ingreso(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["tipo"] = "INGRESO"
    await update.message.reply_text(
        "💰 *¿Qué tipo de ingreso?*",
        parse_mode="Markdown",
        reply_markup=teclado_categorias(CATEGORIAS_INGRESO)
    )
    return ELIGIENDO_CATEGORIA

async def cmd_gasto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["tipo"] = "GASTO"
    await update.message.reply_text(
        "💸 *¿Qué tipo de gasto?*",
        parse_mode="Markdown",
        reply_markup=teclado_categorias(CATEGORIAS_GASTO)
    )
    return ELIGIENDO_CATEGORIA

async def menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    texto = update.message.text
    if texto == "💰 Registrar Ingreso":
        return await cmd_ingreso(update, context)
    elif texto == "💸 Registrar Gasto":
        return await cmd_gasto(update, context)
    elif texto == "📊 Resumen del Mes":
        await resumen(update, context)
    elif texto == "💳 Saldo Actual":
        await saldo(update, context)
    elif texto == "📋 Historial":
        await historial(update, context)

async def elegir_categoria(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "cancelar":
        await query.edit_message_text("❌ Operación cancelada.")
        return ConversationHandler.END

    context.user_data["categoria"] = query.data
    tipo = context.user_data["tipo"]
    emoji = "💵" if tipo == "INGRESO" else "💸"

    await query.edit_message_text(
        f"{emoji} *{query.data}*\n\n¿Cuánto? Escribe el monto:",
        parse_mode="Markdown"
    )
    return ESPERANDO_MONTO

async def recibir_monto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    texto = update.message.text.replace(",", ".").replace("$", "").strip()
    try:
        monto = float(texto)
    except ValueError:
        await update.message.reply_text("❌ Escribe solo el número. Ejemplo: `150000`", parse_mode="Markdown")
        return ESPERANDO_MONTO

    tipo = context.user_data["tipo"]
    categoria = context.user_data["categoria"]
    sheets.registrar_movimiento(tipo, monto, categoria)

    emoji = "✅ Ingreso" if tipo == "INGRESO" else "✅ Gasto"
    await update.message.reply_text(
        f"{emoji} registrado\n"
        f"📂 {categoria}\n"
        f"💰 {formato_pesos(monto)}",
        parse_mode="Markdown"
    )
    return ConversationHandler.END

async def cancelar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ Operación cancelada.")
    return ConversationHandler.END

async def saldo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    ingresos, gastos, balance = sheets.obtener_resumen_mes()
    emoji = "🟢" if balance >= 0 else "🔴"
    await update.message.reply_text(
        f"{emoji} *Saldo del mes*\n\n"
        f"💵 Ingresos: {formato_pesos(ingresos)}\n"
        f"💸 Gastos: {formato_pesos(gastos)}\n"
        f"━━━━━━━━━━━━━━\n"
        f"💰 Balance: {formato_pesos(balance)}",
        parse_mode="Markdown"
    )

async def resumen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    ingresos, gastos, balance = sheets.obtener_resumen_mes()
    porcentaje = (gastos / ingresos * 100) if ingresos > 0 else 0
    emoji = "🟢" if balance >= 0 else "🔴"
    await update.message.reply_text(
        f"📊 *Resumen del mes*\n\n"
        f"💵 Ingresos: {formato_pesos(ingresos)}\n"
        f"💸 Gastos: {formato_pesos(gastos)}\n"
        f"📉 Gastado: {porcentaje:.1f}% del ingreso\n"
        f"━━━━━━━━━━━━━━\n"
        f"{emoji} Balance: {formato_pesos(balance)}",
        parse_mode="Markdown"
    )

async def historial(update: Update, context: ContextTypes.DEFAULT_TYPE):
    registros = sheets.obtener_historial()
    if not registros:
        await update.message.reply_text("📭 No hay movimientos registrados.")
        return
    texto = "📋 *Últimos movimientos*\n\n"
    for r in reversed(registros):
        emoji = "💵" if r.get("Tipo") == "INGRESO" else "💸"
        texto += f"{emoji} {r.get('Fecha')} — {formato_pesos(r.get('Monto', 0))} — {r.get('Descripcion')}\n"
    await update.message.reply_text(texto, parse_mode="Markdown")

async def alerta_diaria(context: ContextTypes.DEFAULT_TYPE):
    ingresos, gastos, balance = sheets.obtener_resumen_mes()
    emoji = "🟢" if balance >= 0 else "🔴"
    await context.bot.send_message(
        chat_id=CHAT_ID,
        text=(
            f"🔔 *Resumen del día*\n\n"
            f"💵 Ingresos del mes: {formato_pesos(ingresos)}\n"
            f"💸 Gastos del mes: {formato_pesos(gastos)}\n"
            f"{emoji} Balance: {formato_pesos(balance)}"
        ),
        parse_mode="Markdown"
    )

def main():
    app = Application.builder().token(TOKEN).build()

    conv = ConversationHandler(
        entry_points=[
            CommandHandler("ingreso", cmd_ingreso),
            CommandHandler("gasto", cmd_gasto),
            MessageHandler(filters.Regex("^(💰 Registrar Ingreso|💸 Registrar Gasto)$"), menu_handler),
        ],
        states={
            ELIGIENDO_CATEGORIA: [CallbackQueryHandler(elegir_categoria)],
            ESPERANDO_MONTO: [MessageHandler(filters.TEXT & ~filters.COMMAND, recibir_monto)],
        },
        fallbacks=[CommandHandler("cancelar", cancelar)],
    )

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("saldo", saldo))
    app.add_handler(CommandHandler("resumen", resumen))
    app.add_handler(CommandHandler("historial", historial))
    app.add_handler(conv)
    app.add_handler(MessageHandler(
        filters.Regex("^(📊 Resumen del Mes|💳 Saldo Actual|📋 Historial)$"),
        menu_handler
    ))

    app.job_queue.run_daily(alerta_diaria, time=time(20, 0))

    logger.info("Bot iniciado...")
    app.run_polling()

if __name__ == "__main__":
    main()
