# TV Tracker - Agent Instructions

## Project Overview

This is a personal TV show tracking web application. Users can search for TV shows (via TVMaze API), add them to their watchlist, and mark episodes as watched. The application includes authentication and statistics visualization with Recharts.

**Architecture**: Full-stack React Router SSR application - previously known as Remix.run

- **Frontend**: React Router v7 with SSR, Tailwind CSS v4, TypeScript
- **Backend**: React Router server functions, Prisma ORM, PostgreSQL
- **External APIs**: TVMaze API for show/episode data
- **Testing**: Vitest (unit), Playwright (E2E), React Testing Library
- **Runtime**: Node.js 22+

Use context7 for framework/library documentation.

## Development Setup & Build Process

### Initial Setup (Required Order)

```bash
# Always install dependencies first
npm ci

# Database setup (requires DATABASE_URL in .env)
cp .env.example .env  # Configure DATABASE_URL first
npm run setup        # Generates Prisma client, pushes schema, seeds DB

# For E2E tests (optional, requires Docker)
npx playwright install
```

**Critical**: Always run `npm run setup` after `npm ci` but before any development or testing. This is essential for Prisma client generation and database initialization. Never force-push to the database.

### Environment Configuration

Create `.env` file from `.env.example`:

- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Session encryption key (required)
- SMTP settings (optional, for email features)
- Feature flags: Handled through flipt.io, using the `flags.ts` file. The environment is set in the `FLIPT_ENVIRONMENT` variable. An empty string means everything is enabled.

Never override an already existing `.env` file.

### Build Commands (Validated Working Order)

```bash
npm run typecheck    # TypeScript compilation (~1s)
npm run lint        # ESLint with cache (~1s)
npm run test        # Vitest unit tests (~5s, 315 tests)
npm run build       # Production build (~1.5s)
npm run dev         # Development server with HMR
npm run validate    # Runs: test --run, lint, typecheck, test:e2e in serial
```

**Build Notes**:

- Source maps enabled in production (shows warning)
- Build generates ~27 client chunks + SSR bundle

### E2E Testing (Docker Required)

```bash
# Full E2E test suite
npm run test:e2e     # setup → run → teardown

# Manual E2E control
npm run test:e2e:setup     # Starts PostgreSQL container, waits up to 60s
npm run test:e2e:run       # Runs Playwright tests
npm run test:e2e:teardown  # Cleanup containers
npm run test:e2e:report    # View test results
```

**E2E Requirements**: Docker must be running. Uses `docker-compose.e2e.yml` with PostgreSQL 15 on port 5433.

## Project Structure & Key Files

### Configuration Files

- `package.json`: Scripts, dependencies, Node.js 22+ requirement
- `vite.config.ts`: React Router plugin, build config with source maps
- `vitest.config.ts`: Test config with jsdom, global test utilities
- `playwright.config.ts`: E2E test config, 30s timeouts, retry on CI
- `eslint.config.mjs`: ESLint v9 flat config with React, TypeScript, accessibility
- `tsconfig.json`: TypeScript config with strict mode, React JSX
- `react-router.config.ts`: SSR enabled
- `postcss.config.mjs`: Tailwind CSS processing

### Database & Models

- `prisma/schema.prisma`: PostgreSQL schema with User, Show, Episode entities
- `prisma/seed.ts`: Test data seeding (creates rachel@remix.run test user)
- `app/db.server.ts`: Prisma client with dev/prod connection handling
- `app/models/`: Server-side data models and business logic
- `app/session.server.ts`: Authentication session management

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

1. **ESLint**: Code linting with cache
2. **TypeScript**: Type checking compilation
3. **Vitest**: Unit tests (51 files, 315 tests)
4. **Playwright**: E2E tests (16 tests) with PostgreSQL service

Always run these (with `npm run validate`) before telling the user you are done.

### Continuous Integration Requirements

- PostgreSQL database for E2E tests
- All tests must pass for PR merge
- Build must complete successfully

### Test Strategy Notes

- Unit tests use mocked Prisma client (`app/__mocks__/db.server.ts`)
- E2E tests use real PostgreSQL in Docker container
- Test files follow `*.test.{ts,tsx}` pattern

**Expected Test Output**:

- Vitest may display stderr output during tests for intentional error testing scenarios
- All tests passing with exit code 0 indicates success, regardless of stderr output

Always run "npm test" with `--run`, otherwise the tests will run in watch mode and not return. Also do this when running tests for a single file.

## Common Build Issues & Solutions

### Database Connection Issues

- **Problem**: Prisma client not generated
- **Solution**: Run `npm run setup` after `npm ci`
- **Problem**: E2E tests fail with database connection
- **Solution**: Ensure Docker is running, wait for PostgreSQL startup (up to 60s)

## Coding Rules

- Use TypeScript for all new files
- Follow functional components with hooks pattern
- Use Tailwind CSS for styling
- Use Remix patterns such as loaders and actions instead of client-side hooks
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

**IMPORTANT**: When making changes to the codebase that affect any information in the `AGENT.md` file, you MUST also update that file accordingly. When making changes which make any section of the `README.md` outdated, you MUST also update the `README.md` file.
