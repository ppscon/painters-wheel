# The Painter's Wheel — project notes

Interactive colour theory for oil painters. Live at https://painters-wheel.vercel.app
(Vercel project `painters-wheel`, ptmps-projects). Remote: https://github.com/ppscon/painters-wheel.

## Commands

- `npm run dev` — dev server on port 5280
- `npm run lint` — ESLint (no-undef is the critical rule; runs as `prebuild`, so Vercel refuses to build unresolved identifiers — this app shipped two white-screens from that bug class)
- `npm test` — Vitest (43 tests incl. a jsdom App smoke render that catches the same class)
- `npm run build` — lints first, then Vite build; a build-time plugin in vite.config.js emits sw.js with the hashed asset list
- Deploy: `vercel deploy --prod --yes` from THIS directory (Vercel builds from source; never deploy dist/ directly — that creates a new project named "dist")

## Architecture notes

- `src/state/persist.js` — ALL localStorage reads go through `loadSaved()`/`sanitiseSaved()`; nothing may throw at module scope (ErrorBoundary can't catch module-init errors)
- `src/state/sync.js` — cross-device sync via private codes against the Crate Escape Supabase project (`pw_sync` table, RLS deny-all, access only via `pw_sync_get`/`pw_sync_put` SECURITY DEFINER RPCs; migration `painters_wheel_sync`)
- Munsell renotation data is fetched at runtime from `/munsell.json`, NOT bundled; regenerate with `node scripts/build-munsell-json.mjs` (source of truth: `src/munsellData.js`, imported only by tests/scripts)
- All non-landing tabs are React.lazy; Lessons is the landing chunk
- PWA: sw.js precaches everything; sw registration is PROD-only in main.jsx

## History

Built originally in a Claude Desktop session (phases 1.x–3.1), hardened/extended in Claude Code
2026-07-21/22. A sibling prototype exists at ~/Developer/colour-studio (paintmatchlab.com) —
see its gap analysis before building: the "I mixed this" observation loop, tube calibration,
and mixing-ladder UI were identified as the top ideas worth porting from it.
