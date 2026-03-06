import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator'

export enum SupportedBankStatementProvider {
  NUBANK = 'NUBANK',
}

export class ImportBankStatementDto {
  @IsNotEmpty()
  @IsEnum(SupportedBankStatementProvider)
    bank: SupportedBankStatementProvider

  @IsString()
  @IsNotEmpty()
  @IsUUID()
    bankAccountId: string

  @IsString()
  @IsNotEmpty()
    csvContent: string
}
