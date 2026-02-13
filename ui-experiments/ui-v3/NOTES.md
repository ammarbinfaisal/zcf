## UI v3 (Story + Testimonials)

**Branch:** `ui/v3-story`

### Palette (60/30/10)
- 60% (dominant): `#FAF3E0` (warm sand)
- 30% (secondary): `#1F2937` (slate)
- 10% (accent): `#0EA5E9` (sky)

### Components used
- `src/components/ui/text-generate-effect.tsx`
- `src/components/ui/infinite-moving-cards.tsx`

### Key UI edits
- `src/app/globals.css` – palette + `animate-scroll` keyframes
- `src/app/page.tsx` – story hero + stories section + testimonials

### Hurdles / notes
- `InfiniteMovingCards` needed a local `animate-scroll` keyframe and correct `animation-direction` values.

