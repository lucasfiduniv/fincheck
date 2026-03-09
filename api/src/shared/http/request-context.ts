import { createHash, randomUUID } from 'crypto'
import { Request } from 'express'

export interface RequestWithContext extends Request {
  requestId?: string
  startedAtNs?: bigint
  userId?: string
}

export function resolveRequestId(request: RequestWithContext) {
  const incomingRequestId = request.headers['x-request-id']

  if (typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0) {
    return incomingRequestId
  }

  return randomUUID()
}

export function anonymizeUserId(userId?: string) {
  if (!userId) {
    return 'anonymous'
  }

  return createHash('sha256').update(userId).digest('hex').slice(0, 12)
}
