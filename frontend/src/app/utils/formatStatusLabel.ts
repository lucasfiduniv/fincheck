interface FormatStatusLabelOptions {
  daysUntilDue?: number
}

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  CANCELED: 'Cancelado',
  OPEN: 'Em aberto',
  OVERDUE: 'Atrasado',
  DUE_TODAY: 'Vence hoje',
  FUTURE: 'No prazo',
  PLANNED: 'Planejada',
  POSTED: 'Efetivada',
  SAFE: 'Seguro',
  WARNING: 'Atenção',
  OVER: 'Acima do limite',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
}

export function formatStatusLabel(status: string, options?: FormatStatusLabelOptions) {
  const normalizedStatus = status.trim().toUpperCase()

  if (normalizedStatus === 'UPCOMING') {
    const daysUntilDue = options?.daysUntilDue ?? 0

    if (daysUntilDue <= 0) {
      return 'Próximo do vencimento'
    }

    return `Em ${daysUntilDue} dia(s)`
  }

  return STATUS_LABELS[normalizedStatus] ?? 'Status desconhecido'
}