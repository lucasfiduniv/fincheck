import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'
import { SavingsBoxYieldMode } from '@prisma/client'

export class CreateSavingsBoxDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
    name: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
    description?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
    targetAmount?: number

  @IsOptional()
  @IsDateString()
    targetDate?: string

  @IsOptional()
  @IsBoolean()
    alertEnabled?: boolean

  @IsOptional()
  @IsBoolean()
    recurrenceEnabled?: boolean

  @IsOptional()
  @IsNumber()
  @Min(1)
    recurrenceDay?: number

  @IsOptional()
  @IsNumber()
  @Min(0.01)
    recurrenceAmount?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
    monthlyYieldRate?: number

  @IsOptional()
  @IsEnum(SavingsBoxYieldMode)
    yieldMode?: SavingsBoxYieldMode
}
