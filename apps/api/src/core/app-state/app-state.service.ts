import { Injectable } from '@nestjs/common';
import { FieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';

type GarageProfile = {
  id: string;
  name: string;
  address: string;
  postalCity: string;
  phone: string;
  email: string;
  legal: string;
  registration: string;
  vat: string;
  cgv: string;
  smtp: Record<string, string>;
};

type CustomerPayload = {
  id: string;
  reference?: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  mobile: string;
  type: string;
  taxNumber: string;
  paymentTerms: string;
  currency: string;
  website: string;
  billingAddress: string;
  shippingAddress: string;
  notes: string;
};

type ProductPayload = { id: string; reference?: string; name: string; type: string; unit: string; unitPrice: number; taxRate: number };
type VehiclePayload = { id: string; plate: string; customerId: string; model: string; mileage: number; status: string };
type LinePayload = { id: string; productId?: string; reference: string; name: string; quantity: number; unitPrice: number; taxRate: number };
type InvoicePayload = { id: string; number: string; customerId: string; customerReference?: string; vehicleId: string; paid: number; status: string; paymentMethod?: string; lines: LinePayload[]; issueDate?: string; dueDate?: string; paymentDate?: string; notes?: string };
type PaymentPayload = { id: string; invoiceId: string; amount: number; method: string; date: string };
type TemplatePayload = Record<string, unknown> & { id: string; name: string; type: string; activity: string; status: string };
type FieldPayload = { id: string; entity: string; label: string; type: string; activity: string };
type GarageData = { customers: CustomerPayload[]; vehicles: VehiclePayload[]; invoices: InvoicePayload[]; payments: PaymentPayload[] };
type AppStatePayload = { garages: GarageProfile[]; activeGarageId: string; allGarageData: Record<string, GarageData>; products: ProductPayload[]; templates: TemplatePayload[]; fields: FieldPayload[] };

const defaultCgv = "Les marchandises livrées demeurent notre propriété jusqu'au paiement intégral. Retard de paiement : pénalités légales et indemnité forfaitaire de 40 € pour frais de recouvrement.";
const defaultSmtp = { host: '', port: '587', user: '', password: '', from: '' };
const defaultTemplate = {
  title: 'Facture',
  primaryColor: '#111827',
  accentColor: '#2563eb',
  introText: 'Merci pour votre confiance.',
  footerText: 'Document généré par Invoxa.',
  paymentText: 'Paiement à réception sauf accord contraire.',
  paperSize: 'A4',
  orientation: 'Portrait',
  marginTop: 14,
  marginBottom: 14,
  marginLeft: 12,
  marginRight: 12,
  includePayment: true,
  companyName: 'CENTER AUTO PIECE',
  companyAddress: '1 RUE DES ARTS',
  companyPostalCity: '59280 ARMENTIERES',
  companyPhone: '03 20 95 31 98',
  companyEmail: 'cap59280@hotmail.com',
  companyLegal: 'Société à responsabilité limitée (SARL) - Capital de 4 000 € - SIRET: 84238627800019',
  companyRegistration: 'RCS/RM: 842 386 278 R.C.S. Lille - Numéro TVA: FR95842386278',
  companyVat: 'FR95842386278',
  cgv: defaultCgv,
};

const initialState: AppStatePayload = {
  activeGarageId: 'g1',
  garages: [
    {
      id: 'g1',
      name: 'CENTER AUTO PIECE',
      address: '1 RUE DES ARTS',
      postalCity: '59280 ARMENTIERES',
      phone: '03 20 95 31 98',
      email: 'cap59280@hotmail.com',
      legal: defaultTemplate.companyLegal,
      registration: defaultTemplate.companyRegistration,
      vat: 'FR95842386278',
      cgv: defaultCgv,
      smtp: defaultSmtp,
    },
  ],
  allGarageData: {
    g1: {
      customers: [
        { id: 'c1', reference: 'DE00001', name: 'Martin Services', companyName: 'Martin Services SARL', email: 'contact@martin.example', phone: '06 21 48 90 12', mobile: '06 21 48 90 13', type: 'Entreprise', taxNumber: 'FR 45 123456789', paymentTerms: '30 jours', currency: 'EUR', website: 'martin-services.example', billingAddress: '12 rue des Ateliers, 33000 Bordeaux', shippingAddress: '12 rue des Ateliers, 33000 Bordeaux', notes: 'Client flotte utilitaires.' },
        { id: 'c2', reference: 'DE00002', name: 'Cabinet Dentaire Nova', companyName: 'Cabinet Dentaire Nova', email: 'admin@nova.example', phone: '05 59 11 20 30', mobile: '06 70 10 20 30', type: 'Professionnel', taxNumber: 'FR 31 987654321', paymentTerms: 'Comptant', currency: 'EUR', website: 'nova-dentaire.example', billingAddress: '8 avenue Santé, 64000 Pau', shippingAddress: '8 avenue Santé, 64000 Pau', notes: 'Priorité véhicule de remplacement.' },
      ],
      vehicles: [
        { id: 'v1', plate: 'AB-482-KL', customerId: 'c1', model: 'Renault Master', mileage: 182400, status: 'Diagnostic' },
        { id: 'v2', plate: 'GH-219-TQ', customerId: 'c2', model: 'Peugeot 308', mileage: 73120, status: 'En atelier' },
      ],
      invoices: [
        { id: 'f1', number: 'FA2605-7B3A', customerId: 'c2', customerReference: 'DE00002', vehicleId: 'v2', paid: 389, status: 'Payée', paymentMethod: 'Carte', issueDate: '2026-05-01', dueDate: '2026-05-31', lines: [{ id: 'l1', productId: 'p2', reference: 'REF-8U2M', name: "Main-d'oeuvre mécanique", quantity: 4.5, unitPrice: 72, taxRate: 20 }] },
      ],
      payments: [{ id: 'pay1', invoiceId: 'f1', amount: 389, method: 'Carte', date: '2026-05-12' }],
    },
  },
  products: [
    { id: 'p1', reference: 'REF-4X9P', name: 'Diagnostic électronique', type: 'Service', unit: 'forfait', unitPrice: 89, taxRate: 20 },
    { id: 'p2', reference: 'REF-8U2M', name: "Main-d'oeuvre mécanique", type: 'Service', unit: 'heure', unitPrice: 72, taxRate: 20 },
    { id: 'p3', reference: 'REF-2K7L', name: 'Plaquettes de frein', type: 'Produit', unit: 'jeu', unitPrice: 64, taxRate: 20 },
  ],
  templates: [{ id: 't1', name: 'CENTER AUTO PIECE', type: 'Facture', activity: 'Garage', status: 'Par défaut', ...defaultTemplate }],
  fields: [
    { id: 'cf1', entity: 'Véhicule', label: 'Garantie constructeur', type: 'Date', activity: 'Garage' },
    { id: 'cf2', entity: 'Client', label: 'Code comptable', type: 'Texte', activity: 'Général' },
  ],
};

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value ?? {}));
const n = (value: Prisma.Decimal | number | string | null | undefined) => Number(value ?? 0);
const date = (value?: string) => (value ? new Date(value) : undefined);

const statusToDocument = (status: string) => {
  if (status === 'Payée') return 'PAID';
  if (status === 'Acompte') return 'SENT';
  if (status === 'En retard') return 'OVERDUE';
  return 'DRAFT';
};

const documentToStatus = (status: string, paid: number, total: number) => {
  if (status === 'PAID' || paid >= total) return 'Payée';
  if (paid > 0) return 'Acompte';
  if (status === 'OVERDUE') return 'En retard';
  return 'À payer';
};

@Injectable()
export class AppStateService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(ctx: RequestContext) {
    await this.ensureTenant(ctx.tenantId);
    const count = await this.prisma.company.count({ where: { tenantId: ctx.tenantId } });
    if (count === 0) {
      await this.saveState(ctx, initialState);
    }
    return this.readState(ctx.tenantId);
  }

  async saveState(ctx: RequestContext, raw: unknown) {
    const input = raw as AppStatePayload;
    await this.ensureTenant(ctx.tenantId);
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.invoiceLine.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.invoice.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.quoteLine.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.quote.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.garageVehicle.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.product.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.contact.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.customer.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.documentTemplate.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.customFieldDefinition.deleteMany({ where: { tenantId: ctx.tenantId } });
      await tx.company.deleteMany({ where: { tenantId: ctx.tenantId } });

      for (const garage of input.garages) {
        await tx.company.create({
          data: {
            id: garage.id,
            tenantId: ctx.tenantId,
            name: garage.name,
            legalName: garage.legal,
            vatNumber: garage.vat,
            email: garage.email,
            phone: garage.phone,
            address: json({ address: garage.address, postalCity: garage.postalCity }),
            settings: json({ registration: garage.registration, cgv: garage.cgv, smtp: garage.smtp, activeGarageId: input.activeGarageId }),
          },
        });
      }

      const fallbackCompanyId = input.garages[0]?.id;
      if (!fallbackCompanyId) return;

      for (const product of input.products ?? []) {
        await tx.product.create({
          data: {
            id: product.id,
            tenantId: ctx.tenantId,
            companyId: fallbackCompanyId,
            sku: product.reference,
            name: product.name,
            type: product.type,
            unit: product.unit,
            unitPrice: product.unitPrice,
            taxRate: product.taxRate,
            customData: json({ frontendId: product.id }),
          },
        });
      }

      for (const garage of input.garages) {
        const data = input.allGarageData[garage.id] ?? { customers: [], vehicles: [], invoices: [], payments: [] };
        for (const customer of data.customers) {
          await tx.customer.create({
            data: {
              id: customer.id,
              tenantId: ctx.tenantId,
              companyId: garage.id,
              type: customer.type,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              billingInfo: json({ companyName: customer.companyName, billingAddress: customer.billingAddress, shippingAddress: customer.shippingAddress }),
              customData: json({ reference: customer.reference, mobile: customer.mobile, taxNumber: customer.taxNumber, paymentTerms: customer.paymentTerms, currency: customer.currency, website: customer.website, notes: customer.notes }),
            },
          });
        }

        for (const vehicle of data.vehicles) {
          const [brand, ...modelParts] = vehicle.model.split(' ');
          await tx.garageVehicle.create({
            data: {
              id: vehicle.id,
              tenantId: ctx.tenantId,
              companyId: garage.id,
              customerId: vehicle.customerId || null,
              plateNumber: vehicle.plate.toUpperCase().replace(/\s/g, ''),
              brand: brand || 'Véhicule',
              model: modelParts.join(' ') || vehicle.model || 'Non renseigné',
              mileage: vehicle.mileage,
              customData: json({ status: vehicle.status, displayModel: vehicle.model }),
            },
          });
        }

        for (const invoice of data.invoices) {
          const subtotal = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
          const taxTotal = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (line.taxRate / 100), 0);
          await tx.invoice.create({
            data: {
              id: invoice.id,
              tenantId: ctx.tenantId,
              companyId: garage.id,
              customerId: invoice.customerId,
              number: invoice.number,
              status: statusToDocument(invoice.status),
              paymentStatus: invoice.paid >= subtotal + taxTotal ? 'PAID' : invoice.paid > 0 ? 'PARTIAL' : 'PENDING',
              issueDate: date(invoice.issueDate),
              dueDate: date(invoice.dueDate),
              subtotal,
              taxTotal,
              total: subtotal + taxTotal,
              amountPaid: invoice.paid,
              notes: invoice.notes,
              businessModule: 'garage',
              businessObjectType: invoice.vehicleId ? 'vehicle' : undefined,
              businessObjectId: invoice.vehicleId || undefined,
              customData: json({ customerReference: invoice.customerReference, paymentMethod: invoice.paymentMethod, paymentDate: invoice.paymentDate }),
              lines: {
                create: invoice.lines.map((line) => ({
                  id: line.id,
                  tenantId: ctx.tenantId,
                  label: line.name,
                  description: line.reference,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  taxRate: line.taxRate,
                  total: line.quantity * line.unitPrice * (1 + line.taxRate / 100),
                  sourceType: line.productId ? 'product' : undefined,
                  sourceId: line.productId,
                })),
              },
            },
          });
        }

        for (const payment of data.payments) {
          await tx.payment.create({
            data: { id: payment.id, tenantId: ctx.tenantId, invoiceId: payment.invoiceId, amount: payment.amount, method: payment.method, paidAt: date(payment.date) ?? new Date() },
          });
        }
      }

      for (const template of input.templates ?? []) {
        await tx.documentTemplate.create({
          data: { id: template.id, tenantId: ctx.tenantId, companyId: fallbackCompanyId, type: template.type, module: template.activity, name: template.name, schema: json(template), html: '', active: template.status === 'Par défaut' },
        });
      }

      for (const field of input.fields ?? []) {
        await tx.customFieldDefinition.create({
          data: {
            id: field.id,
            tenantId: ctx.tenantId,
            companyId: fallbackCompanyId,
            module: field.activity,
            entityType: field.entity,
            key: field.label.toLowerCase().replace(/[^a-z0-9]+/gi, '_'),
            label: field.label,
            type: this.fieldType(field.type),
          },
        });
      }
    });

    return this.readState(ctx.tenantId);
  }

  private async ensureTenant(tenantId: string) {
    await this.prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'Invoxa', slug: tenantId },
    });
  }

  private async readState(tenantId: string): Promise<AppStatePayload> {
    const [companies, products, templates, fields] = await Promise.all([
      this.prisma.company.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.product.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } }),
      this.prisma.documentTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.customFieldDefinition.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    ]);

    const garages = companies.map((company): GarageProfile => {
      const address = company.address as Record<string, string> | null;
      const settings = company.settings as Record<string, unknown>;
      return {
        id: company.id,
        name: company.name,
        address: address?.address ?? '',
        postalCity: address?.postalCity ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        legal: company.legalName ?? '',
        registration: String(settings.registration ?? ''),
        vat: company.vatNumber ?? '',
        cgv: String(settings.cgv ?? defaultCgv),
        smtp: (settings.smtp as Record<string, string> | undefined) ?? defaultSmtp,
      };
    });

    const allGarageData: Record<string, GarageData> = {};
    for (const company of companies) {
      const [customers, vehicles, invoices, payments] = await Promise.all([
        this.prisma.customer.findMany({ where: { tenantId, companyId: company.id }, orderBy: { createdAt: 'desc' } }),
        this.prisma.garageVehicle.findMany({ where: { tenantId, companyId: company.id }, orderBy: { updatedAt: 'desc' } }),
        this.prisma.invoice.findMany({ where: { tenantId, companyId: company.id }, include: { lines: true }, orderBy: { createdAt: 'desc' } }),
        this.prisma.payment.findMany({ where: { tenantId, invoice: { companyId: company.id } }, orderBy: { paidAt: 'desc' } }),
      ]);

      allGarageData[company.id] = {
        customers: customers.map((customer) => {
          const billing = customer.billingInfo as Record<string, string>;
          const custom = customer.customData as Record<string, string>;
          return {
            id: customer.id,
            reference: custom.reference ?? '',
            name: customer.name,
            companyName: billing.companyName ?? customer.name,
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            mobile: custom.mobile ?? '',
            type: customer.type,
            taxNumber: custom.taxNumber ?? '',
            paymentTerms: custom.paymentTerms ?? 'Comptant',
            currency: custom.currency ?? 'EUR',
            website: custom.website ?? '',
            billingAddress: billing.billingAddress ?? '',
            shippingAddress: billing.shippingAddress ?? '',
            notes: custom.notes ?? '',
          };
        }),
        vehicles: vehicles.map((vehicle) => {
          const custom = vehicle.customData as Record<string, string>;
          return {
            id: vehicle.id,
            plate: vehicle.plateNumber,
            customerId: vehicle.customerId ?? '',
            model: custom.displayModel ?? `${vehicle.brand} ${vehicle.model}`.trim(),
            mileage: vehicle.mileage ?? 0,
            status: custom.status ?? 'En atelier',
          };
        }),
        invoices: invoices.map((invoice) => {
          const custom = invoice.customData as Record<string, string>;
          return {
            id: invoice.id,
            number: invoice.number,
            customerId: invoice.customerId,
            customerReference: custom.customerReference ?? '',
            vehicleId: invoice.businessObjectType === 'vehicle' ? invoice.businessObjectId ?? '' : '',
            paid: n(invoice.amountPaid),
            status: documentToStatus(invoice.status, n(invoice.amountPaid), n(invoice.total)),
            paymentMethod: custom.paymentMethod ?? '',
            issueDate: invoice.issueDate?.toISOString().slice(0, 10),
            dueDate: invoice.dueDate?.toISOString().slice(0, 10),
            paymentDate: custom.paymentDate ?? '',
            notes: invoice.notes ?? '',
            lines: invoice.lines.map((line) => ({
              id: line.id,
              productId: line.sourceType === 'product' ? line.sourceId ?? '' : '',
              reference: line.description ?? '',
              name: line.label,
              quantity: n(line.quantity),
              unitPrice: n(line.unitPrice),
              taxRate: n(line.taxRate),
            })),
          };
        }),
        payments: payments.map((payment) => ({
          id: payment.id,
          invoiceId: payment.invoiceId,
          amount: n(payment.amount),
          method: payment.method,
          date: payment.paidAt.toISOString().slice(0, 10),
        })),
      };
    }

    const firstSettings = companies[0]?.settings as Record<string, unknown> | undefined;
    return {
      garages,
      activeGarageId: String(firstSettings?.activeGarageId ?? garages[0]?.id ?? ''),
      allGarageData,
      products: products.map((product) => ({ id: product.id, reference: product.sku ?? '', name: product.name, type: product.type, unit: product.unit, unitPrice: n(product.unitPrice), taxRate: n(product.taxRate) })),
      templates: templates.map((template) => ({ id: template.id, name: template.name, type: template.type, activity: template.module ?? 'Général', status: template.active ? 'Par défaut' : 'Actif', ...(template.schema as Record<string, unknown>) })),
      fields: fields.map((field) => ({ id: field.id, entity: field.entityType, label: field.label, type: this.uiFieldType(field.type), activity: field.module ?? 'Général' })),
    };
  }

  private fieldType(type: string): FieldType {
    if (type.toLowerCase().includes('date')) return FieldType.DATE;
    if (type.toLowerCase().includes('nombre')) return FieldType.NUMBER;
    if (type.toLowerCase().includes('bool')) return FieldType.BOOLEAN;
    return FieldType.TEXT;
  }

  private uiFieldType(type: FieldType) {
    if (type === FieldType.DATE) return 'Date';
    if (type === FieldType.NUMBER) return 'Nombre';
    if (type === FieldType.BOOLEAN) return 'Oui / Non';
    return 'Texte';
  }
}
