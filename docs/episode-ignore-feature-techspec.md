# Episode Ignore Feature - Technical Specification

## Overview

This document outlines the technical implementation for adding episode ignore functionality to the TV Tracker application. The feature allows users to mark episodes as "ignored" to exclude them from unwatched counts and viewing statistics while maintaining them in episode lists with appropriate visual treatment.

## Architecture Changes

### Database Schema Modifications

#### 1. Add ignored field to EpisodeOnUser model

**File**: `prisma/schema.prisma`

Add an `ignored` boolean field to the existing `EpisodeOnUser` model:

- Field name: `ignored`
- Type: `Boolean`
- Default value: `false`
- Index: Add compound index on `(userId, ignored)` for performance

The field will be added to the existing `EpisodeOnUser` model which currently tracks watched episodes. This allows us to distinguish between:

- No entry = unwatched episode
- Entry with `ignored: false` = watched episode
- Entry with `ignored: true` = ignored episode

### Backend Implementation

#### 1. Episode Server Functions

**File**: `app/models/episode.server.ts`

##### New Functions:

**markEpisodeAsIgnored**

- Parameters: `userId`, `episodeId`, `showId`
- Action: Creates `EpisodeOnUser` entry with `ignored: true`
- Validation: Ensures user has access to the show
- Error handling: Returns 404 if show not found for user

**markEpisodeAsUnignored**

- Parameters: `userId`, `episodeId`, `showId`
- Action: Deletes `EpisodeOnUser` entry (returns episode to unwatched state)
- Validation: Ensures user has access to the show and episode is currently ignored

##### Modified Functions:

**getUnwatchedEpisodesCountForUser**

- Update query to exclude episodes where `EpisodeOnUser.ignored = true`
- Modify logic: `totalAiredEpisodes - watchedCount - ignoredCount`

**getRecentlyWatchedEpisodes**

- Add explicit filter for `ignored: false` in existing query
- Ensures ignored episodes never appear in recently watched lists

**getTotalWatchTimeForUser**

- Add explicit filter for `ignored: false` in existing query
- Ensures ignored episodes don't contribute to watch time statistics

**getWatchedEpisodesCountForUser**

- Add explicit filter for `ignored: false` in existing query
- Ensures ignored episodes don't count as watched episodes

**getLast12MonthsStats**

- Add explicit filter for `ignored: false` in existing query
- Ensures ignored episodes don't appear in monthly statistics

**markAllEpisodesAsWatched**

- Update to skip episodes that are currently ignored
- Add filter to exclude ignored episodes from batch marking

#### 2. Show Server Functions

**File**: `app/models/show.server.ts`

##### Modified Functions:

**getShowsByUserId**

- Update `watchedEpisodesCount` query to exclude ignored episodes
- Add separate count for ignored episodes
- Modify unwatched calculation: `pastEpisodesCount - watchedCount - ignoredCount`

**getShowById**

- Add query to fetch ignored episode IDs for the user
- Return both `watchedEpisodes` and `ignoredEpisodes` arrays
- Ensure ignored episodes are excluded from watched count

### Frontend Implementation

#### 1. Episode List Component

**File**: `app/components/episode-list.tsx`

##### Props Interface Update:

- Add `ignoredEpisodes: Episode["id"][]` to Props interface

##### UI Logic Updates:

- For unwatched episodes (not in watched or ignored arrays):
  - Show "Mark as watched" button
  - Show "Ignore" button with white background and black border styling
- For watched episodes:
  - Show "Mark as not watched" button only
  - No ignore functionality (prevents direct watched→ignored transitions)
- For ignored episodes:
  - Apply grayscale styling (same as watched episodes)
  - Show "Unignore" button only
  - No watch/unwatch buttons

##### Visual Styling:

- Ignored episodes: Apply `grayscale` class (same as watched episodes)
- Ignore button: `bg-white border-2 border-black text-black hover:bg-gray-100`
- Unignore button: Same styling as ignore button

#### 2. Show Header Component

**File**: `app/components/show-header.tsx`

##### Props Interface Update:

- Add `ignoredEpisodes: Episode["id"][]` to Props interface

##### Statistics Display Update:

- Update watched count display to exclude ignored episodes
- Calculation: Show "Watched X of Y aired episodes" where Y excludes ignored episodes

#### 3. Route Handler Updates

**File**: `app/routes/tv.$show.tsx`

##### Action Function Updates:

Add new intent handlers:

- `"MARK_IGNORED"`: Call `markEpisodeAsIgnored()`
- `"MARK_UNIGNORED"`: Call `markEpisodeAsUnignored()`

##### Loader Function Updates:

- Update `getShowById()` call to retrieve ignored episodes
- Pass `ignoredEpisodes` to components

##### Error Handling:

Add error states for:

- `"MARKING_EPISODE_IGNORED_FAILED"`
- `"MARKING_EPISODE_UNIGNORED_FAILED"`

### Type Definitions

#### Component Props Updates

Update existing component interfaces to include ignored episodes:

```typescript
interface EpisodeListProps {
  episodes: Episode[];
  watchedEpisodes: Episode["id"][];
  ignoredEpisodes: Episode["id"][];
  showId: Show["id"];
}

interface ShowHeaderProps {
  show: Show & { episodes: Episode[]; archived: boolean };
  watchedEpisodes: Episode["id"][];
  ignoredEpisodes: Episode["id"][];
  features: FeatureFlags;
}
```

## Implementation Steps

### Phase 1: Database and Backend (Priority: High)

1. **Database Schema Update**
   - Add `ignored` field to `EpisodeOnUser` model in `prisma/schema.prisma`
   - Add compound index `(userId, ignored)` for performance

2. **Core Episode Functions**
   - Implement `markEpisodeAsIgnored()` function
   - Implement `markEpisodeAsUnignored()` function
   - Add comprehensive unit tests for new functions

3. **Statistics Functions Update**
   - Update `getUnwatchedEpisodesCountForUser()` to exclude ignored episodes
   - Update all statistics functions to filter `ignored: false`
   - Update existing unit tests to cover ignored episode scenarios

4. **Show Functions Update**
   - Update `getShowsByUserId()` to account for ignored episodes in unwatched counts
   - Update `getShowById()` to return ignored episodes array
   - Update related unit tests

### Phase 2: Frontend Integration (Priority: High)

5. **Route Handler Updates**
   - Add `MARK_IGNORED` and `MARK_UNIGNORED` intent handlers to `tv.$show.tsx`
   - Add error handling for ignore/unignore operations
   - Update loader to pass ignored episodes to components

6. **Episode List Component**
   - Update Props interface to include `ignoredEpisodes`
   - Implement three-state UI logic (unwatched/watched/ignored)
   - Add ignore and unignore buttons with proper styling
   - Apply grayscale styling to ignored episodes

7. **Show Header Component**
   - Update Props interface to include `ignoredEpisodes`
   - Update statistics display to exclude ignored episodes

### Phase 3: Testing and Validation (Priority: Medium)

8. **Unit Tests**
   - Test all new episode server functions
   - Test all modified statistics functions
   - Test show server function modifications
   - Ensure 100% coverage of new ignore functionality

9. **Integration Tests**
   - Test complete ignore/unignore workflows
   - Test statistics accuracy with mixed episode states
   - Test UI state transitions

10. **End-to-End Tests**
    - Test ignore functionality across different browsers
    - Test visual consistency of ignored episodes
    - Test statistics accuracy in dashboard views

## Data Flow

### Episode State Transitions

```
[unwatched] ←→ [watched]
     ↕
  [ignored]
```

**Valid Transitions:**

- unwatched → watched (existing functionality)
- watched → unwatched (existing functionality)
- unwatched → ignored (new functionality)
- ignored → unwatched (new functionality)

**Invalid Transitions:**

- watched → ignored (blocked by UI)
- ignored → watched (blocked by UI)

### Database State Representation

| Episode State | EpisodeOnUser Entry | ignored Field |
| ------------- | ------------------- | ------------- |
| unwatched     | None                | N/A           |
| watched       | Exists              | false         |
| ignored       | Exists              | true          |

## Security Considerations

### Authorization

- All ignore/unignore operations must validate user access to the show
- Use existing `showOnUser` relationship validation
- Ensure users can only modify episodes from shows they're tracking

### Data Integrity

- Prevent orphaned `EpisodeOnUser` records through proper foreign key constraints
- Ensure ignore state cannot be set on non-existent episodes

### Input Validation

- Validate all form inputs (intent, showId, episodeId)
- Ensure episodeId and showId are valid UUIDs

## Performance Considerations

### Database Queries

- New compound index `(userId, ignored)` will optimize statistics queries
- Consider adding `(showId, ignored)` index if show-level performance issues arise

### Frontend Performance

- Episode state calculations happen server-side to minimize client processing
- Component re-renders are minimized through proper prop structure
- Large episode lists (1000+) should maintain current pagination approach

## Error Handling

### Database Errors

- Handle unique constraint violations gracefully
- Retry transient connection errors
- Log all database errors for monitoring

### Business Logic Errors

- Return appropriate HTTP status codes (400, 404, 500)
- Provide user-friendly error messages
- Handle edge cases (non-existent episodes, unauthorized access)

### UI Error States

- Display error alerts for failed ignore/unignore operations
- Provide retry mechanisms for transient errors
- Maintain form state during error conditions

## Testing Strategy

### Unit Testing

- Test all new database functions with mock Prisma client
- Test edge cases: non-existent episodes, unauthorized access
- Test statistics calculations with various episode state combinations
- Achieve 100% code coverage for new functionality

### Integration Testing

- Test complete user workflows (ignore → unignore → watch)
- Test data consistency across related functions
- Test error handling and rollback scenarios

### End-to-End Testing

- Test UI interactions across different browsers
- Test visual styling of ignored episodes
- Test statistics accuracy in real user scenarios

## Migration Strategy

### Feature Rollout

- Feature can be deployed incrementally without breaking existing functionality

### Rollback Plan

- Database migration can be reversed by dropping the `ignored` column
- No data loss occurs during rollback (ignored episodes become unwatched)

## Assumptions

1. **User Interface**: Users prefer contextual ignore buttons rather than bulk operations
2. **Visual Design**: Grayscale treatment for ignored episodes provides sufficient visual distinction
3. **Statistics**: Users want ignored episodes completely excluded from all metrics and counts
4. **State Transitions**: Direct watched↔ignored transitions are not needed (unwatched acts as intermediary)
5. **Performance**: Current pagination and query patterns will scale with ignore functionality
6. **Data Retention**: Ignored episode information should persist indefinitely (no automatic cleanup)

## Future Considerations

### Potential Enhancements

- Bulk ignore functionality for seasons or entire shows
- Ignore history and analytics
- Import/export of ignored episode lists
- Integration with external services (Trakt, IMDB) for ignore suggestions
