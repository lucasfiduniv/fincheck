import { Button } from '../../../components/Button'
import { Input } from '../../../components/Input'
import { SavingsBoxesAnnualPlanning } from '../../../../app/entities/SavingsBox'
import { formatCurrency } from '../../../../app/utils/formatCurrency'

interface PlanningSummary {
  totalPlannedContribution: number
  totalPlannedYield: number
  totalProjectedEndOfYear: number
}

interface SavingsBoxAnnualPlanningSectionProps {
  planningYear: number
  setPlanningYear: (value: number | ((current: number) => number)) => void
  isPlanningExpanded: boolean
  setIsPlanningExpanded: (value: boolean | ((current: boolean) => boolean)) => void
  planningSummary: PlanningSummary
  isLoadingPlanning: boolean
  annualPlanning?: SavingsBoxesAnnualPlanning
}

export function SavingsBoxAnnualPlanningSection({
  planningYear,
  setPlanningYear,
  isPlanningExpanded,
  setIsPlanningExpanded,
  planningSummary,
  isLoadingPlanning,
  annualPlanning,
}: SavingsBoxAnnualPlanningSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <strong className="text-gray-900">Planejamento anual</strong>

        <div className="flex gap-2">
          <Input
            name="planningYear"
            type="number"
            placeholder="Ano"
            value={String(planningYear)}
            onChange={(e) => setPlanningYear(Number(e.target.value) || new Date().getFullYear())}
            className="w-full sm:max-w-[140px]"
          />
          <Button
            type="button"
            variant="ghost"
            className="h-[52px] px-3 rounded-lg"
            onClick={() => setIsPlanningExpanded((state) => !state)}
          >
            {isPlanningExpanded ? 'Ocultar' : 'Ver planejamento'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="text-xs text-gray-600 block">Aporte previsto no ano</span>
          <strong className="text-sm text-gray-900">{formatCurrency(planningSummary.totalPlannedContribution)}</strong>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="text-xs text-gray-600 block">Rendimento previsto</span>
          <strong className="text-sm text-gray-900">{formatCurrency(planningSummary.totalPlannedYield)}</strong>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="text-xs text-gray-600 block">Saldo fim de ano</span>
          <strong className="text-sm text-gray-900">{formatCurrency(planningSummary.totalProjectedEndOfYear)}</strong>
        </div>
      </div>

      {!isPlanningExpanded && (
        <p className="text-sm text-gray-600">
          Abra o planejamento para ver a grade mensal completa.
        </p>
      )}

      {isPlanningExpanded && (
        <>
          {isLoadingPlanning && <p className="text-sm text-gray-600">Carregando planejamento...</p>}

          {!isLoadingPlanning && annualPlanning?.planning.length === 0 && (
            <p className="text-sm text-gray-600">Sem caixinhas para planejar neste ano.</p>
          )}

          {!isLoadingPlanning && annualPlanning?.planning.map((plan) => (
            <div key={plan.savingsBoxId} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <strong className="text-gray-800">{plan.name}</strong>
                <span className="text-sm text-gray-600">Fim do ano: {formatCurrency(plan.projectedEndOfYearBalance)}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {plan.months.map((month) => (
                  <div key={`${plan.savingsBoxId}-${month.month}`} className="rounded-lg bg-gray-50 p-2 text-xs">
                    <p className="text-gray-600">Mes {month.month + 1}</p>
                    <p className="text-gray-700">+{formatCurrency(month.plannedContribution)}</p>
                    <p className="text-gray-700">R {formatCurrency(month.plannedYield)}</p>
                    <p className="font-medium text-gray-800">{formatCurrency(month.projectedBalance)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
