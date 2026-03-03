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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`summary-2-${index}`} className="rounded-xl bg-gray-50 p-3 space-y-2">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-5 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={`section-${sectionIndex}`} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 animate-pulse">
          <div className="h-5 w-44 rounded bg-gray-200" />

          <div className="space-y-2">
            {Array.from({ length: 3 }).map((__, rowIndex) => (
              <div key={`row-${sectionIndex}-${rowIndex}`} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
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

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesService.getAll,
  })

  const { data: selectedVehicle, isFetching: isLoadingVehicle } = useQuery({
    queryKey: ['vehicles', selectedVehicleId],
    queryFn: () => vehiclesService.getById(selectedVehicleId!),
    enabled: !!selectedVehicleId,
  })

  const { mutateAsync: createVehicle, isLoading: isCreatingVehicle } = useMutation(
    vehiclesService.create,
  )

  const { accounts } = useBankAccounts()
  const { categories } = useCategories()

  const { mutateAsync: createPart, isLoading: isCreatingPart } = useMutation(
    vehiclesService.createPart,
  )

  const { mutateAsync: updateVehicle, isLoading: isUpdatingVehicle } = useMutation(
    vehiclesService.update,
  )

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
        fuelType: fuelType as 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID',
      })

      setName('')
      setModel('')
      setPlate('')
      setPhotoUrl('')
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
        toast.success('Foto do veículo atualizada!')
      } catch {
        toast.error('Não foi possível atualizar a foto do veículo.')
      } finally {
        event.target.value = ''
      }
    }

    reader.readAsDataURL(file)
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
                  className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${selectedVehicleId === vehicle.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2">
                    {vehicle.photoUrl && (
                      <img src={vehicle.photoUrl} alt={vehicle.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                    )}
                    <strong className="text-gray-800 block">{vehicle.name}</strong>
                  </div>
                  <span className="text-xs text-gray-600 block">{vehicle.model || 'Sem modelo'}</span>
                  <span className="text-xs text-gray-600 block mt-1">
                    Média: {vehicle.fuelStats?.averageConsumptionKmPerLiter ? `${vehicle.fuelStats.averageConsumptionKmPerLiter.toFixed(2)} km/L` : '—'}
                  </span>
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
            </div>
          )}

          {selectedVehicleId && !selectedVehicle && <VehicleDetailsSkeleton />}

          {selectedVehicle && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {selectedVehicle.photoUrl && (
                      <img src={selectedVehicle.photoUrl} alt={selectedVehicle.name} className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                    )}

                    <div>
                    <strong className="text-xl text-gray-900 block">{selectedVehicle.name}</strong>
                    <p className="text-sm text-gray-600">{selectedVehicle.model || 'Modelo não informado'} {selectedVehicle.plate ? `• ${selectedVehicle.plate}` : ''}</p>
                    </div>
                  </div>

                  <Button type="button" className="h-9 px-3 rounded-xl" onClick={() => setIsCreatePartModalOpen(true)}>
                    Cadastrar peça
                  </Button>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Consumo médio</span>
                    <strong className="text-gray-900">{selectedVehicle.fuelStats?.averageConsumptionKmPerLiter ? `${selectedVehicle.fuelStats.averageConsumptionKmPerLiter.toFixed(2)} km/L` : '-'}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Custo por km</span>
                    <strong className="text-gray-900">{selectedVehicle.fuelStats?.costPerKm ? formatCurrency(selectedVehicle.fuelStats.costPerKm) : '-'}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Preço médio/litro</span>
                    <strong className="text-gray-900">{selectedVehicle.fuelStats?.averagePricePerLiter ? formatCurrency(selectedVehicle.fuelStats.averagePricePerLiter) : '-'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Manutenções</span>
                    <strong className="text-gray-900">{selectedVehicle.maintenances.length}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Total manutenção</span>
                    <strong className="text-gray-900">{formatCurrency(selectedVehicle.maintenances.reduce((acc, item) => acc + item.amount, 0))}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Peças cadastradas</span>
                    <strong className="text-gray-900">{selectedVehicle.parts.length}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <strong className="text-gray-900">Histórico de manutenção</strong>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {selectedVehicle.maintenances.length === 0 && (
                    <p className="text-sm text-gray-600">Ainda sem manutenções vinculadas a este veículo.</p>
                  )}

                  {selectedVehicle.maintenances.map((maintenance) => (
                    <div key={maintenance.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-gray-800">{maintenance.title}</strong>
                        <strong className="text-gray-900">{formatCurrency(maintenance.amount)}</strong>
                      </div>
                      <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                        <span>{formatDate(maintenance.date)}</span>
                        <span>•</span>
                        <span>{maintenance.source === 'ACCOUNT' ? 'Conta' : 'Cartão'}: {maintenance.sourceLabel}</span>
                        {maintenance.odometer !== null && maintenance.odometer !== undefined && (
                          <>
                            <span>•</span>
                            <span>Km: {maintenance.odometer.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900">Histórico de abastecimento</strong>
                  {isLoadingVehicle && <span className="h-3 w-20 rounded bg-gray-200 animate-pulse" />}
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {selectedVehicle.fuelRecords.length === 0 && (
                    <p className="text-sm text-gray-600">Ainda sem abastecimentos registrados.</p>
                  )}

                  {selectedVehicle.fuelRecords.map((record) => (
                    <div key={record.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-gray-800">{formatDate(record.transaction.date)}</strong>
                        <span className="text-gray-600">Odômetro: {record.odometer.toFixed(1)} km</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-gray-700">
                        <span>Litros: {record.liters.toFixed(2)} L</span>
                        <span>R$/L: {formatCurrency(record.pricePerLiter)}</span>
                        <span>Total: {formatCurrency(record.totalCost)}</span>
                        <span>Lançamento: {record.transaction.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <strong className="text-gray-900">Peças e trocas</strong>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {selectedVehicle.parts.length === 0 && (
                    <p className="text-sm text-gray-600">Ainda sem peças cadastradas.</p>
                  )}

                  {selectedVehicle.parts.map((part) => (
                    <div key={part.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-gray-800">{part.name}</strong>
                        <strong className="text-gray-900">{formatCurrency(part.totalCost)}</strong>
                      </div>

                      <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                        <span>{part.brand || 'Sem marca'}</span>
                        <span>•</span>
                        <span>Qtd: {part.quantity}</span>
                        <span>•</span>
                        <span>Instalado em {formatDate(part.installedAt)}</span>
                      </div>

                      <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                        {part.installedOdometer !== null && (
                          <span>Km instalação: {part.installedOdometer.toFixed(1)}</span>
                        )}
                        {part.lifetimeKm !== null && (
                          <>
                            <span>•</span>
                            <span>Vida útil: {part.lifetimeKm.toFixed(0)} km</span>
                          </>
                        )}
                        {part.nextReplacementOdometer !== null && (
                          <>
                            <span>•</span>
                            <span>Próxima troca: {part.nextReplacementOdometer.toFixed(0)} km</span>
                          </>
                        )}
                      </div>

                      {part.notes && (
                        <p className="mt-2 text-xs text-gray-700">{part.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
