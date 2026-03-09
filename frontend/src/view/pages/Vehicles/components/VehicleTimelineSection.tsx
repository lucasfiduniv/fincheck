import { Dispatch, SetStateAction, UIEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/Button'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { TimelineFilter, TimelineItem } from '../types'

interface VehicleTimelineSectionProps {
  mobileOpenSection: 'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE'
  setMobileOpenSection: Dispatch<SetStateAction<'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE'>>
  isTimelineCompactMode: boolean
  onToggleTimelineCompactMode: () => void
  onOpenCreatePartModal: () => void
  timelineFilter: TimelineFilter
  onSelectFilter: (filter: TimelineFilter) => void
  isLoadingVehicle: boolean
  filteredTimelineItems: TimelineItem[]
  visibleTimelineItems: TimelineItem[]
  expandedTimelineText: Record<string, boolean>
  expandedTimelineItems: Record<string, boolean>
  onToggleTimelineText: (key: string) => void
  onToggleTimelineItem: (itemId: string) => void
  onTimelineScroll: (event: UIEvent<HTMLDivElement>) => void
  canLoadMoreTimelineItems: boolean
  onLoadMoreTimelineItems: () => void
  accountsLength: number
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function VehicleTimelineSection({
  mobileOpenSection,
  setMobileOpenSection,
  isTimelineCompactMode,
  onToggleTimelineCompactMode,
  onOpenCreatePartModal,
  timelineFilter,
  onSelectFilter,
  isLoadingVehicle,
  filteredTimelineItems,
  visibleTimelineItems,
  expandedTimelineText,
  expandedTimelineItems,
  onToggleTimelineText,
  onToggleTimelineItem,
  onTimelineScroll,
  canLoadMoreTimelineItems,
  onLoadMoreTimelineItems,
  accountsLength,
}: VehicleTimelineSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <button
        type="button"
        className="lg:hidden w-full flex items-center justify-between text-left"
        onClick={() => setMobileOpenSection((state) => (state === 'TIMELINE' ? 'SUMMARY' : 'TIMELINE'))}
      >
        <strong className="text-gray-900">Timeline unificada</strong>
        <span className="text-xs text-gray-500">
          {mobileOpenSection === 'TIMELINE' ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      <div className={`${mobileOpenSection === 'TIMELINE' ? 'block' : 'hidden'} lg:block space-y-4`}>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleTimelineCompactMode}
            className="h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
          >
            {isTimelineCompactMode ? 'Modo detalhado' : 'Modo compacto'}
          </button>

          <Button type="button" className="h-9 px-3 rounded-lg text-xs" onClick={onOpenCreatePartModal}>
            Cadastrar peca
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'ALL' as const, label: 'Tudo' },
            { value: 'FUEL' as const, label: 'Abastecimentos' },
            { value: 'MAINTENANCE' as const, label: 'Manutencoes' },
            { value: 'PART' as const, label: 'Pecas' },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onSelectFilter(filter.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                timelineFilter === filter.value
                  ? 'bg-teal-900 text-white border-teal-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}

          {isLoadingVehicle && <span className="h-3 w-20 rounded bg-gray-200 animate-pulse" />}
        </div>

        {!isLoadingVehicle && filteredTimelineItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-600 space-y-3">
            <p>Ainda nao ha itens para este filtro.</p>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/"
                className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cadastrar primeiro abastecimento
              </Link>

              <Button type="button" className="h-9 px-3 rounded-lg text-xs" onClick={onOpenCreatePartModal}>
                Cadastrar peca
              </Button>

              {accountsLength === 0 && (
                <Link
                  to="/"
                  className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Vincular conta
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1" onScroll={onTimelineScroll}>
          {isLoadingVehicle ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={`timeline-skeleton-${index}`} className="rounded-xl border border-gray-200 p-3 animate-pulse space-y-2">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
                <div className="h-3 w-1/3 rounded bg-gray-200" />
              </div>
            ))
          ) : (
            visibleTimelineItems.map((item) => {
              const subtitleKey = `${item.id}-subtitle`
              const detailKey = `${item.id}-detail`
              const subtitleExpanded = !!expandedTimelineText[subtitleKey]
              const detailExpanded = !!expandedTimelineText[detailKey]
              const subtitleNeedsExpand = item.subtitle.length > 70
              const detailNeedsExpand = item.detail.length > 60
              const subtitleText = subtitleExpanded || !subtitleNeedsExpand
                ? item.subtitle
                : `${item.subtitle.slice(0, 70).trimEnd()}...`
              const detailText = detailExpanded || !detailNeedsExpand
                ? item.detail
                : `${item.detail.slice(0, 60).trimEnd()}...`

              const isCompactExpanded = !!expandedTimelineItems[item.id]
              const shouldShowDetails = !isTimelineCompactMode || isCompactExpanded

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border border-gray-200 p-3 text-sm ${isTimelineCompactMode ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => {
                    if (!isTimelineCompactMode) {
                      return
                    }

                    onToggleTimelineItem(item.id)
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-gray-800">{item.title}</strong>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          item.type === 'FUEL'
                            ? 'bg-amber-100 text-amber-800'
                            : item.type === 'MAINTENANCE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'FUEL' ? 'Abastecimento' : item.type === 'MAINTENANCE' ? 'Manutencao' : 'Peca'}
                        </span>
                      </div>

                      <div
                        className={`overflow-hidden transition-all duration-200 ${
                          shouldShowDetails ? 'max-h-52 opacity-100 mt-1' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <p className="text-xs text-gray-600 mt-1 break-words">
                          {subtitleText}
                          {subtitleNeedsExpand && (
                            <button
                              type="button"
                              className="ml-1 text-teal-700 hover:text-teal-800"
                              onClick={(event) => {
                                event.stopPropagation()
                                onToggleTimelineText(subtitleKey)
                              }}
                            >
                              {subtitleExpanded ? 'ver menos' : 'ver mais'}
                            </button>
                          )}
                        </p>

                        <p className="text-xs text-gray-500 mt-1 break-words">
                          {detailText}
                          {detailNeedsExpand && (
                            <button
                              type="button"
                              className="ml-1 text-teal-700 hover:text-teal-800"
                              onClick={(event) => {
                                event.stopPropagation()
                                onToggleTimelineText(detailKey)
                              }}
                            >
                              {detailExpanded ? 'ver menos' : 'ver mais'}
                            </button>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <strong className="text-rose-700 font-semibold block">{formatCurrency(item.amount)}</strong>
                      <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
                    </div>
                  </div>

                  {isTimelineCompactMode && (
                    <button
                      type="button"
                      className="text-[11px] text-teal-700 hover:text-teal-800 mt-2"
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleTimelineItem(item.id)
                      }}
                    >
                      {isCompactExpanded ? 'recolher' : 'ver detalhes'}
                    </button>
                  )}
                </div>
              )
            })
          )}

          {canLoadMoreTimelineItems && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onLoadMoreTimelineItems}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Carregar mais eventos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
