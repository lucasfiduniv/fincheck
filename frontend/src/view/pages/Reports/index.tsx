import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Select } from '../../components/Select'
import { Spinner } from '../../components/Spinner'
import { useMemo, useState } from 'react'
import { MONTHS } from '../../../app/config/constants'
import { useTransactions } from '../../../app/hooks/useTransactions'
import { useCategoryBudgets } from '../../../app/hooks/useCategoryBudgets'
import { useCreditCards } from '../../../app/hooks/useCreditCards'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { cn } from '../../../app/utils/cn'

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function isInvestmentLikeLabel(value?: string | null) {
  const normalized = normalizeText(value)

  if (!normalized) {
    return false
  }

  return normalized.includes('aplicacao')
    || normalized.includes('investimento')
    || normalized.includes('rdb')
    || normalized.includes('rende facil')
    || normalized.includes('poupanca')
    || normalized.includes('cdb')
    || normalized.includes('fundo')
    || normalized.includes('tesouro')
}

function getCurrentYearRange() {
  const currentYear = new Date().getFullYear()

  return Array.from({ length: 5 }).map((_, index) => currentYear - index)
}

export function Reports() {
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth())
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())

  const years = useMemo(() => getCurrentYearRange(), [])

  const { transactions, isInitialLoading: isLoadingTransactions } = useTransactions({
    month: selectedMonth,
    year: selectedYear,
  })
  const {
    categoryBudgets,
    isInitialLoadingCategoryBudgets,
  } = useCategoryBudgets({
    month: selectedMonth,
    year: selectedYear,
  })
  const { creditCards, isInitialLoadingCreditCards } = useCreditCards()
  const { accounts, isFetching: isLoadingAccounts } = useBankAccounts()

  const isLoading =
    isLoadingTransactions
    || isInitialLoadingCategoryBudgets
    || isInitialLoadingCreditCards
    || isLoadingAccounts

  const postedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'POSTED'),
    [transactions],
  )

  const {
    totalIncome,
    totalExpense,
    totalInvestment,
  } = useMemo(
    () => postedTransactions.reduce((acc, transaction) => {
      if (transaction.type === 'TRANSFER') {
        return acc
      }

      const isInvestmentMovement = isInvestmentLikeLabel(transaction.name)
        || isInvestmentLikeLabel(transaction.category?.name)

      if (isInvestmentMovement) {
        if (transaction.type === 'EXPENSE') {
          acc.totalInvestment += transaction.value
        }

        return acc
      }

      if (transaction.type === 'INCOME') {
        acc.totalIncome += transaction.value
      }

      if (transaction.type === 'EXPENSE') {
        acc.totalExpense += transaction.value
      }

      return acc
    }, {
      totalIncome: 0,
      totalExpense: 0,
      totalInvestment: 0,
    }),
    [postedTransactions],
  )

  const netCashResult = totalIncome - totalExpense - totalInvestment
  const savingsRate = totalIncome > 0
    ? Math.round((Math.max(netCashResult, 0) / totalIncome) * 100)
    : 0

  const budgetAlerts = categoryBudgets.filter((budget) => budget.hasAlert).length

  const topSpentCategory = useMemo(() => {
    const budgetsWithSpend = categoryBudgets
      .filter((budget) => budget.spent > 0)
      .sort((left, right) => right.spent - left.spent)

    return budgetsWithSpend[0] ?? null
  }, [categoryBudgets])

  const highestCardUsage = useMemo(() => {
    const cards = creditCards
      .filter((card) => card.creditLimit > 0)
      .map((card) => ({
        ...card,
        usageRate: (card.usedLimit / card.creditLimit) * 100,
      }))
      .sort((left, right) => right.usageRate - left.usageRate)

    return cards[0] ?? null
  }, [creditCards])

  return (
    <div className="w-full h-full p-4 lg:px-8 lg:pt-6 lg:pb-8 overflow-y-auto">
      <header className="min-h-[48px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Logo className="h-6 text-teal-900" />

        <Link
          to="/"
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors w-full sm:w-auto text-center"
        >
          Voltar ao dashboard
        </Link>
      </header>

      <main className="max-w-[1120px] mx-auto mt-6 space-y-4">
        <section className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.5px] text-gray-900">Relatórios e Análises</h1>
              <p className="text-sm text-gray-600 mt-1">
                Painel inicial para acompanhar indicadores e evoluir com novos relatórios.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
              <Select
                placeholder="Mês"
                value={String(selectedMonth)}
                onChange={(value) => setSelectedMonth(Number(value))}
                options={MONTHS.map((month, index) => ({
                  value: String(index),
                  label: month,
                }))}
              />

              <Select
                placeholder="Ano"
                value={String(selectedYear)}
                onChange={(value) => setSelectedYear(Number(value))}
                options={years.map((year) => ({
                  value: String(year),
                  label: String(year),
                }))}
              />
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 flex items-center justify-center">
            <Spinner className="w-10 h-10" />
          </div>
        )}

        {!isLoading && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <article className="rounded-2xl border border-gray-200 bg-white p-4">
                <span className="text-xs text-gray-600">Receitas no período</span>
                <strong className="text-xl text-green-800 block mt-1">{formatCurrency(totalIncome)}</strong>
              </article>

              <article className="rounded-2xl border border-gray-200 bg-white p-4">
                <span className="text-xs text-gray-600">Despesas no período</span>
                <strong className="text-xl text-red-800 block mt-1">{formatCurrency(totalExpense)}</strong>
                <span className="text-[11px] text-gray-500 block mt-1">Somente saídas operacionais da conta</span>
              </article>

              <article className="rounded-2xl border border-gray-200 bg-white p-4">
                <span className="text-xs text-gray-600">Dinheiro líquido</span>
                <strong className={cn(
                  'text-xl block mt-1',
                  netCashResult >= 0 ? 'text-teal-900' : 'text-red-800',
                )}
                >
                  {formatCurrency(netCashResult)}
                </strong>
                <span className="text-[11px] text-gray-500 block mt-1">Receitas - despesas operacionais - investimentos</span>
              </article>

              <article className="rounded-2xl border border-gray-200 bg-white p-4">
                <span className="text-xs text-gray-600">Investimentos feitos</span>
                <strong className="text-xl text-indigo-800 block mt-1">{formatCurrency(totalInvestment)}</strong>
                <span className="text-[11px] text-gray-500 block mt-1">Aplicações separadas do resultado líquido</span>
              </article>

              <article className="rounded-2xl border border-gray-200 bg-white p-4">
                <span className="text-xs text-gray-600">Taxa de poupança</span>
                <strong className="text-xl text-gray-900 block mt-1">{savingsRate}%</strong>
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <article className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-800 tracking-[-0.3px]">Relatórios iniciais</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      title: 'Resumo Executivo',
                      description: 'Receitas, despesas, saldo e indicadores centrais por período.',
                      status: 'Disponível',
                    },
                    {
                      title: 'Categorias',
                      description: 'Ranking de gastos por categoria com comparativo mensal.',
                      status: 'Em evolução',
                    },
                    {
                      title: 'Orçamento',
                      description: 'Orçado vs realizado e alertas de estouro por categoria.',
                      status: 'Disponível',
                    },
                    {
                      title: 'Cartões de Crédito',
                      description: 'Uso de limite, faturas e concentração de despesas por cartão.',
                      status: 'Em evolução',
                    },
                  ].map((report) => (
                    <div key={report.title} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-gray-800">{report.title}</strong>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium',
                          report.status === 'Disponível'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-yellow-100 text-yellow-800',
                        )}
                        >
                          {report.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{report.description}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-800 tracking-[-0.3px]">Insights rápidos</h2>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="text-xs text-gray-600">Categoria com maior gasto</span>
                  <strong className="text-sm text-gray-900 block mt-1">
                    {topSpentCategory
                      ? `${topSpentCategory.categoryName} • ${formatCurrency(topSpentCategory.spent)}`
                      : 'Sem gastos categorizados no período'}
                  </strong>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="text-xs text-gray-600">Alertas de orçamento</span>
                  <strong className="text-sm text-gray-900 block mt-1">{budgetAlerts} categoria(s) em alerta</strong>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="text-xs text-gray-600">Maior uso de limite no cartão</span>
                  <strong className="text-sm text-gray-900 block mt-1">
                    {highestCardUsage
                      ? `${highestCardUsage.name} • ${Math.round(highestCardUsage.usageRate)}%`
                      : 'Nenhum cartão disponível'}
                  </strong>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <span className="text-xs text-gray-600">Contas monitoradas</span>
                  <strong className="text-sm text-gray-900 block mt-1">{accounts.length} conta(s)</strong>
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-4 lg:p-5">
              <h3 className="text-sm font-semibold text-gray-800 tracking-[-0.3px]">Estrutura expansível</h3>
              <p className="text-sm text-gray-600 mt-1">
                Esta tela foi organizada em blocos independentes para adicionar novos relatórios sem quebrar os existentes.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
