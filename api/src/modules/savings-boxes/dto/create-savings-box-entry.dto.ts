import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateSavingsBoxEntryDto {
  @IsNumber()
  @Min(0.01)
    amount: number

  @IsDateString()
    date: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
    description?: string

  @IsOptional()
  @IsUUID()
    bankAccountId?: string
}
