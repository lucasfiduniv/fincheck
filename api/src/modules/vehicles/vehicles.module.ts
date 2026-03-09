import { Module } from '@nestjs/common'
import { VehiclesController } from './vehicles.controller'
import { VehiclesService } from './vehicles.service'
import { VehiclesFuelMaintenanceService } from './vehicles-fuel-maintenance.service'
import { VehiclesReadUseCaseService } from './vehicles-read.use-case.service'
import { VehiclesMaintenanceUseCaseService } from './vehicles-maintenance.use-case.service'

@Module({
  controllers: [VehiclesController],
  providers: [
    VehiclesService,
    VehiclesFuelMaintenanceService,
    VehiclesReadUseCaseService,
    VehiclesMaintenanceUseCaseService,
  ],
  exports: [VehiclesService],
})
export class VehiclesModule {}
