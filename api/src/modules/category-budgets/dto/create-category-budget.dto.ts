import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator'

export class CreateCategoryBudgetDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
    categoryId: string

  @IsInt()
  @Min(0)
  @Max(11)
    month: number

  @IsInt()
  @Min(2000)
  @Max(2100)
    year: number

  @IsNumber()
  @IsPositive()
    limit: number

  @IsBoolean()
  @IsOptional()
    carryOverEnabled?: boolean
}
