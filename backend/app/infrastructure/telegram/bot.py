import logging
import re
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo, BotCommand
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
from app.core.config import settings

from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import User, Wallet, DepositTransaction
from app.application.deposit_usecase import submit_deposit_reference, approve_deposit_reference, list_user_deposits
from app.application.withdrawal_usecase import request_withdrawal, approve_withdrawal, reject_withdrawal, list_user_withdrawals
from app.infrastructure.telegram.telebirr_parser import parse_telebirr_input

logger = logging.getLogger(__name__)

WEB_APP_URL = settings.WEB_APP_URL


async def get_or_create_telegram_user(db: AsyncSessionLocal, tg_user):
    stmt = select(User).where(User.telegram_id == tg_user.id)
    res = await db.execute(stmt)
    user_obj = res.scalar_one_or_none()
    if not user_obj:
        user_obj = User(
            telegram_id=tg_user.id,
            username=tg_user.username or "",
            first_name=tg_user.first_name or "Player"
        )
        db.add(user_obj)
        await db.flush()
        wallet = Wallet(user_id=user_obj.id, balance=100.00)
        db.add(wallet)
        await db.commit()
        await db.refresh(user_obj)
    return user_obj


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        user = update.effective_user
        if not user or not update.message:
            return

        async with AsyncSessionLocal() as db:
            await get_or_create_telegram_user(db, user)

        main_keyboard = ReplyKeyboardMarkup(
            [
                [KeyboardButton(text="🎮 Play Bingo"), KeyboardButton(text="💰 Balance")],
                [KeyboardButton(text="💳 Deposit"), KeyboardButton(text="💸 Withdraw")],
                [KeyboardButton(text="📜 History"), KeyboardButton(text="❓ Instructions")],
                [KeyboardButton(text="📱 Share Phone Contact", request_contact=True)]
            ],
            resize_keyboard=True,
            one_time_keyboard=False
        )

        inline_keyboard = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("🎮 PLAY | 10 ብር", web_app=WebAppInfo(url=f"{WEB_APP_URL}?room=standard")),
                InlineKeyboardButton("🔥 SuperBingo | 50 ብር", web_app=WebAppInfo(url=f"{WEB_APP_URL}?room=vip"))
            ],
            [
                InlineKeyboardButton("🎁 GoodBingo Bonus", web_app=WebAppInfo(url=WEB_APP_URL))
            ]
        ])

        first_name_clean = (user.first_name or "Player").replace("*", "").replace("_", "").replace("`", "")

        welcome_text = (
            f"👋 Welcome to *A Bingo (GoodBingo Edition)*, *{first_name_clean}*!\n\n"
            "🎯 Real-time multiplayer Bingo with instant ETB Telebirr payouts!\n\n"
            "Choose a game room or use the menu below:\n"
            "🎮 *PLAY | 10 ብር* — Standard Room\n"
            "🔥 *SuperBingo | 50 ብር* — VIP High Stakes Room\n"
            "💰 *Balance* — View available ETB\n"
            "💳 *Deposit* — Instant Telebirr receipt top-up\n"
            "💸 *Withdraw* — Cash out to Telebirr or CBE Bank\n"
            "📜 *History* — Transaction logs"
        )

        await update.message.reply_text(
            welcome_text,
            reply_markup=main_keyboard,
            parse_mode="Markdown"
        )

        await update.message.reply_text(
            "👇 Select your game room to launch the Mini App:",
            reply_markup=inline_keyboard
        )
    except Exception as e:
        logger.error(f"Error in start_command: {e}", exc_info=True)
        if update.message:
            await update.message.reply_text("👋 Welcome to A Bingo! Type /play or /deposit to get started.")


async def play_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Room selection inline keyboard"""
    inline_keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🎮 PLAY | 10 ብር", web_app=WebAppInfo(url=f"{WEB_APP_URL}?room=standard")),
            InlineKeyboardButton("🔥 SuperBingo | 50 ብር", web_app=WebAppInfo(url=f"{WEB_APP_URL}?room=vip"))
        ],
        [
            InlineKeyboardButton("🎁 GoodBingo Bonus", web_app=WebAppInfo(url=WEB_APP_URL))
        ]
    ])
    await update.message.reply_text(
        "🎰 *Select Game Room / ጨዋታ ይምረጡ*:\n\n"
        "• *PLAY | 10 ብር*: Stake 10 ETB per card\n"
        "• *SuperBingo | 50 ብር*: High stakes VIP room (50 ETB/card)\n"
        "• *GoodBingo Bonus*: Special jackpot event room",
        reply_markup=inline_keyboard,
        parse_mode="Markdown"
    )


async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not user or not update.message:
        return

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        stmt_w = select(Wallet).where(Wallet.user_id == user_obj.id)
        w_res = await db.execute(stmt_w)
        wallet = w_res.scalar_one_or_none()
        bal = float(wallet.balance) if wallet else 0.0

    msg = (
        f"💰 *ቀሪ ሂሳብ (Available Balance)*:\n\n"
        f"💵 *{bal:.2f} ETB*\n\n"
        "Use `/deposit` to top up or `/withdraw` to cash out winnings!"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def deposit_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    inline_kb = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📱 TELEBIRR", callback_data="dep_telebirr"),
            InlineKeyboardButton("🏦 CBE BIRR", callback_data="dep_cbe")
        ]
    ])
    msg = (
        "💳 *Real Money Deposit Instructions*\n\n"
        "To deposit ETB to your Bingo wallet, transfer your desired amount:\n\n"
        "📱 *Telebirr Account*: `0911000000` (Name: GoodBingo Admin)\n"
        "🏦 *CBE Bank Account*: `1000123456789` (Name: GoodBingo Admin)\n\n"
        "---------------------------------------\n"
        "⚡ *Automated Telebirr Verification*:\n"
        "After paying via Telebirr, simply **paste your Telebirr SMS or receipt link** (`https://transactioninfo.ethiotelecom.et/receipt/...`) directly in this chat!\n\n"
        "Or use manual command: `/submit_deposit <amount> <ref_code>`"
    )
    await update.message.reply_text(msg, reply_markup=inline_kb, parse_mode="Markdown")


async def withdraw_info_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = (
        "💸 *Real Money Withdrawal Instructions / የገንዘብ ማውጫ መመሪያ*\n\n"
        "Minimum Withdrawal: *100.00 ETB*\n\n"
        "📌 *Command Format*:\n"
        "`/withdraw <amount> <account_number> <account_name>`\n\n"
        "💡 *Example*:\n"
        "`/withdraw 100 0912345678 Abebe_Bikila`\n\n"
        "---------------------------------------\n"
        "✅ Supported Methods: *Telebirr* & *CBE Bank*\n"
        "⏱ Payout requests are processed rapidly!"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def history_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not user or not update.message:
        return

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        deposits = await list_user_deposits(db, user_obj.id)
        withdrawals = await list_user_withdrawals(db, user_obj.id)

    msg_lines = ["📜 *Transaction History / የግብይት ታሪክ*\n"]

    if deposits:
        msg_lines.append("💳 *Recent Deposits*:")
        for d in deposits[:5]:
            status_icon = "✅" if d["status"] == "COMPLETED" else ("⏳" if d["status"] == "PENDING" else "❌")
            msg_lines.append(f" • {status_icon} {d['amount']:.2f} ETB (Ref: `{d['reference_code']}`) — `{d['status']}`")
        msg_lines.append("")

    if withdrawals:
        msg_lines.append("💸 *Recent Withdrawals*:")
        for w in withdrawals[:5]:
            status_icon = "✅" if w["status"] == "COMPLETED" else ("⏳" if w["status"] == "PENDING" else "❌")
            msg_lines.append(f" • {status_icon} {w['amount']:.2f} ETB to `{w['account_number']}` — `{w['status']}`")

    if not deposits and not withdrawals:
        msg_lines.append("No previous transactions found.")

    await update.message.reply_text("\n".join(msg_lines), parse_mode="Markdown")


async def instructions_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = (
        "❓ *How to Play A Bingo / የቢንጎ አጨዋወት መመሪያ*\n\n"
        "1️⃣ *Join Room & Pick Cards*:\n"
        "Tap *🎮 PLAY* to pick up to 2 active 5x5 cards per round.\n\n"
        "2️⃣ *Live Callouts*:\n"
        "Numbers (1 to 75) are drawn every few seconds in real-time.\n\n"
        "3️⃣ *ASCII Winning Pattern Diagrams*:\n"
        "```text\n"
        "  LINE       FOUR CORNERS    CAPITAL T\n"
        "[X X X X X]   [X . . . X]   [X X X X X]\n"
        "[. . . . .]   [. . . . .]   [. . X . .]\n"
        "[. . ★ . .]   [. . ★ . .]   [. . ★ . .]\n"
        "[. . . . .]   [. . . . .]   [. . X . .]\n"
        "[. . . . .]   [X . . . X]   [. . X . .]\n"
        "```\n"
        "4️⃣ *Claim BINGO & Win*:\n"
        "Press **BINGO!** first to claim the ETB prize pool! 🏆\n"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def submit_deposit_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not context.args or len(context.args) < 2:
        await update.message.reply_text(
            "⚠️ Usage: `/submit_deposit <amount> <reference_code>`\nExample: `/submit_deposit 100 DIO03P4J40`",
            parse_mode="Markdown"
        )
        return

    try:
        amount = float(context.args[0])
        ref_code = context.args[1].strip().upper()
    except ValueError:
        await update.message.reply_text("❌ Invalid amount format. Example: `/submit_deposit 100 DIO03P4J40`", parse_mode="Markdown")
        return

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)

        try:
            await submit_deposit_reference(
                db, 
                user_id=user_obj.id, 
                amount=amount, 
                payment_method="TELEBIRR", 
                reference_code=ref_code
            )
            await update.message.reply_text(
                f"⏳ *Deposit Submission Received!*\n\n"
                f"📌 *Ref Code*: `{ref_code}`\n"
                f"💵 *Amount*: {amount:.2f} ETB\n"
                f"Status: `PENDING Verification`\n\n"
                "Your deposit will be verified promptly.",
                parse_mode="Markdown"
            )
        except Exception as e:
            detail = getattr(e, "detail", str(e))
            await update.message.reply_text(f"❌ Error: {detail}")


async def approve_deposit_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not context.args:
        await update.message.reply_text("⚠️ Usage: `/approve_deposit <reference_code>`", parse_mode="Markdown")
        return

    ref_code = context.args[0].strip().upper()

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        if not user_obj.is_admin:
            await update.message.reply_text("⛔ *Access Denied*: Admin privileges required.", parse_mode="Markdown")
            return

        try:
            res_app = await approve_deposit_reference(db, reference_code=ref_code)
            await update.message.reply_text(
                f"✅ *Deposit Approved Successfully!*\n\n"
                f"📌 *Ref Code*: `{ref_code}`\n"
                f"💵 *Amount*: {res_app['amount']:.2f} ETB\n"
                f"New Balance: `{res_app['new_balance']:.2f} ETB`",
                parse_mode="Markdown"
            )
            if res_app.get("telegram_id"):
                try:
                    await context.bot.send_message(
                        chat_id=res_app["telegram_id"],
                        text=f"🎉 *Deposit Confirmed!*\nYour deposit of *{res_app['amount']:.2f} ETB* (Ref: `{ref_code}`) has been approved.\nNew Balance: *{res_app['new_balance']:.2f} ETB*!",
                        parse_mode="Markdown"
                    )
                except Exception as notify_err:
                    logger.warning(f"Could not notify user: {notify_err}")
        except Exception as e:
            detail = getattr(e, "detail", str(e))
            await update.message.reply_text(f"❌ Approval Error: {detail}")


async def make_admin_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not context.args:
        await update.message.reply_text("⚠️ Usage: `/make_admin <admin_secret>`", parse_mode="Markdown")
        return

    secret = context.args[0].strip()
    if secret != settings.ADMIN_SECRET:
        await update.message.reply_text("❌ Invalid secret key.")
        return

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        user_obj.is_admin = True
        await db.commit()
        await update.message.reply_text("👑 *Success!* You are now an authorized Admin.", parse_mode="Markdown")


async def withdraw_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not context.args or len(context.args) < 3:
        await withdraw_info_command(update, context)
        return

    try:
        amount = float(context.args[0])
        acc_num = context.args[1].strip()
        acc_name = " ".join(context.args[2:]).replace("_", " ").strip()
    except ValueError:
        await update.message.reply_text("❌ Invalid amount format.", parse_mode="Markdown")
        return

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        try:
            res = await request_withdrawal(
                db,
                user_id=user_obj.id,
                amount=amount,
                payment_method="TELEBIRR",
                account_number=acc_num,
                account_name=acc_name
            )
            await update.message.reply_text(
                f"💸 *Withdrawal Request Submitted!*\n\n"
                f"📌 *Request ID*: `{res['id']}`\n"
                f"💵 *Amount*: {amount:.2f} ETB\n"
                f"📱 *Account Number*: `{acc_num}`\n"
                f"👤 *Account Name*: `{acc_name}`\n"
                f"New Balance: `{res['new_balance']:.2f} ETB`\n\n"
                "Status: `PENDING Payout`",
                parse_mode="Markdown"
            )
        except Exception as e:
            detail = getattr(e, "detail", str(e))
            await update.message.reply_text(f"❌ Withdrawal Error: {detail}")


async def approve_withdrawal_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not context.args:
        await update.message.reply_text("⚠️ Usage: `/approve_withdrawal <withdrawal_id>`", parse_mode="Markdown")
        return

    w_id = context.args[0].strip()

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        if not user_obj.is_admin:
            await update.message.reply_text("⛔ *Access Denied*: Admin privileges required.", parse_mode="Markdown")
            return

        try:
            res_app = await approve_withdrawal(db, withdrawal_id=w_id)
            await update.message.reply_text(
                f"✅ *Withdrawal Marked Paid!*\n\n"
                f"📌 *ID*: `{w_id}`\n"
                f"💵 *Amount*: {res_app['amount']:.2f} ETB\n"
                f"📱 *Account*: `{res_app['account_number']}` ({res_app['account_name']})",
                parse_mode="Markdown"
            )
            if res_app.get("telegram_id"):
                try:
                    await context.bot.send_message(
                        chat_id=res_app["telegram_id"],
                        text=f"🎉 *Withdrawal Processed!*\nYour withdrawal of *{res_app['amount']:.2f} ETB* to account `{res_app['account_number']}` has been sent!",
                        parse_mode="Markdown"
                    )
                except Exception as notify_err:
                    logger.warning(f"Could not notify user: {notify_err}")
        except Exception as e:
            detail = getattr(e, "detail", str(e))
            await update.message.reply_text(f"❌ Approval Error: {detail}")


async def reject_withdrawal_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not context.args:
        await update.message.reply_text("⚠️ Usage: `/reject_withdrawal <withdrawal_id>`", parse_mode="Markdown")
        return

    w_id = context.args[0].strip()

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        if not user_obj.is_admin:
            await update.message.reply_text("⛔ *Access Denied*: Admin privileges required.", parse_mode="Markdown")
            return

        try:
            res_rej = await reject_withdrawal(db, withdrawal_id=w_id)
            await update.message.reply_text(
                f"❌ *Withdrawal Rejected & Refunded!*\n\n"
                f"📌 *ID*: `{w_id}`\n"
                f"💵 *Refunded Amount*: {res_rej['amount']:.2f} ETB",
                parse_mode="Markdown"
            )
            if res_rej.get("telegram_id"):
                try:
                    await context.bot.send_message(
                        chat_id=res_rej["telegram_id"],
                        text=f"⚠️ *Withdrawal Rejected*\nYour withdrawal of *{res_rej['amount']:.2f} ETB* was rejected and funds refunded.",
                        parse_mode="Markdown"
                    )
                except Exception as notify_err:
                    logger.warning(f"Could not notify user: {notify_err}")
        except Exception as e:
            detail = getattr(e, "detail", str(e))
            await update.message.reply_text(f"❌ Rejection Error: {detail}")


async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    contact = update.message.contact
    user = update.effective_user

    if not contact or not user:
        return

    phone_number = contact.phone_number
    logger.info(f"Received contact from user {user.id}: {phone_number}")

    async with AsyncSessionLocal() as db:
        user_obj = await get_or_create_telegram_user(db, user)
        user_obj.phone_number = phone_number
        await db.commit()

    inline_keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🎮 Launch Bingo Mini App", web_app=WebAppInfo(url=f"{WEB_APP_URL}?phone={phone_number}"))]
    ])

    await update.message.reply_text(
        f"✅ Thank you *{user.first_name}*! Your phone number (`{phone_number}`) has been saved.\n\n"
        "Click below to start playing Bingo!",
        reply_markup=inline_keyboard,
        parse_mode="Markdown"
    )


async def handle_text_messages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return
    text = update.message.text.strip()

    if text.startswith("/"):
        return

    lower_text = text.lower()

    # Route menu button triggers
    if "play" in lower_text or "🎮" in text:
        await play_command(update, context)
        return
    elif "balance" in lower_text or "💰" in text or "ቀሪ" in text:
        await balance_command(update, context)
        return
    elif "deposit" in lower_text or "💳" in text or "ዲፖዚት" in text:
        await deposit_command(update, context)
        return
    elif "withdraw" in lower_text or "💸" in text or "ማውጫ" in text:
        await withdraw_info_command(update, context)
        return
    elif "history" in lower_text or "📜" in text or "ታሪክ" in text:
        await history_command(update, context)
        return
    elif "instructions" in lower_text or "how to play" in lower_text or "❓" in text or "መመሪያ" in text:
        await instructions_command(update, context)
        return

    # Check for Telebirr automated receipt URL or SMS match
    tele_data = parse_telebirr_input(text)
    if tele_data:
        user = update.effective_user
        tid = tele_data["transaction_id"]
        amount = tele_data["amount"]

        await update.message.reply_text(
            f"🔍 *የTelebirr ደረሰኝ እየተመረመረ ነው* (TID: `{tid}`)...",
            parse_mode="Markdown"
        )

        async with AsyncSessionLocal() as db:
            user_obj = await get_or_create_telegram_user(db, user)

            # Check duplicate TID in deposit_transactions DB
            stmt_check = select(DepositTransaction).where(DepositTransaction.reference_code == tid)
            res_check = await db.execute(stmt_check)
            existing_dep = res_check.scalar_one_or_none()

            if existing_dep:
                await update.message.reply_text(
                    f"❌ *Verification Failed*: Receipt TID `{tid}` has already been used.",
                    parse_mode="Markdown"
                )
                return

            # Perform deposit recording & credit
            try:
                sub_res = await submit_deposit_reference(
                    db,
                    user_id=user_obj.id,
                    amount=amount,
                    payment_method="TELEBIRR",
                    reference_code=tid
                )
                app_res = await approve_deposit_reference(db, reference_code=tid)
                
                await update.message.reply_text(
                    f"✅ *Telebirr Deposit Verified*\n\n"
                    f"📌 *Transaction ID*: `{tid}`\n"
                    f"💰 *Amount*: {amount:.2f} ETB\n"
                    f"💰 *New Balance*: {app_res['new_balance']:.2f} ETB",
                    parse_mode="Markdown"
                )
            except Exception as e:
                detail = getattr(e, "detail", str(e))
                await update.message.reply_text(
                    f"❌ *Verification Failed*: {detail}",
                    parse_mode="Markdown"
                )


async def set_bot_commands(application):
    try:
        commands = [
            BotCommand("start", "👋 Start Bot & Show Menu"),
            BotCommand("play", "🎮 Select Game Room"),
            BotCommand("balance", "💰 View Balance"),
            BotCommand("deposit", "💳 Deposit ETB Funds"),
            BotCommand("withdraw", "💸 Withdraw Winnings"),
            BotCommand("history", "📜 View Transaction History"),
            BotCommand("instructions", "❓ Game Instructions")
        ]
        await application.bot.set_my_commands(commands)
        logger.info("Telegram Bot menu commands registered successfully!")
    except Exception as e:
        logger.warning(f"Could not set Telegram Bot commands: {e}")


def setup_telegram_bot_app():
    if not settings.BOT_TOKEN:
        logger.warning("No BOT_TOKEN configured.")
        return None

    app = ApplicationBuilder().token(settings.BOT_TOKEN).post_init(set_bot_commands).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("menu", start_command))
    app.add_handler(CommandHandler("play", play_command))
    app.add_handler(CommandHandler("balance", balance_command))
    app.add_handler(CommandHandler("deposit", deposit_command))
    app.add_handler(CommandHandler("submit_deposit", submit_deposit_command))
    app.add_handler(CommandHandler("approve_deposit", approve_deposit_command))
    app.add_handler(CommandHandler("make_admin", make_admin_command))
    app.add_handler(CommandHandler("withdraw", withdraw_command))
    app.add_handler(CommandHandler("approve_withdrawal", approve_withdrawal_command))
    app.add_handler(CommandHandler("reject_withdrawal", reject_withdrawal_command))
    app.add_handler(CommandHandler("history", history_command))
    app.add_handler(CommandHandler("instructions", instructions_command))
    app.add_handler(CommandHandler("help", instructions_command))
    app.add_handler(MessageHandler(filters.CONTACT, handle_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_messages))
    return app

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(f"Starting Telegram Bot with WebApp URL: {WEB_APP_URL}")
    app = setup_telegram_bot_app()
    if app:
        app.run_polling()



