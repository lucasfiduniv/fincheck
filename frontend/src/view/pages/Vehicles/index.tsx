import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Modal } from '../../components/Modal'
import { Spinner } from '../../components/Spinner'
import { vehiclesService } from '../../../app/services/vehiclesService'
import { transactionsService } from '../../../app/services/transactionsService'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { toast } from 'react-hot-toast'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../app/hooks/useCategories'

const fuelTypeOptions = [
  { value: 'GASOLINE', label: 'Gasolina' },
  { value: 'ETHANOL', label: 'Etanol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'FLEX', label: 'Flex' },
  { value: 'ELECTRIC', label: 'Elétrico' },
  { value: 'HYBRID', label: 'Híbrido' },
]

const timelineFilterStoragePrefix = 'fincheck:vehicles:timeline-filter:'
const compactModeStoragePrefix = 'fincheck:vehicles:compact-mode:'
const odometerDraftStoragePrefix = 'fincheck:vehicles:odometer-draft:'

type InlineFeedbackState = {
  status: 'saving' | 'synced' | 'error' | 'stale'
  message: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function getHealthBadgeLabel(status?: 'OK' | 'ATTENTION' | 'URGENT') {
  if (status === 'ATTENTION') {
    return 'Atenção'
  }

  if (status === 'URGENT') {
    return 'Urgente'
  }

  return 'OK'
}

function getHealthBadgeClassName(status?: 'OK' | 'ATTENTION' | 'URGENT') {
  if (status === 'ATTENTION') {
    return 'bg-amber-100 text-amber-800'
  }

  if (status === 'URGENT') {
    return 'bg-rose-100 text-rose-800'
  }

  return 'bg-emerald-100 text-emerald-800'
}

function VehicleDetailsSkeleton() {
  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 w-full">
            <div className="w-14 h-14 rounded-xl bg-gray-200" />
            <div className="space-y-2 w-full max-w-xs">
              <div className="h-5 w-40 rounded bg-gray-200" />
              <div className="h-4 w-52 rounded bg-gray-200" />
            </div>
          </div>

          <div className="h-9 w-28 rounded-xl bg-gray-200" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`summary-1-${index}`} className="rounded-xl bg-gray-50 p-3 space-y-2">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-5 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 animate-pulse">
        <div className="h-5 w-44 rounded bg-gray-200" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`row-${index}`} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function Vehicles() {
  const queryClient = useQueryClient()
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreatePartModalOpen, setIsCreatePartModalOpen] = useState(false)
  const [isQuickFuelModalOpen, setIsQuickFuelModalOpen] = useState(false)
  const [isQuickMaintenanceModalOpen, setIsQuickMaintenanceModalOpen] = useState(false)
  const [showCreateVehicleOptionalFields, setShowCreateVehicleOptionalFields] = useState(false)
  const [showCreatePartOptionalFields, setShowCreatePartOptionalFields] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [isCompactMode, setIsCompactMode] = useState(false)

  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [plate, setPlate] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [currentOdometer, setCurrentOdometer] = useState('')
  const [fuelType, setFuelType] = useState('FLEX')

  const [partName, setPartName] = useState('')
  const [partBankAccountId, setPartBankAccountId] = useState('')
  const [partCategoryId, setPartCategoryId] = useState('')
  const [partBrand, setPartBrand] = useState('')
  const [partQuantity, setPartQuantity] = useState('1')
  const [partTotalCost, setPartTotalCost] = useState('')
  const [partInstalledAt, setPartInstalledAt] = useState(new Date().toISOString().slice(0, 10))
  const [partInstalledOdometer, setPartInstalledOdometer] = useState('')
  const [partLifetimeKm, setPartLifetimeKm] = useState('')
  const [partNextReplacementOdometer, setPartNextReplacementOdometer] = useState('')
  const [partNotes, setPartNotes] = useState('')
  const [currentOdometerInput, setCurrentOdometerInput] = useState('')
  const [autoOdometerEnabledInput, setAutoOdometerEnabledInput] = useState(false)
  const [averageDailyKmInput, setAverageDailyKmInput] = useState('')
  const [confirmOdometerOutlier, setConfirmOdometerOutlier] = useState(false)

  const [quickFuelBankAccountId, setQuickFuelBankAccountId] = useState('')
  const [quickFuelCategoryId, setQuickFuelCategoryId] = useState('')
  const [quickFuelLiters, setQuickFuelLiters] = useState('')
  const [quickFuelPricePerLiter, setQuickFuelPricePerLiter] = useState('')
  const [quickFuelOdometer, setQuickFuelOdometer] = useState('')
  const [quickFuelDate, setQuickFuelDate] = useState(new Date().toISOString().slice(0, 10))
  const [quickFuelFillType, setQuickFuelFillType] = useState<'FULL' | 'PARTIAL'>('PARTIAL')
  const [quickFuelFirstPumpClick, setQuickFuelFirstPumpClick] = useState(false)

  const [quickMaintenanceBankAccountId, setQuickMaintenanceBankAccountId] = useState('')
  const [quickMaintenanceCategoryId, setQuickMaintenanceCategoryId] = useState('')
  const [quickMaintenanceTitle, setQuickMaintenanceTitle] = useState('')
  const [quickMaintenanceAmount, setQuickMaintenanceAmount] = useState('')
  const [quickMaintenanceOdometer, setQuickMaintenanceOdometer] = useState('')
  const [quickMaintenanceDate, setQuickMaintenanceDate] = useState(new Date().toISOString().slice(0, 10))

  const [inlineFeedback, setInlineFeedback] = useState<InlineFeedbackState | null>(null)
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'FUEL' | 'MAINTENANCE' | 'PART'>('ALL')
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(20)
  const [expandedTimelineText, setExpandedTimelineText] = useState<Record<string, boolean>>({})
  const [isTimelineCompactMode, setIsTimelineCompactMode] = useState(false)
  const [expandedTimelineItems, setExpandedTimelineItems] = useState<Record<string, boolean>>({})
  const [mobileOpenSection, setMobileOpenSection] = useState<'SUMMARY' | 'ODOMETER' | 'METRICS' | 'TIMELINE'>('SUMMARY')
  const [odometerStep, setOdometerStep] = useState<'CURRENT' | 'AUTO'>('CURRENT')
  const [showOutlierConfirm, setShowOutlierConfirm] = useState(false)

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  })

  const { data: selectedVehicle, isFetching: isLoadingVehicle } = useQuery({
    queryKey: ['vehicles', selectedVehicleId],
    queryFn: () => vehiclesService.getById(selectedVehicleId!),
    enabled: !!selectedVehicleId,
  })

  const { accounts } = useBankAccounts()
  const { categories } = useCategories()

  const { mutateAsync: createVehicle, isLoading: isCreatingVehicle } = useMutation(vehiclesService.create)
  const { mutateAsync: createPart, isLoading: isCreatingPart } = useMutation(vehiclesService.createPart)
  const { mutateAsync: createTransaction, isLoading: isCreatingQuickAction } = useMutation(transactionsService.create)
  const { mutateAsync: updateVehicle, isLoading: isUpdatingVehicle } = useMutation({
    mutationFn: vehiclesService.update,
    onMutate: async (variables) => {
      if (!variables.vehicleId) {
        return undefined
      }

      await queryClient.cancelQueries({ queryKey: ['vehicles', variables.vehicleId] })
      const previousVehicle = queryClient.getQueryData(['vehicles', variables.vehicleId])

      queryClient.setQueryData(['vehicles', variables.vehicleId], (oldData: any) => {
        if (!oldData) {
          return oldData
        }

        return {
          ...oldData,
          ...variables,
          effectiveCurrentOdometer: variables.currentOdometer ?? oldData.effectiveCurrentOdometer,
        }
      })

      queryClient.setQueryData(['vehicles'], (oldData: any) => {
        if (!Array.isArray(oldData)) {
          return oldData
        }

        return oldData.map((vehicle) => (
          vehicle.id === variables.vehicleId
            ? {
              ...vehicle,
              ...variables,
              effectiveCurrentOdometer: variables.currentOdometer ?? vehicle.effectiveCurrentOdometer,
            }
            : vehicle
        ))
      })

      return { previousVehicle }
    },
    onError: (_error, variables, context) => {
      if (context?.previousVehicle && variables.vehicleId) {
        queryClient.setQueryData(['vehicles', variables.vehicleId], context.previousVehicle)
      }
    },
  })
  const { mutateAsync: recalibrateNow, isLoading: isRecalibratingNow } = useMutation({
    mutationFn: vehiclesService.recalibrateNow,
  })
  const { mutateAsync: trackUsageEvent } = useMutation({
    mutationFn: vehiclesService.trackUsageEvent,
  })

  const summary = useMemo(() => {
    const totalCost = vehicles.reduce((acc, vehicle) => acc + (vehicle.fuelStats?.totalCost ?? 0), 0)
    const totalLiters = vehicles.reduce((acc, vehicle) => acc + (vehicle.fuelStats?.totalLiters ?? 0), 0)

    return {
      totalCost,
      totalLiters,
      vehiclesCount: vehicles.length,
    }
  }, [vehicles])

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'EXPENSE'),
    [categories],
  )

  const fuelExpenseCategory = useMemo(() => {
    const byName = expenseCategories.find((category) => /combust|abastec|gasolina|etanol|diesel/i.test(category.name))
    return byName ?? expenseCategories[0]
  }, [expenseCategories])

  const monthlySpentByVehicleId = useMemo(() => {
    const map = new Map<string, number>()

    vehicles.forEach((vehicle) => {
      map.set(vehicle.id, vehicle.fuelStats?.currentMonthCost ?? 0)
    })

    return map
  }, [vehicles])

  const selectedVehicleMonthlySpent = selectedVehicle
    ? monthlySpentByVehicleId.get(selectedVehicle.id) ?? 0
    : 0

  const latestFuelRecord = selectedVehicle?.fuelRecords?.[0]
  const latestMaintenance = selectedVehicle?.maintenances?.[0]

  const nextReplacementStatus = useMemo(() => {
    if (!selectedVehicle) {
      return 'Selecione um veículo'
    }

    const referenceDailyKm = selectedVehicle.averageDailyKm
      ?? selectedVehicle.odometerLearning?.learnedAverageDailyKm
      ?? null

    const partsWithNextReplacement = selectedVehicle.parts.filter(
      (part) => part.nextReplacementOdometer !== null,
    )

    if (partsWithNextReplacement.length === 0) {
      return 'Sem previsão de troca'
    }

    const nextPart = [...partsWithNextReplacement].sort(
      (a, b) => (a.nextReplacementOdometer ?? Number.MAX_SAFE_INTEGER) - (b.nextReplacementOdometer ?? Number.MAX_SAFE_INTEGER),
    )[0]

    const nextReplacementOdometer = nextPart.nextReplacementOdometer ?? 0
    const lastOdometer = selectedVehicle.effectiveCurrentOdometer
      ?? selectedVehicle.currentOdometer
      ?? selectedVehicle.fuelStats?.lastOdometer

    if (lastOdometer === null || lastOdometer === undefined) {
      return `Próxima troca: ${nextPart.name} aos ${nextReplacementOdometer.toFixed(0)} km`
    }

    const remainingKm = nextReplacementOdometer - lastOdometer
    const remainingDays = referenceDailyKm && referenceDailyKm > 0
      ? Math.ceil(Math.abs(remainingKm) / referenceDailyKm)
      : null
    const daysLabel = remainingDays !== null ? ` (~${remainingDays} dias)` : ''

    if (remainingKm <= 0) {
      return `Troca atrasada: ${nextPart.name}${daysLabel}`
    }

    if (remainingKm <= 500) {
      return `Troca próxima: ${nextPart.name} em ${remainingKm.toFixed(0)} km${daysLabel}`
    }

    return `Em dia: ${nextPart.name} em ${remainingKm.toFixed(0)} km${daysLabel}`
  }, [selectedVehicle])

  const timelineItems = useMemo(() => {
    if (!selectedVehicle) {
      return []
    }

    const fuelItems = selectedVehicle.fuelRecords.map((record) => ({
      id: `fuel-${record.id}`,
      type: 'FUEL' as const,
      date: record.transaction.date,
      title: `Abastecimento • ${record.liters.toFixed(2)} L`,
      subtitle: `${record.odometer.toFixed(1)} km • ${record.transaction.name}`,
      amount: record.totalCost,
      detail: `R$/L ${formatCurrency(record.pricePerLiter)}`,
    }))

    const maintenanceItems = selectedVehicle.maintenances.map((maintenance) => ({
      id: `maintenance-${maintenance.id}`,
      type: 'MAINTENANCE' as const,
      date: maintenance.date,
      title: maintenance.title,
      subtitle: `${maintenance.source === 'ACCOUNT' ? 'Conta' : 'Cartão'} • ${maintenance.sourceLabel}`,
      amount: maintenance.amount,
      detail:
        maintenance.odometer !== null && maintenance.odometer !== undefined
          ? `${maintenance.odometer.toFixed(1)} km`
          : 'Sem odômetro',
    }))

    const partItems = selectedVehicle.parts.map((part) => ({
      id: `part-${part.id}`,
      type: 'PART' as const,
      date: part.installedAt,
      title: `Peça • ${part.name}`,
      subtitle: `${part.brand || 'Sem marca'} • Qtd ${part.quantity}`,
      amount: part.totalCost,
      detail:
        part.nextReplacementOdometer !== null
          ? `Próx. troca ${part.nextReplacementOdometer.toFixed(0)} km`
          : 'Sem previsão',
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
  }, [timelineItems, timelineFilter])

  const visibleTimelineItems = useMemo(
    () => filteredTimelineItems.slice(0, timelineVisibleCount),
    [filteredTimelineItems, timelineVisibleCount],
  )

  const canLoadMoreTimelineItems = visibleTimelineItems.length < filteredTimelineItems.length

  const selectedHealthBadge = selectedVehicle?.healthBadge ?? 'OK'
  const selectedConfidenceLevel = selectedVehicle?.odometerConfidence?.level ?? 'LOW'
  const estimatedOdometer = selectedVehicle?.effectiveCurrentOdometer ?? null
  const parsedCurrentOdometerInput = Number(currentOdometerInput.replace(',', '.').trim())
  const hasComparableOdometerValues = Number.isFinite(parsedCurrentOdometerInput)
    && estimatedOdometer !== null
    && estimatedOdometer !== undefined

  const deltaVsEstimated = hasComparableOdometerValues
    ? Number((parsedCurrentOdometerInput - estimatedOdometer).toFixed(1))
    : null

  const deltaLabel = deltaVsEstimated === null
    ? null
    : Math.abs(deltaVsEstimated) <= 20
      ? { text: `Diferença vs estimado: ${deltaVsEstimated >= 0 ? '+' : ''}${deltaVsEstimated.toFixed(1)} km (ok)`, className: 'text-emerald-700' }
      : Math.abs(deltaVsEstimated) <= 80
        ? { text: `Diferença vs estimado: ${deltaVsEstimated >= 0 ? '+' : ''}${deltaVsEstimated.toFixed(1)} km (atenção)`, className: 'text-amber-700' }
        : { text: `Diferença vs estimado: ${deltaVsEstimated >= 0 ? '+' : ''}${deltaVsEstimated.toFixed(1)} km (alto)`, className: 'text-rose-700' }

  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id)
    }
  }, [selectedVehicleId, vehicles])

  useEffect(() => {
    setExpandedTimelineText({})
    setExpandedTimelineItems({})
  }, [selectedVehicleId, timelineFilter])

  useEffect(() => {
    const userId = selectedVehicle?.userId ?? vehicles[0]?.userId

    if (!userId) {
      return
    }

    const savedFilter = localStorage.getItem(`${timelineFilterStoragePrefix}${userId}`)
    const savedCompactMode = localStorage.getItem(`${compactModeStoragePrefix}${userId}`)

    if (savedFilter === 'ALL' || savedFilter === 'FUEL' || savedFilter === 'MAINTENANCE' || savedFilter === 'PART') {
      setTimelineFilter(savedFilter)
    }

    if (savedCompactMode === 'true' || savedCompactMode === 'false') {
      setIsCompactMode(savedCompactMode === 'true')
    }
  }, [selectedVehicle?.userId, vehicles])

  useEffect(() => {
    const userId = selectedVehicle?.userId ?? vehicles[0]?.userId

    if (!userId) {
      return
    }

    localStorage.setItem(`${timelineFilterStoragePrefix}${userId}`, timelineFilter)
  }, [timelineFilter, selectedVehicle?.userId, vehicles])

  useEffect(() => {
    const userId = selectedVehicle?.userId ?? vehicles[0]?.userId

    if (!userId) {
      return
    }

    localStorage.setItem(`${compactModeStoragePrefix}${userId}`, String(isCompactMode))
  }, [isCompactMode, selectedVehicle?.userId, vehicles])

  useEffect(() => {
    if (!partBankAccountId && accounts.length > 0) {
      setPartBankAccountId(accounts[0].id)
    }

    if (!quickFuelBankAccountId && accounts.length > 0) {
      setQuickFuelBankAccountId(accounts[0].id)
    }

    if (!quickMaintenanceBankAccountId && accounts.length > 0) {
      setQuickMaintenanceBankAccountId(accounts[0].id)
    }
  }, [accounts, partBankAccountId, quickFuelBankAccountId, quickMaintenanceBankAccountId])

  useEffect(() => {
    if (!partCategoryId && expenseCategories.length > 0) {
      setPartCategoryId(expenseCategories[0].id)
    }

    if (!quickMaintenanceCategoryId && expenseCategories.length > 0) {
      setQuickMaintenanceCategoryId(expenseCategories[0].id)
    }

    if (!quickFuelCategoryId && fuelExpenseCategory) {
      setQuickFuelCategoryId(fuelExpenseCategory.id)
    }
  }, [expenseCategories, partCategoryId, quickMaintenanceCategoryId, quickFuelCategoryId, fuelExpenseCategory])

  useEffect(() => {
    if (!selectedVehicle) {
      return
    }

    const draftKey = `${odometerDraftStoragePrefix}${selectedVehicle.id}`
    const savedDraftRaw = localStorage.getItem(draftKey)
    let savedDraft: {
      currentOdometerInput?: string
      autoOdometerEnabledInput?: boolean
      averageDailyKmInput?: string
      odometerStep?: 'CURRENT' | 'AUTO'
    } | null = null

    if (savedDraftRaw) {
      try {
        savedDraft = JSON.parse(savedDraftRaw)
      } catch {
        localStorage.removeItem(draftKey)
      }
    }

    setCurrentOdometerInput(
      savedDraft?.currentOdometerInput
        ?? (
          selectedVehicle.currentOdometer !== null && selectedVehicle.currentOdometer !== undefined
            ? selectedVehicle.currentOdometer.toFixed(1)
            : ''
        ),
    )

    setAutoOdometerEnabledInput(savedDraft?.autoOdometerEnabledInput ?? !!selectedVehicle.autoOdometerEnabled)
    setAverageDailyKmInput(
      savedDraft?.averageDailyKmInput
        ?? (
          selectedVehicle.averageDailyKm !== null && selectedVehicle.averageDailyKm !== undefined
            ? selectedVehicle.averageDailyKm.toFixed(1)
            : ''
        ),
    )
    setOdometerStep(savedDraft?.odometerStep ?? 'CURRENT')

    const referenceOdometer = selectedVehicle.effectiveCurrentOdometer ?? selectedVehicle.currentOdometer

    if (!partInstalledOdometer && referenceOdometer !== null && referenceOdometer !== undefined) {
      setPartInstalledOdometer(referenceOdometer.toFixed(1))
    }

    setQuickFuelOdometer(
      referenceOdometer !== null && referenceOdometer !== undefined
        ? referenceOdometer.toFixed(1)
        : '',
    )

    setQuickMaintenanceOdometer(
      referenceOdometer !== null && referenceOdometer !== undefined
        ? referenceOdometer.toFixed(1)
        : '',
    )

    setConfirmOdometerOutlier(false)
    setShowOutlierConfirm(false)
    setTimelineVisibleCount(20)
  }, [selectedVehicle, partInstalledOdometer])

  useEffect(() => {
    if (!selectedVehicle) {
      return
    }

    localStorage.setItem(
      `${odometerDraftStoragePrefix}${selectedVehicle.id}`,
      JSON.stringify({
        currentOdometerInput,
        autoOdometerEnabledInput,
        averageDailyKmInput,
        odometerStep,
      }),
    )
  }, [
    selectedVehicle,
    currentOdometerInput,
    autoOdometerEnabledInput,
    averageDailyKmInput,
    odometerStep,
  ])

  useEffect(() => {
    if (!inlineFeedback || inlineFeedback.status === 'saving' || inlineFeedback.status === 'stale') {
      return
    }

    const timeout = setTimeout(() => {
      setInlineFeedback(null)
    }, 4500)

    return () => clearTimeout(timeout)
  }, [inlineFeedback])

  useEffect(() => {
    if (!selectedVehicle) {
      return
    }

    const normalizedCurrent = currentOdometerInput.replace(',', '.').trim()
    const normalizedAverage = averageDailyKmInput.replace(',', '.').trim()

    const hasCurrentChanged = normalizedCurrent !== (selectedVehicle.currentOdometer?.toFixed(1) ?? '')
    const hasAutoChanged = autoOdometerEnabledInput !== !!selectedVehicle.autoOdometerEnabled
    const hasAverageChanged = normalizedAverage !== (selectedVehicle.averageDailyKm?.toFixed(1) ?? '')

    if (hasCurrentChanged || hasAutoChanged || hasAverageChanged) {
      setInlineFeedback({ status: 'stale', message: 'Alterações pendentes de sincronização.' })
    }
  }, [
    currentOdometerInput,
    averageDailyKmInput,
    autoOdometerEnabledInput,
    selectedVehicle,
  ])

  function resetCreatePartForm() {
    setPartName('')
    setPartBankAccountId(accounts[0]?.id ?? '')
    setPartCategoryId(expenseCategories[0]?.id ?? '')
    setPartBrand('')
    setPartQuantity('1')
    setPartTotalCost('')
    setPartInstalledAt(new Date().toISOString().slice(0, 10))
    setPartInstalledOdometer('')
    setPartLifetimeKm('')
    setPartNextReplacementOdometer('')
    setPartNotes('')
    setShowCreatePartOptionalFields(false)
  }

  function resetQuickFuelForm() {
    const referenceOdometer = selectedVehicle?.effectiveCurrentOdometer ?? selectedVehicle?.currentOdometer

    setQuickFuelBankAccountId(accounts[0]?.id ?? '')
    setQuickFuelCategoryId(fuelExpenseCategory?.id ?? '')
    setQuickFuelLiters('')
    setQuickFuelPricePerLiter('')
    setQuickFuelOdometer(
      referenceOdometer !== null && referenceOdometer !== undefined
        ? referenceOdometer.toFixed(1)
        : '',
    )
    setQuickFuelDate(new Date().toISOString().slice(0, 10))
    setQuickFuelFillType('PARTIAL')
    setQuickFuelFirstPumpClick(false)
  }

  function resetQuickMaintenanceForm() {
    const referenceOdometer = selectedVehicle?.effectiveCurrentOdometer ?? selectedVehicle?.currentOdometer

    setQuickMaintenanceBankAccountId(accounts[0]?.id ?? '')
    setQuickMaintenanceCategoryId(expenseCategories[0]?.id ?? '')
    setQuickMaintenanceTitle('')
    setQuickMaintenanceAmount('')
    setQuickMaintenanceOdometer(
      referenceOdometer !== null && referenceOdometer !== undefined
        ? referenceOdometer.toFixed(1)
        : '',
    )
    setQuickMaintenanceDate(new Date().toISOString().slice(0, 10))
  }

  async function handleCreateVehicle() {
    if (!name.trim()) {
      toast.error('Informe o nome do veículo.')
      return
    }

    try {
      setInlineFeedback({ status: 'saving', message: 'Salvando veículo...' })
      const created = await createVehicle({
        name,
        model: model || undefined,
        plate: plate || undefined,
        photoUrl: photoUrl || undefined,
        currentOdometer: currentOdometer ? Number(currentOdometer.replace(',', '.')) : undefined,
        fuelType: fuelType as 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID',
      })

      setName('')
      setModel('')
      setPlate('')
      setPhotoUrl('')
      setCurrentOdometer('')
      setFuelType('FLEX')
      setShowCreateVehicleOptionalFields(false)
      setIsCreateModalOpen(false)
      setSelectedVehicleId(created.id)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setInlineFeedback({ status: 'synced', message: 'Veículo sincronizado com sucesso.' })
      toast.success('Veículo cadastrado com sucesso!')
    } catch {
      setInlineFeedback({ status: 'error', message: 'Erro ao salvar veículo. Tente novamente.' })
      toast.error('Não foi possível cadastrar o veículo.')
    }
  }

  async function handleCreatePart() {
    if (!selectedVehicleId) {
      toast.error('Selecione um veículo.')
      return
    }

    if (!partName.trim()) {
      toast.error('Informe o nome da peça.')
      return
    }

    if (!partBankAccountId) {
      toast.error('Selecione a conta para vincular o custo no financeiro.')
      return
    }

    if (!partInstalledAt) {
      toast.error('Informe a data de instalação.')
      return
    }

    const totalCost = Number(partTotalCost.replace(',', '.'))

    if (!totalCost || totalCost <= 0) {
      toast.error('Informe um custo total válido.')
      return
    }

    try {
      setInlineFeedback({ status: 'saving', message: 'Salvando peça e sincronizando financeiro...' })
      await createPart({
        vehicleId: selectedVehicleId,
        bankAccountId: partBankAccountId,
        categoryId: partCategoryId || undefined,
        name: partName,
        brand: partBrand || undefined,
        quantity: Number(partQuantity) || 1,
        totalCost,
        installedAt: partInstalledAt,
        installedOdometer: partInstalledOdometer ? Number(partInstalledOdometer) : undefined,
        lifetimeKm: partLifetimeKm ? Number(partLifetimeKm) : undefined,
        nextReplacementOdometer: partNextReplacementOdometer ? Number(partNextReplacementOdometer) : undefined,
        notes: partNotes || undefined,
      })

      resetCreatePartForm()
      setIsCreatePartModalOpen(false)

      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })

      setInlineFeedback({ status: 'synced', message: 'Peça salva e sincronizada no financeiro.' })
      toast.success('Peça cadastrada e vinculada ao financeiro!')
    } catch {
      setInlineFeedback({ status: 'error', message: 'Erro ao salvar peça.' })
      toast.error('Não foi possível cadastrar a peça.')
    }
  }

  async function handleSelectVehiclePhoto(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedVehicleId) {
      return
    }

    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = async () => {
      try {
        setInlineFeedback({ status: 'saving', message: 'Enviando imagem...' })
        if (typeof reader.result !== 'string') {
          return
        }

        await updateVehicle({
          vehicleId: selectedVehicleId,
          photoUrl: reader.result,
        })

        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
        queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
        setInlineFeedback({ status: 'synced', message: 'Dados do veículo sincronizados com sucesso.' })
        toast.success('Foto do veículo atualizada!')
      } catch {
        setInlineFeedback({ status: 'error', message: 'Erro ao atualizar foto do veículo.' })
        toast.error('Não foi possível atualizar a foto do veículo.')
      } finally {
        event.target.value = ''
      }
    }

    reader.readAsDataURL(file)
  }

  async function handleUpdateCurrentOdometer() {
    if (!selectedVehicleId) {
      return
    }

    const normalized = currentOdometerInput.replace(',', '.').trim()

    if (!normalized) {
      toast.error('Informe o odômetro atual.')
      return
    }

    const odometer = Number(normalized)

    if (!Number.isFinite(odometer) || odometer < 0) {
      toast.error('Informe um odômetro válido.')
      return
    }

    try {
      const previousOdometer = selectedVehicle?.currentOdometer ?? selectedVehicle?.effectiveCurrentOdometer

      if (
        previousOdometer !== null
        && previousOdometer !== undefined
        && Number.isFinite(previousOdometer)
        && previousOdometer !== odometer
      ) {
        const confirmed = window.confirm(
          `Você alterou de ${previousOdometer.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} para ${odometer.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km. Deseja continuar?`,
        )

        if (!confirmed) {
          return
        }
      }

      setInlineFeedback({ status: 'saving', message: 'Salvando odômetro...' })
      await updateVehicle({
        vehicleId: selectedVehicleId,
        currentOdometer: odometer,
        confirmOutlier: confirmOdometerOutlier,
      })

      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      setPartInstalledOdometer(odometer.toFixed(1))
      setConfirmOdometerOutlier(false)
      setShowOutlierConfirm(false)
      setInlineFeedback({ status: 'synced', message: 'Odômetro atualizado e sincronizado.' })
      toast.success('Odômetro atualizado com sucesso!')
    } catch (error: any) {
      if (error?.response?.data?.message?.includes?.('salto atípico')) {
        setInlineFeedback({ status: 'error', message: 'Outlier detectado. Marque a confirmação para salvar.' })
        setShowOutlierConfirm(true)
      } else {
        setInlineFeedback({ status: 'error', message: 'Erro ao atualizar odômetro.' })
      }
      toast.error('Não foi possível atualizar o odômetro.')
    }
  }

  async function handleUpdateAutoOdometerSettings() {
    if (!selectedVehicleId) {
      return
    }

    const normalizedDailyKm = averageDailyKmInput.replace(',', '.').trim()

    if (autoOdometerEnabledInput) {
      if (!normalizedDailyKm) {
        toast.error('Informe quantos km você roda por dia.')
        return
      }

      const dailyKm = Number(normalizedDailyKm)

      if (!Number.isFinite(dailyKm) || dailyKm <= 0) {
        toast.error('Informe um valor diário de km válido.')
        return
      }

      try {
        setInlineFeedback({ status: 'saving', message: 'Salvando automação...' })
        await updateVehicle({
          vehicleId: selectedVehicleId,
          autoOdometerEnabled: true,
          averageDailyKm: dailyKm,
        })

        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
        queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
        setInlineFeedback({ status: 'synced', message: 'Automação do odômetro ativada e sincronizada.' })
        toast.success('Automação do odômetro atualizada!')
      } catch {
        setInlineFeedback({ status: 'error', message: 'Erro ao atualizar automação.' })
        toast.error('Não foi possível atualizar a automação do odômetro.')
      }

      return
    }

    try {
      setInlineFeedback({ status: 'saving', message: 'Desativando automação...' })
      await updateVehicle({
        vehicleId: selectedVehicleId,
        autoOdometerEnabled: false,
      })

      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      setInlineFeedback({ status: 'synced', message: 'Automação do odômetro desativada.' })
      toast.success('Automação do odômetro desativada!')
    } catch {
      setInlineFeedback({ status: 'error', message: 'Erro ao desativar automação.' })
      toast.error('Não foi possível atualizar a automação do odômetro.')
    }
  }

  async function handleRecalibrateNow() {
    if (!selectedVehicleId) {
      return
    }

    try {
      setInlineFeedback({ status: 'saving', message: 'Recalibrando odômetro agora...' })
      await recalibrateNow(selectedVehicleId)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      setInlineFeedback({ status: 'synced', message: 'Recalibração concluída e sincronizada.' })
      toast.success('Odômetro recalibrado com 1 clique!')
    } catch {
      setInlineFeedback({ status: 'error', message: 'Erro ao recalibrar odômetro.' })
      toast.error('Não foi possível recalibrar agora.')
    }
  }

  async function handleQuickFuelAction() {
    if (!selectedVehicleId || !quickFuelBankAccountId || !quickFuelCategoryId) {
      toast.error('Preencha conta e categoria para abastecimento rápido.')
      return
    }

    const liters = Number(quickFuelLiters.replace(',', '.'))
    const pricePerLiter = Number(quickFuelPricePerLiter.replace(',', '.'))
    const odometer = Number(quickFuelOdometer.replace(',', '.'))

    if (!liters || !pricePerLiter || !odometer) {
      toast.error('Preencha litros, preço/L e odômetro.')
      return
    }

    try {
      setInlineFeedback({ status: 'saving', message: 'Registrando abastecimento rápido...' })
      await createTransaction({
        bankAccountId: quickFuelBankAccountId,
        categoryId: quickFuelCategoryId,
        name: `Abastecimento rápido • ${selectedVehicle?.name ?? 'Veículo'}`,
        value: Number((liters * pricePerLiter).toFixed(2)),
        type: 'EXPENSE',
        date: quickFuelDate,
        fuelVehicleId: selectedVehicleId,
        fuelOdometer: odometer,
        fuelLiters: liters,
        fuelPricePerLiter: pricePerLiter,
        fuelFillType: quickFuelFillType,
        fuelFirstPumpClick: quickFuelFirstPumpClick,
      })

      setIsQuickFuelModalOpen(false)
      resetQuickFuelForm()
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      setInlineFeedback({ status: 'synced', message: 'Abastecimento rápido sincronizado.' })
      toast.success('Abastecimento registrado!')
    } catch {
      setInlineFeedback({ status: 'error', message: 'Erro no abastecimento rápido.' })
      toast.error('Não foi possível registrar abastecimento.')
    }
  }

  async function handleQuickMaintenanceAction() {
    if (!selectedVehicleId || !quickMaintenanceBankAccountId || !quickMaintenanceCategoryId) {
      toast.error('Preencha conta e categoria para manutenção rápida.')
      return
    }

    const amount = Number(quickMaintenanceAmount.replace(',', '.'))
    const odometer = quickMaintenanceOdometer ? Number(quickMaintenanceOdometer.replace(',', '.')) : undefined

    if (!quickMaintenanceTitle.trim() || !amount || amount <= 0) {
      toast.error('Preencha título e valor da manutenção.')
      return
    }

    try {
      setInlineFeedback({ status: 'saving', message: 'Registrando manutenção rápida...' })
      await createTransaction({
        bankAccountId: quickMaintenanceBankAccountId,
        categoryId: quickMaintenanceCategoryId,
        name: quickMaintenanceTitle,
        value: amount,
        type: 'EXPENSE',
        date: quickMaintenanceDate,
        maintenanceVehicleId: selectedVehicleId,
        maintenanceOdometer: odometer,
      })

      setIsQuickMaintenanceModalOpen(false)
      resetQuickMaintenanceForm()
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      setInlineFeedback({ status: 'synced', message: 'Manutenção rápida sincronizada.' })
      toast.success('Manutenção registrada!')
    } catch {
      setInlineFeedback({ status: 'error', message: 'Erro na manutenção rápida.' })
      toast.error('Não foi possível registrar manutenção.')
    }
  }

  async function trackVehicleEvent(eventName: string, metadata?: Record<string, unknown>) {
    try {
      await trackUsageEvent({
        vehicleId: selectedVehicleId ?? undefined,
        eventName,
        screen: 'vehicles',
        metadata,
      })
    } catch {
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 overflow-y-auto">
        <div className="bg-teal-900 rounded-2xl w-full h-full px-4 py-8 lg:p-10 flex flex-col">
          <div className="w-full h-full flex items-center justify-center">
            <Spinner className="text-teal-950/50 fill-white w-10 h-10" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 overflow-y-auto">
      <Modal
        title="Novo Veículo"
        open={isCreateModalOpen}
        onClose={() => {
          if (name || model || plate) {
            trackVehicleEvent('create_vehicle_abandoned', { hasName: !!name, hasModel: !!model, hasPlate: !!plate })
          }
          setIsCreateModalOpen(false)
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleCreateVehicle()
          }}
        >
          <Input name="name" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />

          <button
            type="button"
            className="text-xs text-teal-700 hover:text-teal-800 underline"
            onClick={() => setShowCreateVehicleOptionalFields((state) => !state)}
          >
            {showCreateVehicleOptionalFields ? 'Ocultar campos opcionais' : 'Mostrar campos opcionais'}
          </button>

          {showCreateVehicleOptionalFields && (
            <div className="space-y-3 rounded-xl border border-gray-200 p-3 bg-gray-50">
              <Input name="model" placeholder="Modelo (opcional)" value={model} onChange={(e) => setModel(e.target.value)} />
              <Input name="plate" placeholder="Placa (opcional)" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
              <Input
                type="number"
                step="0.1"
                name="currentOdometer"
                placeholder="Odômetro atual (opcional)"
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(e.target.value)}
              />

              <div className="space-y-2">
                <label className="text-xs text-gray-600 block">Foto do veículo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]

                    if (!file) {
                      return
                    }

                    const reader = new FileReader()
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setPhotoUrl(reader.result)
                      }
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-gray-200 file:bg-white file:text-gray-700"
                />
                {photoUrl && (
                  <img src={photoUrl} alt="Pré-visualização" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                )}
              </div>

              <Select
                placeholder="Combustível"
                value={fuelType}
                onChange={setFuelType}
                options={fuelTypeOptions}
              />
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isCreatingVehicle}>Cadastrar veículo</Button>
        </form>
      </Modal>

      <Modal
        title="Nova peça / troca"
        open={isCreatePartModalOpen}
        contentClassName="max-h-[90vh] overflow-hidden"
        onClose={() => {
          if (partName || partTotalCost) {
            trackVehicleEvent('create_part_abandoned', { hasName: !!partName, hasCost: !!partTotalCost })
          }
          setIsCreatePartModalOpen(false)
        }}
      >
        <form
          className="flex h-full max-h-[calc(90vh-180px)] flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            handleCreatePart()
          }}
        >
          <div className="space-y-3 overflow-y-auto pr-1">
            {accounts.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Você precisa vincular uma conta antes de cadastrar a peça no financeiro.{' '}
                <Link to="/" className="underline">Vincular conta</Link>
              </div>
            )}

            <Select
              placeholder="Conta para lançar o custo"
              value={partBankAccountId}
              onChange={setPartBankAccountId}
              options={accounts.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
            />

            <Input name="partName" placeholder="Nome da peça" value={partName} onChange={(e) => setPartName(e.target.value)} />
            <Input type="number" step="0.01" name="partTotalCost" placeholder="Custo total" value={partTotalCost} onChange={(e) => setPartTotalCost(e.target.value)} />
            <Input type="date" name="partInstalledAt" value={partInstalledAt} onChange={(e) => setPartInstalledAt(e.target.value)} />

            <button
              type="button"
              className="text-xs text-teal-700 hover:text-teal-800 underline"
              onClick={() => setShowCreatePartOptionalFields((state) => !state)}
            >
              {showCreatePartOptionalFields ? 'Ocultar detalhes opcionais' : 'Mostrar detalhes opcionais'}
            </button>

            {showCreatePartOptionalFields && (
              <div className="space-y-3 rounded-xl border border-gray-200 p-3 bg-gray-50">
                <Select
                  placeholder="Categoria de despesa"
                  value={partCategoryId}
                  onChange={setPartCategoryId}
                  options={expenseCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                />

                <Input name="partBrand" placeholder="Marca (opcional)" value={partBrand} onChange={(e) => setPartBrand(e.target.value)} />
                <Input type="number" step="0.01" name="partQuantity" placeholder="Quantidade" value={partQuantity} onChange={(e) => setPartQuantity(e.target.value)} />
                <Input type="number" step="0.1" name="partInstalledOdometer" placeholder="Km da instalação (opcional)" value={partInstalledOdometer} onChange={(e) => setPartInstalledOdometer(e.target.value)} />
                <Input type="number" step="1" name="partLifetimeKm" placeholder="Vida útil esperada em km (opcional)" value={partLifetimeKm} onChange={(e) => setPartLifetimeKm(e.target.value)} />
                <Input type="number" step="1" name="partNextReplacementOdometer" placeholder="Próxima troca em km (opcional)" value={partNextReplacementOdometer} onChange={(e) => setPartNextReplacementOdometer(e.target.value)} />
                <Input name="partNotes" placeholder="Observações (opcional)" value={partNotes} onChange={(e) => setPartNotes(e.target.value)} />
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-gray-100">
            <Button type="submit" className="w-full" isLoading={isCreatingPart}>Salvar peça</Button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Abastecimento rápido"
        open={isQuickFuelModalOpen}
        onClose={() => {
          if (quickFuelLiters || quickFuelPricePerLiter) {
            trackVehicleEvent('quick_fuel_abandoned', { liters: quickFuelLiters, price: quickFuelPricePerLiter })
          }
          setIsQuickFuelModalOpen(false)
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            handleQuickFuelAction()
          }}
        >
          <Select
            placeholder="Conta"
            value={quickFuelBankAccountId}
            onChange={setQuickFuelBankAccountId}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          />
          <Select
            placeholder="Categoria"
            value={quickFuelCategoryId}
            onChange={setQuickFuelCategoryId}
            options={expenseCategories.map((category) => ({ value: category.id, label: category.name }))}
          />
          <Input type="number" step="0.01" name="quickFuelLiters" placeholder="Litros" value={quickFuelLiters} onChange={(e) => setQuickFuelLiters(e.target.value)} />
          <Input type="number" step="0.01" name="quickFuelPricePerLiter" placeholder="Preço por litro" value={quickFuelPricePerLiter} onChange={(e) => setQuickFuelPricePerLiter(e.target.value)} />
          <Input type="number" step="0.1" name="quickFuelOdometer" placeholder="Odômetro" value={quickFuelOdometer} onChange={(e) => setQuickFuelOdometer(e.target.value)} />

          <Select
            placeholder="Tipo de abastecimento"
            value={quickFuelFillType}
            onChange={(value) => setQuickFuelFillType(value as 'FULL' | 'PARTIAL')}
            options={[
              { value: 'PARTIAL', label: 'Parcial' },
              { value: 'FULL', label: 'Tanque cheio' },
            ]}
          />

          <label className="flex items-center gap-2 text-xs text-gray-700 rounded-lg border border-gray-200 px-3 py-2">
            <input
              type="checkbox"
              checked={quickFuelFirstPumpClick}
              onChange={(e) => setQuickFuelFirstPumpClick(e.target.checked)}
            />
            Primeiro clique da bomba
          </label>

          <Input type="date" name="quickFuelDate" value={quickFuelDate} onChange={(e) => setQuickFuelDate(e.target.value)} />

          <Button type="submit" className="w-full" isLoading={isCreatingQuickAction}>Salvar abastecimento</Button>
        </form>
      </Modal>

      <Modal
        title="Manutenção rápida"
        open={isQuickMaintenanceModalOpen}
        onClose={() => {
          if (quickMaintenanceTitle || quickMaintenanceAmount) {
            trackVehicleEvent('quick_maintenance_abandoned', { title: quickMaintenanceTitle, amount: quickMaintenanceAmount })
          }
          setIsQuickMaintenanceModalOpen(false)
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            handleQuickMaintenanceAction()
          }}
        >
          <Select
            placeholder="Conta"
            value={quickMaintenanceBankAccountId}
            onChange={setQuickMaintenanceBankAccountId}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          />
          <Select
            placeholder="Categoria"
            value={quickMaintenanceCategoryId}
            onChange={setQuickMaintenanceCategoryId}
            options={expenseCategories.map((category) => ({ value: category.id, label: category.name }))}
          />
          <Input name="quickMaintenanceTitle" placeholder="Título da manutenção" value={quickMaintenanceTitle} onChange={(e) => setQuickMaintenanceTitle(e.target.value)} />
          <Input type="number" step="0.01" name="quickMaintenanceAmount" placeholder="Valor" value={quickMaintenanceAmount} onChange={(e) => setQuickMaintenanceAmount(e.target.value)} />
          <Input type="number" step="0.1" name="quickMaintenanceOdometer" placeholder="Odômetro (opcional)" value={quickMaintenanceOdometer} onChange={(e) => setQuickMaintenanceOdometer(e.target.value)} />
          <Input type="date" name="quickMaintenanceDate" value={quickMaintenanceDate} onChange={(e) => setQuickMaintenanceDate(e.target.value)} />

          <Button type="submit" className="w-full" isLoading={isCreatingQuickAction}>Salvar manutenção</Button>
        </form>
      </Modal>

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Logo className="h-6 text-teal-900" />
          <p className="text-sm text-gray-600 mt-2">Controle seus custos de combustível, média e custo por km.</p>
          {selectedVehicle && (
            <span className={`inline-flex mt-2 text-[11px] px-2.5 py-1 rounded-full font-semibold ${
              selectedHealthBadge === 'OK'
                ? 'bg-emerald-100 text-emerald-800'
                : selectedHealthBadge === 'ATTENTION'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
            }`}>
              Saúde: {selectedHealthBadge === 'OK' ? 'OK' : selectedHealthBadge === 'ATTENTION' ? 'Atenção' : 'Urgente'}
            </span>
          )}
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <Link
            to="/"
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-center"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </header>

      <main className="mt-6 grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-xs text-gray-600 block">Veículos</span>
              <strong className="text-gray-900 text-sm">{summary.vehiclesCount}</strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-xs text-gray-600 block">Total gasto</span>
              <strong className="text-gray-900 text-sm">{formatCurrency(summary.totalCost)}</strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-xs text-gray-600 block">Total litros</span>
              <strong className="text-gray-900 text-sm">{summary.totalLiters.toFixed(1)} L</strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-gray-900">Meus veículos</strong>
              <button
                type="button"
                onClick={() => {
                  const next = !isCompactMode
                  setIsCompactMode(next)
                  trackVehicleEvent('compact_mode_toggled', { enabled: next })
                }}
                className="text-[11px] px-2 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {isCompactMode ? 'Modo completo' : 'Modo compacto'}
              </button>
            </div>

            {vehicles.length === 0 && (
              <p className="text-sm text-gray-600">Nenhum veículo cadastrado ainda.</p>
            )}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(vehicle.id)}
                  className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${selectedVehicleId === vehicle.id ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative w-9 h-9 shrink-0">
                        {vehicle.photoUrl ? (
                          <img src={vehicle.photoUrl} alt={vehicle.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center text-xs">🚗</div>
                        )}

                        <span
                          title={`Saúde: ${getHealthBadgeLabel(vehicle.healthBadge)}`}
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            vehicle.healthBadge === 'URGENT'
                              ? 'bg-rose-500'
                              : vehicle.healthBadge === 'ATTENTION'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                        />
                      </div>

                      <strong className="text-gray-800 block truncate">{vehicle.name}</strong>
                    </div>

                    {selectedVehicleId === vehicle.id && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-teal-100 text-teal-800 font-semibold">
                        Ativo
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-gray-600 block mt-1">{vehicle.model || 'Sem modelo'}</span>

                  <div className={`grid ${isCompactMode ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-2`}>
                    <div className="rounded-lg bg-white border border-gray-200 px-2 py-1">
                      <span className="text-[10px] text-gray-500 block">R$/km</span>
                      <strong className="text-[11px] text-gray-800">
                        {vehicle.fuelStats?.costPerKm ? formatCurrency(vehicle.fuelStats.costPerKm) : '—'}
                      </strong>
                    </div>

                    <div className="rounded-lg bg-white border border-gray-200 px-2 py-1">
                      <span className="text-[10px] text-gray-500 block">km/L</span>
                      <strong className="text-[11px] text-gray-800">
                        {vehicle.fuelStats?.averageConsumptionKmPerLiter
                          ? vehicle.fuelStats.averageConsumptionKmPerLiter.toFixed(2)
                          : '—'}
                      </strong>
                    </div>

                    {!isCompactMode && (
                      <div className="rounded-lg bg-white border border-gray-200 px-2 py-1">
                        <span className="text-[10px] text-gray-500 block">Gasto mês</span>
                        <strong className="text-[11px] text-gray-800">
                          {formatCurrency(monthlySpentByVehicleId.get(vehicle.id) ?? 0)}
                        </strong>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(true)
                trackVehicleEvent('create_vehicle_started')
              }}
              className="w-full mt-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center text-base font-semibold">
                  +
                </span>
                <div>
                  <strong className="text-sm text-gray-800 block">Adicionar veículo</strong>
                  <span className="text-xs text-gray-500">Cadastro rápido</span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          {!selectedVehicleId && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-600 flex flex-col items-center justify-center gap-3 min-h-[280px]">
              <img src="/public/select-vehicle.png" alt="Selecione um veículo" className="w-72 h-72 object-contain" />
              <p className="text-center">Selecione um veículo para ver combustível, manutenção e peças.</p>
              <Button type="button" className="h-9 px-4 rounded-xl" onClick={() => setIsCreateModalOpen(true)}>
                Cadastrar veículo
              </Button>
            </div>
          )}

          {selectedVehicleId && !selectedVehicle && <VehicleDetailsSkeleton />}

          {selectedVehicle && (
            <>
              <div className="sticky top-2 z-20 bg-white/95 backdrop-blur border border-gray-200 rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <strong className="text-sm text-gray-900 block truncate">{selectedVehicle.name}</strong>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getHealthBadgeClassName(selectedVehicle.healthBadge)}`}>
                        {getHealthBadgeLabel(selectedVehicle.healthBadge)}
                      </span>
                      <span className="text-xs text-gray-700">
                        {selectedVehicle.effectiveCurrentOdometer !== null && selectedVehicle.effectiveCurrentOdometer !== undefined
                          ? `${selectedVehicle.effectiveCurrentOdometer.toFixed(1)} km`
                          : 'Sem referência'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickFuelModalOpen(true)
                        trackVehicleEvent('quick_fuel_started')
                      }}
                      className="h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      ⛽ Abastecer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickMaintenanceModalOpen(true)
                        trackVehicleEvent('quick_maintenance_started')
                      }}
                      className="h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      🛠 Manutenção
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between text-left"
                  onClick={() => setMobileOpenSection((state) => (state === 'SUMMARY' ? 'ODOMETER' : 'SUMMARY'))}
                >
                  <strong className="text-gray-900">Resumo</strong>
                  <span className="text-xs text-gray-500">
                    {mobileOpenSection === 'SUMMARY' ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>

                <div className={`${mobileOpenSection === 'SUMMARY' ? 'block' : 'hidden'} lg:block space-y-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="group relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shrink-0"
                        title="Editar foto"
                      >
                        {selectedVehicle.photoUrl ? (
                          <img src={selectedVehicle.photoUrl} alt={selectedVehicle.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-lg">🚗</span>
                        )}

                        <span className="absolute inset-0 bg-black/45 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          Editar
                        </span>
                      </button>

                      <div>
                        <strong className="text-xl text-gray-900 block">{selectedVehicle.name}</strong>
                        <p className="text-sm text-gray-600">
                          {selectedVehicle.model || 'Modelo não informado'} {selectedVehicle.plate ? `• ${selectedVehicle.plate}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto" />
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSelectVehiclePhoto}
                  />

                  {inlineFeedback && (
                    <div className={`rounded-xl px-3 py-2 text-xs border ${
                      inlineFeedback.status === 'saving'
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : inlineFeedback.status === 'synced'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : inlineFeedback.status === 'stale'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}>
                      {inlineFeedback.status === 'saving' && 'Salvando • '}
                      {inlineFeedback.status === 'synced' && 'Sincronizado • '}
                      {inlineFeedback.status === 'stale' && 'Desatualizado • '}
                      {inlineFeedback.status === 'error' && 'Erro • '}
                      {inlineFeedback.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {isLoadingVehicle ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div key={`overview-skeleton-${index}`} className="rounded-xl bg-gray-50 p-3 animate-pulse space-y-2">
                          <div className="h-3 w-24 rounded bg-gray-200" />
                          <div className="h-4 w-28 rounded bg-gray-200" />
                          <div className="h-3 w-36 rounded bg-gray-200" />
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="rounded-xl bg-gray-50 p-3">
                          <span className="text-xs text-gray-600 block">Último abastecimento</span>
                          <strong className="text-gray-900 block mt-1">
                            {latestFuelRecord ? formatDate(latestFuelRecord.transaction.date) : 'Sem registro'}
                          </strong>
                          {latestFuelRecord && (
                            <span className="text-xs text-gray-600 block mt-1">
                              {latestFuelRecord.liters.toFixed(2)} L • {formatCurrency(latestFuelRecord.totalCost)}
                            </span>
                          )}
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <span className="text-xs text-gray-600 block">Última manutenção</span>
                          <strong className="text-gray-900 block mt-1">
                            {latestMaintenance ? formatDate(latestMaintenance.date) : 'Sem registro'}
                          </strong>
                          {latestMaintenance && (
                            <span className="text-xs text-gray-600 block mt-1 truncate">{latestMaintenance.title}</span>
                          )}
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <span className="text-xs text-gray-600 block">Status próxima troca</span>
                          <strong className="text-gray-900 block mt-1">{nextReplacementStatus}</strong>
                        </div>
                      </>
                    )}
                  </div>

                </div>

                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between text-left"
                  onClick={() => setMobileOpenSection((state) => (state === 'ODOMETER' ? 'METRICS' : 'ODOMETER'))}
                >
                  <strong className="text-gray-900">Odômetro</strong>
                  <span className="text-xs text-gray-500">
                    {mobileOpenSection === 'ODOMETER' ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>

                <div className={`${mobileOpenSection === 'ODOMETER' ? 'block' : 'hidden'} lg:block space-y-4`}>
                  <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                    <span className="text-xs text-teal-700 block">Odômetro consolidado</span>
                    <strong className="text-3xl text-teal-900 tracking-[-1px] block mt-1">
                      {selectedVehicle.effectiveCurrentOdometer !== null && selectedVehicle.effectiveCurrentOdometer !== undefined
                        ? `${selectedVehicle.effectiveCurrentOdometer.toFixed(1)} km`
                        : 'Sem referência'}
                    </strong>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[11px] px-2 py-1 rounded-full ${
                        selectedConfidenceLevel === 'HIGH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedConfidenceLevel === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}>
                        Nível de confiança: {selectedConfidenceLevel === 'HIGH' ? 'alto' : selectedConfidenceLevel === 'MEDIUM' ? 'médio' : 'baixo'}
                      </span>

                      {selectedVehicle.odometerConfidence?.daysSinceCalibration !== null
                        && selectedVehicle.odometerConfidence?.daysSinceCalibration !== undefined && (
                          <span className="text-[11px] text-teal-800">
                            Última calibração há {selectedVehicle.odometerConfidence.daysSinceCalibration} dias
                          </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOdometerStep('CURRENT')}
                        className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                          odometerStep === 'CURRENT'
                            ? 'border-teal-700 bg-teal-50 text-teal-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        1) Quilometragem atual
                      </button>
                      <button
                        type="button"
                        onClick={() => setOdometerStep('AUTO')}
                        className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors ${
                          odometerStep === 'AUTO'
                            ? 'border-teal-700 bg-teal-50 text-teal-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        2) Automação diária
                      </button>
                    </div>
                  </div>

                  {odometerStep === 'CURRENT' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                      <strong className="text-sm text-gray-900 block">Quilometragem atual</strong>

                      <div className="space-y-2">
                        <label className="text-xs text-gray-600 block">Valor atual do painel</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="currentOdometerInput"
                          placeholder="Ex.: 52340.5"
                          value={currentOdometerInput}
                          onChange={(e) => {
                            setCurrentOdometerInput(e.target.value)
                            setShowOutlierConfirm(false)
                            setConfirmOdometerOutlier(false)
                          }}
                        />
                      </div>

                      {selectedVehicle.effectiveCurrentOdometer !== null && selectedVehicle.effectiveCurrentOdometer !== undefined && (
                        <div className="space-y-1">
                          <span className="text-xs text-teal-700 block">
                            Estimativa atual: {selectedVehicle.effectiveCurrentOdometer.toFixed(1)} km
                          </span>
                          {deltaLabel && (
                            <span className={`text-xs block font-medium ${deltaLabel.className}`}>
                              {deltaLabel.text}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-gray-500">
                        Use o valor real do painel para recalibrar.
                      </p>

                      {showOutlierConfirm && (
                        <label className="flex items-center gap-2 text-[11px] text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                          <input
                            type="checkbox"
                            checked={confirmOdometerOutlier}
                            onChange={(event) => setConfirmOdometerOutlier(event.target.checked)}
                          />
                          Confirmar outlier (salto atípico) para salvar
                        </label>
                      )}

                      <div className="space-y-2">
                        <Button
                          type="button"
                          className="h-9 px-3 rounded-lg w-full sm:w-auto text-sm"
                          isLoading={isUpdatingVehicle}
                          onClick={handleUpdateCurrentOdometer}
                        >
                          Salvar quilometragem
                        </Button>

                        <button
                          type="button"
                          className="text-xs text-teal-700 hover:text-teal-800 underline"
                          onClick={handleRecalibrateNow}
                          disabled={isRecalibratingNow}
                        >
                          {isRecalibratingNow ? 'Atualizando...' : 'Atualizar agora (ação rápida)'}
                        </button>
                      </div>
                    </div>
                  )}

                  {odometerStep === 'AUTO' && (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <input
                          id="auto-odometer"
                          type="checkbox"
                          checked={autoOdometerEnabledInput}
                          onChange={(event) => setAutoOdometerEnabledInput(event.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <label htmlFor="auto-odometer" className="text-sm text-gray-800 font-medium">
                          Estimativa automática de km/dia
                        </label>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-gray-600 block">Média de km por dia</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="averageDailyKmInput"
                          placeholder="Ex.: 38.5"
                          value={averageDailyKmInput}
                          onChange={(e) => setAverageDailyKmInput(e.target.value)}
                        />
                      </div>

                      <p className="text-[11px] text-gray-500">
                        Use a média diária para prever km e próximas necessidades.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                          <span className="text-[10px] text-gray-500 block">Aprendizado</span>
                          <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.learnedAverageDailyKm?.toFixed(1) ?? '—'} km/dia</strong>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                          <span className="text-[10px] text-gray-500 block">Dia útil</span>
                          <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.learnedWeekdayKm?.toFixed(1) ?? '—'} km/dia</strong>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                          <span className="text-[10px] text-gray-500 block">Fim de semana</span>
                          <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.learnedWeekendKm?.toFixed(1) ?? '—'} km/dia</strong>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                          <span className="text-[10px] text-gray-500 block">Projeção semanal</span>
                          <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.weeklyProjectionKm?.toFixed(1) ?? '—'} km</strong>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
                          <span className="text-[10px] text-gray-500 block">Outliers</span>
                          <strong className="text-xs text-gray-800">{selectedVehicle.odometerLearning?.outlierCount ?? 0}</strong>
                        </div>
                      </div>

                      {selectedVehicle.recalibrationSuggested && (
                        <span className="text-[11px] text-amber-700 block">
                          Atenção: divergência de {selectedVehicle.divergencePercent?.toFixed(1)}%. Recalibre para melhorar a precisão.
                        </span>
                      )}

                      {selectedVehicle.odometerBaseDate && (
                        <span className="text-[11px] text-gray-500 block">
                          Base: {formatDate(selectedVehicle.odometerBaseDate)}
                        </span>
                      )}

                      <Button
                        type="button"
                        className="h-9 px-3 rounded-lg w-full sm:w-auto text-sm"
                        isLoading={isUpdatingVehicle}
                        onClick={handleUpdateAutoOdometerSettings}
                      >
                        Salvar automação
                      </Button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between text-left"
                  onClick={() => setMobileOpenSection((state) => (state === 'METRICS' ? 'TIMELINE' : 'METRICS'))}
                >
                  <strong className="text-gray-900">Métricas</strong>
                  <span className="text-xs text-gray-500">
                    {mobileOpenSection === 'METRICS' ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>

                <div className={`${mobileOpenSection === 'METRICS' ? 'block' : 'hidden'} lg:block space-y-2`}>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {isLoadingVehicle ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <div key={`metrics-skeleton-${index}`} className="rounded-xl bg-gray-50 p-3 animate-pulse space-y-2">
                          <div className="h-3 w-16 rounded bg-gray-200" />
                          <div className="h-4 w-20 rounded bg-gray-200" />
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="rounded-xl bg-gray-50 p-3" title="Média de quilômetros por litro dos abastecimentos registrados.">
                          <span className="text-[11px] text-gray-500 block">Consumo médio</span>
                          <strong className="text-gray-900 text-lg leading-none mt-1 block">
                            {selectedVehicle.fuelStats?.averageConsumptionKmPerLiter
                              ? `${selectedVehicle.fuelStats.averageConsumptionKmPerLiter.toFixed(2)} km/L`
                              : '-'}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3" title="Valor médio gasto por quilômetro rodado.">
                          <span className="text-[11px] text-gray-500 block">Custo por km</span>
                          <strong className="text-rose-700 text-lg leading-none mt-1 block font-semibold">
                            {selectedVehicle.fuelStats?.costPerKm ? formatCurrency(selectedVehicle.fuelStats.costPerKm) : '-'}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3" title="Projeção de gasto para cada 1.000 km.">
                          <span className="text-[11px] text-gray-500 block">Custo / 1.000 km</span>
                          <strong className="text-rose-700 text-lg leading-none mt-1 block font-semibold">
                            {selectedVehicle.fuelStats?.costPer1000Km ? formatCurrency(selectedVehicle.fuelStats.costPer1000Km) : '-'}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3" title="Somatório de combustível e manutenção no mês atual.">
                          <span className="text-[11px] text-gray-500 block">Gasto no mês</span>
                          <strong className="text-rose-700 text-lg leading-none mt-1 block font-semibold">{formatCurrency(selectedVehicleMonthlySpent)}</strong>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3">
                          <span className="text-[11px] text-gray-500 block">Peças cadastradas</span>
                          <strong className="text-gray-900 text-lg leading-none mt-1 block">{selectedVehicle.parts.length}</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

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
                      onClick={() => setIsTimelineCompactMode((state) => !state)}
                      className="h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {isTimelineCompactMode ? 'Modo detalhado' : 'Modo compacto'}
                    </button>

                    <Button type="button" className="h-9 px-3 rounded-lg text-xs" onClick={() => setIsCreatePartModalOpen(true)}>
                      Cadastrar peça
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { value: 'ALL' as const, label: 'Tudo' },
                      { value: 'FUEL' as const, label: 'Abastecimentos' },
                      { value: 'MAINTENANCE' as const, label: 'Manutenções' },
                      { value: 'PART' as const, label: 'Peças' },
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => {
                          setTimelineFilter(filter.value)
                          setTimelineVisibleCount(20)
                          trackVehicleEvent('timeline_filter_changed', { filter: filter.value })
                        }}
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
                      <p>Ainda não há itens para este filtro.</p>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to="/"
                          className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cadastrar primeiro abastecimento
                        </Link>

                        <Button type="button" className="h-9 px-3 rounded-lg text-xs" onClick={() => setIsCreatePartModalOpen(true)}>
                          Cadastrar peça
                        </Button>

                        {accounts.length === 0 && (
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

                  <div
                    className="space-y-2 max-h-[420px] overflow-y-auto pr-1"
                    onScroll={(event) => {
                      const target = event.currentTarget
                      const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 40

                      if (isNearBottom && canLoadMoreTimelineItems) {
                        setTimelineVisibleCount((current) => current + 20)
                      }
                    }}
                  >
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

                              setExpandedTimelineItems((state) => ({
                                ...state,
                                [item.id]: !isCompactExpanded,
                              }))
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
                                    {item.type === 'FUEL' ? 'Abastecimento' : item.type === 'MAINTENANCE' ? 'Manutenção' : 'Peça'}
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
                                            setExpandedTimelineText((state) => ({
                                              ...state,
                                              [subtitleKey]: !subtitleExpanded,
                                            }))
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
                                            setExpandedTimelineText((state) => ({
                                              ...state,
                                              [detailKey]: !detailExpanded,
                                            }))
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
                                  setExpandedTimelineItems((state) => ({
                                    ...state,
                                    [item.id]: !isCompactExpanded,
                                  }))
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
                          onClick={() => setTimelineVisibleCount((current) => current + 20)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Carregar mais eventos
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
