export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new AppError(code, message, 400);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Access denied') {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError('NOT_FOUND', message, 404);
  }

  static conflict(message: string) {
    return new AppError('CONFLICT', message, 409);
  }

  static limitReached(message: string) {
    return new AppError('LIMIT_REACHED', message, 429);
  }

  static internal(message = 'Internal server error') {
    return new AppError('INTERNAL_ERROR', message, 500);
  }
}
