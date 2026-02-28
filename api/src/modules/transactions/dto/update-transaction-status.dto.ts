import { IsEnum, IsNotEmpty } from 'class-validator'
import { TransactionStatus } from '../entities/Transaction'

export class UpdateTransactionStatusDto {
  @IsNotEmpty()
  @IsEnum(TransactionStatus)
    status: TransactionStatus
}
