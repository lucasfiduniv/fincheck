import { Injectable } from '@nestjs/common'
import { CreateVehiclePartDto } from './dto/create-vehicle-part.dto'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { CreateVehicleUsageEventDto } from './dto/create-vehicle-usage-event.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'
import { VehiclesMaintenanceUseCaseService } from './vehicles-maintenance.use-case.service'
import { VehiclesReadUseCaseService } from './vehicles-read.use-case.service'

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesReadUseCaseService: VehiclesReadUseCaseService,
    private readonly vehiclesMaintenanceUseCaseService: VehiclesMaintenanceUseCaseService,
  ) {}

  create(userId: string, createVehicleDto: CreateVehicleDto) {
    return this.vehiclesMaintenanceUseCaseService.create(userId, createVehicleDto)
  }

  findAll(userId: string) {
    return this.vehiclesReadUseCaseService.findAll(userId)
  }

  findOne(userId: string, vehicleId: string) {
    return this.vehiclesReadUseCaseService.findOne(userId, vehicleId)
  }

  update(userId: string, vehicleId: string, updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesMaintenanceUseCaseService.update(userId, vehicleId, updateVehicleDto)
  }

  createPart(userId: string, vehicleId: string, createVehiclePartDto: CreateVehiclePartDto) {
    return this.vehiclesMaintenanceUseCaseService.createPart(userId, vehicleId, createVehiclePartDto)
  }

  recalibrateNow(userId: string, vehicleId: string) {
    return this.vehiclesMaintenanceUseCaseService.recalibrateNow(userId, vehicleId)
  }

  trackUsageEvent(userId: string, createVehicleUsageEventDto: CreateVehicleUsageEventDto) {
    return this.vehiclesMaintenanceUseCaseService.trackUsageEvent(userId, createVehicleUsageEventDto)
  }

  findAuditLogs(userId: string, vehicleId: string, limit: number) {
    return this.vehiclesMaintenanceUseCaseService.findAuditLogs(userId, vehicleId, limit)
  }
}
