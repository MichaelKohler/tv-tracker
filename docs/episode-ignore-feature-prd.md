# Episode Ignore Feature - Product Requirements Document

## Introduction/Overview

The TV Tracker application currently allows users to mark episodes as "watched" or "unwatched". This PRD defines a new feature that allows users to mark episodes as "ignored" - episodes they don't intend to watch but want to exclude from their tracking without affecting their viewing statistics.

This feature addresses the common scenario where users skip certain seasons or episodes (e.g., watching only the final season of a long-running show) and need a way to hide unwatched content without inflating their watch statistics.

## Goals

### Primary Objectives

- Enable users to mark individual episodes as "ignored" to hide them from unwatched content lists
- Ensure ignored episodes don't contribute to viewing statistics or completion metrics
- Provide a seamless user experience that integrates with the existing episode management workflow

### Business Value

- Improves user experience by providing more granular control over episode tracking
- Increases user engagement by allowing more flexible viewing patterns
- Maintains accurate viewing statistics by separating ignored content from watched content

## User Stories

### US-1: Mark Episode as Ignored

**As a** TV Tracker user  
**I want to** mark an episode as ignored  
**So that** it doesn't appear in my unwatched episode lists but also doesn't count as watched in my statistics

**Acceptance Criteria:**

- An "Ignore" button appears below the "Mark as watched" button for unwatched episodes
- The ignore button is styled as a white button with black border
- Clicking ignore marks the episode as ignored and visually greys it out like watched episodes
- Ignored episodes don't appear in unwatched episode counts or lists
- Ignored episodes don't contribute to viewing statistics

### US-2: Unignore Episode

**As a** TV Tracker user  
**I want to** mark an ignored episode as "unignored"  
**So that** it returns to normal unwatched state if I change my mind

**Acceptance Criteria:**

- Ignored episodes show an "Unignore" button instead of ignore/watch buttons
- Clicking unignore returns the episode to normal unwatched state
- Unignored episodes reappear in unwatched counts and can be marked as watched normally

### US-3: Prevent Ignoring Watched Episodes

**As a** TV Tracker user  
**I want** watched episodes to not show ignore options  
**So that** my viewing history remains accurate

**Acceptance Criteria:**

- Watched episodes only show "Mark as not watched" button
- No ignore button appears for episodes already marked as watched
- Users must first mark an episode as unwatched before they can ignore it

## Functional Requirements

### FR-1: Episode State Management

- The system shall support three episode states per user: unwatched, watched, and ignored
- Episode state transitions shall be: unwatched ↔ watched, unwatched ↔ ignored
- Direct transitions between watched and ignored states shall not be allowed

### FR-2: User Interface Integration

- The ignore button shall appear directly below the "Mark as watched" button for unwatched episodes
- The ignore button shall have white background with black border styling
- Ignored episodes shall display with the same visual treatment as watched episodes (greyed out)
- Ignored episodes shall show an "Unignore" button to restore them to unwatched state

### FR-3: Statistics Exclusion

- Ignored episodes shall be completely excluded from all viewing statistics
- Ignored episodes shall not count toward show completion percentages
- Unwatched episode counts shall exclude ignored episodes

### FR-4: Data Management

- Episode ignore state shall be stored in the database with appropriate indexing
- All episode update scripts shall continue to process ignored episodes normally
- Ignored episodes shall remain syncable with external data sources

### FR-5: Display Behavior

- Ignored episodes shall not appear in upcoming episodes lists
- Ignored episodes shall not appear in unwatched episode counts in show headers
- Ignored episodes shall appear greyed out in episode lists (same as watched episodes)
- No separate ignored episodes list shall be provided

## Non-Goals

- Bulk ignore functionality for multiple episodes
- Season-level or show-level ignore functionality
- Separate ignored episodes list or view
- Integration with existing "Ignore on overview" show feature
- Automatic ignore suggestions based on user behavior

## Design Considerations

### User Experience Requirements

- The ignore functionality must feel natural and intuitive within the existing episode management flow
- Visual feedback must clearly distinguish between different episode states while maintaining consistency
- The interface should minimize cognitive load by keeping ignore functionality contextual

### Accessibility Requirements

- Ignore buttons must meet WCAG accessibility standards
- Button labels must be descriptive and screen-reader friendly
- Color-blind users must be able to distinguish ignored episodes through non-color indicators

## Technical Considerations

### Database Schema Changes

- Add `ignored` boolean field to `EpisodeOnUser` model with default value `false`
- Update existing database indexes to include ignored status for performance

### Performance Requirements

- Episode state queries must complete within existing performance benchmarks
- Statistics calculations must maintain current response times despite additional filtering
- Database queries must utilize proper indexing for ignored status

### Security Requirements

- Episode ignore actions must respect existing user authentication and authorization
- Users can only ignore episodes from shows they are tracking
- All ignore/unignore actions must be logged appropriately

## Questions answered after the fact

1. Should there be a confirmation dialog when ignoring episodes to prevent accidental clicks? No.
2. Should ignored episodes have any indicator in episode lists beyond greying out? No.
3. How should ignored episodes be handled in data exports or backups? Same as other episodes.
4. Should there be user preferences to show/hide ignored episodes in lists? No.

## Dependencies

- Existing episode state management system
- Statistics calculation functions
- Episode list UI components
- User authentication and authorization system

## Testing Strategy

### Unit Testing

- Database operations for ignore/unignore functionality
- Statistics calculation exclusions
- Episode state transition validation

### Integration Testing

- UI component interactions with ignore functionality
- End-to-end episode state management workflows
- Statistics accuracy with mixed episode states

### User Acceptance Testing

- Ignore/unignore workflows across different devices
- Visual consistency across episode lists
- Statistics accuracy validation
