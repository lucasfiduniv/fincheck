import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { CreateVehiclePartDto } from './dto/create-vehicle-part.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'
import { VehiclesService } from './vehicles.service'
import { CreateVehicleUsageEventDto } from './dto/create-vehicle-usage-event.dto'

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(
    @ActiveUserId() userId: string,
    @Body() createVehicleDto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(userId, createVehicleDto)
  }

  @Get()
  findAll(@ActiveUserId() userId: string) {
    return this.vehiclesService.findAll(userId)
  }

  @Get(':vehicleId')
  findOne(
    @ActiveUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.vehiclesService.findOne(userId, vehicleId)
  }

  @Patch(':vehicleId')
  update(
    @ActiveUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(userId, vehicleId, updateVehicleDto)
  }

  @Patch(':vehicleId/recalibrate-now')
  recalibrateNow(
    @ActiveUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.vehiclesService.recalibrateNow(userId, vehicleId)
  }

  @Post(':vehicleId/parts')
  createPart(
    @ActiveUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() createVehiclePartDto: CreateVehiclePartDto,
  ) {
    return this.vehiclesService.createPart(userId, vehicleId, createVehiclePartDto)
  }

  @Post('usage-events')
  trackUsageEvent(
    @ActiveUserId() userId: string,
    @Body() createVehicleUsageEventDto: CreateVehicleUsageEventDto,
  ) {
    return this.vehiclesService.trackUsageEvent(userId, createVehicleUsageEventDto)
  }

  @Get(':vehicleId/audit')
  findAuditLogs(
    @ActiveUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query('limit') limit = '20',
  ) {
    return this.vehiclesService.findAuditLogs(userId, vehicleId, Number(limit))
  }
}
