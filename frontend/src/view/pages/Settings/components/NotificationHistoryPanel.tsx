import { NotificationEvent } from '../../../../app/entities/NotificationEvent'

const statusConfig: Record<'PENDING' | 'SENT' | 'FAILED', { label: string; className: string }> = {
  PENDING: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800',
  },
  SENT: {
    label: 'Enviado',
    className: 'bg-green-100 text-green-800',
  },
  FAILED: {
    label: 'Falhou',
    className: 'bg-red-100 text-red-800',
  },
}

const typeLabel: Record<string, string> = {
  GENERAL: 'Geral',
  DUE_REMINDERS: 'Vencimentos',
  CREDIT_CARD_DUE: 'Fatura do cartão',
  BUDGET_ALERTS: 'Orçamento',
  LOW_BALANCE: 'Saldo baixo',
  WEEKLY_SUMMARY: 'Resumo semanal',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface NotificationHistoryPanelProps {
  history: NotificationEvent[]
  isLoading: boolean
}

export function NotificationHistoryPanel({
  history,
  isLoading,
}: NotificationHistoryPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <strong className="text-sm text-gray-800 block">Central de notificações</strong>
          <span className="text-xs text-gray-600">Histórico de envios no app (WhatsApp).</span>
        </div>

        {isLoading && <span className="text-xs text-gray-500">Atualizando...</span>}
      </div>

      {history.length === 0 && !isLoading && (
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
          Ainda não há eventos de notificação para este usuário.
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {history.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 truncate">
                  {typeLabel[event.type] ?? event.type}
                </span>

                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[event.status].className}`}>
                  {statusConfig[event.status].label}
                </span>
              </div>

              <p className="text-sm text-gray-800">{event.message}</p>

              <div className="text-xs text-gray-600 space-y-0.5">
                <p>Destino: +{event.destination}</p>
                <p>Criado em: {formatDateTime(event.createdAt)}</p>
                {event.sentAt && <p>Enviado em: {formatDateTime(event.sentAt)}</p>}
                {event.errorMessage && <p className="text-red-800">Erro: {event.errorMessage}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
