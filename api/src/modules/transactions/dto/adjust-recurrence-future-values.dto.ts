import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator'

export class AdjustRecurrenceFutureValuesDto {
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
    value: number

  @IsOptional()
  @IsDateString()
    fromDate?: string
}
