# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VanPanelWebUI (AI+CloudOps-web) is the Vue 3 frontend for the VanPanel cloud-native operations platform. Built on **Vben Admin Pro v5.2.2** as a pnpm/Turborepo monorepo.

- **Vue 3.5** · TypeScript · Vite · Ant Design Vue 4 · Pinia · Tailwind CSS
- **Dev server**: port 4004, proxies `/api` to `http://localhost:8889/api` (backend)
- **Node >= 20**, **pnpm >= 9**

## Commonly Used Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run dev` | Vite dev server (port 4004) |
| `pnpm run build` | Turbo-powered production build (all packages) |
| `pnpm run build:antd` | Build only the web-antd app |
| `pnpm run lint` | ESLint via `vsh lint` |
| `pnpm run format` | Prettier via `vsh lint --format` |
| `pnpm run check:type` | TypeScript type check across all workspace packages |
| `pnpm run test:unit` | Vitest (jsdom environment) |
| `vitest run <path/to/file.test.ts>` | Run single test file |

---

## Architecture

### Monorepo Layout

```
VanPanelWebUI/
├── apps/web-antd/          # Primary application (@vben/web-antd)
├── packages/
│   ├── @core/              # Vben core: layouts, menus, base components, UI kit
│   ├── effects/            # Request client (@vben/request), SSE/WebSocket
│   ├── stores/             # Global Pinia state (user, access, tabbar, lock)
│   ├── constants/          # Shared constants
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Shared utilities
│   ├── locales/            # Shared i18n
│   ├── styles/             # Shared styles
│   ├── icons/              # Icon components
│   └── preferences/        # Preference management
├── internal/               # Build tooling (vite-config, lint-configs, tailwind-config)
└── scripts/                # CLI tools (vsh)
```

All shared packages are `@vben/*` scoped. Turborepo manages build dependencies (`^build` ordering).

### Import Alias

`#` maps to `./src` in the web-antd app. Configured in both `tsconfig.json` (paths) and `vite.config.mts` (resolve.alias). Use `#/api/...`, `#/views/...`, `#/router/...`, etc.

### App Bootstrap (`apps/web-antd/src/`)

`main.ts` → `initPreferences()` → dynamic `import('./bootstrap')` → `bootstrap(namespace)`:
1. `createApp(App)` — root component with Ant Design Vue `ConfigProvider` (theming + locale)
2. `setupI18n(app)` — vue-i18n with zh-CN/en-US
3. `initStores(app, { namespace })` — Pinia with `pinia-plugin-persistedstate` (namespace-prefixed keys in localStorage)
4. `registerAccessDirective(app)` — `v-access` directive for permission-based rendering
5. `app.use(router)` — Vue Router
6. `app.use(Antd)` — Ant Design Vue globally registered

### Network Layer (`apps/web-antd/src/api/`)

Three Axios clients in `request.ts`:
- **`requestClient`** — primary client for backend API (base URL from `apiURL`)
- **`requestClientAIOps`** — separate client for AI service (base URL from `aiopsURL`)
- **`baseRequestClient`** — unconfigured client for refresh token calls (avoids circular interceptor dependency)

All built on `RequestClient` class from `@vben/request`. Response envelope `{ code, data, message }` is unwrapped by the response interceptor — returns `data` when `code === 0`. Token refresh uses a queue-based pattern that buffers concurrent 401 requests.

### Routing (`apps/web-antd/src/router/`)

**Frontend-driven routing** (`accessMode: 'frontend'` in preferences). Routes are defined in `src/router/routes/modules/` and auto-discovered via `import.meta.glob('./modules/**/*.ts', { eager: true })`.

Each route module exports `RouteRecordRaw[]` with:
- Top-level route using `BasicLayout` component
- Child routes with lazy-loaded components: `() => import('#/views/...')`
- `meta.order` for menu ordering, `meta.icon` (Iconify format), `meta.title`

Route modules: `dashboard.ts`, `k8s.ts`, `prometheus.ts`, `workorder.ts`, `servicetree.ts`, `cron.ts`, `assistant.ts`, `predict.ts`, `rca.ts`, `files.ts`

### State Management (`packages/stores/` + `apps/web-antd/src/store/`)

Global stores (in `packages/stores/`):
- `useAccessStore` (id: `'core-access'`) — accessToken, refreshToken, accessCodes, accessMenus, accessRoutes. **Persisted** in localStorage.
- `useUserStore` (id: `'core-user'`) — userInfo (avatar, realName, userId, username), userRoles
- `useTabbarStore` (id: `'core-tabbar'`) — open tabs, cached tabs. **Persisted** in sessionStorage.
- `useLockStore` (id: `'core-lock'`) — lock screen state. **Persisted** in localStorage.

App-level store (in `apps/web-antd/src/store/`):
- `useAuthStore` (id: `'auth'`) — login/logout flows, token management

Store keys are namespace-prefixed: `${namespace}-${storeId}`.

### Component Pattern

Business views follow a **composable + template** pattern:
- **`.ts` file** — exports `useXxxPage()` composable with all state (`ref()`), computed properties, form validation rules, and CRUD action functions
- **`.vue` file** — template-only, consumes the composable. Uses Ant Design Vue components (`a-table`, `a-modal`, `a-form`, etc.)
- **API file** in `#/api/core/` — typed request/response interfaces + async functions calling `requestClient`

### Business Views (`apps/web-antd/src/views/`)

| View | Feature |
|------|---------|
| `k8s/` | 18 K8s resource management pages (cluster, namespace, node, deployment, pod, service, ingress, configmap, secret, PV, PVC, RBAC, YAML templates/tasks) |
| `prometheus/` | Scrape pools/jobs, alert rules/events/records, on-duty groups, send groups, config |
| `workorder/` | Form design, categories, process design, instances, notifications, templates |
| `servicetree/` | CMDB tree, local/cloud resources, terminal, web terminal |
| `dashboard/` | Welcome, user/API/role/audit management |
| `assistant/` | AI assistant (query, sessions, knowledge base) |
| `ai/` | AI console |
| `predict/` | Load prediction dashboard and analysis |
| `rca/` | Root cause analysis |
| `cron/` | Cron job management |
| `files/` | File manager, terminal manager |

### i18n

Two languages: `zh-CN` (default) and `en-US`. App-specific translations in `apps/web-antd/src/locales/langs/*.json`. Most translations come from `@vben/locales` shared package. Ant Design Vue locale and dayjs locale are set dynamically.

### Preferences

`apps/web-antd/src/preferences.ts` overrides Vben defaults:
- `accessMode: 'frontend'` — routes defined in frontend, not from backend API
- `enableRefreshToken: true` — automatic token refresh
- `theme.mode: 'light'` — default light theme
- `tabbar.keepAlive: true` — keep-alive for open tabs

---

## Code Conventions

- Vue 3 Composition API with `<script setup>` throughout
- TypeScript strict; type check via `vue-tsc --noEmit --skipLibCheck`
- Pinia stores via `defineStore` composable pattern
- Two Axios instances: `requestClient` (backend) and `requestClientAIOps` (AI service)
- Module-based route definitions with lazy imports
- Pre-commit hooks: Husky + lint-staged (ESLint + Prettier + Stylelint)
- ESLint config from `@vben/eslint-config`, Prettier from `@vben/prettier-config`
- Tailwind CSS from `@vben/tailwind-config`
- CSS: Tailwind + SCSS; Ant Design Vue tokens for theming
