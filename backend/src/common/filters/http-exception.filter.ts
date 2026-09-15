import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Global exception filter producing a consistent JSON error shape for both
 * NestJS HttpExceptions (validation errors, NotFoundException, etc.) and
 * unexpected errors (which are mapped to 500 without leaking internals).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string | string[] = exception.message;
      let error = exception.name;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string | string[]) ?? message;
        error = (body.error as string) ?? error;
      }

      this.respond(response, { statusCode, message, error, path: request.url, timestamp: new Date().toISOString() });
      return;
    }

    // Unknown/unexpected error: never leak internals, always 500.
    this.respond(response, {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private respond(response: Response, body: ErrorBody): void {
    response.status(body.statusCode).json(body);
  }
}
