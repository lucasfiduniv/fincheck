import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { anonymizeUserId, RequestWithContext } from './request-context'

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpAccess')

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>()
    const response = context.switchToHttp().getResponse()
    const startNs = request.startedAtNs ?? process.hrtime.bigint()

    return next.handle().pipe(
      tap(() => {
        const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000

        this.logger.log(JSON.stringify({
          event: 'http_request_completed',
          requestId: request.requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          latencyMs: Number(elapsedMs.toFixed(2)),
          user: anonymizeUserId(request.userId),
          timestamp: new Date().toISOString(),
        }))
      }),
    )
  }
}
