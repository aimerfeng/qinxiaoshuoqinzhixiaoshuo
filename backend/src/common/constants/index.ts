// Common constants for the application
export const APP_NAME = 'Project Anima';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Token expiration times (in seconds)
export const ACCESS_TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

// Rate limiting
export const LOGIN_ATTEMPT_LIMIT = 5;
export const LOGIN_LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
