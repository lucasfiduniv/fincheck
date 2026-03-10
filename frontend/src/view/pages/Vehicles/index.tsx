import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { vehiclesService } from '../../../app/services/vehiclesService'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { toast } from 'react-hot-toast'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../app/hooks/useCategories'
import { useVehicleMutations } from './hooks/useVehicleMutations'
import { useVehicleTimeline } from './hooks/useVehicleTimeline'
import { VehicleTimelineSection } from './components/VehicleTimelineSection'
import { VehicleQuickActionModals } from './components/VehicleQuickActionModals'
import { VehicleCreateModals } from './components/VehicleCreateModals'
import { VehicleSummarySection } from './components/VehicleSummarySection'
import { VehicleOdometerSection } from './components/VehicleOdometerSection'
import { VehicleMetricsSection } from './components/VehicleMetricsSection'
import { InlineFeedbackState } from './types'
import { getTodayDateInputValue } from '../../../app/utils/getTodayDateInputValue'

const fuelTypeOptions = [
  { value: 'GASOLINE', label: 'Gasolina' },
  { value: 'ETHANOL', label: 'Etanol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'FLEX', label: 'Flex' },
  { value: 'ELECTRIC', label: 'Elétrico' },
  { value: 'HYBRID', label: 'Híbrido' },
]

const compactModeStoragePrefix = 'fincheck:vehicles:compact-mode:'
const odometerDraftStoragePrefix = 'fincheck:vehicles:odometer-draft:'

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
  const [partInstalledAt, setPartInstalledAt] = useState(getTodayDateInputValue())
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
  const [quickFuelDate, setQuickFuelDate] = useState(getTodayDateInputValue())
  const [quickFuelFillType, setQuickFuelFillType] = useState<'FULL' | 'PARTIAL'>('PARTIAL')
  const [quickFuelFirstPumpClick, setQuickFuelFirstPumpClick] = useState(false)

  const [quickMaintenanceBankAccountId, setQuickMaintenanceBankAccountId] = useState('')
  const [quickMaintenanceCategoryId, setQuickMaintenanceCategoryId] = useState('')
  const [quickMaintenanceTitle, setQuickMaintenanceTitle] = useState('')
  const [quickMaintenanceAmount, setQuickMaintenanceAmount] = useState('')
  const [quickMaintenanceOdometer, setQuickMaintenanceOdometer] = useState('')
  const [quickMaintenanceDate, setQuickMaintenanceDate] = useState(getTodayDateInputValue())

  const [inlineFeedback, setInlineFeedback] = useState<InlineFeedbackState | null>(null)
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
  const {
    createVehicle,
    isCreatingVehicle,
    createPart,
    isCreatingPart,
    createTransaction,
    isCreatingQuickAction,
    updateVehicle,
    isUpdatingVehicle,
    recalibrateNow,
    isRecalibratingNow,
    trackUsageEvent,
  } = useVehicleMutations()

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

  const {
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
  } = useVehicleTimeline({
    selectedVehicle,
    selectedVehicleId,
    userIdForStorage: selectedVehicle?.userId ?? vehicles[0]?.userId,
  })

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
    const userId = selectedVehicle?.userId ?? vehicles[0]?.userId

    if (!userId) {
      return
    }

    const savedCompactMode = localStorage.getItem(`${compactModeStoragePrefix}${userId}`)

    if (savedCompactMode === 'true' || savedCompactMode === 'false') {
      setIsCompactMode(savedCompactMode === 'true')
    }
  }, [selectedVehicle?.userId, vehicles])

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
    setPartInstalledAt(getTodayDateInputValue())
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
    setQuickFuelDate(getTodayDateInputValue())
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
    setQuickMaintenanceDate(getTodayDateInputValue())
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
      <VehicleCreateModals
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        name={name}
        model={model}
        plate={plate}
        setName={setName}
        setModel={setModel}
        setPlate={setPlate}
        showCreateVehicleOptionalFields={showCreateVehicleOptionalFields}
        setShowCreateVehicleOptionalFields={setShowCreateVehicleOptionalFields}
        currentOdometer={currentOdometer}
        setCurrentOdometer={setCurrentOdometer}
        photoUrl={photoUrl}
        setPhotoUrl={setPhotoUrl}
        fuelType={fuelType}
        setFuelType={setFuelType}
        fuelTypeOptions={fuelTypeOptions}
        isCreatingVehicle={isCreatingVehicle}
        onCreateVehicle={handleCreateVehicle}
        onTrackVehicleEvent={trackVehicleEvent}
        isCreatePartModalOpen={isCreatePartModalOpen}
        setIsCreatePartModalOpen={setIsCreatePartModalOpen}
        partName={partName}
        partTotalCost={partTotalCost}
        setPartName={setPartName}
        setPartTotalCost={setPartTotalCost}
        partBankAccountId={partBankAccountId}
        setPartBankAccountId={setPartBankAccountId}
        partInstalledAt={partInstalledAt}
        setPartInstalledAt={setPartInstalledAt}
        showCreatePartOptionalFields={showCreatePartOptionalFields}
        setShowCreatePartOptionalFields={setShowCreatePartOptionalFields}
        partCategoryId={partCategoryId}
        setPartCategoryId={setPartCategoryId}
        partBrand={partBrand}
        setPartBrand={setPartBrand}
        partQuantity={partQuantity}
        setPartQuantity={setPartQuantity}
        partInstalledOdometer={partInstalledOdometer}
        setPartInstalledOdometer={setPartInstalledOdometer}
        partLifetimeKm={partLifetimeKm}
        setPartLifetimeKm={setPartLifetimeKm}
        partNextReplacementOdometer={partNextReplacementOdometer}
        setPartNextReplacementOdometer={setPartNextReplacementOdometer}
        partNotes={partNotes}
        setPartNotes={setPartNotes}
        accounts={accounts}
        expenseCategories={expenseCategories}
        isCreatingPart={isCreatingPart}
        onCreatePart={handleCreatePart}
      />

      <VehicleQuickActionModals
        isQuickFuelModalOpen={isQuickFuelModalOpen}
        setIsQuickFuelModalOpen={setIsQuickFuelModalOpen}
        isQuickMaintenanceModalOpen={isQuickMaintenanceModalOpen}
        setIsQuickMaintenanceModalOpen={setIsQuickMaintenanceModalOpen}
        quickFuelLiters={quickFuelLiters}
        quickFuelPricePerLiter={quickFuelPricePerLiter}
        quickFuelBankAccountId={quickFuelBankAccountId}
        setQuickFuelBankAccountId={setQuickFuelBankAccountId}
        quickFuelCategoryId={quickFuelCategoryId}
        setQuickFuelCategoryId={setQuickFuelCategoryId}
        quickFuelOdometer={quickFuelOdometer}
        setQuickFuelOdometer={setQuickFuelOdometer}
        quickFuelDate={quickFuelDate}
        setQuickFuelDate={setQuickFuelDate}
        quickFuelFillType={quickFuelFillType}
        setQuickFuelFillType={setQuickFuelFillType}
        quickFuelFirstPumpClick={quickFuelFirstPumpClick}
        setQuickFuelFirstPumpClick={setQuickFuelFirstPumpClick}
        setQuickFuelLiters={setQuickFuelLiters}
        setQuickFuelPricePerLiter={setQuickFuelPricePerLiter}
        handleQuickFuelAction={handleQuickFuelAction}
        quickMaintenanceTitle={quickMaintenanceTitle}
        quickMaintenanceAmount={quickMaintenanceAmount}
        quickMaintenanceBankAccountId={quickMaintenanceBankAccountId}
        setQuickMaintenanceBankAccountId={setQuickMaintenanceBankAccountId}
        quickMaintenanceCategoryId={quickMaintenanceCategoryId}
        setQuickMaintenanceCategoryId={setQuickMaintenanceCategoryId}
        quickMaintenanceOdometer={quickMaintenanceOdometer}
        setQuickMaintenanceOdometer={setQuickMaintenanceOdometer}
        quickMaintenanceDate={quickMaintenanceDate}
        setQuickMaintenanceDate={setQuickMaintenanceDate}
        setQuickMaintenanceTitle={setQuickMaintenanceTitle}
        setQuickMaintenanceAmount={setQuickMaintenanceAmount}
        handleQuickMaintenanceAction={handleQuickMaintenanceAction}
        isCreatingQuickAction={isCreatingQuickAction}
        accountOptions={accounts.map((account) => ({ value: account.id, label: account.name }))}
        expenseCategoryOptions={expenseCategories.map((category) => ({ value: category.id, label: category.name }))}
        trackVehicleEvent={trackVehicleEvent}
      />

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
                <VehicleSummarySection
                  mobileOpenSection={mobileOpenSection}
                  setMobileOpenSection={setMobileOpenSection}
                  selectedVehicle={selectedVehicle}
                  photoInputRef={photoInputRef}
                  handleSelectVehiclePhoto={handleSelectVehiclePhoto}
                  inlineFeedback={inlineFeedback}
                  isLoadingVehicle={isLoadingVehicle}
                  latestFuelRecord={latestFuelRecord}
                  latestMaintenance={latestMaintenance}
                  nextReplacementStatus={nextReplacementStatus}
                />

                <VehicleOdometerSection
                  mobileOpenSection={mobileOpenSection}
                  setMobileOpenSection={setMobileOpenSection}
                  selectedVehicle={selectedVehicle}
                  selectedConfidenceLevel={selectedConfidenceLevel}
                  odometerStep={odometerStep}
                  setOdometerStep={setOdometerStep}
                  currentOdometerInput={currentOdometerInput}
                  setCurrentOdometerInput={setCurrentOdometerInput}
                  setShowOutlierConfirm={setShowOutlierConfirm}
                  confirmOdometerOutlier={confirmOdometerOutlier}
                  setConfirmOdometerOutlier={setConfirmOdometerOutlier}
                  showOutlierConfirm={showOutlierConfirm}
                  isUpdatingVehicle={isUpdatingVehicle}
                  handleUpdateCurrentOdometer={handleUpdateCurrentOdometer}
                  handleRecalibrateNow={handleRecalibrateNow}
                  isRecalibratingNow={isRecalibratingNow}
                  autoOdometerEnabledInput={autoOdometerEnabledInput}
                  setAutoOdometerEnabledInput={setAutoOdometerEnabledInput}
                  averageDailyKmInput={averageDailyKmInput}
                  setAverageDailyKmInput={setAverageDailyKmInput}
                  handleUpdateAutoOdometerSettings={handleUpdateAutoOdometerSettings}
                  deltaLabel={deltaLabel}
                />

                <VehicleMetricsSection
                  mobileOpenSection={mobileOpenSection}
                  setMobileOpenSection={setMobileOpenSection}
                  isLoadingVehicle={isLoadingVehicle}
                  selectedVehicle={selectedVehicle}
                  selectedVehicleMonthlySpent={selectedVehicleMonthlySpent}
                />
              </div>

              <VehicleTimelineSection
                mobileOpenSection={mobileOpenSection}
                setMobileOpenSection={setMobileOpenSection}
                isTimelineCompactMode={isTimelineCompactMode}
                onToggleTimelineCompactMode={() => setIsTimelineCompactMode((state) => !state)}
                onOpenCreatePartModal={() => setIsCreatePartModalOpen(true)}
                timelineFilter={timelineFilter}
                onSelectFilter={(filter) => {
                  applyTimelineFilter(filter)
                  trackVehicleEvent('timeline_filter_changed', { filter })
                }}
                isLoadingVehicle={isLoadingVehicle}
                filteredTimelineItems={filteredTimelineItems}
                visibleTimelineItems={visibleTimelineItems}
                expandedTimelineText={expandedTimelineText}
                expandedTimelineItems={expandedTimelineItems}
                onToggleTimelineText={toggleTimelineTextExpanded}
                onToggleTimelineItem={toggleTimelineItemExpanded}
                onTimelineScroll={onTimelineScroll}
                canLoadMoreTimelineItems={canLoadMoreTimelineItems}
                onLoadMoreTimelineItems={loadMoreTimelineItems}
                accountsLength={accounts.length}
              />
            </>
          )}
        </section>
      </main>
    </div>
  )
}
