import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export enum SupportedCreditCardStatementProvider {
  NUBANK = 'NUBANK',
}

export class ImportCreditCardStatementDto {
  @IsNotEmpty()
  @IsEnum(SupportedCreditCardStatementProvider)
    bank: SupportedCreditCardStatementProvider

  @IsString()
  @IsNotEmpty()
    csvContent: string

  @IsOptional()
  @IsString()
    requestId?: string
}
