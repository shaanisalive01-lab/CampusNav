# CampusNav v2 — pitch prototype

Self-contained, gradient-free, mobile-first web app (no build step). Everything the app needs is inside `v2/`.

## Run it
- Double-click `index.html`, or from the repo root: `python3 -m http.server 8000` → http://localhost:8000/v2/
- Demo any time of the week: `index.html?now=Mon@09:40`

## Demo script (≈3 minutes)
1. **Student:** Home shows the live countdown + "leave by" time → Navigate → animated route, stairs, step-free toggle.
2. **Settings → Demo role → Class Rep:** change Engineering Maths to Room 105 → *Publish & notify*.
3. **Club Admin:** publish an event. **Campus Admin:** broadcast a notice.
4. **Back to Student:** bell badge shows 3 updates, timetable/home reflect the new room, event appears in Events.

> Demo mode stores data in this device's `localStorage` (same keys as the original `cr.html` / `club-admin.html`).
> A real rollout needs a backend + login so a CR's change reaches every student's phone.

## Install as an app (PWA — no app store needed)
Serve over **https** (GitHub Pages, Netlify, Vercel…), then:
- **Android / Chrome:** ⋮ menu → *Install app*
- **iPhone / Safari:** Share → *Add to Home Screen*

It then opens full-screen with its own icon and works offline (service worker).

## Real App Store / Play Store builds (Capacitor)
`capacitor.config.json` at the repo root points at `v2/`. From the repo root:
```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap add android && npx cap add ios
npx cap sync
npx cap open android   # Android Studio  (Google Play: one-time $25)
npx cap open ios       # Xcode, Mac only (Apple Developer: $99/year)
```
Not yet built or tested here — it needs Android Studio / Xcode on your machine.

## Duplicated data
`campusData.js` and `timetableData.js` are copies of the repo-root files so `v2/` can be packaged on its own. Keep them in sync (or delete the old pages once v2 replaces them).
