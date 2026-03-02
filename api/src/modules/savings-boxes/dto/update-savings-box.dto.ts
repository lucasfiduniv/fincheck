import { PartialType } from '@nestjs/mapped-types'
import { CreateSavingsBoxDto } from './create-savings-box.dto'

export class UpdateSavingsBoxDto extends PartialType(CreateSavingsBoxDto) {}
