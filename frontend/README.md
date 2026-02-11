# Bubble Catcher -- Frontend

> **Sxnnyside Project** -- Educational SQL analysis and sandboxed execution platform.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | [SvelteKit v2.5](https://kit.svelte.dev) |
| UI Library | [Svelte 5](https://svelte.dev) (runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable`) |
| Styling | [TailwindCSS v4](https://tailwindcss.com) via `@tailwindcss/vite` |
| Editor | [Monaco Editor v0.52](https://microsoft.github.io/monaco-editor/) |
| Auth | [Supabase JS v2.45](https://supabase.com/docs/reference/javascript) |
| Build | [Vite v5.4](https://vitejs.dev) |

---

## Architecture Overview

```
src/
|-- app.html                        HTML shell
|-- app.css                         TailwindCSS entry (imports + theme tokens)
|-- app.d.ts                        Global type augmentations
|-- lib/
|   |-- api.ts                      Typed API client (fetch wrapper, auth headers)
|   |-- stores.ts                   Svelte stores (session, profile, projects, theme, locale)
|   |-- supabase.ts                 Supabase browser client
|   |-- i18n/
|   |   |-- types.ts                Translation key interface
|   |   |-- en.ts                   English translations
|   |   |-- es.ts                   Spanish translations
|   |   `-- index.ts                Locale loader and reactive t() store
|   `-- components/
|       |-- LoginPage.svelte        Auth form (sign-in / sign-up)
|       |-- MonacoEditor.svelte     SQL editor (dynamic import, custom theme)
|       |-- AnalysisPanel.svelte    Displays analysis issues grouped by severity
|       `-- ExecutionPanel.svelte   Displays query execution results in a table
|-- routes/
|   |-- +layout.svelte              Root layout -- session initialization, auth state
|   |-- +layout.ts                  Disables SSR, imports global CSS
|   |-- +page.svelte                Landing / marketing page
|   `-- (app)/
|       |-- +layout.svelte          Authenticated layout shell (sidebar, header, profile guard)
|       |-- dashboard/+page.svelte  Dashboard overview
|       |-- projects/
|       |   |-- +page.svelte        Project list + create
|       |   `-- [id]/+page.svelte   Project editor (Monaco + analysis + execution)
|       |-- pricing/+page.svelte    Plan comparison
|       `-- settings/+page.svelte   User preferences (theme, locale)
`-- static/                         Static assets
```

---

## Theme System

The application supports three themes: `colorful`, `light`, and `dark`. Themes are implemented via CSS custom properties defined in `app.css` and activated by setting a `data-theme` attribute on the root `<html>` element.

Theme state is managed by:

1. **Svelte store** (`theme` in `stores.ts`) -- reactive in-memory state.
2. **localStorage** (`bubble-catcher-theme`) -- persists across page reloads.
3. **Database** (`bubble_profiles.preferred_theme`) -- persists across devices.

The `applyTheme()` function updates all three locations. On load, `loadTheme()` reads from localStorage first (for instant application) and then syncs with the server-stored preference.

Monaco Editor uses a custom `bubble-colorful` theme registered at initialization to match the application's color palette.

---

## Localization System (i18n)

Translations are plain TypeScript objects conforming to the `Translations` interface defined in `i18n/types.ts`. Two locales are currently supported:

| Locale | File |
|---|---|
| English | `i18n/en.ts` |
| Spanish | `i18n/es.ts` |

The `t` store is a `derived` store that reacts to changes in the `locale` store. When the locale changes, the `t` store switches to the corresponding translation object. All UI text references `$t.key` for automatic reactivity.

### Adding a New Locale

1. Create a new file `i18n/<code>.ts` exporting an object that satisfies `Translations`.
2. Import it in `i18n/index.ts` and add it to the `translations` record.
3. Add the locale code to the `preferred_locale` check constraint in the database schema.
4. Add the locale code to the `locale` store type in `stores.ts`.

---

## Auth Lifecycle

1. `supabase.ts` creates a browser-side Supabase client using `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.
2. The root `+layout.svelte` calls `supabase.auth.getSession()` on mount and subscribes to `onAuthStateChange`. The `session` and `sessionLoaded` stores are updated accordingly.
3. The `(app)/+layout.svelte` guards authenticated routes: it waits for `$sessionLoaded` to be `true` before checking `$session`. If the session is null after loading completes, the user is redirected to `/`.
4. When authenticated, every API call includes `Authorization: Bearer <token>` via the `getAuthHeaders()` function in `api.ts`. The client validates JWT structure (three dot-separated parts) before sending.
5. Unauthenticated users see `LoginPage.svelte`. Authenticated users are routed into the `(app)/` group.

### Defensive Patterns

- **`sessionLoaded` gate:** Auth-guard redirects only fire after `$sessionLoaded` is `true`. Without this, the app redirects to `/` on every hard reload because `$session` starts as `null` while `getSession()` is in flight.
- **Load-once flags:** `$effect()` blocks use boolean flags (`dashboardLoaded`, `projectsLoaded`, `dataLoaded`) to prevent duplicate API calls when Svelte re-runs effects.
- **Profile retry cooldown:** The `(app)/+layout.svelte` profile fetch retries after a 5-second delay on failure, not immediately, preventing infinite retry loops.
- **`.catch()` on all `$effect` API calls:** Every `$effect` that calls the API includes a `.catch()` to prevent unhandled promise rejections.

---

## API Client

`api.ts` exports a typed `api` object with `get`, `post`, `patch`, and `delete` methods. Each method:

1. Resolves the Supabase session token via `getAuthHeaders()`.
2. Constructs the full URL from `PUBLIC_API_URL` + the provided path.
3. Sends the request with `credentials: 'include'`.
4. Parses the JSON response into `ApiResult<T>`.
5. Throws on non-2xx responses with the server's error message.

The base URL is validated at module load time to ensure it exists and starts with `http`.

---

## Monaco Integration

`MonacoEditor.svelte` dynamically imports Monaco Editor to avoid SSR issues (Monaco requires browser APIs). Key behaviors:

- Registers a custom `bubble-colorful` theme with syntax highlighting aligned to the application palette.
- Configures SQL language mode based on the active project dialect.
- Exposes the editor instance for parent components to read the current SQL value.
- Handles cleanup on component destroy to prevent memory leaks.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PUBLIC_SUPABASE_URL` | Yes | -- | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | -- | Supabase anon/public key |
| `PUBLIC_API_URL` | Yes | -- | Backend API base URL (e.g. `http://localhost:3001/api/v1`) |

All public environment variables must be prefixed with `PUBLIC_` per SvelteKit convention. They are embedded at build time and visible in client-side bundles.

---

## SSR Considerations

SSR is disabled globally via `export const ssr = false` in `+layout.ts`. This is required because:

- Monaco Editor uses Web Workers and DOM APIs that do not exist in server environments.
- The Supabase client depends on `localStorage` for session persistence.
- All API calls require a browser-side session token.

If SSR were enabled, these modules would throw during server-side rendering.

---

## Running Locally

```bash
# Install dependencies
npm install

# Copy env template and fill in values
cp .env.example .env

# Start dev server (port 5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type-check
npm run check
```

---

## Common Runtime Pitfalls

| Problem | Cause | Resolution |
|---|---|---|
| Blank page in dev | `PUBLIC_SUPABASE_URL` not set | Create `.env` from `.env.example` |
| Monaco not loading | SSR enabled or dynamic import error | Verify `ssr = false` in `+layout.ts` |
| Type errors on `$shared/*` | Missing Vite alias | Check `resolve.alias` in `vite.config.ts` and `alias` in `svelte.config.js` |
| 401 from API | Session expired or token not attached | Check `stores.ts` session handling and `api.ts` auth headers |
| CORS errors | Backend `CORS_ORIGIN` does not match frontend URL | Set backend `CORS_ORIGIN` to `http://localhost:5173` |
| Flash redirect to `/` on reload | Auth guard fires before session loads | Verify redirect is gated on `$sessionLoaded` |
| Infinite API retry loop | Profile fetch resets flag immediately on error | Use cooldown timer before resetting `profileFetched` flag |
| `$shared` import not found | Path alias missing in one config | Must be configured in both `tsconfig.json` and `vite.config.ts` |
