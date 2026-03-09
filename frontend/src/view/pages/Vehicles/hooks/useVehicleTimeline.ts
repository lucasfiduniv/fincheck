import { UIEvent, useEffect, useMemo, useState } from 'react'
import { VehicleDetails } from '../../../../app/entities/Vehicle'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { TimelineFilter, TimelineItem } from '../types'

const timelineFilterStoragePrefix = 'fincheck:vehicles:timeline-filter:'

interface UseVehicleTimelineParams {
  selectedVehicle: VehicleDetails | undefined
  selectedVehicleId: string | null
  userIdForStorage?: string
}

export function useVehicleTimeline({
  selectedVehicle,
  selectedVehicleId,
  userIdForStorage,
}: UseVehicleTimelineParams) {
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('ALL')
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(20)
  const [expandedTimelineText, setExpandedTimelineText] = useState<Record<string, boolean>>({})
  const [isTimelineCompactMode, setIsTimelineCompactMode] = useState(false)
  const [expandedTimelineItems, setExpandedTimelineItems] = useState<Record<string, boolean>>({})

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!selectedVehicle) {
      return []
    }

    const fuelItems: TimelineItem[] = selectedVehicle.fuelRecords.map((record) => ({
      id: `fuel-${record.id}`,
      type: 'FUEL',
      date: record.transaction.date,
      title: `Abastecimento - ${record.liters.toFixed(2)} L`,
      subtitle: `${record.odometer.toFixed(1)} km - ${record.transaction.name}`,
      amount: record.totalCost,
      detail: `R$/L ${formatCurrency(record.pricePerLiter)}`,
    }))

    const maintenanceItems: TimelineItem[] = selectedVehicle.maintenances.map((maintenance) => ({
      id: `maintenance-${maintenance.id}`,
      type: 'MAINTENANCE',
      date: maintenance.date,
      title: maintenance.title,
      subtitle: `${maintenance.source === 'ACCOUNT' ? 'Conta' : 'Cartao'} - ${maintenance.sourceLabel}`,
      amount: maintenance.amount,
      detail:
        maintenance.odometer !== null && maintenance.odometer !== undefined
          ? `${maintenance.odometer.toFixed(1)} km`
          : 'Sem odometro',
    }))

    const partItems: TimelineItem[] = selectedVehicle.parts.map((part) => ({
      id: `part-${part.id}`,
      type: 'PART',
      date: part.installedAt,
      title: `Peca - ${part.name}`,
      subtitle: `${part.brand || 'Sem marca'} - Qtd ${part.quantity}`,
      amount: part.totalCost,
      detail:
        part.nextReplacementOdometer !== null
          ? `Prox. troca ${part.nextReplacementOdometer.toFixed(0)} km`
          : 'Sem previsao',
    }))

    return [...fuelItems, ...maintenanceItems, ...partItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  }, [selectedVehicle])

  const filteredTimelineItems = useMemo(() => {
    if (timelineFilter === 'ALL') {
      return timelineItems
    }

    return timelineItems.filter((item) => item.type === timelineFilter)
  }, [timelineFilter, timelineItems])

  const visibleTimelineItems = useMemo(
    () => filteredTimelineItems.slice(0, timelineVisibleCount),
    [filteredTimelineItems, timelineVisibleCount],
  )

  const canLoadMoreTimelineItems = visibleTimelineItems.length < filteredTimelineItems.length

  useEffect(() => {
    if (!userIdForStorage) {
      return
    }

    const savedFilter = localStorage.getItem(`${timelineFilterStoragePrefix}${userIdForStorage}`)
    if (savedFilter === 'ALL' || savedFilter === 'FUEL' || savedFilter === 'MAINTENANCE' || savedFilter === 'PART') {
      setTimelineFilter(savedFilter)
    }
  }, [userIdForStorage])

  useEffect(() => {
    if (!userIdForStorage) {
      return
    }

    localStorage.setItem(`${timelineFilterStoragePrefix}${userIdForStorage}`, timelineFilter)
  }, [timelineFilter, userIdForStorage])

  useEffect(() => {
    setExpandedTimelineText({})
    setExpandedTimelineItems({})
    setTimelineVisibleCount(20)
  }, [selectedVehicleId, timelineFilter])

  function applyTimelineFilter(filter: TimelineFilter) {
    setTimelineFilter(filter)
    setTimelineVisibleCount(20)
  }

  function loadMoreTimelineItems() {
    setTimelineVisibleCount((current) => current + 20)
  }

  function toggleTimelineItemExpanded(itemId: string) {
    setExpandedTimelineItems((state) => ({
      ...state,
      [itemId]: !state[itemId],
    }))
  }

  function toggleTimelineTextExpanded(key: string) {
    setExpandedTimelineText((state) => ({
      ...state,
      [key]: !state[key],
    }))
  }

  function onTimelineScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 40

    if (isNearBottom && canLoadMoreTimelineItems) {
      loadMoreTimelineItems()
    }
  }

  return {
    timelineFilter,
    isTimelineCompactMode,
    setIsTimelineCompactMode,
    expandedTimelineItems,
    expandedTimelineText,
    filteredTimelineItems,
    visibleTimelineItems,
    canLoadMoreTimelineItems,
    applyTimelineFilter,
    loadMoreTimelineItems,
    toggleTimelineItemExpanded,
    toggleTimelineTextExpanded,
    onTimelineScroll,
  }
}
