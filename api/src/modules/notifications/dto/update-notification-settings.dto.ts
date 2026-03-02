import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'

class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
    dueReminders?: boolean

  @IsOptional()
  @IsBoolean()
    creditCardDue?: boolean

  @IsOptional()
  @IsBoolean()
    budgetAlerts?: boolean

  @IsOptional()
  @IsBoolean()
    lowBalance?: boolean

  @IsOptional()
  @IsBoolean()
    weeklySummary?: boolean
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
    preferences?: NotificationPreferencesDto
}
