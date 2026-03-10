import { Injectable } from '@nestjs/common'

type TransactionBalanceInput = {
  type: string
  value: number
  status: string
}

@Injectable()
export class BankAccountBalanceCalculatorService {
  calculate(initialBalance: number, transactions: TransactionBalanceInput[]) {
    const totalTransactions = transactions.reduce((acc, transaction) => {
      if (transaction.status !== 'POSTED') {
        return acc
      }

      if (transaction.type === 'TRANSFER') {
        return acc + transaction.value
      }

      return acc + (transaction.type === 'INCOME' ? transaction.value : -transaction.value)
    }, 0)

    return initialBalance + totalTransactions
  }
}
