import { SavingsBoxAlert, SavingsBoxTransaction } from '../../../../app/entities/SavingsBox'
import { formatCurrency } from '../../../../app/utils/formatCurrency'

interface SavingsBoxHistoryAlertsSectionProps {
  isLoadingDetails: boolean
  historyTypeFilter: 'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'YIELD'
  setHistoryTypeFilter: (value: 'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'YIELD') => void
  filteredTransactions: SavingsBoxTransaction[]
  visibleTransactions: SavingsBoxTransaction[]
  showAllTransactions: boolean
  setShowAllTransactions: (value: boolean | ((current: boolean) => boolean)) => void
  alerts?: SavingsBoxAlert[]
}

function formatDate(date?: string | null) {
  if (!date) {
    return '-'
  }

  return new Date(date).toLocaleDateString('pt-BR')
}

export function SavingsBoxHistoryAlertsSection({
  isLoadingDetails,
  historyTypeFilter,
  setHistoryTypeFilter,
  filteredTransactions,
  visibleTransactions,
  showAllTransactions,
  setShowAllTransactions,
  alerts,
}: SavingsBoxHistoryAlertsSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <strong className="text-gray-900">Historico e alertas</strong>
        {isLoadingDetails && <span className="text-xs text-gray-500">Atualizando...</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-gray-700 block mb-2">Movimentacoes</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {[
              { value: 'ALL', label: 'Todos' },
              { value: 'DEPOSIT', label: 'Aportes' },
              { value: 'WITHDRAW', label: 'Resgates' },
              { value: 'YIELD', label: 'Rendimentos' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setHistoryTypeFilter(option.value as 'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'YIELD')}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                  historyTypeFilter === option.value
                    ? 'border-teal-300 bg-teal-50 text-teal-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {filteredTransactions.length === 0 && (
              <p className="text-xs text-gray-500">Sem movimentacoes recentes.</p>
            )}

            {visibleTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-800">{transaction.type === 'DEPOSIT' ? 'Aporte' : transaction.type === 'WITHDRAW' ? 'Resgate' : transaction.type === 'YIELD' ? 'Rendimento' : 'Ajuste'}</p>
                <p className="text-gray-700">{formatCurrency(transaction.amount)}</p>
                <p className="text-gray-500">{formatDate(transaction.date)}</p>
                {transaction.description && <p className="text-gray-600">{transaction.description}</p>}
              </div>
            ))}

            {filteredTransactions.length > 5 && (
              <button
                type="button"
                className="text-xs text-teal-700 hover:text-teal-800 underline"
                onClick={() => setShowAllTransactions((state) => !state)}
              >
                {showAllTransactions ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-700 block mb-2">Alertas</span>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {(alerts?.length ?? 0) === 0 && (
              <p className="text-xs text-gray-500">Sem alertas recentes.</p>
            )}

            {alerts?.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-800">{alert.type === 'GOAL_COMPLETED' ? 'Meta concluida' : alert.type === 'GOAL_NEAR_DUE' ? 'Meta proxima do vencimento' : alert.type === 'LOW_PROGRESS' ? 'Baixo progresso' : 'Recorrencia executada'}</p>
                <p className="text-gray-700">{alert.message}</p>
                <p className="text-gray-500">{formatDate(alert.createdAt)} · {alert.status === 'PENDING' ? 'Pendente' : alert.status === 'SENT' ? 'Enviado' : 'Falhou'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
