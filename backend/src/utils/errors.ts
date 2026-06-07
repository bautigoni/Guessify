export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg, 'BAD_REQUEST');
export const unauthorized = (msg = 'Not authenticated') =>
  new HttpError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Not found') => new HttpError(404, msg, 'NOT_FOUND');
export const serverError = (msg = 'Internal server error') =>
  new HttpError(500, msg, 'SERVER_ERROR');
