# SDK KNOWLEDGE BASE

**Generated:** 2026-07-04
**Stack:** Node.js (TypeScript) + PHP

## STRUCTURE

```
sdks/
├── nodejs-client/     # Full Node.js SDK (TypeScript)
│   ├── src/           # Source code
│   │   ├── client/    # Client implementations
│   │   ├── http/      # HTTP layer (SSE, retry, form-data)
│   │   ├── types/     # TypeScript types
│   │   ├── errors/    # Error classes
│   │   └── index.ts   # Main export
│   ├── __tests__/     # Unit tests
│   ├── tsup.config.ts # Build config
│   ├── vitest.config.ts # Test config
│   ├── eslint.config.js # Lint config
│   └── package.json   # Dependencies
├── php-client/        # Simple PHP SDK (single file)
│   ├── dify-client.php # Main client class
│   └── composer.json  # PHP dependencies
└── README.md          # SDK documentation
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Node.js client | `nodejs-client/src/client/` | Chat, completion, workflow, etc. |
| Node.js types | `nodejs-client/src/types/` | TypeScript interfaces |
| Node.js HTTP | `nodejs-client/src/http/` | SSE, retry, form-data handling |
| Node.js errors | `nodejs-client/src/errors/` | Custom error classes |
| PHP client | `php-client/dify-client.php` | Single-file implementation |
| Tests | `nodejs-client/__tests__/` | Unit tests |
| Build | `nodejs-client/tsup.config.ts` | tsup bundler config |
| Lint | `nodejs-client/eslint.config.js` | ESLint config |

## CONVENTIONS

### Node.js SDK
- **TypeScript**: Strict mode, `no-explicit-any: error`
- **Build**: tsup bundler
- **Test**: Vitest
- **Lint**: `@typescript-eslint` recommended + type-checked
- **Imports**: `consistent-type-imports: error` (prefer type imports)
- **Exports**: Named exports, barrel file at `src/index.ts`

### PHP SDK
- **Single file**: `dify-client.php` contains entire implementation
- **Composer**: Simple autoloading
- **No tests**: PHP SDK has no test suite

### API Coverage
Both SDKs cover:
- Chat completions
- Text completions
- Workflow execution
- Knowledge base operations
- File uploads
- Audio transcription/translation

## ANTI-PATTERNS (THIS PROJECT)

| Pattern | Why Forbidden |
|---------|---------------|
| `any` type in Node.js | Use explicit types |
| Unsafe imports | Use `consistent-type-imports` |
| Missing error handling | Always handle API errors |
| Hardcoded API keys | Use environment variables |

## NOTES

- **Incomplete SDK set**: README mentions Java, Go, Ruby, Python SDKs in separate repos
- **PHP SDK is bare**: Single-file implementation vs. full TypeScript project
- **SDKs at repo root**: Unusual placement (typically separate repos or `packages/`)
- **Node.js SDK is production-ready**: Full test suite, build pipeline, type safety
- **PHP SDK needs expansion**: No tests, minimal implementation

## QUICK REFERENCE

```bash
# Node.js SDK
cd sdks/nodejs-client
pnpm install && pnpm build && pnpm test

# PHP SDK
cd sdks/php-client
composer install
```
