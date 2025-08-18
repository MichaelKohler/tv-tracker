# Show Status Updater GitHub Action - Product Requirements Document

## Overview

Implement a scheduled GitHub Action workflow that automatically checks all non-ended TV shows in the database and updates their status to `ended: true` if they have concluded according to the TVMaze API. This ensures the database accurately reflects current show statuses without manual intervention.

## Goals

- **Primary**: Automatically maintain accurate show status data in the database
- **Secondary**: Reduce manual maintenance overhead for show status updates
- **Business Value**: Ensure users see correct show information and improve data quality

## User Stories

### Story 1: Automated Show Status Updates

**As a** system administrator  
**I want** the system to automatically check and update ended show statuses  
**So that** the database remains accurate without manual intervention

**Acceptance Criteria:**

- Workflow runs automatically every week
- All shows with `ended: null` are checked against TVMaze API
- Shows that have ended are updated with `ended: true` and the end date
- Process handles API rate limiting gracefully
- Errors are logged and cause workflow failure

### Story 2: Monitoring and Observability

**As a** system administrator  
**I want** to see detailed logs of the show status update process  
**So that** I can monitor the system's health and troubleshoot issues

**Acceptance Criteria:**

- Log shows being processed (minimal info: name, maze ID)
- Log successful updates with show details
- Log final summary of total shows processed and updated
- Error details are captured in logs before workflow fails

## Functional Requirements

### Workflow Scheduling

- **Schedule**: Weekly execution using cron syntax
- **Timing**: Between 2:00-4:00 AM CET/CEST (European night hours)
- **Trigger**: Automatic via GitHub Actions scheduler
- **Manual Trigger**: Support manual workflow dispatch for testing

### Show Status Detection Logic

- **Source Data**: Query shows where `ended: null` in database
- **API Check**: Fetch show details from TVMaze API using existing maze.server.ts functions
- **Status Determination**: If API returns `ended` field with a date, mark show as ended
- **Update Logic**: Set `ended: true` and populate end date in database

### Error Handling Strategy

- **API Errors**: Log error details and exit with code 1 on first failure
- **Rate Limiting**: Implement retry logic with exponential backoff for 429 responses
- **Missing Shows**: Log warning if show not found in API, continue processing
- **Database Errors**: Log error and exit with code 1

### Processing Approach

- **Mode**: Serial processing (one show at a time)
- **Rate Limiting**: Follow existing scripts pattern (retry on 429 with delay)
- **Batching**: No batching required, process all eligible shows
- **Timeout**: No specific timeout constraints

### Logging Requirements

- **Start**: Log workflow start with timestamp
- **Processing**: Log each show being checked (name, mazeId)
- **Updates**: Log successful status updates with show details
- **Summary**: Log total shows processed and updated count
- **Errors**: Detailed error logging before exit

## Non-Goals

- Real-time show status updates (weekly is sufficient)
- Updating other show metadata beyond ended status
- User notifications about show status changes
- Rollback mechanism for incorrect updates
- Testing infrastructure for this workflow
- Performance optimization beyond rate limit handling

## Technical Considerations

### Performance Requirements

- **Runtime**: No specific constraints, serial processing acceptable
- **API Calls**: Rate limited to respect TVMaze API limits
- **Database**: Use existing connection pooling and transaction patterns

### Security Requirements

- **Credentials**: Use same DATABASE_URL pattern as other workflows
- **API Access**: No authentication required for TVMaze API
- **Secrets**: Leverage existing GitHub Secrets configuration

### Scalability Considerations

- **Show Volume**: Current architecture supports expected show counts
- **Growth**: Serial processing adequate for foreseeable growth
- **Resource Usage**: Standard GitHub Actions runner sufficient

### Integration Points

- **Database**: Existing Prisma client and schema
- **API**: TVMaze API via existing maze.server.ts
- **Logging**: Standard console logging for GitHub Actions
- **Monitoring**: GitHub Actions workflow status and logs

## Success Metrics

### Primary KPIs

- **Accuracy**: 100% of ended shows correctly identified and updated
- **Reliability**: Workflow success rate > 95%
- **Timeliness**: Updates applied within 7 days of show ending

### Secondary Metrics

- **Processing Time**: Total workflow execution time
- **API Efficiency**: Number of API calls per show processed
- **Error Rate**: Percentage of shows causing processing errors

### Monitoring Points

- Weekly workflow execution success/failure
- Number of shows processed per run
- Number of shows updated per run
- API rate limit encounters and retry success

## Open Questions

### Resolved Assumptions

- ✅ Weekly frequency confirmed
- ✅ European night timing specified (2-4 AM CET)
- ✅ Error handling strategy defined (fail fast)
- ✅ Serial processing confirmed
- ✅ Logging requirements specified
- ✅ Credentials approach confirmed

### Dependencies

- Existing TVMaze API integration via maze.server.ts
- Database access via existing Prisma setup
- GitHub Actions environment and secrets configuration

### Future Considerations

- Potential optimization for large show databases
- Integration with user notification system
- Audit trail for show status changes
- Performance monitoring and alerting

## Acceptance Criteria Summary

**Must Have:**

- [x] Weekly scheduled execution during European night hours
- [x] Process all shows with `ended: null`
- [x] Update database when show has ended per TVMaze API
- [x] Handle API rate limiting with retry logic
- [x] Log processing details and summary statistics
- [x] Fail workflow on first error with exit code 1
- [x] Use existing database credentials and connection patterns

**Should Have:**

- [x] Manual workflow trigger capability
- [x] Minimal logging for each show processed
- [x] Consistent error handling patterns

**Could Have:**

- [ ] Performance metrics collection
- [ ] Advanced retry strategies
- [ ] Show update notifications
