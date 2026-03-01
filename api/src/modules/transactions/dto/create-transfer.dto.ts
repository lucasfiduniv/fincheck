import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator'

export class CreateTransferDto {
  @IsUUID()
  @IsNotEmpty()
    fromBankAccountId: string

  @IsUUID()
  @IsNotEmpty()
    toBankAccountId: string

  @IsNumber()
  @IsPositive()
    value: number

  @IsDateString()
    date: string

  @IsString()
  @IsOptional()
    description?: string
}