import { IsNumber, IsPositive } from 'class-validator'

export class UpdateCategoryBudgetDto {
  @IsNumber()
  @IsPositive()
    limit: number
}
