import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
// Prisma v6: error classes moved out of the `Prisma` namespace.
// They live in `@prisma/client/runtime/library` and must be imported directly.
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ichki server xatosi';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
        message = Array.isArray((exceptionResponse as any).message)
          ? (exceptionResponse as any).message.join(', ')
          : (exceptionResponse as any).message;
        error = (exceptionResponse as any).error ?? exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Bu ma\'lumot allaqachon mavjud';
          error = 'Conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Ma\'lumot topilmadi';
          error = 'Not Found';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Ma\'lumotlar bazasi xatosi';
          error = 'Database Error';
      }
    } else if (exception instanceof PrismaClientUnknownRequestError) {
      // e.g. PostgreSQL 22021 — invalid byte sequence (null bytes, bad encoding)
      const msg = (exception as any).message ?? '';
      if (msg.includes('22021') || msg.includes('invalid byte sequence') || msg.includes('0x00')) {
        status  = HttpStatus.BAD_REQUEST;
        message = 'So\'rov noto\'g\'ri belgilar (null-bayt yoki noto\'g\'ri kodlash) ni o\'z ichiga oladi';
        error   = 'Bad Request';
      } else {
        status  = HttpStatus.BAD_REQUEST;
        message = 'Ma\'lumotlar bazasi xatosi';
        error   = 'Database Error';
        this.logger.error(msg, (exception as any).stack);
      }
    } else if (exception instanceof PrismaClientValidationError) {
      status  = HttpStatus.BAD_REQUEST;
      message = 'Ma\'lumotlar bazasi validatsiya xatosi';
      error   = 'Bad Request';
      this.logger.warn((exception as any).message?.slice(0, 200));
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
