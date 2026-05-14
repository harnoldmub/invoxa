import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async invoicePdf(ctx: RequestContext, id: string) {
    const invoice = await this.prisma.invoice.findFirstOrThrow({
      where: { id, tenantId: ctx.tenantId },
      include: { company: true, customer: true, lines: true, payments: true },
    });

    const template = await this.prisma.documentTemplate.findFirst({
      where: { tenantId: ctx.tenantId, companyId: invoice.companyId, type: 'invoice', active: true },
      orderBy: { updatedAt: 'desc' },
    });

    const html = template?.html ?? this.defaultInvoiceHtml(invoice);
    const rendered = html
      .replaceAll('{{invoice.number}}', invoice.number)
      .replaceAll('{{company.name}}', invoice.company.name)
      .replaceAll('{{customer.name}}', invoice.customer.name)
      .replaceAll('{{invoice.total}}', String(invoice.total));

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(rendered, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return pdf;
  }

  private defaultInvoiceHtml(invoice: any) {
    const rows = invoice.lines
      .map((line: any) => `<tr><td>${line.label}</td><td>${line.quantity}</td><td>${line.unitPrice}</td><td>${line.total}</td></tr>`)
      .join('');
    return `<!doctype html><html><head><style>body{font-family:Inter,Arial;padding:40px;color:#14213d}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left}.total{font-size:22px;font-weight:700;text-align:right}</style></head><body><h1>Facture ${invoice.number}</h1><p>${invoice.company.name} -> ${invoice.customer.name}</p><table><thead><tr><th>Ligne</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total ${invoice.total} ${invoice.currency}</p></body></html>`;
  }
}
