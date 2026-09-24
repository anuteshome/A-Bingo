# Technical UI/UX Design Specification: Telegram Bingo Mini App

**Project:** Real-Time Telegram Bingo Mini App  
**Document:** UI design .md  
**Reference Benchmark:** Abay H Bingo Mini App UI (`images from other games`)  
**Version:** 2.0  

---

## 1. Executive Summary & Design System Overview

The UI design upgrades the Telegram Mini App to replicate the visual polish, real-time telemetry, pattern previewing, 5,000-card reservation grid, and anti-cheat disqualification overlays seen in modern Telegram Bingo applications.

### 🎨 Color Palette & Design Tokens
```css
:root {
  --bg-dark-obsidian: #080C14;
  --bg-card-navy: #111827;
  --bg-card-border: rgba(255, 255, 255, 0.1);
  
  --primary-gold: #FFD700;
  --primary-gold-glow: rgba(255, 215, 0, 0.4);
  --accent-cyan: #00F2FE;
  --accent-cyan-glow: rgba(0, 242, 254, 0.35);
  
  --status-locked-red: #EF4444;
  --status-available-blue: #1E293B;
  --status-owned-green: #10B981;
  --cell-marked-gold: #F59E0B;
  
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

---

## 2. Top Header & Stats Bar Component Specification

### UI Layout:
```text
┌────────────────────────────────────────────────────────────────────────┐
│  Close                     Abay H Bingo Mini App                   (•••)│
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐   ┌──────────────────────┐   ┌──────────────────────┐ │
│ │  ባለ 10 ETB   │   │   ድራሽ 2000.00 ETB    │   │     የተጠራ 27 Calls   │ │
│ └──────────────┘   └──────────────────────┘   └──────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ [🌐 አማርኛ ▾]   [🔊 Sound]   [🤖 Auto-Mark]   [👁️ የጨዋታ አይነት (Patterns)]│
└────────────────────────────────────────────────────────────────────────┘
```

1. **Card Price Badge (`ባለ 10 ETB`)**: Displays cost per card.
2. **Live Prize Pool (`ድራሽ 2000.00 ETB`)**: Glowing gold center badge.
3. **Drawn Calls Count (`የተጠራ 27`)**: Number of balls called out so far in the round.
4. **Countdown Badge (`ቀሪ ጊዜ 53s`)**: Red badge during `COUNTDOWN` state.
5. **Interactive Header Control Buttons**:
   - **Language Selector Dropdown**: Toggle between English and Amharic (`አማርኛ`).
   - **Sound Mute/Unmute Toggle**: Mute audio callout sounds.
   - **Auto-Mark Switch (`🤖` / `👁️`)**: Toggles automatic highlighting of drawn numbers on card.
   - **Game Pattern Button (`የጨዋታ አይነት`)**: Opens the **40-Pattern Preview Modal**.

---

## 3. Game Pattern Preview Modal Component (`PatternModal`)

When the user clicks `የጨዋታ አይነት` (Game Type info), a glassmorphic modal opens displaying the mathematical winning patterns:

```text
┌────────────────────────────────────────────────────────────────────────┐
│  የጨዋታ አይነት: ካፒታል T + 1 መስመር                     [ X ]  │
├────────────────────────────────────────────────────────────────────────┤
│                          Pattern 1 of 40                               │
│                                                                        │
│       B        I        N        G        O                            │
│    ┌───────┬────────┬────────┬────────┬───────┐                        │
│    │   X   │   X    │   X    │   X    │   X   │ (Top Row)              │
│    ├───────┼────────┼────────┼────────┼───────┤                        │
│    │   X   │   X    │   X    │   X    │   X   │ (Second Row)           │
│    ├───────┼────────┼────────┼────────┼───────┤                        │
│    │       │        │   ★    │        │       │ (Center FREE)          │
│    ├───────┼────────┼────────┼────────┼───────┤                        │
│    │       │        │   X    │        │       │                        │
│    ├───────┼────────┼────────┼────────┼───────┤                        │
│    │       │        │   X    │        │       │                        │
│    └───────┴────────┴────────┴────────┴───────┘                        │
│                                                                        │
│    [ Back ]                                            [ Next ]        │
└────────────────────────────────────────────────────────────────────────┘
```

- **Coordinates Render**: Green `X` tiles for pattern targets, yellow `★` for center FREE space.
- **Pagination**: Cycles through all 40 winning pattern permutations.

---

## 4. 5,000 Card Selection & Lock Grid Specification

### Grid Layout:
- **Search Input**: `Search Card #...` (filters cards 1 to 5,000).
- **Card Tiles (5000 Total)**:
  - 🟥 **Red Tile + Lock Icon (`🔒`)**: Locked card purchased by another player in the round.
  - 🟦 **Dark Blue Tile**: Available card ready for purchase.
  - 🟩 **Bright Emerald Green Tile**: Card owned by current user (Card `#68`).
- **Footer Actions**: **Exit** (Red button) & **Refresh** (Green button).

---

## 5. Live Playing View & 75-Ball Master Board Specification

### 1. Callout Strip & Master Board:
- **Horizontal Ball Strip**: Displays past 10 callouts (e.g. `G-57`, `N-34`, `I-23`).
- **Master Board Grid (5x15 Matrix)**:
  - Rows: `B` (1-15), `I` (16-30), `N` (31-45), `G` (46-60), `O` (61-75).
  - Drawn cells turn bright green.
  - The latest callout displays a **gold glowing border box**.
  - Toggle button: `Show 👁️` / `Hide X`.

### 2. User 5x5 Card Grid (`Card 68`):
- 5x5 matrix displaying numbers.
- Matching callout numbers highlight in bright gold/orange (`34`).
- Center cell displays gold star `★`.
- **BINGO! Button**: Glowing green action button at bottom.

### 3. Disqualification Overlay (Anti-Cheat Penalty):
If BINGO is pressed without a valid winning pattern:
- Full screen modal overlay appears with a large red cross `❌`.
- Text: **`BINGO! DISQUALIFIED`**.
- Claim button is locked for 5 seconds while round drawing continues.

---

## 6. Detailed Implementation Roadmap

1. **Update Domain & Patterns**: Add 40-pattern set generator for Game Types.
2. **Update Frontend UI Components**:
   - `Header.tsx`: Add language, sound, auto-mark, and pattern info buttons.
   - `PatternModal.tsx`: Create 5x5 pattern preview modal with `Pattern X of 40` pagination.
   - `CardPickerView.tsx`: Render 5,000 card tiles with red lock icons `🔒`, search, exit & refresh buttons.
   - `BingoGameView.tsx`: Add 5x15 Master Board (`B-I-N-G-O` 1..75), newest callout gold box glow, and `BINGO! DISQUALIFIED` overlay on invalid claim.
