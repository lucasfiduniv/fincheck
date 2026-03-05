import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Select } from '../../components/Select'
import { Modal } from '../../components/Modal'
import { InputCurrency } from '../../components/InputCurrency'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { savingsBoxesService } from '../../../app/services/savingsBoxesService'
import { friendshipsService } from '../../../app/services/friendshipsService'
import { currencyStringToNumber } from '../../../app/utils/currencyStringToNumber'
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

function getProgressPercentage(currentBalance: number, targetAmount: number | null) {
  if (!targetAmount || targetAmount <= 0) {
    return 0
  }

  return Math.min((currentBalance / targetAmount) * 100, 100)
}

export function SavingsBoxes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedSavingsBoxId, setSelectedSavingsBoxId] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false)
  const [isYieldModalOpen, setIsYieldModalOpen] = useState(false)
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [isAdvancedConfigOpen, setIsAdvancedConfigOpen] = useState(false)
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'YIELD'>('ALL')
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [isPlanningExpanded, setIsPlanningExpanded] = useState(false)

  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createInitialBalance, setCreateInitialBalance] = useState('')
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
  const [friendEmail, setFriendEmail] = useState('')
  const [selectedFriendUserId, setSelectedFriendUserId] = useState('')

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

  useEffect(() => {
    if (searchParams.get('create') !== '1') {
      return
    }

    setIsCreateModalOpen(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('create')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  const { data: details, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['savingsBoxes', selectedSavingsBoxId],
    queryFn: () => savingsBoxesService.getById(selectedSavingsBoxId!),
    enabled: !!selectedSavingsBoxId,
  })

  const { data: annualPlanning, isLoading: isLoadingPlanning } = useQuery({
    queryKey: ['savingsBoxes', 'planning', planningYear],
    queryFn: () => savingsBoxesService.getAnnualPlanning(planningYear),
  })

  const { data: friends = [] } = useQuery({
    queryKey: ['friendships', 'friends'],
    queryFn: friendshipsService.getFriends,
  })

  const { data: receivedRequests = [] } = useQuery({
    queryKey: ['friendships', 'received-requests'],
    queryFn: friendshipsService.getReceivedRequests,
  })

  const filteredTransactions = useMemo(() => {
    if (!details) {
      return []
    }

    if (historyTypeFilter === 'ALL') {
      return details.transactions
    }

    return details.transactions.filter((transaction) => transaction.type === historyTypeFilter)
  }, [details, historyTypeFilter])

  const visibleTransactions = showAllTransactions
    ? filteredTransactions
    : filteredTransactions.slice(0, 5)

  const planningSummary = useMemo(() => {
    if (!annualPlanning?.planning.length) {
      return {
        totalPlannedContribution: 0,
        totalPlannedYield: 0,
        totalProjectedEndOfYear: 0,
      }
    }

    return annualPlanning.planning.reduce(
      (accumulator, plan) => {
        const planContribution = plan.months.reduce(
          (total, month) => total + month.plannedContribution,
          0,
        )

        const planYield = plan.months.reduce(
          (total, month) => total + month.plannedYield,
          0,
        )

        accumulator.totalPlannedContribution += planContribution
        accumulator.totalPlannedYield += planYield
        accumulator.totalProjectedEndOfYear += plan.projectedEndOfYearBalance

        return accumulator
      },
      {
        totalPlannedContribution: 0,
        totalPlannedYield: 0,
        totalProjectedEndOfYear: 0,
      },
    )
  }, [annualPlanning])

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

  useEffect(() => {
    setShowAllTransactions(false)
  }, [selectedSavingsBoxId, historyTypeFilter])

  const { mutateAsync: createSavingsBox, isLoading: isCreating } = useMutation(
    savingsBoxesService.create,
  )

  const { mutateAsync: createEntry, isLoading: isCreatingEntry } = useMutation(
    ({
      type,
      savingsBoxId,
      amount,
      description,
      date,
    }: {
      type: 'DEPOSIT' | 'WITHDRAW'
      savingsBoxId: string
      amount: number
      description?: string
      date: string
    }) => {
      if (type === 'DEPOSIT') {
        return savingsBoxesService.deposit({
          savingsBoxId,
          amount,
          description,
          date,
        })
      }

      return savingsBoxesService.withdraw({
        savingsBoxId,
        amount,
        description,
        date,
      })
    },
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

  const { mutateAsync: sendFriendRequest, isLoading: isSendingFriendRequest } = useMutation(
    friendshipsService.sendRequest,
  )

  const { mutateAsync: acceptFriendRequest, isLoading: isAcceptingFriendRequest } = useMutation(
    friendshipsService.acceptRequest,
  )

  const { mutateAsync: shareWithFriend, isLoading: isSharingWithFriend } = useMutation(
    savingsBoxesService.shareWithFriend,
  )

  function invalidateSavingsBoxesQueries() {
    queryClient.invalidateQueries({ queryKey: ['savingsBoxes'] })
  }

  function invalidateFriendsQueries() {
    queryClient.invalidateQueries({ queryKey: ['friendships'] })
  }

  async function handleCreateSavingsBox() {
    if (!createName.trim()) {
      toast.error('Informe o nome da caixinha.')
      return
    }

    try {
      const created = await createSavingsBox({
        name: createName,
        description: createDescription || undefined,
        initialBalance: currencyStringToNumber(createInitialBalance),
        targetAmount: createTargetAmount ? currencyStringToNumber(createTargetAmount) : undefined,
        targetDate: toISODate(createTargetDate),
      })

      setSelectedSavingsBoxId(created.id)
      setCreateName('')
      setCreateDescription('')
      setCreateInitialBalance('')
      setCreateTargetAmount('')
      setCreateTargetDate('')
      setCreateStep(1)
      setIsCreateModalOpen(false)
      invalidateSavingsBoxesQueries()
      toast.success('Caixinha salva.')
    } catch {
      toast.error('Não foi possível criar a caixinha.')
    }
  }

  function handleOpenEntryModal(type: 'DEPOSIT' | 'WITHDRAW') {
    setEntryType(type)
    setIsEntryModalOpen(true)
  }

  async function handleCreateEntry() {
    if (!selectedBox) {
      return
    }

    const parsedAmount = currencyStringToNumber(entryAmount)

    if (!entryAmount || parsedAmount <= 0) {
      toast.error('Informe um valor válido.')
      return
    }

    try {
      await createEntry({
        type: entryType,
        savingsBoxId: selectedBox.id,
        amount: parsedAmount,
        description: entryDescription || undefined,
        date: new Date(`${entryDate}T00:00:00.000Z`).toISOString(),
      })

      setEntryAmount('')
      setEntryDescription('')
      setIsEntryModalOpen(false)
      invalidateSavingsBoxesQueries()
      toast.success(entryType === 'DEPOSIT' ? 'Aporte salvo.' : 'Resgate salvo.')
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
        targetAmount: goalAmount ? currencyStringToNumber(goalAmount) : undefined,
        targetDate: toISODate(goalDate),
        alertEnabled: goalAlertsEnabled,
      })

      setIsGoalModalOpen(false)
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
        recurrenceAmount: recurrenceAmount ? currencyStringToNumber(recurrenceAmount) : undefined,
      })

      setIsRecurrenceModalOpen(false)
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
      toast.success('Aplicação de recorrência concluída!')
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
        monthlyYieldRate: yieldRate ? currencyStringToNumber(yieldRate) : undefined,
      })

      setIsYieldModalOpen(false)
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
      toast.success('Rendimento do mês aplicado!')
    } catch {
      toast.error('Falha ao aplicar rendimento mensal.')
    }
  }

  async function handleSendFriendRequest() {
    if (!friendEmail.trim()) {
      toast.error('Informe o e-mail do amigo.')
      return
    }

    try {
      await sendFriendRequest(friendEmail.trim())
      setFriendEmail('')
      invalidateFriendsQueries()
      toast.success('Solicitação enviada!')
    } catch {
      toast.error('Não foi possível enviar a solicitação.')
    }
  }

  async function handleAcceptRequest(friendshipId: string) {
    try {
      await acceptFriendRequest(friendshipId)
      invalidateFriendsQueries()
      toast.success('Agora vocês são amigos!')
    } catch {
      toast.error('Não foi possível aceitar a solicitação.')
    }
  }

  async function handleShareWithFriend() {
    if (!selectedBox) {
      return
    }

    if (!selectedFriendUserId) {
      toast.error('Selecione um amigo para compartilhar.')
      return
    }

    try {
      await shareWithFriend({
        savingsBoxId: selectedBox.id,
        friendUserId: selectedFriendUserId,
      })

      setSelectedFriendUserId('')
      setIsFriendsModalOpen(false)
      invalidateSavingsBoxesQueries()
      toast.success('Caixinha compartilhada com sucesso!')
    } catch {
      toast.error('Não foi possível compartilhar a caixinha.')
    }
  }

  return (
    <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 overflow-y-auto">
      <Modal
        title="Nova Caixinha"
        open={isCreateModalOpen}
        onClose={() => {
          setCreateStep(1)
          setIsCreateModalOpen(false)
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (createStep === 1) {
              setCreateStep(2)
              return
            }

            handleCreateSavingsBox()
          }}
        >
          {createStep === 1 && (
            <div className="space-y-4">
              <Input
                name="createName"
                placeholder="Nome da caixinha"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />

              <div>
                <span className="text-gray-600 tracking-[-0.5px] text-xs">Saldo inicial</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
                  <InputCurrency
                    value={createInitialBalance}
                    onChange={(value) => setCreateInitialBalance(value ?? '')}
                    className="text-teal-900"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setCreateStep(1)
                    setIsCreateModalOpen(false)
                  }}
                >
                  Cancelar
                </Button>

                <Button type="submit" className="flex-1">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4">
              <div>
                <span className="text-gray-600 tracking-[-0.5px] text-xs">Descrição (opcional)</span>
                <Input
                  name="createDescription"
                  placeholder="Ex.: Viagem, reserva, reforma"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>

              <div>
                <span className="text-gray-600 tracking-[-0.5px] text-xs">Meta (opcional)</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
                  <InputCurrency
                    value={createTargetAmount}
                    onChange={(value) => setCreateTargetAmount(value ?? '')}
                    className="text-teal-900"
                  />
                </div>
              </div>

              <div>
                <span className="text-gray-600 tracking-[-0.5px] text-xs">Data alvo (opcional)</span>
                <Input
                  name="createTargetDate"
                  type="date"
                  value={createTargetDate}
                  onChange={(e) => setCreateTargetDate(e.target.value)}
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setCreateStep(1)}
                >
                  Voltar
                </Button>

                <Button type="submit" className="flex-1" isLoading={isCreating}>
                  Salvar caixinha
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        title={entryType === 'DEPOSIT' ? 'Novo Aporte' : 'Novo Resgate'}
        open={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleCreateEntry()
          }}
        >
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
            Tipo: {entryType === 'DEPOSIT' ? 'Aporte' : 'Resgate'}
          </div>

          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs">Valor</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 tracking-[-0.5px] text-lg">R$</span>
              <InputCurrency
                value={entryAmount}
                onChange={(value) => setEntryAmount(value ?? '')}
                className="text-teal-900"
              />
            </div>
          </div>

          <Input
            name="entryDate"
            type="date"
            placeholder="Data"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />

          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs">Descrição (opcional)</span>
            <Input
              name="entryDescription"
              placeholder="Detalhe da movimentação"
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isCreatingEntry}>
            {entryType === 'DEPOSIT' ? 'Salvar aporte' : 'Salvar resgate'}
          </Button>
        </form>
      </Modal>

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
        title="Recorrência"
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
            <span className="text-sm text-gray-700">Recorrência ativa</span>
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
              placeholder="Mês"
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
              Aplicar mês
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Compartilhar e Amigos"
        open={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <span className="text-gray-600 tracking-[-0.5px] text-xs">Convidar amigo por e-mail</span>
            <div className="mt-1 flex flex-col sm:flex-row gap-2">
              <Input
                name="friendEmail"
                type="email"
                placeholder="E-mail do amigo"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
              />
              <Button
                type="button"
                className="h-[52px] px-4 rounded-lg w-full sm:w-auto"
                isLoading={isSendingFriendRequest}
                onClick={handleSendFriendRequest}
              >
                Enviar
              </Button>
            </div>
          </div>

          {receivedRequests.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-gray-600 uppercase tracking-[0.08em]">Pedidos recebidos</span>

              {receivedRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{request.requester.name}</p>
                    <p className="text-xs text-gray-500">{request.requester.email}</p>
                  </div>
                  <Button
                    type="button"
                    className="h-9 px-3 rounded-lg text-xs"
                    isLoading={isAcceptingFriendRequest}
                    onClick={() => handleAcceptRequest(request.id)}
                  >
                    Aceitar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs text-gray-600 uppercase tracking-[0.08em]">Meus amigos</span>

            {friends.length === 0 && (
              <p className="text-sm text-gray-500">Você ainda não tem amigos adicionados.</p>
            )}

            {friends.map((friend) => (
              <div key={friend.friendshipId} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm text-gray-800 font-medium">{friend.name}</p>
                <p className="text-xs text-gray-500">{friend.email}</p>
              </div>
            ))}
          </div>

          {selectedBox?.isOwner && (
            <form
              className="pt-2 border-t border-gray-100 space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                handleShareWithFriend()
              }}
            >
              <span className="text-gray-600 tracking-[-0.5px] text-xs block">Compartilhar caixinha atual</span>
              <Select
                placeholder="Escolha um amigo"
                value={selectedFriendUserId}
                onChange={setSelectedFriendUserId}
                options={friends.map((friend) => ({
                  value: friend.userId,
                  label: `${friend.name} (${friend.email})`,
                }))}
              />

              <Button type="submit" className="w-full" isLoading={isSharingWithFriend}>
                Compartilhar caixinha
              </Button>
            </form>
          )}
        </div>
      </Modal>

      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Logo className="h-6 text-teal-900" />
          <p className="text-sm text-gray-600 mt-2">Organize metas, aportes e evolução das suas caixinhas.</p>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-4 rounded-xl w-full sm:w-auto"
            onClick={() => setIsFriendsModalOpen(true)}
          >
            Compartilhar e amigos
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
        <section className="space-y-4 xl:sticky xl:top-0 self-start">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-xs text-gray-600 block">Total guardado</span>
              <strong className="text-gray-900 text-sm">{formatCurrency(summary?.totalBalance ?? 0)}</strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <span className="text-xs text-gray-600 block">Caixinhas</span>
              <strong className="text-gray-900 text-sm">{summary?.savingsBoxes.length ?? 0}</strong>
            </div>
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

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {summary?.savingsBoxes.map((box) => {
                const progress = getProgressPercentage(box.currentBalance, box.targetAmount)

                return (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => setSelectedSavingsBoxId(box.id)}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${selectedSavingsBoxId === box.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-gray-800 block truncate">{box.name}</strong>
                      <span className="text-xs text-gray-600">{progress.toFixed(0)}%</span>
                    </div>

                    <span className="text-xs text-gray-600 block mt-1">Saldo: {formatCurrency(box.currentBalance)}</span>

                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-teal-700" style={{ width: `${progress}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full mt-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center text-base font-semibold">
                  +
                </span>
                <div>
                  <strong className="text-sm text-gray-800 block">Adicionar caixinha</strong>
                  <span className="text-xs text-gray-500">Cadastro rápido</span>
                </div>
              </div>
            </button>
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
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <strong className="text-xl text-gray-900 block">{selectedBox.name}</strong>
                  {!selectedBox.isOwner && (
                    <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-800">
                      Compartilhada por {selectedBox.ownerName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{selectedBox.description || 'Sem descrição'}</p>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-teal-700"
                    style={{ width: `${getProgressPercentage(selectedBox.currentBalance, selectedBox.targetAmount)}%` }}
                  />
                </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                  <Button type="button" onClick={() => handleOpenEntryModal('DEPOSIT')} className="h-10 rounded-xl px-3 text-sm w-full">
                    Aportar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => handleOpenEntryModal('WITHDRAW')} className="h-10 rounded-xl px-3 text-sm w-full">
                    Resgatar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setIsGoalModalOpen(true)} className="h-10 rounded-xl px-3 text-sm w-full" disabled={!selectedBox.isOwner}>
                    Meta
                  </Button>
                </div>

                {selectedBox.isOwner && (
                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    <button
                      type="button"
                      className="text-sm text-teal-700 hover:text-teal-800 underline text-left"
                      onClick={() => setIsAdvancedConfigOpen((state) => !state)}
                    >
                      {isAdvancedConfigOpen ? 'Ocultar configurações avançadas' : 'Mostrar configurações avançadas'}
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        isAdvancedConfigOpen ? 'max-h-52 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsRecurrenceModalOpen(true)} className="h-10 rounded-xl px-3 text-sm w-full">
                          Recorrência
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setIsYieldModalOpen(true)} className="h-10 rounded-xl px-3 text-sm w-full">
                          Rendimento
                        </Button>
                        <Button type="button" variant="ghost" className="h-10 rounded-xl px-3 text-sm w-full" onClick={() => setIsFriendsModalOpen(true)}>
                          Compartilhar e amigos
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {details?.collaborators && details.collaborators.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-600 uppercase tracking-[0.08em] block mb-2">Colaboradores</span>
                    <div className="flex flex-wrap gap-2">
                      {details.collaborators.map((collaborator) => (
                        <span key={collaborator.userId} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {collaborator.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {details && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <strong className="text-gray-900 block mb-2">Meta e progresso</strong>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p>Meta: {details.targetAmount ? formatCurrency(details.targetAmount) : '-'}</p>
                      <p>Progresso: {details.progress.percentage.toFixed(2)}%</p>
                      <p>Faltante: {details.progress.remaining !== null ? formatCurrency(details.progress.remaining) : '-'}</p>
                      <p>Dias para meta: {details.progress.daysToTarget ?? '-'}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <strong className="text-gray-900 block mb-2">Projeção</strong>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p>Contribuição mensal: {formatCurrency(details.projection.monthlyContribution)}</p>
                      <p>Saldo projetado (12m): {formatCurrency(details.projection.projectedBalanceIn12Months)}</p>
                      <p>Meses para meta: {details.projection.estimatedMonthsToGoal ?? '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900">Histórico e alertas</strong>
                  {isLoadingDetails && <span className="text-xs text-gray-500">Atualizando...</span>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-700 block mb-2">Movimentações</span>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[
                        { value: 'ALL', label: 'Todos' },
                        { value: 'DEPOSIT', label: 'Aportes' },
                        { value: 'WITHDRAW', label: 'Resgates' },
                        { value: 'YIELD', label: 'Rendimentos' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setHistoryTypeFilter(option.value as 'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'YIELD')}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                            historyTypeFilter === option.value
                              ? 'border-teal-300 bg-teal-50 text-teal-900'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {filteredTransactions.length === 0 && (
                        <p className="text-xs text-gray-500">Sem movimentações recentes.</p>
                      )}

                      {visibleTransactions.map((transaction) => (
                        <div key={transaction.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                          <p className="font-medium text-gray-800">{transaction.type === 'DEPOSIT' ? 'Aporte' : transaction.type === 'WITHDRAW' ? 'Resgate' : transaction.type === 'YIELD' ? 'Rendimento' : 'Ajuste'}</p>
                          <p className="text-gray-700">{formatCurrency(transaction.amount)}</p>
                          <p className="text-gray-500">{formatDate(transaction.date)}</p>
                          {transaction.description && <p className="text-gray-600">{transaction.description}</p>}
                        </div>
                      ))}

                      {filteredTransactions.length > 5 && (
                        <button
                          type="button"
                          className="text-xs text-teal-700 hover:text-teal-800 underline"
                          onClick={() => setShowAllTransactions((state) => !state)}
                        >
                          {showAllTransactions ? 'Ver menos' : 'Ver mais'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-700 block mb-2">Alertas</span>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {details?.alerts.length === 0 && (
                        <p className="text-xs text-gray-500">Sem alertas recentes.</p>
                      )}

                      {details?.alerts.map((alert) => (
                        <div key={alert.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                          <p className="font-medium text-gray-800">{alert.type === 'GOAL_COMPLETED' ? 'Meta concluída' : alert.type === 'GOAL_NEAR_DUE' ? 'Meta próxima do vencimento' : alert.type === 'LOW_PROGRESS' ? 'Baixo progresso' : 'Recorrência executada'}</p>
                          <p className="text-gray-700">{alert.message}</p>
                          <p className="text-gray-500">{formatDate(alert.createdAt)} · {alert.status === 'PENDING' ? 'Pendente' : alert.status === 'SENT' ? 'Enviado' : 'Falhou'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

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
                          <p className="text-gray-600">Mês {month.month + 1}</p>
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
        </section>
      </main>
    </div>
  )
}
