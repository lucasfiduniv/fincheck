import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Response } from 'express'
import { RequestWithContext, resolveRequestId } from './request-context'

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const requestId = resolveRequestId(request)

    request.requestId = requestId
    request.startedAtNs = process.hrtime.bigint()

    response.setHeader('x-request-id', requestId)

    next()
  }
}
