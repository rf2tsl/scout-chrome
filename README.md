# scout-chrome

Chrome (MV3) side-panel extension for Scout. Capture the job listing on the
current tab, ship it to the Scout backend for AI-driven resume optimization,
and download the tailored resume — without leaving the page.

## Architecture

```
┌─────────────────────┐         chrome.runtime / chrome.tabs        ┌──────────────────┐
│  Side panel (React) │ ◄──────────────────────────────────────────► │   Background SW  │
│  src/panel/         │                                              │  src/background/ │
└─────────┬───────────┘                                              └────────┬─────────┘
          │                                                                   │
          │ chrome.tabs.sendMessage                                           │ stores
          ▼                                                                   ▼
┌─────────────────────┐                                              ┌──────────────────┐
│   Content script    │   page text / form fields                    │ chrome.storage   │
│   src/content/      │                                              │   .local         │
└─────────────────────┘                                              └──────────────────┘
          │
          ▼
   Active job-listing page

The panel calls scout-backend with a long-lived bearer token minted at sign-in:
  POST /api/discover/extract-listing/    (Sonnet)
  POST /api/resume/optimizations/        (creates an Optimization)
  GET  /api/resume/optimizations/{id}/   (poll until done)
  GET  /api/resume/optimizations/{id}/download/?format=pdf|docx
```

## Develop

```bash
npm install
npm run dev    # vite build --watch → dist/
npm run typecheck
```

To install in Chrome:

1. Visit `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and pick the `dist/` folder.
4. Click the Scout toolbar icon to open the side panel.

The first time you open the panel you'll see a **Sign in** screen. Click it —
the extension opens the Scout web app's `/extension-link` page, which mints a
90-day bearer token and posts it back to the extension. You only do this once
per browser.

## Backend URLs

URLs are configured in [src/shared/config.ts](src/shared/config.ts). Edit there
for local dev (e.g. `http://localhost:8000`).

The corresponding hosts must be in `manifest.json#host_permissions` so fetch is
allowed from the panel.

## Build for distribution

```bash
npm run build   # outputs dist/, ready to zip and submit
```

## File layout

```
manifest.json                 MV3 manifest
vite.config.ts                multi-entry build (panel + bg + content)
src/
├── background/index.ts       service worker — token storage, side-panel open, sign-in flow
├── content/index.ts          extract page text + bridge token-link postMessage to bg
├── panel/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx               SignIn / Listing / OptimizationResult router
│   ├── theme.ts
│   ├── styled.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useActiveTab.ts
│   │   ├── useListingExtract.ts
│   │   └── useOptimization.ts
│   └── views/
│       ├── SignIn.tsx
│       ├── Listing.tsx
│       └── OptimizationResult.tsx
└── shared/
    ├── api.ts                fetch wrapper + auth header
    ├── config.ts             API_BASE_URL, WEB_APP_BASE_URL
    ├── messages.ts           typed chrome.runtime message protocol
    ├── storage.ts            chrome.storage.local helpers
    └── types.ts              cross-module types
```

## Phase B (autofill) — TODO

Not yet implemented. Will add `Apply` view, `useAutofill` hook, and DOM-fill
side of the content script once the backend `/api/resume/applicant-profile/`
and `/api/resume/autofill-map/` endpoints land.
