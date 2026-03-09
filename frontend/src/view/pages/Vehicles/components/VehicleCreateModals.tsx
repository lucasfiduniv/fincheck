import { Link } from 'react-router-dom'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { Select } from '../../../components/Select'

interface Option {
  value: string
  label: string
}

interface AccountOption {
  id: string
  name: string
}

interface CategoryOption {
  id: string
  name: string
}

interface VehicleCreateModalsProps {
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (value: boolean) => void
  name: string
  model: string
  plate: string
  setName: (value: string) => void
  setModel: (value: string) => void
  setPlate: (value: string) => void
  showCreateVehicleOptionalFields: boolean
  setShowCreateVehicleOptionalFields: (updater: (state: boolean) => boolean) => void
  currentOdometer: string
  setCurrentOdometer: (value: string) => void
  photoUrl: string
  setPhotoUrl: (value: string) => void
  fuelType: string
  setFuelType: (value: string) => void
  fuelTypeOptions: Option[]
  isCreatingVehicle: boolean
  onCreateVehicle: () => void
  onTrackVehicleEvent: (eventName: string, metadata?: Record<string, unknown>) => void

  isCreatePartModalOpen: boolean
  setIsCreatePartModalOpen: (value: boolean) => void
  partName: string
  partTotalCost: string
  setPartName: (value: string) => void
  setPartTotalCost: (value: string) => void
  partBankAccountId: string
  setPartBankAccountId: (value: string) => void
  partInstalledAt: string
  setPartInstalledAt: (value: string) => void
  showCreatePartOptionalFields: boolean
  setShowCreatePartOptionalFields: (updater: (state: boolean) => boolean) => void
  partCategoryId: string
  setPartCategoryId: (value: string) => void
  partBrand: string
  setPartBrand: (value: string) => void
  partQuantity: string
  setPartQuantity: (value: string) => void
  partInstalledOdometer: string
  setPartInstalledOdometer: (value: string) => void
  partLifetimeKm: string
  setPartLifetimeKm: (value: string) => void
  partNextReplacementOdometer: string
  setPartNextReplacementOdometer: (value: string) => void
  partNotes: string
  setPartNotes: (value: string) => void
  accounts: AccountOption[]
  expenseCategories: CategoryOption[]
  isCreatingPart: boolean
  onCreatePart: () => void
}

export function VehicleCreateModals({
  isCreateModalOpen,
  setIsCreateModalOpen,
  name,
  model,
  plate,
  setName,
  setModel,
  setPlate,
  showCreateVehicleOptionalFields,
  setShowCreateVehicleOptionalFields,
  currentOdometer,
  setCurrentOdometer,
  photoUrl,
  setPhotoUrl,
  fuelType,
  setFuelType,
  fuelTypeOptions,
  isCreatingVehicle,
  onCreateVehicle,
  onTrackVehicleEvent,
  isCreatePartModalOpen,
  setIsCreatePartModalOpen,
  partName,
  partTotalCost,
  setPartName,
  setPartTotalCost,
  partBankAccountId,
  setPartBankAccountId,
  partInstalledAt,
  setPartInstalledAt,
  showCreatePartOptionalFields,
  setShowCreatePartOptionalFields,
  partCategoryId,
  setPartCategoryId,
  partBrand,
  setPartBrand,
  partQuantity,
  setPartQuantity,
  partInstalledOdometer,
  setPartInstalledOdometer,
  partLifetimeKm,
  setPartLifetimeKm,
  partNextReplacementOdometer,
  setPartNextReplacementOdometer,
  partNotes,
  setPartNotes,
  accounts,
  expenseCategories,
  isCreatingPart,
  onCreatePart,
}: VehicleCreateModalsProps) {
  return (
    <>
      <Modal
        title="Novo Veículo"
        open={isCreateModalOpen}
        onClose={() => {
          if (name || model || plate) {
            onTrackVehicleEvent('create_vehicle_abandoned', { hasName: !!name, hasModel: !!model, hasPlate: !!plate })
          }
          setIsCreateModalOpen(false)
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            onCreateVehicle()
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
            onTrackVehicleEvent('create_part_abandoned', { hasName: !!partName, hasCost: !!partTotalCost })
          }
          setIsCreatePartModalOpen(false)
        }}
      >
        <form
          className="flex h-full max-h-[calc(90vh-180px)] flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            onCreatePart()
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
    </>
  )
}
