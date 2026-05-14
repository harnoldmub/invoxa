import { Controller, Get, Query } from '@nestjs/common';
import { Tenant, RequestContext } from '../../common/request-context';
import { SearchService } from './search.service';

@Controller('core/search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(@Tenant() ctx: RequestContext, @Query('q') q = '') {
    return this.search.query(ctx, q);
  }
}
