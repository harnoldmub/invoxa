import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { Tenant, RequestContext } from '../../common/request-context';
import { DocumentsService } from './documents.service';

@Controller('core/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('invoices/:id.pdf')
  async invoicePdf(@Tenant() ctx: RequestContext, @Param('id') id: string, @Res() res: Response) {
    const pdf = await this.documents.invoicePdf(ctx, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${id}.pdf"`);
    res.send(pdf);
  }
}
