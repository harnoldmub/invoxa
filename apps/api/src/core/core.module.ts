import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CrmModule } from './crm/crm.module';
import { CatalogModule } from './catalog/catalog.module';
import { QuotesModule } from './quotes/quotes.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TemplatesModule } from './templates/templates.module';
import { SearchModule } from './search/search.module';
import { ActivityModule } from './activity/activity.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { DocumentsModule } from './documents/documents.module';
import { AppStateModule } from './app-state/app-state.module';

@Module({
  imports: [
    AuthModule,
    CompaniesModule,
    UsersModule,
    RolesModule,
    CrmModule,
    CatalogModule,
    QuotesModule,
    InvoicesModule,
    PaymentsModule,
    DashboardModule,
    TemplatesModule,
    SearchModule,
    ActivityModule,
    NotificationsModule,
    SettingsModule,
    CustomFieldsModule,
    DocumentsModule,
    AppStateModule,
  ],
})
export class CoreModule {}
