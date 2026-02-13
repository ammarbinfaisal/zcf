## UI v4 (Modern Dark / Premium)

**Branch:** `ui/v4-dark`

### Palette (60/30/10)
- 60% (dominant): `#0B0F14` (near-black)
- 30% (secondary): `#334155` (slate)
- 10% (accent): `#FBBF24` (gold)

### Components used
- `src/components/ui/background-beams.tsx`
- `src/components/ui/moving-border.tsx`

### Key UI edits
- `src/app/layout.tsx` – defaults to dark (`<html className="dark">`)
- `src/app/globals.css` – palette mapped onto existing brand variables
- `src/app/page.tsx` – beams hero + moving-border donate CTA

### Hurdles / notes
- `moving-border.tsx` had hardcoded colors; switched to use CSS variables.

