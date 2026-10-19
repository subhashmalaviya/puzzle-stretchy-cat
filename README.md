# 🐱 Stretchy Cat — Puzzle Game

An engaging, addictive grid-puzzle game built with React, Vite, and Tailwind CSS. Stretch your cat across the board, avoid water puddles, grab bonus fish treats, and beat the clock!

---

## 🌟 Features

- **Multi-Stage Progression**:
  - Stage 1: Living Room (12 Levels)
  - Stage 2: Kitchen Counter (14 Levels)
  - Stage 3: Dusty Attic (16 Levels)
  - Stage 4: Botanical Sunroom (18 Levels)
  - Stage 5: Royal Cat Palace (20 Levels)
  - Each next stage increases total levels by **+2** with larger grid sizes (up to 7×7) and higher path densities.
- **Continuous Non-Stopping Countdown Clock**: Timer starts upon clicking **Start Game 🚀** and continues ticking seamlessly across level clears.
- **Water Hazards 💧**: Stepping into water puddles causes a splash and resets the current level, burning valuable seconds.
- **Fish Treats 🐟 & Yarn 🧶**: Catch treats before they vanish for precious bonus seconds and score multipliers.
- **Real-Time Multiplayer Battle Rooms**:
  - Create and join custom room codes (e.g. `CAT-777`).
  - Friends ready-up lobby with synchronized `3.. 2.. 1.. GO!` countdown.
  - Live floating leaderboard HUD displaying players' live ranks, levels, and scores.
  - **Sudden Death**: When ANY player's timer hits zero, the match terminates for everyone, displaying the winner 👑, podium (🥇, 🥈, 🥉), and rematch option.
- **Score History & High Score Tracking**: Best score displayed at the top, full history modal with timestamps and stats.

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local Vite development server
npm run dev

# 3. Open in browser
http://localhost:3000/
```

To test the production build locally:
```bash
npm run build
npm start
```

---

## 🚀 Deployment on Render

### Method 1: Automatic Blueprint (Recommended)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository: `https://github.com/subhashmalaviya/puzzle-stretchy-cat`.
4. Render will automatically detect `render.yaml` and configure the free Node Web Service.
5. Click **Apply**. Render will install, build, and deploy the game with full real-time multiplayer support!

---

### Method 2: Manual Web Service (Full Real-Time Multiplayer)
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Web Service**.
3. Connect your repository `puzzle-stretchy-cat`.
4. Configure the settings:
   - **Language / Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Click **Create Web Service**.

---

### Method 3: Manual Static Site
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Static Site**.
3. Connect your repository `puzzle-stretchy-cat`.
4. Configure the settings:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
5. Click **Create Static Site**.

---

## 📜 License
Apache-2.0
