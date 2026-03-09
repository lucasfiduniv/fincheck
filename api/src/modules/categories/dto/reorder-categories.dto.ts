import { IsArray, IsEnum, IsUUID, ArrayMinSize, ArrayUnique, IsIn } from 'class-validator'
import { TransactionType } from 'src/modules/transactions/entities/Transaction'

export class ReorderCategoriesDto {
  @IsEnum(TransactionType)
  @IsIn([TransactionType.INCOME, TransactionType.EXPENSE])
  type: TransactionType

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  orderedCategoryIds: string[]
}
