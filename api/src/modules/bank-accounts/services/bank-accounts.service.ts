import { Injectable } from '@nestjs/common'
import { CreateBankAccountDto } from '../dto/create-bank-account.dto'
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto'
import { CreateBankAccountUseCase } from '../use-cases/create-bank-account.use-case'
import { FindAllBankAccountsByUserUseCase } from '../use-cases/find-all-bank-accounts-by-user.use-case'
import { UpdateBankAccountUseCase } from '../use-cases/update-bank-account.use-case'
import { RemoveBankAccountUseCase } from '../use-cases/remove-bank-account.use-case'

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly createBankAccountUseCase: CreateBankAccountUseCase,
    private readonly findAllBankAccountsByUserUseCase: FindAllBankAccountsByUserUseCase,
    private readonly updateBankAccountUseCase: UpdateBankAccountUseCase,
    private readonly removeBankAccountUseCase: RemoveBankAccountUseCase,
  ) {}

  create(userId: string, createBankAccountDto: CreateBankAccountDto) {
    return this.createBankAccountUseCase.execute(userId, createBankAccountDto)
  }

  findAllByUserId(userId: string) {
    return this.findAllBankAccountsByUserUseCase.execute(userId)
  }

  update(
    userId: string,
    bankAccountId: string,
    updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.updateBankAccountUseCase.execute(userId, bankAccountId, updateBankAccountDto)
  }

  remove(userId: string, bankAccountId: string) {
    return this.removeBankAccountUseCase.execute(userId, bankAccountId)
  }
}
