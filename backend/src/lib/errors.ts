export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    return new AppError(code, code, 400, details);
  }

  static unauthorized(code = 'UNAUTHORIZED') {
    return new AppError(code, code, 401);
  }

  static forbidden(code = 'FORBIDDEN', details?: Record<string, unknown>) {
    return new AppError(code, code, 403, details);
  }

  static notFound(code = 'NOT_FOUND') {
    return new AppError(code, code, 404);
  }

  static conflict(code = 'CONFLICT', details?: Record<string, unknown>) {
    return new AppError(code, code, 409, details);
  }

  static limitReached(code = 'LIMIT_REACHED', details?: Record<string, unknown>) {
    return new AppError(code, code, 429, details);
  }

  /** 422 — blocked query or semantic error */
  static unprocessable(code = 'UNPROCESSABLE', details?: Record<string, unknown>) {
    return new AppError(code, code, 422, details);
  }

  static internal(code = 'INTERNAL_ERROR', details?: Record<string, unknown>) {
    return new AppError(code, code, 500, details);
  }
}
