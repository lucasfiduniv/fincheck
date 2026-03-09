import { AxiosError } from 'axios'

interface ApiErrorPayload {
  statusCode?: number
  message?: string | string[]
  error?: string
}

export function normalizeApiError(error: unknown): { statusCode?: number; message: string } {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status
    const data = error.response?.data as ApiErrorPayload | undefined

    const rawMessage = Array.isArray(data?.message)
      ? data?.message.join(', ')
      : data?.message

    const requestUrl = error.config?.url ?? ''

    if (statusCode === 401 && requestUrl.includes('/auth/signin')) {
      return {
        statusCode,
        message: 'Credenciais invalidas.',
      }
    }

    if (statusCode === 401) {
      return {
        statusCode,
        message: 'Sua sessao expirou. Faca login novamente.',
      }
    }

    if (statusCode === 403) {
      return {
        statusCode,
        message: 'Voce nao tem permissao para esta acao.',
      }
    }

    if (statusCode === 422) {
      return {
        statusCode,
        message: rawMessage || 'Nao foi possivel validar os dados enviados.',
      }
    }

    if (statusCode && statusCode >= 500) {
      return {
        statusCode,
        message: 'Erro interno do servidor. Tente novamente em instantes.',
      }
    }

    return {
      statusCode,
      message: rawMessage || 'Nao foi possivel concluir a requisicao.',
    }
  }

  return {
    message: 'Erro inesperado. Tente novamente.',
  }
}

export function shouldRetryRequest(failureCount: number, error: unknown) {
  if (!(error instanceof AxiosError)) {
    return failureCount < 2
  }

  if (error.code === 'ERR_CANCELED') {
    return false
  }

  const statusCode = error.response?.status

  if (!statusCode) {
    return failureCount < 2
  }

  if ([401, 403, 404, 422].includes(statusCode)) {
    return false
  }

  if (statusCode === 429) {
    return failureCount < 2
  }

  if (statusCode >= 500) {
    return failureCount < 2
  }

  return failureCount < 1
}
