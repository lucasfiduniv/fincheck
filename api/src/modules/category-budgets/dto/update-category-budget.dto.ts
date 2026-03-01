import { IsBoolean, IsNumber, IsOptional, IsPositive } from 'class-validator'

export class UpdateCategoryBudgetDto {
  @IsNumber()
  @IsPositive()
    limit: number

  @IsBoolean()
  @IsOptional()
    carryOverEnabled?: boolean
}
