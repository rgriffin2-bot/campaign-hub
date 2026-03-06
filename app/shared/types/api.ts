/**
 * Shared types for API request/response contracts.
 * Used by both server route handlers and client fetch utilities.
 */

/** Standard wrapper for all API responses */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

