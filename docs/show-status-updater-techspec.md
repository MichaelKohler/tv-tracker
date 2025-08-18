# Show Status Updater GitHub Action - Technical Specification

## Overview

This document outlines the technical implementation for a scheduled GitHub Action that automatically detects and updates TV show statuses when they end, ensuring database accuracy through integration with the TVMaze API.

## Architecture Overview

### Components

1. **GitHub Actions Workflow** (`update-show-status.yml`)
   - Scheduled weekly execution with manual trigger capability
   - Standard Node.js 22 environment setup
   - Database connection via existing secrets pattern

2. **Update Script** (`scripts/update-show-status.ts`)
   - TypeScript script following existing project patterns
   - Integrates with existing Prisma database client
   - Uses existing TVMaze API integration via `maze.server.ts`

3. **Database Integration**
   - Leverages existing Prisma schema and client
   - Updates `Show` model `ended` field from `null` to `DateTime`
   - No schema changes required

## Detailed Implementation Plan

### Step 1: Create GitHub Actions Workflow

**File**: `.github/workflows/update-show-status.yml`

**Implementation Requirements**:

- Use cron schedule for weekly execution during European night hours (2-4 AM CET)
- Follow existing workflow patterns from `update.yml` and `force-update-episode.yml`
- Include `workflow_dispatch` trigger for manual execution
- Set up Node.js 22 environment
- Use existing `DATABASE_URL` secret from GitHub repository settings
- Include same environment variables as other scripts (SESSION*SECRET, FLIPT*\*, etc.)
- Execute `npm run update:show:status` command

**Cron Schedule**: `0 3 * * 1` (Every Monday at 3:00 AM CET/CEST)

**Environment Variables Required**:

- `NODE_ENV: production`
- `DATABASE_URL: ${{ secrets.DATABASE_URL }}`
- `SESSION_SECRET: "unused"` (following existing pattern)
- `FLIPT_URL: ${{ vars.FLIPT_URL }}`
- `FLIPT_TOKEN: ${{ secrets.FLIPT_TOKEN }}`
- `FLIPT_ENVIRONMENT: ${{ vars.FLIPT_ENVIRONMENT }}`

### Step 2: Add NPM Script

**File**: `package.json`

**Implementation Requirements**:

- Add new script entry: `"update:show:status": "tsx scripts/update-show-status.ts"`
- Follow existing script naming convention pattern
- Use `tsx` runner consistent with other scripts

### Step 3: Create Update Script

**File**: `scripts/update-show-status.ts`

**Core Logic Flow**:

1. **Environment Validation**
   - Check for `DATABASE_URL` environment variable
   - Exit with code 1 if missing

2. **Feature Flag Check**
   - Use existing flags system to check `FLAGS.FETCH_FROM_SOURCE`
   - Exit with code 1 if feature disabled (following existing pattern)

3. **Database Query**
   - Query all shows where `ended: null` using Prisma client
   - Use existing `prisma.show.findMany()` pattern
   - Select fields: `id`, `name`, `mazeId`, `ended`

4. **Serial Processing Loop**
   - Process shows one at a time (no parallelization)
   - For each show:
     - Log processing start: `"Checking show: {name} (mazeId: {mazeId})"`
     - Fetch show details from TVMaze API using existing `TV_GET_API_PREFIX`
     - Check if API response includes `ended` field with date value
     - If ended, update database record
     - Handle errors gracefully

5. **TVMaze API Integration**
   - Use existing `TV_GET_API_PREFIX` constant from `app/constants.ts`
   - Implement rate limiting with retry logic for 429 responses
   - Follow existing pattern from `get-new-episodes.ts` script
   - Use axios for HTTP requests with error handling

6. **Database Updates**
   - Use `prisma.show.update()` to set `ended: new Date(apiResponse.ended)`
   - Log successful updates: `"Updated show: {name} - ended on {endDate}"`
   - Use existing database connection patterns

7. **Error Handling Strategy**
   - API errors: Log error details and exit with code 1
   - Rate limiting (429): Retry with 5-second delay, max 3 attempts
   - Show not found in API: Log warning, continue processing
   - Database errors: Log error and exit with code 1
   - Network errors: Log error and exit with code 1

8. **Logging and Monitoring**
   - Start: `"Starting show status update process..."`
   - Processing: `"Processing {total} shows with unknown end status"`
   - Per show: `"Checking show: {name} (mazeId: {mazeId})"`
   - Updates: `"Updated show: {name} - ended on {endDate}"`
   - Summary: `"Process completed. Processed {total} shows, updated {updated} shows"`
   - Errors: Detailed error logging before exit

### Step 4: TypeScript Implementation Details

**Dependencies**:

- Import existing modules: `prisma`, `TV_GET_API_PREFIX`, `evaluateBooleanFromScripts`, `FLAGS`
- Use `axios` for HTTP requests (already available)
- Follow existing TypeScript patterns and error handling

**Type Definitions**:

- Use existing `Show` type from Prisma client
- Define TVMaze API response interface for show details
- Reuse existing patterns from `get-new-episodes.ts`

**Function Structure**:

```typescript
// Main execution function
async function updateShowStatuses(): Promise<void>;

// Individual show processing
async function checkAndUpdateShow(show: Show): Promise<boolean>;

// TVMaze API fetch with retry logic
async function fetchShowFromAPI(
  mazeId: string
): Promise<TVMazeShowResponse | null>;

// Database update operation
async function updateShowEndDate(showId: string, endDate: Date): Promise<void>;
```

**Error Handling Patterns**:

- Follow existing patterns from `get-new-episodes.ts`
- Use try-catch blocks for API calls and database operations
- Implement exponential backoff for rate limiting
- Log errors before throwing to ensure visibility

### Step 5: Integration Points

**Database Integration**:

- Use existing `prisma` client from `app/db.server.ts`
- Follow existing query patterns for show retrieval and updates
- No schema migrations required - `ended` field already exists as `DateTime?`

**API Integration**:

- Leverage existing `TV_GET_API_PREFIX` constant
- Use same HTTP client patterns as existing scripts
- Implement same rate limiting strategy as `get-new-episodes.ts`

**Feature Flags Integration**:

- Use existing `evaluateBooleanFromScripts` function
- Check `FLAGS.FETCH_FROM_SOURCE` flag before execution
- Follow existing patterns from other scripts

### Step 6: Testing Strategy

**Manual Testing**:

- Test script locally with development database
- Verify workflow execution via manual trigger
- Test with shows that have ended vs. ongoing shows
- Validate rate limiting behavior

**Error Scenario Testing**:

- Test with invalid mazeId values
- Test API rate limiting scenarios
- Test database connection failures
- Verify proper exit codes for all error conditions

### Step 7: Monitoring and Observability

**GitHub Actions Monitoring**:

- Workflow execution status visible in Actions tab
- Console logs available for troubleshooting
- Email notifications on workflow failure (GitHub default)

**Logging Strategy**:

- Use `console.log` for standard operations
- Use `console.error` for error conditions
- Include timestamp information for debugging
- Log processing statistics for monitoring

### Step 8: Deployment Process

**Implementation Order**:

1. Create update script with comprehensive testing
2. Add NPM script entry to package.json
3. Create GitHub Actions workflow file
4. Test manual workflow execution
5. Verify scheduled execution works correctly

**Rollback Strategy**:

- If issues arise, disable workflow by commenting out cron schedule
- Manual database corrections possible via existing admin tools
- No permanent schema changes to rollback

## Technical Specifications

### Performance Requirements

**Expected Load**:

- Process estimated 50-200 shows per execution
- Serial processing: ~2-3 seconds per show including API delay
- Total execution time: 3-10 minutes per run
- Weekly frequency sufficient for requirements

**Resource Usage**:

- Standard GitHub Actions runner (Ubuntu latest)
- Node.js 22 runtime environment
- Minimal memory requirements (~100MB)
- Database connection pooling via existing Prisma configuration

### Error Recovery

**Retry Logic**:

- HTTP 429 (Rate Limited): Retry with 5-second delay, max 3 attempts
- HTTP 5xx errors: No retry, log and continue to next show
- HTTP 4xx errors (except 429): No retry, log and continue
- Database connection errors: Exit immediately with code 1

**Failure Modes**:

- Individual show API errors: Continue processing other shows
- Database connectivity issues: Fail entire process
- Authentication errors: Fail entire process
- Rate limiting exceeded: Implement exponential backoff

### Security Considerations

**Credentials Management**:

- Use existing GitHub Secrets for `DATABASE_URL`
- No new secrets required
- Follow existing secret access patterns

**API Security**:

- TVMaze API requires no authentication
- Rate limiting compliance to prevent blocking
- No sensitive data in API requests or responses

**Data Protection**:

- Only update show metadata, no user data involved
- Use existing database transaction patterns
- Follow existing security practices for script execution

### Scalability Planning

**Current Scale**:

- Designed for current database size (estimated hundreds of shows)
- Serial processing adequate for foreseeable growth
- Weekly frequency provides sufficient update cadence

**Future Considerations**:

- Parallel processing possible if needed for larger datasets
- Batch API requests could improve efficiency
- Database indexing on `ended` field if query performance degrades

## Dependencies and Integration

### External Dependencies

**TVMaze API**:

- Endpoint: `https://api.tvmaze.com/shows/{id}`
- Rate limiting: Respect existing patterns
- No authentication required
- Response format: JSON with show metadata including `ended` field

**Database Dependencies**:

- PostgreSQL via existing Prisma configuration
- Show table with `ended` field (already exists)
- Existing database connection pooling
- No schema changes required

### Internal Dependencies

**Existing Code Modules**:

- `app/db.server.ts`: Database client
- `app/constants.ts`: API endpoint constants
- `app/flags.server.ts`: Feature flag system
- `scripts/` patterns: Error handling and logging

**Runtime Dependencies**:

- Node.js 22+ (existing requirement)
- TypeScript compilation via tsx
- Existing npm packages (axios, Prisma client)

## Risk Assessment and Mitigation

### Technical Risks

**API Rate Limiting**:

- Risk: TVMaze API blocks requests due to excessive usage
- Mitigation: Implement retry logic with exponential backoff
- Monitoring: Log rate limit encounters and retry success

**Database Performance**:

- Risk: Query performance degradation with large datasets
- Mitigation: Monitor query execution times, add indexes if needed
- Current: Database size not expected to cause issues

**GitHub Actions Reliability**:

- Risk: Scheduled workflows may occasionally fail
- Mitigation: Manual trigger capability for missed executions
- Monitoring: GitHub Actions provides built-in failure notifications

### Operational Risks

**False Positives**:

- Risk: Shows incorrectly marked as ended due to API data issues
- Mitigation: Thorough testing and validation of API responses
- Recovery: Manual database correction tools available

**Missed Updates**:

- Risk: Shows end but are not detected due to API issues
- Mitigation: Weekly execution provides regular checking
- Recovery: Manual trigger capability for catch-up processing

## Success Metrics and Monitoring

### Key Performance Indicators

**Accuracy Metrics**:

- Percentage of correctly identified ended shows: Target 100%
- False positive rate: Target <1%
- Processing completion rate: Target >95%

**Performance Metrics**:

- Average execution time per show: Target <3 seconds
- Total workflow execution time: Target <10 minutes
- API rate limit encounters: Target <5% of requests

**Reliability Metrics**:

- Workflow success rate: Target >95%
- Database update success rate: Target 100%
- Error recovery success rate: Target >90%

### Monitoring Implementation

**GitHub Actions Monitoring**:

- Workflow execution status visible in repository Actions tab
- Failed executions trigger email notifications
- Execution logs available for troubleshooting

**Application Monitoring**:

- Console logs provide detailed execution information
- Error logs include context for debugging
- Summary statistics logged for each execution

**Database Monitoring**:

- Monitor show status accuracy through existing application
- Track database query performance
- Monitor connection pool usage during script execution

## Future Enhancements

### Potential Optimizations

**Performance Improvements**:

- Parallel processing for multiple shows
- Batch API requests to TVMaze
- Database query optimization with indexes

**Feature Enhancements**:

- User notifications for ended shows
- Audit trail for show status changes
- Integration with other show metadata updates

**Monitoring Enhancements**:

- Performance metrics collection
- Advanced retry strategies
- Integration with external monitoring systems

### Extensibility Considerations

**Code Structure**:

- Modular function design allows for easy extension
- Separate concerns (API, database, logging) for maintainability
- TypeScript interfaces support additional metadata fields

**Configuration Options**:

- Feature flags allow runtime behavior modification
- Environment variables support different execution modes
- Cron schedule easily adjustable for different frequencies

This technical specification provides a comprehensive guide for implementing the Show Status Updater GitHub Action while maintaining consistency with existing project patterns and ensuring robust error handling and monitoring capabilities.
