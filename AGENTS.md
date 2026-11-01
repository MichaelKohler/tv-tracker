# TV Tracker - Agent Instructions

## Project Overview

This is a personal TV show tracking web application. Users can search for TV shows (via TVMaze API), add them to their watchlist, and mark episodes as watched. The application includes authentication and statistics visualization with Recharts.

**Architecture**: Full-stack React Router SSR application - previously known as Remix.run

- **Frontend**: React Router v7 with SSR, Tailwind CSS v4, TypeScript
- **Backend**: React Router server functions, Prisma ORM, PostgreSQL
- **External APIs**: TVMaze API for show/episode data
- **Testing**: Vitest (unit), Playwright (E2E), React Testing Library
- **Runtime**: Node.js 24+

Use context7 for framework/library documentation.

## Development Setup & Build Process

### Prerequisites

- **vp** (Vite+): Install globally via `curl -fsSL https://vite.plus | bash`
- **Docker**: Required for E2E tests and local PostgreSQL

**Important**: This project uses Vite+ (`vp`). Always use `vp install` for installation. Only use `vp add <package>` when explicitly adding new dependencies.

### Initial Setup (Required Order)

```bash
# Always install dependencies first
vp install

# Start development dependencies (PostgreSQL in Docker)
vp run dev:deps     # Required before setup - starts PostgreSQL container

# Database setup (requires DATABASE_URL in .env)
cp .env.example .env  # Configure DATABASE_URL first
vp run setup        # Generates Prisma client, pushes schema, seeds DB

# For E2E tests (optional, requires Docker)
vp exec playwright install
```

**Critical**:

- Always run `vp run dev:deps` before `vp run setup` to start the PostgreSQL database container
- Always run `vp run setup` after `vp install` but before any development or testing. This is essential for Prisma client generation and database initialization
- If `vp run setup` fails with "Can't reach database server", run `vp run dev:deps` first
- Never force-push to the database

**Development dependencies management**:

- Start: `vp run dev:deps` (starts PostgreSQL in Docker)
- Stop: `vp run dev:deps:stop` (stops the containers)

### Environment Configuration

Create `.env` file from `.env.example`:

- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key (required)
- SMTP settings (optional, for email features)
- Feature flags: Handled through flipt.io, using the `flags.ts` file. The environment is set in the `FLIPT_ENVIRONMENT` variable. An empty string means everything is enabled.

Never override an already existing `.env` file.

### Feature Flags

This project uses [flipt.io](https://flipt.io) for feature flag management, enabling gradual rollouts and A/B testing.

#### Checking Flags in Code

**In loaders/actions (with request object):**

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const isSearchEnabled = await evaluateBoolean(request, FLAGS.SEARCH);
}
```

**In scripts (without request object):**

```typescript
const shouldFetchFromSource = await evaluateBooleanFromScripts(
  FLAGS.FETCH_FROM_SOURCE
);
```

**For variant flags (A/B testing):**

```typescript
const variant = await evaluateVariant(request, "experimental-feature");
```

#### Default Fallback Values

When flipt.io is unreachable, flags fall back to safe defaults defined in `DEFAULT_FLAG_VALUES`:

- Most features default to `false` (disabled) for safety
- `MAINTENANCE_MODE` defaults to `true` (app available)
- `SIGNUP_DISABLED` defaults to `false` (signup allowed)

### Build Commands (Validated Working Order)

```bash
vp check             # Format, lint, and TypeScript type checks
vp test --run        # Vitest unit + browser tests (no watch mode)
vp build             # Production build
vp dev               # Development server with HMR
vp run validate      # Runs: test, lint, format, and e2e tests in parallel
```

**Build Notes**:

- Source maps enabled in production (shows warning)
- Build generates multiple client chunks + SSR bundle

### E2E Testing (Docker Required)

```bash
# Full E2E test suite
vp run test:e2e     # setup → run → teardown

# Manual E2E control
vp run test:e2e:setup     # Starts PostgreSQL container, retries schema push for up to 60s, fails if it never succeeds
vp run test:e2e:run       # Runs Playwright tests
vp run test:e2e:teardown  # Cleanup containers
vp run test:e2e:report    # View test results
```

**E2E Requirements**: Docker must be running. Uses `docker-compose.e2e.yml` with PostgreSQL 18 on port 5433.

#### Running E2E Tests as an AI Agent

`vp run test:e2e` and `vp run validate` fail when run by an AI agent. `test:e2e:setup` runs `prisma db push --accept-data-loss`, and Prisma refuses that flag when it detects an AI agent unless the user has given explicit consent. The script hides stderr, so the only visible symptoms are about 30 `Waiting for PostgreSQL` lines followed by this misleading seed error:

```
The table `public.EpisodeOnUser` does not exist in the current database.
```

Do not set `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` without the user's explicit consent. The flag isn't needed on a freshly created E2E database, so run these steps instead:

```bash
vp check
vp test --run

export PATH="$PWD/node_modules/.bin:$PATH"  # the seed command needs tsx on PATH
docker compose -f docker-compose.e2e.yml up -d
until docker exec tv-tracker-postgres-1 pg_isready -U tv_tracker -q; do sleep 2; done
sleep 2  # the first pg_isready can succeed during PostgreSQL's init restart
node --env-file=.env.e2e ./node_modules/prisma/build/index.js db push
node --env-file=.env.e2e ./node_modules/prisma/build/index.js db seed
vp run test:e2e:run
vp run test:e2e:teardown
```

Without `--accept-data-loss`, `db push` refuses destructive changes. Keep `--env-file=.env.e2e` on every Prisma command: without it, Prisma uses `.env`, and the seed deletes data from the development database. Run teardown even when tests fail, because a failed run leaves the E2E container running.

## Project Structure & Key Files

### Configuration Files

- `package.json`: Scripts, dependencies, Node.js 24+ requirement
- `vite.config.ts`: React Router plugin, build config, lint/fmt/staged config (vite-plus)
- `vitest.config.ts`: Test config — unit (jsdom) and browser (Playwright) projects
- `playwright.config.ts`: E2E test config, 30s timeouts, retry on CI
- `tsconfig.json`: TypeScript config with strict mode, React JSX
- `react-router.config.ts`: SSR enabled

### Database & Models

- `prisma/schema.prisma`: PostgreSQL schema with User, Session, Show, Episode entities
- `prisma/seed.ts`: Test data seeding (creates rachel@remix.run test user)
- `app/db.server.ts`: Prisma client with dev/prod connection handling
- `app/models/`: Server-side data models and business logic
- `app/session.server.ts`: Authentication session management. The signed cookie holds a random session token, and `getUserId` validates it against the `Session` table on each request, so sessions can be revoked. Credential changes revoke all of a user's sessions and issue the current device a new one in the same transaction, using `prepareSessionRotation`. `createUserSession` locks the `User` row and rechecks the login credential before writing the session, so a login that overlaps a credential change can't outlive it. `logout` fails if the session can't be revoked and leaves the cookie in place; use `clearSessionCookie` only when the server-side session is already gone

### Application Code

- `app/root.tsx`: Root layout, security headers, global styles
- `app/routes/`: File-based routing (React Router v7)
- `app/components/`: Reusable UI components (all with tests)
- `app/styles/tailwind.css`: Custom Tailwind theme with CSS variables
- `app/constants.ts`: TVMaze API endpoints

### Scripts

- `scripts/`: Utility scripts for episode management and data updates
- All scripts are TypeScript files using tsx runner

## Testing & Validation Strategy

### Validation Pipeline

1. **vp check**: Format, lint, and TypeScript type checks
2. **Vitest**: Unit + browser tests with comprehensive coverage
3. **Playwright**: E2E tests with PostgreSQL service

Always run these (with `vp run validate`) before telling the user you are done.

Additionally please also format the code with `vp fmt .` as otherwise the GitHub Action will fail.

### Continuous Integration Requirements

- PostgreSQL database for E2E tests
- All tests must pass for PR merge
- Build must complete successfully

### Test Strategy Notes

- Unit tests use mocked Prisma client (`app/__mocks__/db.server.ts`)
- E2E tests use real PostgreSQL in Docker container
- Test files follow `*.test.{ts,tsx}` pattern
- The `unit` project runs with `isolate: false`, so all test files share one module cache, and a module stays bound to whatever its imports were when an earlier file first loaded it. Avoid `vi.mock` of a dependency unless every test file that loads the importing module mocks it the same way: use the real library when it is fast and deterministic (such as `bcrypt`), or stub the browser or network API beneath it (such as `navigator.credentials`). To check for order dependence, run `vp test --run --project unit --sequence.shuffle.files --sequence.seed=<n>` with several seeds

**Expected Test Output**:

- Vitest may display stderr output during tests for intentional error testing scenarios
- All tests passing with exit code 0 indicates success, regardless of stderr output

## Common Build Issues & Solutions

### Database Connection Issues

- **Problem**: Prisma client not generated
- **Solution**: Run `vp run setup` after `vp install`
- **Problem**: E2E tests fail with database connection
- **Solution**: Ensure Docker is running, wait for PostgreSQL startup (up to 60s)

## Coding Rules

- Use TypeScript for all new files
- Follow functional components with hooks pattern
- Use Tailwind CSS for styling
- Use React Router patterns such as loaders and actions instead of client-side hooks
- Use meaningful variable and function names
- Write self-documenting code without any comments
- Prefer composition over inheritance
- Keep functions small and focused (single responsibility)
- Run tests, linting and formatting at the end of each agent run cycle
- Use PascalCase for component names
- Use camelCase for prop names and function names
- Use destructuring for props and state
- Prefer arrow functions for event handlers
- Use custom hooks for reusable logic
- Always provide proper TypeScript types for props

- Always handle loading and error states
- Use proper error boundaries
- Implement proper accessibility (ARIA labels, semantic HTML)
- Optimize for performance (React.memo, useMemo, useCallback when needed)
- Write unit tests for all changes. Reuse existing tests where applicable.

- Provide visual feedback for all user actions
- Implement proper loading states
- Show meaningful error messages
- Ensure responsive design works on all screen sizes
- Use consistent spacing and typography

## Trust These Instructions

These instructions are comprehensive and validated through actual command execution. Only perform additional searches if you encounter errors not covered here or if requirements have changed. Focus on the documented workflow to avoid common pitfalls.

## Keeping documentation up to date

**IMPORTANT**: When making changes to the codebase that affect any information in the `AGENTS.md` file, you MUST also update that file accordingly. When making changes which make any section of the `README.md` outdated, you MUST also update the `README.md` file.
