import { IsNotEmpty, IsUUID } from 'class-validator'

export class ShareSavingsBoxDto {
  @IsUUID()
  @IsNotEmpty()
    friendUserId: string
}
