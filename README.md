<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Stretchy Cat Puzzle

A grid-based path puzzle game featuring a stretchy cat, built with React, Vite, and TypeScript.

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Clone the repository:
   ```bash
   git clone https://github.com/subhashmalaviya/puzzle-stretchy-cat.git
   cd puzzle-stretchy-cat
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your Gemini API key (optional) in `.env.local`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Deploy on Render

### Option 1: Manual Static Site Setup
1. Log in to [Render](https://dashboard.render.com/).
2. Click **New +** > **Static Site**.
3. Connect your repository: `https://github.com/subhashmalaviya/puzzle-stretchy-cat`.
4. Configure the build settings:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
5. (Optional) Add your `GEMINI_API_KEY` under **Environment Variables**.
6. Click **Create Static Site**.

### Option 2: Render Blueprint (`render.yaml`)
1. On Render, click **New +** > **Blueprint**.
2. Connect this repository; Render will automatically detect `render.yaml`.
