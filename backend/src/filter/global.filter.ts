import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let customMessage: string = 'INTERNAL_SERVER_ERROR';

    //500 에러
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    }

    //400 에러
    if (exception instanceof HttpException && status !== 500) {
      const res = exception.getResponse();
      customMessage =
        typeof res === 'string'
          ? res
          : Array.isArray(res['message'])
            ? res['message'][0]
            : res['message'];
    }

    response.status(status).json({
      statusCode: status,
      message: customMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
