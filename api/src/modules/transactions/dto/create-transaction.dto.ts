import {
  IsInt,
  IsIn,
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
  @IsIn([TransactionType.INCOME, TransactionType.EXPENSE])
    type: TransactionType

  @IsOptional()
  @IsEnum(TransactionCreationType)
    repeatType?: TransactionCreationType

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(360)
    repeatCount?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
    dueDay?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(15)
    alertDaysBefore?: number

  @IsOptional()
  @IsUUID()
    fuelVehicleId?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
    fuelOdometer?: number

  @IsOptional()
  @IsNumber()
  @Min(0.01)
    fuelLiters?: number

  @IsOptional()
  @IsNumber()
  @Min(0.01)
    fuelPricePerLiter?: number

  @IsOptional()
  @IsUUID()
    maintenanceVehicleId?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
    maintenanceOdometer?: number
}
