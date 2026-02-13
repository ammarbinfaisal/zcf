## UI v2 (Trust-first Minimal)

**Branch:** `ui/v2-minimal`

### Palette (60/30/10)
- 60% (dominant): `#FFFFFF` (white)
- 30% (secondary): `#1E3A8A` (navy)
- 10% (accent): `#E11D48` (rose)

### Components used
- `src/components/ui/timeline.tsx`

### Key UI edits
- `src/app/globals.css` – palette mapped onto existing brand variables
- `src/app/page.tsx` – simplified editorial layout + Timeline
- `src/app/layout.tsx` – skip link + footer pinning

### Hurdles / notes
- Timeline component from Aceternity needed theme-adaptation (removed hardcoded white/black colors).

