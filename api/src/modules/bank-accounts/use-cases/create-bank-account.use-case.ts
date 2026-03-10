import { Injectable } from '@nestjs/common'
import { CreateBankAccountDto } from '../dto/create-bank-account.dto'
import { BankAccountsDataRepository } from '../repositories/bank-accounts-data.repository'

@Injectable()
export class CreateBankAccountUseCase {
  constructor(private readonly bankAccountsDataRepository: BankAccountsDataRepository) {}

  execute(userId: string, createBankAccountDto: CreateBankAccountDto) {
    return this.bankAccountsDataRepository.create(userId, createBankAccountDto)
  }
}
