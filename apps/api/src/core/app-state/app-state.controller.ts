import { Body, Controller, Get, Put } from '@nestjs/common';
import { Tenant, RequestContext } from '../../common/request-context';
import { AppStateService } from './app-state.service';

@Controller('app')
export class AppStateController {
  constructor(private readonly appState: AppStateService) {}

  @Get('state')
  state(@Tenant() ctx: RequestContext) {
    return this.appState.getState(ctx);
  }

  @Put('state')
  save(@Tenant() ctx: RequestContext, @Body() input: unknown) {
    return this.appState.saveState(ctx, input);
  }
}
