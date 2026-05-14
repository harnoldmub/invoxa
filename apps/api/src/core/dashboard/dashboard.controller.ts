import { Controller, Get } from '@nestjs/common';
import { Tenant, RequestContext } from '../../common/request-context';
import { DashboardService } from './dashboard.service';

@Controller('core/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  overview(@Tenant() ctx: RequestContext) {
    return this.dashboard.overview(ctx);
  }
}
