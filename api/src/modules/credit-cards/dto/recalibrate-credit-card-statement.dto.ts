import { IsBoolean, IsOptional } from 'class-validator'

export class RecalibrateCreditCardStatementDto {
  @IsOptional()
  @IsBoolean()
    includePaid?: boolean

  @IsOptional()
  @IsBoolean()
    includeCanceled?: boolean
}
