# Copilot Instructions - TV Tracker

## Project Overview

This is a TV tracking application that allows users to track their favorite TV shows, episodes, and viewing progress.

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS version 4
- **State Management**: React Router loaders
- **Routing**: React Router v7 (migrated from Remix v2)
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library as well as E2E testing with Playwright
- **Linting**: ESLint + Prettier
- **Package Manager**: npm
- **Database**: Prisma with PostgreSQL
- **API**: TVMaze API for show and episode data
- **Version Control**: Git
- **Deployment**: Vercel

## Coding Standards

### General Rules

- Use TypeScript for all new files
- Follow functional components with hooks pattern
- Use Tailwind CSS for styling
- Use Remix patterns such as loaders and actions instead of client-side hooks
- Use meaningful variable and function names
- Write self-documenting code with minimal comments
- Prefer composition over inheritance
- Keep functions small and focused (single responsibility)
- Run tests, linting and formatting at the end of each agent run cycle

### React specific

- Use PascalCase for component names
- Use camelCase for prop names and function names
- Use destructuring for props and state
- Prefer arrow functions for event handlers
- Use custom hooks for reusable logic
- Always provide proper TypeScript types for props

### File Structure

- Components in `/app/components/`
- Routes in `/app/routes/`
- Prisma data models in `/app/models/`

### Naming Conventions

- Components: `PascalCase.tsx` (e.g., `ShowCard.tsx`)
- Hooks: `use + PascalCase` (e.g., `useShowData.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `PascalCase` interfaces/types (e.g., `Show`, `Episode`)

### Code Quality

- Always handle loading and error states
- Use proper error boundaries
- Implement proper accessibility (ARIA labels, semantic HTML)
- Optimize for performance (React.memo, useMemo, useCallback when needed)
- Write unit tests for all changes. Reuse existing tests where applicable.
- Use consistent import ordering (external libraries first, then internal modules)

## Project-specific Rules

### TV Show Data

- Always validate API responses
- Handle missing or incomplete show data gracefully
- Use consistent date formatting throughout the app

### User Experience

- Provide visual feedback for all user actions
- Implement proper loading states
- Show meaningful error messages
- Ensure responsive design works on all screen sizes
- Use consistent spacing and typography

### Performance

- Optimize images and assets
- Minimize bundle size
- Use proper memoization techniques

## Documentation Maintenance Rules

### Self-Maintenance

**IMPORTANT**: When making changes to the codebase that affect any information in this Copilot instructions file, you MUST also update this file accordingly. This includes:

- Technology stack changes (adding/removing libraries, frameworks)
- File structure modifications
- New coding standards or rule changes
- Updated naming conventions
- New project-specific requirements

### README Maintenance

**IMPORTANT**: When making changes that make any section of the README.md outdated, you MUST also update the README.md file accordingly. This includes:

- Installation instructions changes
- New features or functionality
- Changed development workflow
- Updated project description or goals

### Documentation Sync

Always ensure that:

- Code comments match actual implementation
- Type definitions reflect current data structures
- Example code in documentation is working and up-to-date
- All breaking changes are documented

## Common Patterns

### Error Handling

```typescript
try {
  const data = await fetchShows();
  setShows(data);
} catch (error) {
  setError(error instanceof Error ? error.message : "An error occurred");
} finally {
  setLoading(false);
}
```

### Component Structure

```typescript
interface Props {
  // Define props here
}

export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks at the top
  // Event handlers
  // Render logic

  return (
    // JSX
  );
};
```

## Testing Guidelines

- Test user interactions, not implementation details
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies according to other tests
- Aim for good test coverage but focus on most useful paths

Remember: These instructions should evolve with the project. Keep them updated as the codebase grows and changes.
