import { useEffect, useRef, useState } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { localStorageKeys } from '../../../../../../app/config/localStorageKeys'
import {
  FINANCIAL_IMPORT_COMPLETED_EVENT,
  FinancialImportCompletedDetail,
} from '../../../../../../app/utils/financialImportRealtime'
import { Transaction } from '../../../../../../app/entities/Transaction'

export interface ImportNoticeState {
  source: FinancialImportCompletedDetail['source'] | 'REALTIME'
  importedCount: number
}

interface TransactionsChangedRealtimeEvent {
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'IMPORTED'
  count?: number
}

export function useTransactionsRealtime(
  queryClient: QueryClient,
  transactions: Transaction[],
) {
  const [importNotice, setImportNotice] = useState<ImportNoticeState | null>(null)
  const [animatedTransactionIds, setAnimatedTransactionIds] = useState<string[]>([])
  const previousTransactionIdsRef = useRef<string[]>([])
  const pendingImportRef = useRef<ImportNoticeState | null>(null)

  useEffect(() => {
    function handleFinancialImportCompleted(event: Event) {
      const customEvent = event as CustomEvent<FinancialImportCompletedDetail>
      const detail = customEvent.detail

      if (!detail || detail.importedCount <= 0) {
        return
      }

      pendingImportRef.current = {
        source: detail.source,
        importedCount: detail.importedCount,
      }

      setImportNotice({
        source: detail.source,
        importedCount: detail.importedCount,
      })
    }

    window.addEventListener(FINANCIAL_IMPORT_COMPLETED_EVENT, handleFinancialImportCompleted)

    return () => {
      window.removeEventListener(FINANCIAL_IMPORT_COMPLETED_EVENT, handleFinancialImportCompleted)
    }
  }, [])

  useEffect(() => {
    const accessToken = localStorage.getItem(localStorageKeys.ACCESS_TOKEN)

    if (!accessToken) {
      return
    }

    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
    })

    socket.on('transactions.changed', (event: TransactionsChangedRealtimeEvent) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      queryClient.invalidateQueries({ queryKey: ['categoryBudgets'] })
      queryClient.invalidateQueries({ queryKey: ['transactionDueAlerts'] })

      if (event.action === 'CREATED' || event.action === 'IMPORTED') {
        const importedCount = Math.max(1, event.count ?? 1)

        pendingImportRef.current = {
          source: 'REALTIME',
          importedCount,
        }

        setImportNotice({
          source: 'REALTIME',
          importedCount,
        })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])

  useEffect(() => {
    const currentIds = transactions.map((transaction) => transaction.id)
    const previousIds = previousTransactionIdsRef.current

    if (pendingImportRef.current) {
      const newIds = currentIds.filter((id) => !previousIds.includes(id))

      if (newIds.length > 0) {
        const maxAnimatedItems = Math.max(1, Math.min(newIds.length, pendingImportRef.current.importedCount))
        const idsToAnimate = newIds.slice(0, maxAnimatedItems)

        setAnimatedTransactionIds(idsToAnimate)

        window.setTimeout(() => {
          setAnimatedTransactionIds([])
        }, 3200)
      }

      pendingImportRef.current = null
    }

    previousTransactionIdsRef.current = currentIds
  }, [transactions])

  useEffect(() => {
    if (!importNotice) {
      return
    }

    const timeout = window.setTimeout(() => {
      setImportNotice(null)
    }, 5000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [importNotice])

  return {
    importNotice,
    animatedTransactionIds,
  }
}
