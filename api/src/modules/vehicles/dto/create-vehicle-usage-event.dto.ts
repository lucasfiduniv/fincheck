import { IsJSON, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateVehicleUsageEventDto {
  @IsOptional()
  @IsUUID()
    vehicleId?: string

  @IsString()
  @MaxLength(120)
    eventName: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
    screen?: string

  @IsOptional()
  @IsJSON()
    metadata?: string
}
