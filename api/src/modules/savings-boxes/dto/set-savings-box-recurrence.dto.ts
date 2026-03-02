import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator'

export class SetSavingsBoxRecurrenceDto {
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
}
