import { describe, it, expect } from '@jest/globals';
import {
  BadRequestError,
  NotFoundError,
  ValidationError,
  InternalServerError,
} from '../src/utils/errors';
import { errorHandler } from '../src/middleware/errorHandler';
import { Request, Response } from 'express';

describe('Unit Tests - Errors & Middlewares', () => {
  it('debe instanciar correctamente clases de error personalizadas', () => {
    const badReq = new BadRequestError('Bad request test');
    expect(badReq.statusCode).toBe(400);

    const notFound = new NotFoundError('Not found test');
    expect(notFound.statusCode).toBe(404);

    const valErr = new ValidationError('Validation error test', [{ field: 'a' }]);
    expect(valErr.statusCode).toBe(422);
    expect(valErr.details).toBeDefined();

    const intErr = new InternalServerError('Internal error test');
    expect(intErr.statusCode).toBe(500);
  });

  it('debe manejar errores no controlados en errorHandler', () => {
    const mockReq = { method: 'GET', url: '/test' } as Request;
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const mockNext = jest.fn();

    const genericError = new Error('Generic failure');
    errorHandler(genericError, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 500,
        error: 'Internal Server Error',
      })
    );
  });
});
