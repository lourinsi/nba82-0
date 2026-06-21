import "server-only";

export const adminCredentials = {
  username: "admin",
  password: "82-0-admin",
  sessionSecret: "change-this-admin-session-secret",
};

export const ADMIN_SESSION_COOKIE = "nba82_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
