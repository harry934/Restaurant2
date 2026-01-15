// Shared Administrative Core Logic
// Managed by Antigravity

const SessionManager = {
  // Get all active sessions
  getAllSessions() {
    const sessions = localStorage.getItem("adminSessions");
    return sessions ? JSON.parse(sessions) : {};
  },

  // Get current session ID
  getCurrentSessionId() {
    return sessionStorage.getItem("currentSessionId");
  },

  // Get current session data
  getCurrentSession() {
    const sessionId = this.getCurrentSessionId();
    if (!sessionId) return null;

    const sessions = this.getAllSessions();
    return sessions[sessionId] || null;
  },

  // Update session activity
  updateActivity(sessionId) {
    const sessions = this.getAllSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].lastActivity = new Date().toISOString();
      localStorage.setItem("adminSessions", JSON.stringify(sessions));
    }
  },

  // Remove a specific session (logout)
  removeSession(sessionId) {
    const sessions = this.getAllSessions();
    delete sessions[sessionId];
    localStorage.setItem("adminSessions", JSON.stringify(sessions));

    // If this was the current session, clear it from sessionStorage
    if (this.getCurrentSessionId() === sessionId) {
      sessionStorage.removeItem("currentSessionId");
    }
  },

  // Get all active admin names (for display)
  getActiveAdmins() {
    const sessions = this.getAllSessions();
    return Object.values(sessions).map((s) => s.staffName);
  },
};

async function adminFetch(url, options = {}) {
  const session = SessionManager.getCurrentSession();
  if (!session) {
    // Only redirect if we are in the admin dashboard path
    if (window.location.pathname.includes("/admin/")) {
      window.location.href = "index.html";
    }
    throw new Error("No active session");
  }

  // Update activity timestamp
  SessionManager.updateActivity(SessionManager.getCurrentSessionId());

  const ADMIN_TOKEN = "kibbys-secret-token-123"; // Matches server.js

  const defaultHeaders = {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
    "X-Staff-Name": session.staffName || "Admin",
    "X-Admin-Session-Id": SessionManager.getCurrentSessionId(),
    "X-Admin-Username": session.username,
  };

  // Don't override content-type if it's already set or if it's FormData
  if (
    !(options.body instanceof FormData) &&
    !options.headers?.["Content-Type"]
  ) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  const res = await fetch(url, mergedOptions);
  if (res.status === 401) {
    // Only remove current session on auth failure
    SessionManager.removeSession(SessionManager.getCurrentSessionId());
    if (window.location.pathname.includes("/admin/")) {
      window.location.href = "index.html";
    }
    throw new Error("Unauthorized");
  }
  return res;
}
