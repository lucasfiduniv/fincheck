import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import { anonymizeUserId, RequestWithContext } from './request-context'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError')

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const request = http.getRequest<RequestWithContext>()
    const response = http.getResponse<Response>()

    const statusCode = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null

    const message = this.resolveMessage(exceptionResponse, exception)

    const payload = {
      statusCode,
      message,
      path: request.originalUrl,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    }

    this.logger.error(JSON.stringify({
      event: 'http_request_failed',
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode,
      latencyMs: this.resolveLatency(request.startedAtNs),
      user: anonymizeUserId(request.userId),
      error: exception instanceof Error ? exception.message : String(exception),
      timestamp: payload.timestamp,
    }))

    response.status(statusCode).json(payload)
  }

  private resolveMessage(exceptionResponse: unknown, exception: unknown) {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse
    }

    if (
      typeof exceptionResponse === 'object'
      && exceptionResponse !== null
      && 'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message
    }

    if (exception instanceof Error) {
      return exception.message
    }

    return 'Internal server error'
  }

  private resolveLatency(startedAtNs?: bigint) {
    if (!startedAtNs) {
      return undefined
    }

    const elapsedMs = Number(process.hrtime.bigint() - startedAtNs) / 1_000_000

    return Number(elapsedMs.toFixed(2))
  }
}
