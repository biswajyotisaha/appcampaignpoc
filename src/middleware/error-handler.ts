import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
  });
}
