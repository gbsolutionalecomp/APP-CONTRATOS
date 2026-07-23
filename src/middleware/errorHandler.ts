import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  logger.error(`Error en ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Handle default unhandled errors
  return res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    details: err.message || 'Error interno no controlado',
  });
}
