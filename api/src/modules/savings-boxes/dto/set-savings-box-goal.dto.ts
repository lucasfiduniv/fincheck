import { IsBoolean, IsDateString, IsNumber, IsOptional, Min } from 'class-validator'

export class SetSavingsBoxGoalDto {
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
}
