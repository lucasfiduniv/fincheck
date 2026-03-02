import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator'
import { SavingsBoxYieldMode } from '@prisma/client'

export class SetSavingsBoxYieldDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
    monthlyYieldRate?: number

  @IsOptional()
  @IsEnum(SavingsBoxYieldMode)
    yieldMode?: SavingsBoxYieldMode
}
