import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { savingsBoxesService } from '../../../app/services/savingsBoxesService'
import { toast } from 'react-hot-toast'
import { SavingsBoxYieldMode } from '../../../app/entities/SavingsBox'

function formatDate(date?: string | null) {
  if (!date) {
    return '-'
  }

  return new Date(date).toLocaleDateString('pt-BR')
}

function toISODate(value: string) {
  if (!value) {
    return undefined
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

export function SavingsBoxes() {
  const queryClient = useQueryClient()
  const [selectedSavingsBoxId, setSelectedSavingsBoxId] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTargetAmount, setCreateTargetAmount] = useState('')
  const [createTargetDate, setCreateTargetDate] = useState('')

  const [entryAmount, setEntryAmount] = useState('')
  const [entryDescription, setEntryDescription] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [entryType, setEntryType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT')

  const [goalAmount, setGoalAmount] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [goalAlertsEnabled, setGoalAlertsEnabled] = useState(true)

  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState('')
  const [recurrenceAmount, setRecurrenceAmount] = useState('')

  const [yieldMode, setYieldMode] = useState<SavingsBoxYieldMode | ''>('')
  const [yieldRate, setYieldRate] = useState('')

  const [planningYear, setPlanningYear] = useState(new Date().getFullYear())
  const [yieldRunYear, setYieldRunYear] = useState(new Date().getFullYear())
  const [yieldRunMonth, setYieldRunMonth] = useState(new Date().getMonth() + 1)

  const { data: summary, isLoading } = useQuery({
    queryKey: ['savingsBoxes', 'summary'],
    queryFn: savingsBoxesService.getAll,
  })

  const selectedBox = useMemo(
    () => summary?.savingsBoxes.find((box) => box.id === selectedSavingsBoxId) ?? null,
    [summary, selectedSavingsBoxId],
  )

  useEffect(() => {
    if (!summary?.savingsBoxes.length) {
      setSelectedSavingsBoxId(null)
      return
    }

    if (!selectedSavingsBoxId) {
      setSelectedSavingsBoxId(summary.savingsBoxes[0].id)
    }
  }, [summary, selectedSavingsBoxId])

  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['savingsBoxes', selectedSavingsBoxId],
    queryFn: () => savingsBoxesService.getById(selectedSavingsBoxId!),
    enabled: !!selectedSavingsBoxId,
  })

  const { data: annualPlanning, isLoading: isLoadingPlanning } = useQuery({
    queryKey: ['savingsBoxes', 'planning', planningYear],
    queryFn: () => savingsBoxesService.getAnnualPlanning(planningYear),
  })

  useEffect(() => {
    if (!details) {
      return
    }

    setGoalAmount(details.targetAmount ? String(details.targetAmount) : '')
    setGoalDate(details.targetDate ? details.targetDate.slice(0, 10) : '')
    setGoalAlertsEnabled(details.alertEnabled)

    setRecurrenceEnabled(details.recurrenceEnabled)
    setRecurrenceDay(details.recurrenceDay ? String(details.recurrenceDay) : '')
    setRecurrenceAmount(details.recurrenceAmount ? String(details.recurrenceAmount) : '')

    setYieldMode(details.yieldMode ?? '')
    setYieldRate(details.monthlyYieldRate ? String(details.monthlyYieldRate) : '')
  }, [details])

  const { mutateAsync: createSavingsBox, isLoading: isCreating } = useMutation(
    savingsBoxesService.create,
  )

  const { mutateAsync: createEntry, isLoading: isCreatingEntry } = useMutation(
    entryType === 'DEPOSIT'
      ? savingsBoxesService.deposit
      : savingsBoxesService.withdraw,
  )

  const { mutateAsync: setGoal, isLoading: isSavingGoal } = useMutation(
    savingsBoxesService.setGoal,
  )

  const { mutateAsync: setRecurrence, isLoading: isSavingRecurrence } = useMutation(
    savingsBoxesService.setRecurrence,
  )

  const { mutateAsync: runRecurrenceNow, isLoading: isRunningRecurrence } = useMutation(
    savingsBoxesService.runRecurrenceNow,
  )

  const { mutateAsync: setYield, isLoading: isSavingYield } = useMutation(
    savingsBoxesService.setYield,
  )

  const { mutateAsync: runMonthlyYield, isLoading: isRunningMonthlyYield } = useMutation(
    ({ year, month }: { year: number; month: number }) =>
      savingsBoxesService.runMonthlyYield(year, month),
  )

  function invalidateSavingsBoxesQueries() {
    queryClient.invalidateQueries({ queryKey: ['savingsBoxes'] })
  }

  async function handleCreateSavingsBox() {
    if (!createName.trim()) {
      toast.error('Informe o nome da caixinha.')
      return
    }

    try {
      await createSavingsBox({
        name: createName,
        description: createDescription || undefined,
        targetAmount: createTargetAmount ? Number(createTargetAmount) : undefined,
        targetDate: toISODate(createTargetDate),
      })

      setCreateName('')
      setCreateDescription('')
      setCreateTargetAmount('')
      setCreateTargetDate('')
      invalidateSavingsBoxesQueries()
      toast.success('Caixinha criada com sucesso!')
    } catch {
      toast.error('Não foi possível criar a caixinha.')
    }
  }

  async function handleCreateEntry() {
    if (!selectedBox) {
      return
    }

    if (!entryAmount || Number(entryAmount) <= 0) {
      toast.error('Informe um valor válido.')
      return
    }

    try {
      await createEntry({
        savingsBoxId: selectedBox.id,
        amount: Number(entryAmount),
        description: entryDescription || undefined,
        date: new Date(`${entryDate}T00:00:00.000Z`).toISOString(),
      })

      setEntryAmount('')
      setEntryDescription('')
      invalidateSavingsBoxesQueries()
      toast.success(entryType === 'DEPOSIT' ? 'Aporte realizado!' : 'Resgate realizado!')
    } catch {
      toast.error('Não foi possível concluir a movimentação.')
    }
  }

  async function handleSaveGoal() {
    if (!selectedBox) {
      return
    }

    try {
      await setGoal({
        savingsBoxId: selectedBox.id,
        targetAmount: goalAmount ? Number(goalAmount) : undefined,
        targetDate: toISODate(goalDate),
        alertEnabled: goalAlertsEnabled,
      })

      invalidateSavingsBoxesQueries()
      toast.success('Meta atualizada com sucesso!')
    } catch {
      toast.error('Erro ao atualizar meta.')
    }
  }

  async function handleSaveRecurrence() {
    if (!selectedBox) {
      return
    }

    try {
      await setRecurrence({
        savingsBoxId: selectedBox.id,
        recurrenceEnabled,
        recurrenceDay: recurrenceDay ? Number(recurrenceDay) : undefined,
        recurrenceAmount: recurrenceAmount ? Number(recurrenceAmount) : undefined,
      })

      invalidateSavingsBoxesQueries()
      toast.success('Recorrência atualizada!')
    } catch {
      toast.error('Erro ao atualizar recorrência.')
    }
  }

  async function handleRunRecurrenceNow() {
    if (!selectedBox) {
      return
    }

    try {
      await runRecurrenceNow(selectedBox.id)
      invalidateSavingsBoxesQueries()
      toast.success('Execução de recorrência concluída!')
    } catch {
      toast.error('Falha na execução da recorrência.')
    }
  }

  async function handleSaveYield() {
    if (!selectedBox) {
      return
    }

    try {
      await setYield({
        savingsBoxId: selectedBox.id,
        yieldMode: yieldMode || undefined,
        monthlyYieldRate: yieldRate ? Number(yieldRate) : undefined,
      })

      invalidateSavingsBoxesQueries()
      toast.success('Configuração de rendimento atualizada!')
    } catch {
      toast.error('Erro ao atualizar rendimento.')
    }
  }

  async function handleRunMonthlyYield() {
    try {
      await runMonthlyYield({
        year: yieldRunYear,
        month: yieldRunMonth - 1,
      })
      invalidateSavingsBoxesQueries()
      toast.success('Rendimento mensal aplicado!')
    } catch {
      toast.error('Falha ao aplicar rendimento mensal.')
    }
  }

  return (
    <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 overflow-y-auto">
      <header className="h-12 flex items-center justify-between">
        <Logo className="h-6 text-teal-900" />

        <Link
          to="/"
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Voltar ao dashboard
        </Link>
      </header>

      <main className="mt-6 grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <strong className="text-gray-900 block">Nova caixinha</strong>
            <Input name="createName" placeholder="Nome" value={createName} onChange={(e) => setCreateName(e.target.value)} />
            <Input name="createDescription" placeholder="Descrição" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} />
            <Input name="createTargetAmount" type="number" step="0.01" placeholder="Meta (opcional)" value={createTargetAmount} onChange={(e) => setCreateTargetAmount(e.target.value)} />
            <Input name="createTargetDate" type="date" placeholder="Data alvo" value={createTargetDate} onChange={(e) => setCreateTargetDate(e.target.value)} />
            <Button type="button" onClick={handleCreateSavingsBox} isLoading={isCreating}>
              Criar caixinha
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <strong className="text-gray-900">Caixinhas</strong>
              <span className="text-sm text-gray-600">Total: {formatCurrency(summary?.totalBalance ?? 0)}</span>
            </div>

            {isLoading && <p className="text-sm text-gray-600">Carregando...</p>}
            {!isLoading && !summary?.savingsBoxes.length && (
              <p className="text-sm text-gray-600">Nenhuma caixinha cadastrada ainda.</p>
            )}

            {summary?.savingsBoxes.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => setSelectedSavingsBoxId(box.id)}
                className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${selectedSavingsBoxId === box.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <strong className="text-gray-800 block">{box.name}</strong>
                <span className="text-xs text-gray-600">Saldo: {formatCurrency(box.currentBalance)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {!selectedBox && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-600">
              Selecione uma caixinha para ver detalhes.
            </div>
          )}

          {selectedBox && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
                <strong className="text-xl text-gray-900 block">{selectedBox.name}</strong>
                <p className="text-sm text-gray-600">{selectedBox.description || 'Sem descrição'}</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-2">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Saldo atual</span>
                    <strong className="text-gray-900">{formatCurrency(selectedBox.currentBalance)}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Meta</span>
                    <strong className="text-gray-900">{selectedBox.targetAmount ? formatCurrency(selectedBox.targetAmount) : '-'}</strong>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <span className="text-xs text-gray-600 block">Data alvo</span>
                    <strong className="text-gray-900">{formatDate(selectedBox.targetDate)}</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <strong className="text-gray-900 block">MVP · Aportar / Resgatar</strong>

                  <Select
                    options={[
                      { value: 'DEPOSIT', label: 'Aportar' },
                      { value: 'WITHDRAW', label: 'Resgatar' },
                    ]}
                    value={entryType}
                    onChange={(value) => setEntryType(value as 'DEPOSIT' | 'WITHDRAW')}
                    placeholder="Tipo"
                  />

                  <Input name="entryAmount" type="number" step="0.01" placeholder="Valor" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} />
                  <Input name="entryDate" type="date" placeholder="Data" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                  <Input name="entryDescription" placeholder="Descrição" value={entryDescription} onChange={(e) => setEntryDescription(e.target.value)} />

                  <Button type="button" onClick={handleCreateEntry} isLoading={isCreatingEntry}>
                    Confirmar movimentação
                  </Button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <strong className="text-gray-900 block">V2 · Meta e alertas</strong>
                  <Input name="goalAmount" type="number" step="0.01" placeholder="Valor da meta" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} />
                  <Input name="goalDate" type="date" placeholder="Data alvo" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
                  <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
                    <span className="text-sm text-gray-700">Alertas da meta</span>
                    <input type="checkbox" checked={goalAlertsEnabled} onChange={(e) => setGoalAlertsEnabled(e.target.checked)} className="w-4 h-4 accent-teal-900" />
                  </label>
                  <Button type="button" onClick={handleSaveGoal} isLoading={isSavingGoal}>Salvar meta</Button>

                  {details && (
                    <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                      <p>Progresso: {details.progress.percentage.toFixed(2)}%</p>
                      <p>Faltante: {details.progress.remaining !== null ? formatCurrency(details.progress.remaining) : '-'}</p>
                      <p>Dias para meta: {details.progress.daysToTarget ?? '-'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <strong className="text-gray-900 block">V3 · Recorrência e projeção</strong>
                  <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
                    <span className="text-sm text-gray-700">Recorrência ativa</span>
                    <input type="checkbox" checked={recurrenceEnabled} onChange={(e) => setRecurrenceEnabled(e.target.checked)} className="w-4 h-4 accent-teal-900" />
                  </label>
                  <Input name="recurrenceDay" type="number" min={1} max={31} placeholder="Dia do aporte" value={recurrenceDay} onChange={(e) => setRecurrenceDay(e.target.value)} />
                  <Input name="recurrenceAmount" type="number" step="0.01" placeholder="Valor recorrente" value={recurrenceAmount} onChange={(e) => setRecurrenceAmount(e.target.value)} />
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleSaveRecurrence} isLoading={isSavingRecurrence} className="flex-1">Salvar recorrência</Button>
                    <Button type="button" variant="ghost" onClick={handleRunRecurrenceNow} isLoading={isRunningRecurrence} className="flex-1">Executar agora</Button>
                  </div>

                  {details && (
                    <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                      <p>Contribuição mensal: {formatCurrency(details.projection.monthlyContribution)}</p>
                      <p>Saldo projetado (12m): {formatCurrency(details.projection.projectedBalanceIn12Months)}</p>
                      <p>Meses para meta: {details.projection.estimatedMonthsToGoal ?? '-'}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <strong className="text-gray-900 block">V4 · Rendimento e planejamento</strong>
                  <Select
                    options={[
                      { value: 'PERCENT', label: 'Percentual (%)' },
                      { value: 'FIXED', label: 'Valor fixo (R$)' },
                    ]}
                    value={yieldMode}
                    onChange={(value) => setYieldMode(value as SavingsBoxYieldMode)}
                    placeholder="Modo de rendimento"
                  />
                  <Input name="yieldRate" type="number" step="0.01" placeholder="Rendimento mensal" value={yieldRate} onChange={(e) => setYieldRate(e.target.value)} />
                  <Button type="button" onClick={handleSaveYield} isLoading={isSavingYield}>Salvar rendimento</Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Input name="yieldRunYear" type="number" placeholder="Ano" value={String(yieldRunYear)} onChange={(e) => setYieldRunYear(Number(e.target.value) || new Date().getFullYear())} />
                    <Input name="yieldRunMonth" type="number" min={1} max={12} placeholder="Mês" value={String(yieldRunMonth)} onChange={(e) => setYieldRunMonth(Number(e.target.value) || 1)} />
                  </div>

                  <Button type="button" variant="ghost" onClick={handleRunMonthlyYield} isLoading={isRunningMonthlyYield}>
                    Aplicar rendimento do mês
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900">Histórico e alertas</strong>
                  {isLoadingDetails && <span className="text-xs text-gray-500">Atualizando...</span>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-700 block mb-2">Movimentações</span>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {details?.transactions.map((transaction) => (
                        <div key={transaction.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                          <p className="font-medium text-gray-800">{transaction.type}</p>
                          <p className="text-gray-700">{formatCurrency(transaction.amount)}</p>
                          <p className="text-gray-500">{formatDate(transaction.date)}</p>
                          {transaction.description && <p className="text-gray-600">{transaction.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-700 block mb-2">Alertas</span>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {details?.alerts.map((alert) => (
                        <div key={alert.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                          <p className="font-medium text-gray-800">{alert.type}</p>
                          <p className="text-gray-700">{alert.message}</p>
                          <p className="text-gray-500">{formatDate(alert.createdAt)} · {alert.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-gray-900">Planejamento anual</strong>
              <Input
                name="planningYear"
                type="number"
                placeholder="Ano"
                value={String(planningYear)}
                onChange={(e) => setPlanningYear(Number(e.target.value) || new Date().getFullYear())}
                className="max-w-[140px]"
              />
            </div>

            {isLoadingPlanning && <p className="text-sm text-gray-600">Carregando planejamento...</p>}

            {!isLoadingPlanning && annualPlanning?.planning.length === 0 && (
              <p className="text-sm text-gray-600">Sem caixinhas para planejar neste ano.</p>
            )}

            {!isLoadingPlanning && annualPlanning?.planning.map((plan) => (
              <div key={plan.savingsBoxId} className="rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-gray-800">{plan.name}</strong>
                  <span className="text-sm text-gray-600">Fim do ano: {formatCurrency(plan.projectedEndOfYearBalance)}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {plan.months.map((month) => (
                    <div key={`${plan.savingsBoxId}-${month.month}`} className="rounded-lg bg-gray-50 p-2 text-xs">
                      <p className="text-gray-600">Mês {month.month + 1}</p>
                      <p className="text-gray-700">+{formatCurrency(month.plannedContribution)}</p>
                      <p className="text-gray-700">R {formatCurrency(month.plannedYield)}</p>
                      <p className="font-medium text-gray-800">{formatCurrency(month.projectedBalance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
