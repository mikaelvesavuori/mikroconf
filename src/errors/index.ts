/**
 * @description Error thrown when configuration validation fails.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.message = message || 'Validation did not pass';
    this.cause = { statusCode: 400 };
  }
}
