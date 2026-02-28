import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateCreditCardPurchaseDto {
  @IsString()
  @IsNotEmpty()
    description: string

  @IsNumber()
  @IsPositive()
    amount: number

  @IsDateString()
    purchaseDate: string

  @IsOptional()
  @IsUUID()
    categoryId?: string

  @IsInt()
  @Min(1)
  @Max(360)
    installmentCount: number
}
