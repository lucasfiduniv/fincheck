import { IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class PayCreditCardStatementDto {
  @IsInt()
  @Min(0)
  @Max(11)
    month: number

  @IsInt()
  @Min(2000)
    year: number

  @IsOptional()
  @IsUUID()
    bankAccountId?: string
}
