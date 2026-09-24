# 🎯 Complete Guide: How Real-Time Multiplayer Telegram Bingo & AI Bots Work

This document explains in detail how **Card Selection**, **AI Bot Player Auto-Spawning**, **Round Lifecycle States**, **Real-Time 30-Second Draw Sequences**, **Competitive Bot vs. Human Winner Race**, and **Server-Authoritative Claims** work under the hood.

---

## 🔄 1. Round Lifecycle & State Machine

Every game takes place inside a **Round**. A round moves through strict server-managed states:

```text
 ┌───────────────────────┐
 │        WAITING        │ ◄── Players browse 5,000 cards & buy cards
 └───────────┬───────────┘
             │ Card Purchased / Auto Start Triggered
             ▼
 ┌───────────────────────┐
 │       COUNTDOWN       │ ◄── 3-second fast countdown (AI Bots Auto-Join)
 └───────────┬───────────┘
             │ Countdown Expires
             ▼
 ┌───────────────────────┐
 │        PLAYING        │ ◄── Live number draw active (0.6s per call, 30s total)
 └───────────┬───────────┘    Card buying is locked for this active round
             │ Player or AI Bot hits BINGO
             ▼
 ┌───────────────────────┐
 │       FINISHED        │ ◄── Winner crowned, Prize Pool awarded to Wallet
 └───────────────────────┘
```

---

## 🤖 2. AI Bot Player Auto-Spawning & Prize Pool Expansion

When you buy a card for a round:
1. The server acquires a **Redis Distributed Lock** (`lock:round:{id}:card:{number}`) to prevent duplicate card reservation.
2. Your wallet is charged **10 ETB**.
3. Immediately, the server automatically spawns **5 AI Bot Players** (`Kebede (Bot)`, `Abebe (Bot)`, `Tigist (Bot)`, `Dawit (Bot)`, `Bethel (Bot)`).
4. Each bot selects an available card from the pool of 5,000 cards and locks it (`CARD_RESERVED` WS event).
5. The **Prize Pool** automatically expands from 10 ETB to **60 ETB** (10 ETB from player + 50 ETB from bots).
6. The round automatically triggers the **3-second countdown** into live drawing!

---

## 🎲 3. Standard 5x5 Bingo Grid & Center FREE Space

Each card matrix adheres strictly to standard 75-ball Bingo rules:

| Column | Number Range | Description |
|:---:|:---:|---|
| **B** | 1 – 15 | 5 random numbers |
| **I** | 16 – 30 | 5 random numbers |
| **N** | 31 – 45 | 4 random numbers + **Center FREE Space ⭐** |
| **G** | 46 – 60 | 5 random numbers |
| **O** | 61 – 75 | 5 random numbers |

> 🌟 **FREE Space ⭐**: Row index `2`, Column index `2` (`[2,2]`) is a permanent **FREE space**. It is automatically pre-marked for every card before numbers are drawn.

---

## ⚡ 4. Fast Live Drawing Engine (30 Seconds Total)

1. When a round transitions to `PLAYING`, the backend generates a cryptographically shuffled sequence of numbers `[1..75]`.
2. Every **0.6 seconds**, the server draws the next number.
3. Each drawn number is saved to the database and added to Redis set `round:{id}:drawn_set` for $O(1)$ fast membership checks.
4. The WebSocket server broadcasts `NUMBER_DRAWN` to all connected players and spectating rooms.
5. In the React Mini App:
   - Callout Banner flashes the letter & number (e.g. `B - 13`).
   - The Master Board lights up the drawn cell.
   - Matching numbers on your 5x5 card grid highlight automatically.

---

## 🏆 5. Competitive Winner Race: Human vs. AI Bots

During every tick of the live draw loop:
- The server evaluates **all active cards** in the round against 20–40 mathematical pattern definitions (*Capital T + 1 Line*, *Standard Horizontal/Vertical/Diagonal Lines*, *4 Corners*, *Blackout*).

### Case A: You Click BINGO First 🥇
- When your numbers form the winning pattern, tap the big glowing **`BINGO!`** button.
- Server validates your card matrix against the drawn numbers set.
- Validated! You win 100% of the prize pool (**60.00 ETB**), credited straight to your wallet balance with a victory confetti explosion!

### Case B: An AI Bot Completes the Pattern First 🤖
- If an AI Bot's card fills the pattern before you click BINGO:
- The bot automatically executes a claim.
- Round status updates to `FINISHED`.
- The WebSocket broadcasts `BINGO_WINNER` announcing the winning bot:
  > 🏆 **BINGO VICTOR!**  
  > Winner: **Kebede (Bot)** (@kebede_bot)  
  > Won Prize: **60.00 ETB!**  
  > Winning Card **#42** (*Capital T + 1 Line*)

---

## 🛡️ 6. Anti-Cheat Disqualification Penalty

If a player clicks **BINGO!** before completing a valid pattern:
- The server rejects the claim with `HTTP 400 Bad Request`.
- The client displays the **`BINGO! DISQUALIFIED`** anti-cheat overlay for 3.5 seconds before resuming play.
