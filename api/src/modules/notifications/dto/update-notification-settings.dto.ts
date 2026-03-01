import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+()\-\s]+$/, {
    message: 'phoneNumber must contain only digits and phone symbols.',
  })
    phoneNumber?: string

  @IsOptional()
  @IsBoolean()
    notificationsEnabled?: boolean
}
