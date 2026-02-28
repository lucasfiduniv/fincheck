import {
  IsInt,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator'
import { TransactionCreationType, TransactionType } from '../entities/Transaction'

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
    bankAccountId: string

  @IsString()
  @IsNotEmpty()
  @IsUUID()
    categoryId: string

  @IsString()
  @IsNotEmpty()
    name: string

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
    value: number

  @IsNotEmpty()
  @IsDateString()
    date: string

  @IsNotEmpty()
  @IsEnum(TransactionType)
    type: TransactionType

  @IsOptional()
  @IsEnum(TransactionCreationType)
    repeatType?: TransactionCreationType

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(60)
    repeatCount?: number
}
