import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateCreditCardDto {
  @IsString()
  @IsNotEmpty()
    name: string

  @IsString()
  @IsOptional()
    brand?: string

  @IsString()
  @IsNotEmpty()
    color: string

  @IsUUID()
  @IsNotEmpty()
    bankAccountId: string

  @IsNumber()
  @IsPositive()
    creditLimit: number

  @IsInt()
  @Min(1)
  @Max(31)
    closingDay: number

  @IsInt()
  @Min(1)
  @Max(31)
    dueDay: number
}
