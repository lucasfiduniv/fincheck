import { Dispatch, SetStateAction } from 'react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { Modal } from '../../../components/Modal'
import { Select } from '../../../components/Select'

type Option = {
  value: string
  label: string
}

interface VehicleQuickActionModalsProps {
  isQuickFuelModalOpen: boolean
  setIsQuickFuelModalOpen: Dispatch<SetStateAction<boolean>>
  isQuickMaintenanceModalOpen: boolean
  setIsQuickMaintenanceModalOpen: Dispatch<SetStateAction<boolean>>
  quickFuelLiters: string
  quickFuelPricePerLiter: string
  quickFuelBankAccountId: string
  setQuickFuelBankAccountId: Dispatch<SetStateAction<string>>
  quickFuelCategoryId: string
  setQuickFuelCategoryId: Dispatch<SetStateAction<string>>
  quickFuelOdometer: string
  setQuickFuelOdometer: Dispatch<SetStateAction<string>>
  quickFuelDate: string
  setQuickFuelDate: Dispatch<SetStateAction<string>>
  quickFuelFillType: 'FULL' | 'PARTIAL'
  setQuickFuelFillType: Dispatch<SetStateAction<'FULL' | 'PARTIAL'>>
  quickFuelFirstPumpClick: boolean
  setQuickFuelFirstPumpClick: Dispatch<SetStateAction<boolean>>
  setQuickFuelLiters: Dispatch<SetStateAction<string>>
  setQuickFuelPricePerLiter: Dispatch<SetStateAction<string>>
  handleQuickFuelAction: () => void
  quickMaintenanceTitle: string
  quickMaintenanceAmount: string
  quickMaintenanceBankAccountId: string
  setQuickMaintenanceBankAccountId: Dispatch<SetStateAction<string>>
  quickMaintenanceCategoryId: string
  setQuickMaintenanceCategoryId: Dispatch<SetStateAction<string>>
  quickMaintenanceOdometer: string
  setQuickMaintenanceOdometer: Dispatch<SetStateAction<string>>
  quickMaintenanceDate: string
  setQuickMaintenanceDate: Dispatch<SetStateAction<string>>
  setQuickMaintenanceTitle: Dispatch<SetStateAction<string>>
  setQuickMaintenanceAmount: Dispatch<SetStateAction<string>>
  handleQuickMaintenanceAction: () => void
  isCreatingQuickAction: boolean
  accountOptions: Option[]
  expenseCategoryOptions: Option[]
  trackVehicleEvent: (eventName: string, metadata?: Record<string, unknown>) => Promise<void>
}

export function VehicleQuickActionModals({
  isQuickFuelModalOpen,
  setIsQuickFuelModalOpen,
  isQuickMaintenanceModalOpen,
  setIsQuickMaintenanceModalOpen,
  quickFuelLiters,
  quickFuelPricePerLiter,
  quickFuelBankAccountId,
  setQuickFuelBankAccountId,
  quickFuelCategoryId,
  setQuickFuelCategoryId,
  quickFuelOdometer,
  setQuickFuelOdometer,
  quickFuelDate,
  setQuickFuelDate,
  quickFuelFillType,
  setQuickFuelFillType,
  quickFuelFirstPumpClick,
  setQuickFuelFirstPumpClick,
  setQuickFuelLiters,
  setQuickFuelPricePerLiter,
  handleQuickFuelAction,
  quickMaintenanceTitle,
  quickMaintenanceAmount,
  quickMaintenanceBankAccountId,
  setQuickMaintenanceBankAccountId,
  quickMaintenanceCategoryId,
  setQuickMaintenanceCategoryId,
  quickMaintenanceOdometer,
  setQuickMaintenanceOdometer,
  quickMaintenanceDate,
  setQuickMaintenanceDate,
  setQuickMaintenanceTitle,
  setQuickMaintenanceAmount,
  handleQuickMaintenanceAction,
  isCreatingQuickAction,
  accountOptions,
  expenseCategoryOptions,
  trackVehicleEvent,
}: VehicleQuickActionModalsProps) {
  return (
    <>
      <Modal
        title="Abastecimento rapido"
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
          <Select placeholder="Conta" value={quickFuelBankAccountId} onChange={setQuickFuelBankAccountId} options={accountOptions} />
          <Select placeholder="Categoria" value={quickFuelCategoryId} onChange={setQuickFuelCategoryId} options={expenseCategoryOptions} />
          <Input type="number" step="0.01" name="quickFuelLiters" placeholder="Litros" value={quickFuelLiters} onChange={(e) => setQuickFuelLiters(e.target.value)} />
          <Input type="number" step="0.01" name="quickFuelPricePerLiter" placeholder="Preco por litro" value={quickFuelPricePerLiter} onChange={(e) => setQuickFuelPricePerLiter(e.target.value)} />
          <Input type="number" step="0.1" name="quickFuelOdometer" placeholder="Odometro" value={quickFuelOdometer} onChange={(e) => setQuickFuelOdometer(e.target.value)} />

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
        title="Manutencao rapida"
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
          <Select placeholder="Conta" value={quickMaintenanceBankAccountId} onChange={setQuickMaintenanceBankAccountId} options={accountOptions} />
          <Select placeholder="Categoria" value={quickMaintenanceCategoryId} onChange={setQuickMaintenanceCategoryId} options={expenseCategoryOptions} />
          <Input name="quickMaintenanceTitle" placeholder="Titulo da manutencao" value={quickMaintenanceTitle} onChange={(e) => setQuickMaintenanceTitle(e.target.value)} />
          <Input type="number" step="0.01" name="quickMaintenanceAmount" placeholder="Valor" value={quickMaintenanceAmount} onChange={(e) => setQuickMaintenanceAmount(e.target.value)} />
          <Input type="number" step="0.1" name="quickMaintenanceOdometer" placeholder="Odometro (opcional)" value={quickMaintenanceOdometer} onChange={(e) => setQuickMaintenanceOdometer(e.target.value)} />
          <Input type="date" name="quickMaintenanceDate" value={quickMaintenanceDate} onChange={(e) => setQuickMaintenanceDate(e.target.value)} />

          <Button type="submit" className="w-full" isLoading={isCreatingQuickAction}>Salvar manutencao</Button>
        </form>
      </Modal>
    </>
  )
}
