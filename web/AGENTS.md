# FRONTEND KNOWLEDGE BASE

**Generated:** 2026-07-04
**Stack:** Next.js App Router + TypeScript + React + Tailwind

## STRUCTURE

```
web/
├── app/                  # App Router pages + components
│   ├── (commonLayout)/   # Authenticated routes (apps, datasets, plugins)
│   ├── (shareLayout)/    # Public/shared routes
│   ├── (humanInputLayout)/ # Human-input forms
│   ├── components/       # React components (108 base, workflow canvas)
│   └── [signin|signup|install|init|forgot-password|reset-password|activate]/
├── service/              # API service layer (55 composables)
├── contract/             # API contracts (console + marketplace)
├── hooks/                # Custom React hooks (23 files)
├── context/              # React context providers (29 files)
├── types/                # TypeScript type definitions
├── utils/                # Utility functions (52 files)
├── i18n/                 # Internationalization (23 languages)
├── i18n-config/          # i18n configuration
├── themes/               # CSS theme files (light/dark)
├── next/                 # Next.js re-export wrapper (non-standard!)
├── config/               # Runtime config
├── constants/            # Constants (link.ts only)
├── plugins/              # dev-proxy, eslint, vite plugins
├── test/                 # Test directory (alongside __tests__/)
├── assets/               # SVG icons
├── models/               # Data models (at root, not in app/)
├── public/               # Static assets
└── .storybook/           # Storybook config
```

## WHERE TO LOOK

| Task              | Location                   | Notes                            |
| ----------------- | -------------------------- | -------------------------------- |
| New page/route    | `app/(commonLayout)/`      | Use route groups for layouts     |
| Base UI component | `app/components/base/`     | 108 foundational components      |
| Workflow canvas   | `app/components/workflow/` | Visual workflow editor           |
| API call          | `service/`                 | Use composables from `contract/` |
| Type definition   | `types/`                   | Shared TypeScript types          |
| Custom hook       | `hooks/`                   | 23 reusable hooks                |
| Context provider  | `context/`                 | 29 React contexts                |
| i18n string       | `i18n/en-US/`              | Must use flat, sorted keys       |
| Theme/style       | `themes/`                  | Light/dark CSS themes            |
| Utility function  | `utils/`                   | 52 utility files                 |
| Test file         | `__tests__/` or `test/`    | Dual test directories            |
| Storybook story   | `.storybook/`              | UI component development         |

## CONVENTIONS

### TypeScript

- **Strict mode**: `no-explicit-any: error`
- **type over interface**: For all type definitions
- **No direct `next` imports**: Use `@/next` wrapper
- **Package manager**: `pnpm` only (enforced via `only-allow pnpm`)
- **Node engine**: `^22.22.1`

### Styling

- **Tailwind**: Enforced via ESLint (consistent class order, no duplicates)
- **Icons via Tailwind**: Use `i-*` classes, not raw SVG/JSX
- **Themes**: Light/dark via CSS variables in `themes/`

### Components

- **Overlay primitives**: Use `@/app/components/base/ui/*` (not legacy)
- **Legacy overlays**: `modal`, `select`, `tooltip`, `toast`, `confirm`, `portal-to-follow-elem` are DEPRECATED
- **Component complexity**: >300 lines or >50 complexity score needs refactoring before testing

### API Integration

- **Contracts**: Define in `contract/` (console + marketplace)
- **Services**: Use composables in `service/` (55 files)
- **Query/Mutation**: Follow `frontend-query-mutation` skill patterns

### i18n

- **Keys**: Must be flat, sorted, without extra/placeholder inconsistencies
- **Location**: `web/i18n/en-US/` for English strings
- **No hardcoded text**: All user-facing strings must use i18n

### Testing

- **Framework**: Vitest + React Testing Library
- **Commands**: `pnpm test` (via Vite+ `vp test`)
- **Coverage**: `VITEST_COVERAGE_SCOPE=app-components`
- **CI sharding**: 6 parallel shards with blob report merging
- **Storybook**: For UI component development

## ANTI-PATTERNS (THIS PROJECT)

| Pattern                          | Why Forbidden                           |
| -------------------------------- | --------------------------------------- |
| `any` type                       | Use explicit types, `unknown` if needed |
| Direct `next` imports            | Use `@/next` wrapper                    |
| Legacy overlay imports           | Use `@/app/components/base/ui/*`        |
| Hardcoded strings                | Use i18n keys                           |
| Inconsistent Tailwind            | ESLint enforces class order             |
| Raw SVG/JSX icons                | Use `i-*` Tailwind icon classes         |
| Interface declarations           | Use `type` keyword                      |
| Z-index overrides on `base/ui/*` | NEVER add z-index overrides             |

## NOTES

- **`next/` wrapper is non-standard**: Custom directory wrapping Next.js imports for custom behavior
- **Dual test directories**: `__tests__/` (alongside source) and `test/` (at root) — fragmented
- **`models/` at root**: Data models separated from `app/` layer
- **`contract/` + `service/` separation**: API contracts and consumers in different directories
- **Vite+ build system**: vite/vitest aliased to @voidzero-dev packages
- **Framework duality**: Config files for both Next.js AND Vite

## QUICK REFERENCE

```bash
pnpm install           # Install dependencies
pnpm dev               # Dev server
pnpm lint:fix          # Lint + fix
pnpm type-check        # Type check
pnpm test              # Run tests
pnpm storybook         # Storybook
pnpm analyze-component # Component complexity
```
