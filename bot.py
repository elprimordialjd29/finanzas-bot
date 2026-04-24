import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from datetime import time
import sheets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TOKEN = os.environ.get("TELEGRAM_TOKEN")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")

def formato_pesos(monto):
    return f"${monto:,.0f}".replace(",", ".")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "💰 *Bot de Finanzas - Jesús Vanegas*\n\n"
        "Comandos disponibles:\n"
        "• `/ingreso 50000 descripcion`\n"
        "• `/gasto 30000 descripcion`\n"
        "• `/saldo` — balance del mes\n"
        "• `/resumen` — desglose completo\n"
        "• `/historial` — últimos 10 movimientos",
        parse_mode="Markdown"
    )

async def ingreso(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        monto = float(context.args[0].replace(",", "."))
        descripcion = " ".join(context.args[1:]) if len(context.args) > 1 else "Sin descripción"
        sheets.registrar_movimiento("INGRESO", monto, descripcion)
        await update.message.reply_text(
            f"✅ *Ingreso registrado*\n"
            f"💵 {formato_pesos(monto)} — {descripcion}",
            parse_mode="Markdown"
        )
    except (IndexError, ValueError):
        await update.message.reply_text("❌ Uso: `/ingreso 50000 descripcion`", parse_mode="Markdown")

async def gasto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        monto = float(context.args[0].replace(",", "."))
        descripcion = " ".join(context.args[1:]) if len(context.args) > 1 else "Sin descripción"
        sheets.registrar_movimiento("GASTO", monto, descripcion)
        await update.message.reply_text(
            f"✅ *Gasto registrado*\n"
            f"💸 {formato_pesos(monto)} — {descripcion}",
            parse_mode="Markdown"
        )
    except (IndexError, ValueError):
        await update.message.reply_text("❌ Uso: `/gasto 30000 descripcion`", parse_mode="Markdown")

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

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ingreso", ingreso))
    app.add_handler(CommandHandler("gasto", gasto))
    app.add_handler(CommandHandler("saldo", saldo))
    app.add_handler(CommandHandler("resumen", resumen))
    app.add_handler(CommandHandler("historial", historial))

    app.job_queue.run_daily(alerta_diaria, time=time(20, 0))

    logger.info("Bot iniciado...")
    app.run_polling()

if __name__ == "__main__":
    main()
