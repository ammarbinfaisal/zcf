## UI v1 (Aurora / Spotlight)

**Branch:** `ui/v1-aurora`

### Palette (60/30/10)
- 60% (dominant): `#F5F7FA` (mist)
- 30% (secondary): `#0F766E` (teal)
- 10% (accent): `#F59E0B` (amber)

### Components used
- `src/components/ui/aurora-background.tsx`
- `src/components/ui/spotlight.tsx`

### Key UI edits
- `src/app/globals.css` – palette + aurora/spotlight animations
- `src/app/page.tsx` – aurora hero + trust row
- `src/components/site/header.tsx` – subtle premium hover states

### Hurdles / notes
- Aceternity components are added via `bunx shadcn@latest add @aceternity/...` (not `bun add`).

