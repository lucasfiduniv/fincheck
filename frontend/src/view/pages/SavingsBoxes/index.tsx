import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/Button'
import { CreateSavingsBoxModal } from './components/CreateSavingsBoxModal'
import { SavingsBoxEntryModal } from './components/SavingsBoxEntryModal'
import { SavingsBoxConfigModals } from './components/SavingsBoxConfigModals'
import { SavingsBoxFriendsModal } from './components/SavingsBoxFriendsModal'
import { SavingsBoxHistoryAlertsSection } from './components/SavingsBoxHistoryAlertsSection'
import { SavingsBoxAnnualPlanningSection } from './components/SavingsBoxAnnualPlanningSection'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { savingsBoxesService } from '../../../app/services/savingsBoxesService'
import { friendshipsService } from '../../../app/services/friendshipsService'
import { currencyStringToNumber } from '../../../app/utils/currencyStringToNumber'
import { toast } from 'react-hot-toast'
import { SavingsBoxYieldMode } from '../../../app/entities/SavingsBox'
import { getTodayDateInputValue } from '../../../app/utils/getTodayDateInputValue'
import { formatDate as formatUTCDate } from '../../../app/utils/formatDate'

function formatDate(date?: string | null) {
  if (!date) {
    return '-'
  }

  return formatUTCDate(new Date(date))
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
  const [entryDate, setEntryDate] = useState(getTodayDateInputValue())
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
      <CreateSavingsBoxModal
        isOpen={isCreateModalOpen}
        setIsOpen={setIsCreateModalOpen}
        createStep={createStep}
        setCreateStep={setCreateStep}
        createName={createName}
        setCreateName={setCreateName}
        createDescription={createDescription}
        setCreateDescription={setCreateDescription}
        createInitialBalance={createInitialBalance}
        setCreateInitialBalance={setCreateInitialBalance}
        createTargetAmount={createTargetAmount}
        setCreateTargetAmount={setCreateTargetAmount}
        createTargetDate={createTargetDate}
        setCreateTargetDate={setCreateTargetDate}
        isCreating={isCreating}
        handleCreateSavingsBox={handleCreateSavingsBox}
      />

      <SavingsBoxEntryModal
        isOpen={isEntryModalOpen}
        setIsOpen={setIsEntryModalOpen}
        entryType={entryType}
        entryAmount={entryAmount}
        setEntryAmount={setEntryAmount}
        entryDescription={entryDescription}
        setEntryDescription={setEntryDescription}
        entryDate={entryDate}
        setEntryDate={setEntryDate}
        isCreatingEntry={isCreatingEntry}
        handleCreateEntry={handleCreateEntry}
      />

      <SavingsBoxConfigModals
        isGoalModalOpen={isGoalModalOpen}
        setIsGoalModalOpen={setIsGoalModalOpen}
        isRecurrenceModalOpen={isRecurrenceModalOpen}
        setIsRecurrenceModalOpen={setIsRecurrenceModalOpen}
        isYieldModalOpen={isYieldModalOpen}
        setIsYieldModalOpen={setIsYieldModalOpen}
        goalAmount={goalAmount}
        setGoalAmount={setGoalAmount}
        goalDate={goalDate}
        setGoalDate={setGoalDate}
        goalAlertsEnabled={goalAlertsEnabled}
        setGoalAlertsEnabled={setGoalAlertsEnabled}
        recurrenceEnabled={recurrenceEnabled}
        setRecurrenceEnabled={setRecurrenceEnabled}
        recurrenceDay={recurrenceDay}
        setRecurrenceDay={setRecurrenceDay}
        recurrenceAmount={recurrenceAmount}
        setRecurrenceAmount={setRecurrenceAmount}
        yieldMode={yieldMode}
        setYieldMode={setYieldMode}
        yieldRate={yieldRate}
        setYieldRate={setYieldRate}
        yieldRunYear={yieldRunYear}
        setYieldRunYear={setYieldRunYear}
        yieldRunMonth={yieldRunMonth}
        setYieldRunMonth={setYieldRunMonth}
        isSavingGoal={isSavingGoal}
        isSavingRecurrence={isSavingRecurrence}
        isRunningRecurrence={isRunningRecurrence}
        isSavingYield={isSavingYield}
        isRunningMonthlyYield={isRunningMonthlyYield}
        handleSaveGoal={handleSaveGoal}
        handleSaveRecurrence={handleSaveRecurrence}
        handleRunRecurrenceNow={handleRunRecurrenceNow}
        handleSaveYield={handleSaveYield}
        handleRunMonthlyYield={handleRunMonthlyYield}
      />

      <SavingsBoxFriendsModal
        open={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        friendEmail={friendEmail}
        setFriendEmail={setFriendEmail}
        isSendingFriendRequest={isSendingFriendRequest}
        onSendFriendRequest={handleSendFriendRequest}
        receivedRequests={receivedRequests}
        isAcceptingFriendRequest={isAcceptingFriendRequest}
        onAcceptRequest={handleAcceptRequest}
        friends={friends}
        selectedBox={selectedBox}
        selectedFriendUserId={selectedFriendUserId}
        setSelectedFriendUserId={setSelectedFriendUserId}
        isSharingWithFriend={isSharingWithFriend}
        onShareWithFriend={handleShareWithFriend}
      />

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

              <SavingsBoxHistoryAlertsSection
                isLoadingDetails={isLoadingDetails}
                historyTypeFilter={historyTypeFilter}
                setHistoryTypeFilter={setHistoryTypeFilter}
                filteredTransactions={filteredTransactions}
                visibleTransactions={visibleTransactions}
                showAllTransactions={showAllTransactions}
                setShowAllTransactions={setShowAllTransactions}
                alerts={details?.alerts}
              />
            </>
          )}

          <SavingsBoxAnnualPlanningSection
            planningYear={planningYear}
            setPlanningYear={setPlanningYear}
            isPlanningExpanded={isPlanningExpanded}
            setIsPlanningExpanded={setIsPlanningExpanded}
            planningSummary={planningSummary}
            isLoadingPlanning={isLoadingPlanning}
            annualPlanning={annualPlanning}
          />
        </section>
      </main>
    </div>
  )
}
