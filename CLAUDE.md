# McSnapface

Personal screenshot & screen recording app for Mac, built with Electron + React + TypeScript.

## Build & Run

```bash
npm run dev              # Dev mode with hot reload
npm run build && npm run package  # MUST build renderer before packaging
open dist/mac-arm64/McSnapface.app
```

**Important:** `npm run package` alone does NOT build the renderer. Always run `npm run build` first or the app will show a blank window.

## Architecture

- **Main process** (`src/main/index.ts`): Window management, tray, global shortcuts, IPC handlers, file I/O
- **Renderer** (`src/renderer/`): React app with Zustand store. Views: dashboard, screenshot-flow, recording-flow, annotation-editor, video-editor
- **Preload** (`src/preload/index.ts`): Exposes `captureAPI` to renderer via context bridge
- Capture happens in renderer via `getUserMedia` with `chromeMediaSource: 'desktop'` — window must be alive (but can be hidden)
- Sharing uploads to Vercel Blob via `@vercel/blob`. Requires `BLOB_READ_WRITE_TOKEN` in `.env` (project root or `~/Library/Application Support/mcSnapface/.env`)

## Known Bugs (as of 2026-03-28)

- **Capture flow broken end-to-end:** Cmd+Shift+5 hides window and auto-captures primary screen, but captures don't appear in the library. The annotation editor or save path likely has an issue when triggered while window is hidden.
- **Share untested:** Vercel Blob upload hasn't been verified working (blocked by capture bug above).
- **Screenshot flow always auto-captures:** The source picker is bypassed — clicking the in-app "Screenshot" button also auto-captures instead of showing source selection. Need to differentiate shortcut-triggered vs button-triggered flows.

## Recent Fixes (2026-03-28)

- Single-instance lock (`app.requestSingleInstanceLock`) prevents duplicate windows
- Cmd+Shift+5 hides app window before capture so it doesn't appear in screenshots
- `.env` file loader (no dotenv dependency) reads from userData or project root
- `window:show` IPC channel lets renderer re-show window after capture completes
- `npm install --legacy-peer-deps` required due to electron-vite/vite version conflict
