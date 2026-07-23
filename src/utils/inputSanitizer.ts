/**
 * Input Sanitizer
 * Provides utilities for sanitizing and validating user input
 * to prevent injection attacks and ensure data integrity
 */

/**
 * Input Sanitizer class for cleaning and validating user input
 */
export class InputSanitizer {
  /**
   * Sanitizes text input by trimming and removing dangerous patterns
   * @param input - The text input to sanitize
   * @returns Sanitized text string
   */
  public sanitizeText(input: string): string {
    // Trim whitespace
    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Limit length to 5000 characters (max for description field)
    sanitized = sanitized.substring(0, 5000);

    return sanitized;
  }

  /**
   * Validates UUID format using regex
   * @param id - The ID string to validate
   * @returns true if valid UUID format, false otherwise
   */
  public isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Sanitizes search query to prevent injection attacks
   * @param query - The search query string to sanitize
   * @returns Sanitized search query string
   */
  public sanitizeSearchQuery(query: string): string {
    // Trim whitespace
    let sanitized = query.trim();

    // Escape special regex characters to treat them as literal text
    // This prevents regex injection attacks
    sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Limit length to 200 characters
    sanitized = sanitized.substring(0, 200);

    return sanitized;
  }
}

/**
 * Singleton input sanitizer instance for use across the application
 */
export const inputSanitizer = new InputSanitizer();
