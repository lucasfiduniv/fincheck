import { PartialType } from '@nestjs/mapped-types'
import { CreateCreditCardDto } from './create-credit-card.dto'
import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateCreditCardDto extends PartialType(CreateCreditCardDto) {
  @IsOptional()
  @IsBoolean()
    isActive?: boolean
}
