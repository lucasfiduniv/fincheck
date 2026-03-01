import { IsOptional, IsString, MaxLength } from 'class-validator'

export class SendTestNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
    message?: string
}
