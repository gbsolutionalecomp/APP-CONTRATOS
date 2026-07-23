export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details: unknown;

  constructor(message: string, statusCode = 500, details: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud incorrecta', details: unknown = null) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Error de validación de datos', details: unknown = null) {
    super(message, 422, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Error interno del servidor', details: unknown = null) {
    super(message, 500, details);
  }
}
