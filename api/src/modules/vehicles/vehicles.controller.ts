import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { ActiveUserId } from 'src/shared/decorators/ActiveUserId'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { CreateVehiclePartDto } from './dto/create-vehicle-part.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'
import { VehiclesService } from './vehicles.service'

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

  @Post(':vehicleId/parts')
  createPart(
    @ActiveUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() createVehiclePartDto: CreateVehiclePartDto,
  ) {
    return this.vehiclesService.createPart(userId, vehicleId, createVehiclePartDto)
  }
}
