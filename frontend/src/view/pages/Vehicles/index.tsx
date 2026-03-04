import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Modal } from '../../components/Modal'
import { Spinner } from '../../components/Spinner'
import { vehiclesService } from '../../../app/services/vehiclesService'
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function isCurrentMonth(value: string) {
  const date = new Date(value)
  const now = new Date()

  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
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
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

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
  const [partTotalCost, setPartTotalCost] = useState('0')
  const [partInstalledAt, setPartInstalledAt] = useState(new Date().toISOString().slice(0, 10))
  const [partInstalledOdometer, setPartInstalledOdometer] = useState('')
  const [partLifetimeKm, setPartLifetimeKm] = useState('')
  const [partNextReplacementOdometer, setPartNextReplacementOdometer] = useState('')
  const [partNotes, setPartNotes] = useState('')
  const [currentOdometerInput, setCurrentOdometerInput] = useState('')

  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null)
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'FUEL' | 'MAINTENANCE' | 'PART'>('ALL')
  const [mobileOpenSection, setMobileOpenSection] = useState<'OVERVIEW' | 'TIMELINE'>('OVERVIEW')

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
  const { mutateAsync: updateVehicle, isLoading: isUpdatingVehicle } = useMutation(vehiclesService.update)

  const vehicleDetailsQueries = useQueries({
    queries: vehicles.map((vehicle) => ({
      queryKey: ['vehicles', 'card-summary', vehicle.id],
      queryFn: () => vehiclesService.getById(vehicle.id),
      staleTime: 1000 * 60,
      enabled: vehicles.length > 0,
    })),
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

  const monthlySpentByVehicleId = useMemo(() => {
    const map = new Map<string, number>()

    vehicles.forEach((vehicle, index) => {
      const details = vehicleDetailsQueries[index]?.data

      if (!details) {
        map.set(vehicle.id, 0)
        return
      }

      const fuelSpent = details.fuelRecords
        .filter((record) => isCurrentMonth(record.transaction.date))
        .reduce((acc, record) => acc + record.totalCost, 0)

      const maintenanceSpent = details.maintenances
        .filter((maintenance) => isCurrentMonth(maintenance.date))
        .reduce((acc, maintenance) => acc + maintenance.amount, 0)

      map.set(vehicle.id, fuelSpent + maintenanceSpent)
    })

    return map
  }, [vehicleDetailsQueries, vehicles])

  const selectedVehicleMonthlySpent = selectedVehicle
    ? monthlySpentByVehicleId.get(selectedVehicle.id) ?? 0
    : 0

  const latestFuelRecord = selectedVehicle?.fuelRecords?.[0]
  const latestMaintenance = selectedVehicle?.maintenances?.[0]

  const nextReplacementStatus = useMemo(() => {
    if (!selectedVehicle) {
      return 'Selecione um veículo'
    }

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
    const lastOdometer = selectedVehicle.currentOdometer ?? selectedVehicle.fuelStats?.lastOdometer

    if (lastOdometer === null || lastOdometer === undefined) {
      return `Próxima troca: ${nextPart.name} aos ${nextReplacementOdometer.toFixed(0)} km`
    }

    const remainingKm = nextReplacementOdometer - lastOdometer

    if (remainingKm <= 0) {
      return `Troca atrasada: ${nextPart.name}`
    }

    if (remainingKm <= 500) {
      return `Troca próxima: ${nextPart.name} em ${remainingKm.toFixed(0)} km`
    }

    return `Em dia: ${nextPart.name} em ${remainingKm.toFixed(0)} km`
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

  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id)
    }
  }, [selectedVehicleId, vehicles])

  useEffect(() => {
    if (!partBankAccountId && accounts.length > 0) {
      setPartBankAccountId(accounts[0].id)
    }
  }, [accounts, partBankAccountId])

  useEffect(() => {
    if (!partCategoryId && expenseCategories.length > 0) {
      setPartCategoryId(expenseCategories[0].id)
    }
  }, [expenseCategories, partCategoryId])

  useEffect(() => {
    if (!selectedVehicle) {
      return
    }

    setCurrentOdometerInput(
      selectedVehicle.currentOdometer !== null && selectedVehicle.currentOdometer !== undefined
        ? selectedVehicle.currentOdometer.toFixed(1)
        : '',
    )

    if (!partInstalledOdometer && selectedVehicle.currentOdometer !== null && selectedVehicle.currentOdometer !== undefined) {
      setPartInstalledOdometer(selectedVehicle.currentOdometer.toFixed(1))
    }
  }, [selectedVehicle, partInstalledOdometer])

  useEffect(() => {
    if (!inlineFeedback) {
      return
    }

    const timeout = setTimeout(() => {
      setInlineFeedback(null)
    }, 4500)

    return () => clearTimeout(timeout)
  }, [inlineFeedback])

  async function handleCreateVehicle() {
    if (!name.trim()) {
      toast.error('Informe o nome do veículo.')
      return
    }

    try {
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
      setIsCreateModalOpen(false)
      setSelectedVehicleId(created.id)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veículo cadastrado com sucesso!')
    } catch {
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

      setPartName('')
      setPartCategoryId(expenseCategories[0]?.id ?? '')
      setPartBrand('')
      setPartQuantity('1')
      setPartTotalCost('0')
      setPartInstalledAt(new Date().toISOString().slice(0, 10))
      setPartInstalledOdometer('')
      setPartLifetimeKm('')
      setPartNextReplacementOdometer('')
      setPartNotes('')
      setIsCreatePartModalOpen(false)

      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })

      setInlineFeedback('Peça salva e sincronizada no financeiro.')
      toast.success('Peça cadastrada e vinculada ao financeiro!')
    } catch {
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
        if (typeof reader.result !== 'string') {
          return
        }

        await updateVehicle({
          vehicleId: selectedVehicleId,
          photoUrl: reader.result,
        })

        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
        queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
        setInlineFeedback('Dados do veículo sincronizados com sucesso.')
        toast.success('Foto do veículo atualizada!')
      } catch {
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
      await updateVehicle({
        vehicleId: selectedVehicleId,
        currentOdometer: odometer,
      })

      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedVehicleId] })
      setPartInstalledOdometer(odometer.toFixed(1))
      setInlineFeedback('Odômetro atualizado e pronto para usar em manutenção/abastecimento.')
      toast.success('Odômetro atualizado com sucesso!')
    } catch {
      toast.error('Não foi possível atualizar o odômetro.')
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
        onClose={() => setIsCreateModalOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleCreateVehicle()
          }}
        >
          <Input name="name" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
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
              className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-gray-200 file:bg-gray-50 file:text-gray-700"
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

          <Button type="submit" className="w-full" isLoading={isCreatingVehicle}>Cadastrar veículo</Button>
        </form>
      </Modal>

      <Modal
        title="Nova peça / troca"
        open={isCreatePartModalOpen}
        onClose={() => setIsCreatePartModalOpen(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            handleCreatePart()
          }}
        >
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

          <Select
            placeholder="Categoria de despesa"
            value={partCategoryId}
            onChange={setPartCategoryId}
            options={expenseCategories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />

          <Input name="partName" placeholder="Nome da peça" value={partName} onChange={(e) => setPartName(e.target.value)} />
          <Input name="partBrand" placeholder="Marca (opcional)" value={partBrand} onChange={(e) => setPartBrand(e.target.value)} />
          <Input type="number" step="0.01" name="partQuantity" placeholder="Quantidade" value={partQuantity} onChange={(e) => setPartQuantity(e.target.value)} />
          <Input type="number" step="0.01" name="partTotalCost" placeholder="Custo total" value={partTotalCost} onChange={(e) => setPartTotalCost(e.target.value)} />
          <Input type="date" name="partInstalledAt" value={partInstalledAt} onChange={(e) => setPartInstalledAt(e.target.value)} />
          <Input type="number" step="0.1" name="partInstalledOdometer" placeholder="Km da instalação (opcional)" value={partInstalledOdometer} onChange={(e) => setPartInstalledOdometer(e.target.value)} />
          <Input type="number" step="1" name="partLifetimeKm" placeholder="Vida útil esperada em km (opcional)" value={partLifetimeKm} onChange={(e) => setPartLifetimeKm(e.target.value)} />
          <Input type="number" step="1" name="partNextReplacementOdometer" placeholder="Próxima troca em km (opcional)" value={partNextReplacementOdometer} onChange={(e) => setPartNextReplacementOdometer(e.target.value)} />
          <Input name="partNotes" placeholder="Observações (opcional)" value={partNotes} onChange={(e) => setPartNotes(e.target.value)} />

          <Button type="submit" className="w-full" isLoading={isCreatingPart}>Salvar peça</Button>
        </form>
      </Modal>

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Logo className="h-6 text-teal-900" />
          <p className="text-sm text-gray-600 mt-2">Controle seus custos de combustível, média e custo por km.</p>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <Button type="button" className="h-10 px-4 rounded-xl w-full sm:w-auto" onClick={() => setIsCreateModalOpen(true)}>
            Novo veículo
          </Button>
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
            <strong className="text-gray-900">Meus veículos</strong>

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
                      {vehicle.photoUrl && (
                        <img src={vehicle.photoUrl} alt={vehicle.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                      )}
                      <strong className="text-gray-800 block truncate">{vehicle.name}</strong>
                    </div>

                    {selectedVehicleId === vehicle.id && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-teal-100 text-teal-800 font-semibold">
                        Ativo
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-gray-600 block mt-1">{vehicle.model || 'Sem modelo'}</span>

                  <div className="grid grid-cols-3 gap-2 mt-2">
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

                    <div className="rounded-lg bg-white border border-gray-200 px-2 py-1">
                      <span className="text-[10px] text-gray-500 block">Gasto mês</span>
                      <strong className="text-[11px] text-gray-800">
                        {formatCurrency(monthlySpentByVehicleId.get(vehicle.id) ?? 0)}
                      </strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between text-left"
                  onClick={() => setMobileOpenSection((state) => (state === 'OVERVIEW' ? 'TIMELINE' : 'OVERVIEW'))}
                >
                  <strong className="text-gray-900">Resumo do veículo</strong>
                  <span className="text-xs text-gray-500">
                    {mobileOpenSection === 'OVERVIEW' ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>

                <div className={`${mobileOpenSection === 'OVERVIEW' ? 'block' : 'hidden'} lg:block space-y-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {selectedVehicle.photoUrl && (
                        <img src={selectedVehicle.photoUrl} alt={selectedVehicle.name} className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                      )}

                      <div>
                        <strong className="text-xl text-gray-900 block">{selectedVehicle.name}</strong>
                        <p className="text-sm text-gray-600">
                          {selectedVehicle.model || 'Modelo não informado'} {selectedVehicle.plate ? `• ${selectedVehicle.plate}` : ''}
                        </p>
                      </div>
                    </div>

                    <Button type="button" className="h-9 px-3 rounded-xl" onClick={() => setIsCreatePartModalOpen(true)}>
                      Cadastrar peça
                    </Button>
                  </div>

                  {inlineFeedback && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      {inlineFeedback}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 block mb-1">Odômetro atual consolidado</label>
                        <Input
                          type="number"
                          step="0.1"
                          name="currentOdometerInput"
                          placeholder="Ex.: 52340.5"
                          value={currentOdometerInput}
                          onChange={(e) => setCurrentOdometerInput(e.target.value)}
                        />
                        <span className="text-[11px] text-gray-500 block mt-1">
                          Esse valor é usado como referência rápida em manutenção e abastecimento.
                        </span>
                      </div>

                      <Button
                        type="button"
                        className="h-9 px-3 rounded-xl w-full sm:w-auto"
                        isLoading={isUpdatingVehicle}
                        onClick={handleUpdateCurrentOdometer}
                      >
                        Salvar odômetro
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSelectVehiclePhoto}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="text-sm text-gray-800 block">
                          {selectedVehicle.photoUrl ? 'Foto do veículo' : 'Adicione a foto do veículo'}
                        </strong>
                        <span className="text-xs text-gray-600 block mt-1">
                          {selectedVehicle.photoUrl
                            ? 'Você pode trocar a imagem quando quiser.'
                            : 'Selecione uma imagem para personalizar este veículo.'}
                        </span>
                      </div>

                      <Button
                        type="button"
                        className="h-9 px-3 rounded-xl w-full sm:w-auto"
                        isLoading={isUpdatingVehicle}
                        onClick={() => photoInputRef.current?.click()}
                      >
                        {selectedVehicle.photoUrl ? 'Trocar imagem' : 'Selecionar imagem'}
                      </Button>
                    </div>

                    {!selectedVehicle.photoUrl && (
                      <div className="mt-3 h-24 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-xs text-gray-500">
                        Nenhuma imagem cadastrada
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <span className="text-xs text-gray-600 block">Consumo médio</span>
                      <strong className="text-gray-900">
                        {selectedVehicle.fuelStats?.averageConsumptionKmPerLiter
                          ? `${selectedVehicle.fuelStats.averageConsumptionKmPerLiter.toFixed(2)} km/L`
                          : '-'}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <span className="text-xs text-gray-600 block">Custo por km</span>
                      <strong className="text-gray-900">
                        {selectedVehicle.fuelStats?.costPerKm ? formatCurrency(selectedVehicle.fuelStats.costPerKm) : '-'}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <span className="text-xs text-gray-600 block">Gasto no mês</span>
                      <strong className="text-gray-900">{formatCurrency(selectedVehicleMonthlySpent)}</strong>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <span className="text-xs text-gray-600 block">Peças cadastradas</span>
                      <strong className="text-gray-900">{selectedVehicle.parts.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between text-left"
                  onClick={() => setMobileOpenSection((state) => (state === 'TIMELINE' ? 'OVERVIEW' : 'TIMELINE'))}
                >
                  <strong className="text-gray-900">Timeline unificada</strong>
                  <span className="text-xs text-gray-500">
                    {mobileOpenSection === 'TIMELINE' ? 'Ocultar' : 'Mostrar'}
                  </span>
                </button>

                <div className={`${mobileOpenSection === 'TIMELINE' ? 'block' : 'hidden'} lg:block space-y-3`}>
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
                        onClick={() => setTimelineFilter(filter.value)}
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

                  {filteredTimelineItems.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-600 space-y-3">
                      <p>Ainda não há itens para este filtro.</p>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to="/"
                          className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cadastrar primeiro abastecimento
                        </Link>

                        <Button type="button" className="h-8 px-3 rounded-lg text-xs" onClick={() => setIsCreatePartModalOpen(true)}>
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

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredTimelineItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
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
                            <p className="text-xs text-gray-600 mt-1">{item.subtitle}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                          </div>

                          <div className="text-right">
                            <strong className="text-gray-900 block">{formatCurrency(item.amount)}</strong>
                            <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
