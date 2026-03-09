import { Dispatch, SetStateAction } from 'react'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { InputCurrency } from '../../../components/InputCurrency'
import { Modal } from '../../../components/Modal'
import { Select } from '../../../components/Select'
import { SavingsBoxYieldMode } from '../../../../app/entities/SavingsBox'

interface SavingsBoxConfigModalsProps {
  isGoalModalOpen: boolean
  setIsGoalModalOpen: Dispatch<SetStateAction<boolean>>
  isRecurrenceModalOpen: boolean
  setIsRecurrenceModalOpen: Dispatch<SetStateAction<boolean>>
  isYieldModalOpen: boolean
  setIsYieldModalOpen: Dispatch<SetStateAction<boolean>>
  goalAmount: string
  setGoalAmount: Dispatch<SetStateAction<string>>
  goalDate: string
  setGoalDate: Dispatch<SetStateAction<string>>
  goalAlertsEnabled: boolean
  setGoalAlertsEnabled: Dispatch<SetStateAction<boolean>>
  recurrenceEnabled: boolean
  setRecurrenceEnabled: Dispatch<SetStateAction<boolean>>
  recurrenceDay: string
  setRecurrenceDay: Dispatch<SetStateAction<string>>
  recurrenceAmount: string
  setRecurrenceAmount: Dispatch<SetStateAction<string>>
  yieldMode: SavingsBoxYieldMode | ''
  setYieldMode: Dispatch<SetStateAction<SavingsBoxYieldMode | ''>>
  yieldRate: string
  setYieldRate: Dispatch<SetStateAction<string>>
  yieldRunYear: number
  setYieldRunYear: Dispatch<SetStateAction<number>>
  yieldRunMonth: number
  setYieldRunMonth: Dispatch<SetStateAction<number>>
  isSavingGoal: boolean
  isSavingRecurrence: boolean
  isRunningRecurrence: boolean
  isSavingYield: boolean
  isRunningMonthlyYield: boolean
  handleSaveGoal: () => void
  handleSaveRecurrence: () => void
  handleRunRecurrenceNow: () => void
  handleSaveYield: () => void
  handleRunMonthlyYield: () => void
}

export function SavingsBoxConfigModals({
  isGoalModalOpen,
  setIsGoalModalOpen,
  isRecurrenceModalOpen,
  setIsRecurrenceModalOpen,
  isYieldModalOpen,
  setIsYieldModalOpen,
  goalAmount,
  setGoalAmount,
  goalDate,
  setGoalDate,
  goalAlertsEnabled,
  setGoalAlertsEnabled,
  recurrenceEnabled,
  setRecurrenceEnabled,
  recurrenceDay,
  setRecurrenceDay,
  recurrenceAmount,
  setRecurrenceAmount,
  yieldMode,
  setYieldMode,
  yieldRate,
  setYieldRate,
  yieldRunYear,
  setYieldRunYear,
  yieldRunMonth,
  setYieldRunMonth,
  isSavingGoal,
  isSavingRecurrence,
  isRunningRecurrence,
  isSavingYield,
  isRunningMonthlyYield,
  handleSaveGoal,
  handleSaveRecurrence,
  handleRunRecurrenceNow,
  handleSaveYield,
  handleRunMonthlyYield,
}: SavingsBoxConfigModalsProps) {
  return (
    <>
      <Modal
        title="Meta da Caixinha"
        open={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSaveGoal()
          }}
        >
          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs">Valor da meta</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
              <InputCurrency
                value={goalAmount}
                onChange={(value) => setGoalAmount(value ?? '')}
                className="text-teal-900"
              />
            </div>
          </div>

          <Input
            name="goalDate"
            type="date"
            placeholder="Data alvo"
            value={goalDate}
            onChange={(e) => setGoalDate(e.target.value)}
          />

          <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-3">
            <span className="text-sm text-gray-700">Alertas da meta</span>
            <input
              type="checkbox"
              checked={goalAlertsEnabled}
              onChange={(e) => setGoalAlertsEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-900"
            />
          </label>

          <Button type="submit" className="w-full" isLoading={isSavingGoal}>
            Salvar meta
          </Button>
        </form>
      </Modal>

      <Modal
        title="Recorrencia"
        open={isRecurrenceModalOpen}
        onClose={() => setIsRecurrenceModalOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSaveRecurrence()
          }}
        >
          <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-3">
            <span className="text-sm text-gray-700">Recorrencia ativa</span>
            <input
              type="checkbox"
              checked={recurrenceEnabled}
              onChange={(e) => setRecurrenceEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-900"
            />
          </label>

          <Input
            name="recurrenceDay"
            type="number"
            min={1}
            max={31}
            placeholder="Dia do aporte"
            value={recurrenceDay}
            onChange={(e) => setRecurrenceDay(e.target.value)}
          />

          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs">Valor recorrente</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
              <InputCurrency
                value={recurrenceAmount}
                onChange={(value) => setRecurrenceAmount(value ?? '')}
                className="text-teal-900"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" isLoading={isSavingRecurrence}>
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              isLoading={isRunningRecurrence}
              onClick={handleRunRecurrenceNow}
            >
              Aplicar agora
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Rendimento"
        open={isYieldModalOpen}
        onClose={() => setIsYieldModalOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSaveYield()
          }}
        >
          <Select
            options={[
              { value: 'PERCENT', label: 'Percentual (%)' },
              { value: 'FIXED', label: 'Valor fixo (R$)' },
            ]}
            value={yieldMode}
            onChange={(value) => setYieldMode(value as SavingsBoxYieldMode)}
            placeholder="Modo de rendimento"
          />

          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs">
              {yieldMode === 'PERCENT' ? 'Rendimento mensal (%)' : 'Rendimento mensal'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">
                {yieldMode === 'PERCENT' ? '%' : 'R$'}
              </span>
              <InputCurrency
                value={yieldRate}
                onChange={(value) => setYieldRate(value ?? '')}
                className="text-teal-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              name="yieldRunYear"
              type="number"
              placeholder="Ano"
              value={String(yieldRunYear)}
              onChange={(e) => setYieldRunYear(Number(e.target.value) || new Date().getFullYear())}
            />
            <Input
              name="yieldRunMonth"
              type="number"
              min={1}
              max={12}
              placeholder="Mes"
              value={String(yieldRunMonth)}
              onChange={(e) => setYieldRunMonth(Number(e.target.value) || 1)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" isLoading={isSavingYield}>
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              isLoading={isRunningMonthlyYield}
              onClick={handleRunMonthlyYield}
            >
              Aplicar mes
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
