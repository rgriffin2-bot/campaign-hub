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

/** Paginated list response for endpoints that support paging */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Structured error payload returned on API failures */
export interface ApiError {
  code: string;
  message: string;
  /** Arbitrary context about the error (e.g. field-level validation issues) */
  details?: Record<string, unknown>;
}
