import {
	IsDateString,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	IsUUID,
} from 'class-validator'
import { TransactionType } from '../entities/Transaction'

export class UpdateTransactionDto {
	@IsString()
	@IsNotEmpty()
	@IsUUID()
		bankAccountId: string

	@IsOptional()
	@IsString()
	@IsUUID()
		categoryId?: string

	@IsString()
	@IsNotEmpty()
		name: string

	@IsNumber()
	@IsNotEmpty()
	@IsPositive()
		value: number

	@IsNotEmpty()
	@IsDateString()
		date: string

	@IsNotEmpty()
	@IsEnum(TransactionType)
		type: TransactionType
}
