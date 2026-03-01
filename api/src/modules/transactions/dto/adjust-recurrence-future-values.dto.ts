import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator'

export enum RecurrenceAdjustmentScope {
  THIS = 'THIS',
  THIS_AND_NEXT = 'THIS_AND_NEXT',
  ALL = 'ALL',
}

export class AdjustRecurrenceFutureValuesDto {
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
    value: number

  @IsEnum(RecurrenceAdjustmentScope)
  @IsOptional()
    scope?: RecurrenceAdjustmentScope

  @IsUUID()
  @IsOptional()
    transactionId?: string

  @IsOptional()
  @IsDateString()
    fromDate?: string
}
