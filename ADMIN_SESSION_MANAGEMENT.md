# Admin Session Management System

## Overview

The Pizza Chick n Crust admin dashboard now features a robust **multi-session management system** that allows multiple administrators to be logged in simultaneously without interfering with each other's sessions.

## Key Features

### 1. **Independent Sessions**

- Each admin login creates a unique session with its own session ID
- Sessions are stored independently in `localStorage`
- Logging out one admin does NOT affect other logged-in admins

### 2. **Session Isolation**

- Each session contains:
  - Unique session ID (e.g., `session_1704751234567_abc123xyz`)
  - Admin token
  - Username
  - Staff display name
  - Login timestamp
  - Last activity timestamp

### 3. **Active Sessions Display**

- The sidebar shows all currently active admin sessions
- Your current session is highlighted with "(You)" indicator
- Updates automatically every 5 seconds
- Only displays when 2 or more admins are logged in

## How It Works

### Login Process

1. Admin enters credentials on `/admin/index.html`
2. System validates credentials with backend
3. A unique session ID is generated
4. Session data is saved to `localStorage` under `adminSessions`
5. The session ID is set as the current active session
6. Admin is redirected to the dashboard

### Session Storage Structure

```javascript
{
  "session_1704751234567_abc123xyz": {
    "token": "pcnc-secret-token-123",
    "username": "admin1",
    "staffName": "John Doe",
    "loginTime": "2026-01-08T20:15:30.000Z",
    "lastActivity": "2026-01-08T20:30:45.000Z"
  },
  "session_1704751298765_def456uvw": {
    "token": "pcnc-secret-token-123",
    "username": "admin2",
    "staffName": "Jane Smith",
    "loginTime": "2026-01-08T20:16:15.000Z",
    "lastActivity": "2026-01-08T20:31:00.000Z"
  }
}
```

### Logout Process

1. Admin clicks "System Logout"
2. Only the current session ID is removed from `adminSessions`
3. Other sessions remain intact
4. Admin is redirected to login page

## Usage Scenarios

### Scenario 1: Multiple Admins on Same Computer

**Use Case:** Two admins working on the same computer using different browser tabs

1. Admin 1 logs in → Tab 1 shows Admin 1's session
2. Admin 2 logs in (new tab) → Tab 2 shows Admin 2's session
3. Both admins can work simultaneously
4. Admin 1 logs out → Only Tab 1 is logged out, Tab 2 remains active

### Scenario 2: Multiple Admins on Different Computers

**Use Case:** Multiple staff members managing orders from different locations

1. Each admin logs in from their own device
2. All sessions are independent
3. Logging out on one device doesn't affect others

### Scenario 3: Same Admin, Multiple Tabs

**Use Case:** One admin wants multiple dashboard views open

1. Admin logs in → Creates Session 1
2. Opens new tab and logs in again → Creates Session 2
3. Both tabs work independently
4. Closing one tab doesn't affect the other

## Session Manager API

### Available Methods

#### `SessionManager.generateSessionId()`

Generates a unique session identifier

```javascript
const sessionId = SessionManager.generateSessionId();
// Returns: "session_1704751234567_abc123xyz"
```

#### `SessionManager.getAllSessions()`

Retrieves all active sessions

```javascript
const sessions = SessionManager.getAllSessions();
// Returns: { session_id_1: {...}, session_id_2: {...} }
```

#### `SessionManager.getCurrentSessionId()`

Gets the current active session ID

```javascript
const currentId = SessionManager.getCurrentSessionId();
// Returns: "session_1704751234567_abc123xyz"
```

#### `SessionManager.getCurrentSession()`

Gets the current session data

```javascript
const session = SessionManager.getCurrentSession();
// Returns: { token: "...", username: "...", staffName: "..." }
```

#### `SessionManager.saveSession(sessionId, sessionData)`

Saves a new session

```javascript
SessionManager.saveSession(sessionId, {
  token: "pcnc-secret-token-123",
  username: "admin1",
  staffName: "John Doe",
});
```

#### `SessionManager.removeSession(sessionId)`

Removes a specific session (logout)

```javascript
SessionManager.removeSession(sessionId);
```

#### `SessionManager.updateActivity(sessionId)`

Updates the last activity timestamp for a session

```javascript
SessionManager.updateActivity(sessionId);
```

#### `SessionManager.getActiveAdmins()`

Gets list of all active admin names

```javascript
const admins = SessionManager.getActiveAdmins();
// Returns: ["John Doe", "Jane Smith"]
```

## Security Considerations

### Session Persistence

- Sessions are stored in `localStorage` (persists across browser restarts)
- Sessions remain active until explicitly logged out
- No automatic session expiration (can be added if needed)

### Session Hijacking Prevention

- Each session has a unique ID
- Activity timestamps track session usage
- Backend validates tokens on each request

### Recommended Enhancements

1. **Auto-logout on inactivity:** Add timeout for inactive sessions
2. **Session expiration:** Implement time-based session expiration
3. **Session limit:** Limit number of concurrent sessions per admin
4. **Session monitoring:** Log all session activities for audit trail

## Troubleshooting

### Issue: Admin gets logged out unexpectedly

**Solution:** Check if another admin logged out on the same browser. Each logout only affects that specific session.

### Issue: Active sessions display not updating

**Solution:** The display updates every 5 seconds. Wait a moment or refresh the page.

### Issue: Can't see other active admins

**Solution:** The active sessions display only shows when 2+ admins are logged in. If you're alone, it won't display.

### Issue: Old sessions accumulating

**Solution:** Sessions persist until logout. To clear all sessions:

```javascript
localStorage.removeItem("adminSessions");
localStorage.removeItem("currentSessionId");
```

## Migration from Old System

### Old System (Before)

- Used `sessionStorage.setItem('adminToken', token)`
- Used `localStorage.getItem('adminToken')`
- Logging out cleared global storage, affecting all tabs

### New System (After)

- Uses `SessionManager` with unique session IDs
- Each session is isolated
- Logout only affects current session

### No Breaking Changes

- Backend authentication remains the same
- Login credentials unchanged
- All existing admin accounts work as before

## Testing the System

### Test 1: Multiple Logins

1. Open admin login page
2. Login as Admin 1
3. Open new tab, login as Admin 2
4. Verify both dashboards work independently

### Test 2: Independent Logout

1. Have 2 admins logged in (2 tabs)
2. Logout from Tab 1
3. Verify Tab 2 remains active and functional

### Test 3: Active Sessions Display

1. Login as Admin 1
2. Verify no active sessions display (only 1 admin)
3. Login as Admin 2 in new tab
4. Verify both tabs show "Active Staff" section with 2 admins

## Future Enhancements

1. **Session Activity Monitor:** Real-time view of what each admin is doing
2. **Session Notifications:** Alert when new admin logs in
3. **Session Management Panel:** Admin can view and terminate other sessions
4. **Session Permissions:** Different permission levels for different admins
5. **Session Analytics:** Track admin activity and performance

## Support

For issues or questions about the session management system, contact the development team or refer to the main project documentation.

---

**Last Updated:** January 8, 2026
**Version:** 2.0.0
**Author:** PCnC Development Team
