import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export enum SupportedBankStatementProvider {
  NUBANK = 'NUBANK',
  BANCO_DO_BRASIL = 'BANCO_DO_BRASIL',
  SICOOB = 'SICOOB',
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

  @IsOptional()
  @IsString()
    requestId?: string
}
