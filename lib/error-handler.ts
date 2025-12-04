/**
 * Centralized error handling for the application
 */

export class StackTraceAnalyzerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message)
    this.name = "StackTraceAnalyzerError"
  }
}

export const ErrorCodes = {
  INVALID_STACK_TRACE: "INVALID_STACK_TRACE",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  METHOD_NOT_FOUND: "METHOD_NOT_FOUND",
  GIT_ERROR: "GIT_ERROR",
  INVALID_DATE: "INVALID_DATE",
  PROJECT_ROOT_ERROR: "PROJECT_ROOT_ERROR",
  UNKNOWN: "UNKNOWN",
}

export function handleError(error: any): string {
  if (error instanceof StackTraceAnalyzerError) {
    switch (error.code) {
      case ErrorCodes.INVALID_STACK_TRACE:
        return 'The stack trace format is not recognized. Please ensure it contains lines starting with "at".'
      case ErrorCodes.FILE_NOT_FOUND:
        return "Source file could not be found in the project directory."
      case ErrorCodes.GIT_ERROR:
        return "Git command failed. Ensure you are in a Git repository with proper permissions."
      case ErrorCodes.INVALID_DATE:
        return "Invalid date format. Please use YYYY-MM-DD format."
      default:
        return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred. Please try again."
}
