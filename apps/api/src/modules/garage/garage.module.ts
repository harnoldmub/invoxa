import { Module } from '@nestjs/common';
import { GarageVehiclesController } from './vehicles/vehicles.controller';
import { GarageVehiclesService } from './vehicles/vehicles.service';
import { GarageWorkOrdersController } from './work-orders/work-orders.controller';
import { GarageWorkOrdersService } from './work-orders/work-orders.service';
import { GaragePartsController } from './parts/parts.controller';
import { GaragePartsService } from './parts/parts.service';
import { GarageInterventionsController } from './interventions/interventions.controller';
import { GarageInterventionsService } from './interventions/interventions.service';

@Module({
  controllers: [GarageVehiclesController, GarageWorkOrdersController, GaragePartsController, GarageInterventionsController],
  providers: [GarageVehiclesService, GarageWorkOrdersService, GaragePartsService, GarageInterventionsService],
})
export class GarageModule {}
