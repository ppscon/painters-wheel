# The Painter's Wheel

Interactive colour theory for oil painters. Four lesson paintings (contrast, value, hue, chroma) with pin-based colour sampling, Munsell notation interpolated from the real renotation dataset, oil paint matching across five manufacturers (Winsor & Newton, Michael Harding, Old Holland, Gamblin, Rembrandt), two-paint mixing recommendations, automatic palette extraction for uploaded images, and a dynamic RYB colour wheel with a live mixing lab (hue nudging along the wheel, chroma cancellation toward the complement, tint and shade with a black-versus-complement comparison). Pins and the saved palette persist per browser via localStorage, and the sampling canvas supports touch (drag to inspect, release to pin). A dedicated Zorn Palette tab covers the four-tube portrait method. Value view posterises on equal L* bands (3, 5 or 9 steps) for notan studies, and every image gets a luminosity histogram with shadow, mid and light zone masses. Contextual tooltips explain Munsell notation, ΔE scores and mixing behaviour in place, and a help overlay (the ? in the header) covers every tab plus a glossary. All paint mixing uses a Kubelka-Munk subtractive model on reconstructed reflectance spectra, so mixes behave like pigment rather than light.

## Stack

React 18 + Vite. No backend; all colour analysis (CIELAB, CIEDE2000, k-means palette extraction) runs in the browser. Uploaded images never leave the client.

## Development

```bash
npm install
npm run dev        # http://localhost:5280 (strictPort)
npm run build
npm run preview    # http://localhost:5281
```

Ports are pinned to 5280/5281 deliberately to avoid colliding with other local Vite projects on 5173.

## Structure

- `src/munsellData.js` · the 2,734-point Munsell renotation dataset as D65 CIELAB
- `src/App.jsx` — the whole application for now (Phase 1); will be split into components in Phase 2
- `public/lessons/` — the four lesson paintings (`contrast.jpg` is Caravaggio's The Taking of Christ, public domain, National Gallery of Ireland via Wikimedia Commons; the other three are the site author's own works)

## Deploying to Vercel

Vercel auto-detects Vite. Import the repo, accept the defaults (build command `vite build`, output `dist`), deploy. No environment variables required.

## Roadmap

- Phase 2: Munsell hue circle with value/chroma slices backed by the renotation lookup table
- Phase 3: value-zone posterisation and luminosity histogram; additional master studies
- Exportable study sheets (pinned image + records as a printable mixing plan)
- Saved palettes and pins persisted via Supabase

## Notes

Paint swatch values are approximate masstones compiled for guidance; verify against manufacturer colour charts. Munsell notation is a Lab-based approximation until the renotation lookup ships.
