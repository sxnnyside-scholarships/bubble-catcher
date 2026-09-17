# Frontend — Vue 3 + Vite SPA

## Architecture
- **Framework**: Vue 3 (Composition API `<script setup lang="ts">`)
- **Build Tool**: Vite with `@tailwindcss/vite`
- **State Management**: Pinia
- **Styling**: Tailwind CSS v4 + Bubblemorphism design system (`src/design/bubblemorphism.css`)
- **Internationalization**: `vue-i18n` with English (`en`) and Spanish (`es`)

## Commands
- `bun run dev`: Start Vite dev server with HMR (:5173)
- `bun run build`: Typecheck with `vue-tsc -b` and build production assets
- `bun run typecheck`: Run `vue-tsc -b`
- `bun run lint`: Run Biome linter (`biome check .`)
- `bun run lint:fix`: Auto-fix lint and formatting issues (`biome check --write .`)
- `bun run format`: Run Biome formatter (`biome format --write .`)
- `bun test`: Run test suite (`bun test`)

## Key Guidelines
- Never hardcode user-facing strings; use `t('key')` from `vue-i18n`.
- Components use design tokens defined in `src/style.css` and `src/design/bubblemorphism.css`.
- API client functions reside in `src/lib/api.ts` consuming the backend endpoints.
