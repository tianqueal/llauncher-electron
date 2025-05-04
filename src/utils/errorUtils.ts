/**
 * Extracts a user-friendly error message from an unknown error type.
 * @param error The error object (unknown type).
 * @param context Optional context string to prepend to the message (e.g., "Error spawning Java").
 * @returns A formatted error message string.
 */
export function getErrorMessage(error: unknown, context?: string): string {
  const prefix = context ? `${context}: ` : ''
  let message: string

  if (error instanceof Error) {
    // Standard Error object
    message = error.message
  } else if (typeof error === 'string') {
    // Simple string error
    message = error
  } else if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    // Duck-typing for objects with a message property
    message = error.message
  } else {
    // Fallback for other types
    try {
      message = JSON.stringify(error)
    } catch {
      message = 'An unknown error occurred'
    }
  }
  return `${prefix}${message}`
}
