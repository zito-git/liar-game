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
export class GlobalFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let customMessage = 'INTERNAL_SERVER_ERROR';

    //일반 에러
    if (
      exception instanceof HttpException &&
      status != HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      const res = exception.getResponse();
      customMessage = typeof res === 'string' ? res : res['message'][0];
    }

    //서버 에러
    if (
      exception instanceof HttpException &&
      status == HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message: customMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
