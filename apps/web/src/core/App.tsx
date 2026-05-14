import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  FileText,
  Gauge,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { GarageWorkspace } from '../modules/garage/pages/GarageWorkspace';

type Page = 'dashboard' | 'crm' | 'catalog' | 'quotes' | 'invoices' | 'payments' | 'garage' | 'templates' | 'settings';
type ActivityKey = 'garage' | 'artisan' | 'agency' | 'services';
type Customer = {
  id: string;
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
type Product = { id: string; name: string; type: string; unit: string; unitPrice: number; taxRate: number };
type Vehicle = { id: string; plate: string; customerId: string; model: string; mileage: number; status: string };
type LineItem = { productId: string; quantity: number; unitPrice: number; taxRate: number };
type Quote = { id: string; number: string; customerId: string; vehicleId: string; status: string; lines: LineItem[] };
type Invoice = { id: string; number: string; customerId: string; vehicleId: string; paid: number; status: string; lines: LineItem[] };
type Payment = { id: string; invoiceId: string; amount: number; method: string; date: string };
type Template = { id: string; name: string; type: string; activity: string; status: string; title: string; primaryColor: string; accentColor: string; introText: string; footerText: string; paymentText: string };
type CustomField = { id: string; entity: string; label: string; type: string; activity: string };
type RelationTarget = { kind: 'customer' | 'product' | 'quote' | 'invoice' | 'vehicle' | 'payment'; id: string } | null;

const nav: Array<{ key: Page; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'catalog', label: 'Catalogue', icon: Package },
  { key: 'quotes', label: 'Devis', icon: ClipboardList },
  { key: 'invoices', label: 'Factures', icon: FileText },
  { key: 'payments', label: 'Paiements', icon: CreditCard },
  { key: 'garage', label: 'Garage', icon: Car },
  { key: 'templates', label: 'Modèles', icon: Sparkles },
  { key: 'settings', label: 'Paramètres', icon: Settings },
];

const activities = [
  { key: 'garage', label: 'Garage automobile', description: 'Véhicules, atelier et ordres de réparation', icon: Car },
  { key: 'artisan', label: 'Artisan chantier', description: 'Chantiers, interventions et matériaux', icon: Wrench },
  { key: 'agency', label: 'Agence projets', description: 'Projets, temps passé et livrables', icon: CalendarDays },
  { key: 'services', label: 'Services récurrents', description: 'Contrats, abonnements et prestations', icon: Gauge },
];

const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const matches = (query: string, values: Array<string | number>) => values.join(' ').toLowerCase().includes(query.trim().toLowerCase());

const customerName = (customers: Customer[], idValue: string) => customers.find((customer) => customer.id === idValue)?.name ?? 'Client inconnu';
const vehicleLabel = (vehicles: Vehicle[], idValue: string) => {
  const vehicle = vehicles.find((item) => item.id === idValue);
  return vehicle ? `${vehicle.plate} - ${vehicle.model}` : 'Dossier non renseigné';
};
const productName = (products: Product[], idValue: string) => products.find((product) => product.id === idValue)?.name ?? 'Article inconnu';
const documentTotal = (products: Product[], lines: LineItem[]) =>
  lines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    const unitPrice = line.unitPrice ?? product?.unitPrice ?? 0;
    const taxRate = line.taxRate ?? product?.taxRate ?? 0;
    return sum + unitPrice * line.quantity * (1 + taxRate / 100);
  }, 0);
const documentSummary = (products: Product[], lines: LineItem[]) => lines.map((line) => `${line.quantity} x ${productName(products, line.productId)}`).join(', ');
const lineFromProduct = (products: Product[], productId: string, quantity = 1): LineItem => {
  const product = products.find((item) => item.id === productId);
  return { productId, quantity, unitPrice: product?.unitPrice ?? 0, taxRate: product?.taxRate ?? 20 };
};
const defaultTemplate = {
  title: 'Devis professionnel',
  primaryColor: '#1f6285',
  accentColor: '#e7f4f1',
  introText: 'Merci pour votre confiance. Vous trouverez ci-dessous le détail de notre proposition.',
  footerText: 'Document généré par Invoxa',
  paymentText: 'Conditions de paiement : acompte à validation, solde à réception.',
};

export function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState('Application prête');
  const [selectedActivity, setSelectedActivity] = useState<ActivityKey>('garage');
  const [relationTarget, setRelationTarget] = useState<RelationTarget>(null);

  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'c1', name: 'Martin Services', companyName: 'Martin Services SARL', email: 'contact@martin.example', phone: '06 21 48 90 12', mobile: '06 21 48 90 13', type: 'Entreprise', taxNumber: 'FR 45 123456789', paymentTerms: '30 jours', currency: 'EUR', website: 'martin-services.example', billingAddress: '12 rue des Ateliers, 33000 Bordeaux', shippingAddress: '12 rue des Ateliers, 33000 Bordeaux', notes: 'Client flotte utilitaires.' },
    { id: 'c2', name: 'Cabinet Dentaire Nova', companyName: 'Cabinet Dentaire Nova', email: 'admin@nova.example', phone: '05 59 11 20 30', mobile: '06 70 10 20 30', type: 'Professionnel', taxNumber: 'FR 31 987654321', paymentTerms: 'Comptant', currency: 'EUR', website: 'nova-dentaire.example', billingAddress: '8 avenue Santé, 64000 Pau', shippingAddress: '8 avenue Santé, 64000 Pau', notes: 'Priorité véhicule de remplacement.' },
    { id: 'c3', name: 'Logisud', companyName: 'Logisud Transport', email: 'fleet@logisud.example', phone: '04 88 91 42 10', mobile: '06 88 91 42 10', type: 'Flotte', taxNumber: 'FR 89 456789123', paymentTerms: '45 jours', currency: 'EUR', website: 'logisud.example', billingAddress: '22 quai Logistique, 13002 Marseille', shippingAddress: 'Dépôt Sud, 13015 Marseille', notes: 'Validation par responsable parc.' },
  ]);
  const [products, setProducts] = useState<Product[]>([
    { id: 'p1', name: 'Diagnostic électronique', type: 'Service', unit: 'forfait', unitPrice: 89, taxRate: 20 },
    { id: 'p2', name: 'Main-d’oeuvre mécanique', type: 'Service', unit: 'heure', unitPrice: 72, taxRate: 20 },
    { id: 'p3', name: 'Plaquettes de frein', type: 'Produit', unit: 'jeu', unitPrice: 64, taxRate: 20 },
  ]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: 'v1', plate: 'AB-482-KL', customerId: 'c1', model: 'Renault Master', mileage: 182400, status: 'Diagnostic' },
    { id: 'v2', plate: 'GH-219-TQ', customerId: 'c2', model: 'Peugeot 308', mileage: 73120, status: 'En atelier' },
    { id: 'v3', plate: 'PT-902-RS', customerId: 'c3', model: 'Mercedes Vito', mileage: 241850, status: 'Prêt' },
  ]);
  const [quotes, setQuotes] = useState<Quote[]>([
    { id: 'q1', number: 'DEV-2026-0041', customerId: 'c1', vehicleId: 'v1', status: 'Envoyé', lines: [{ productId: 'p1', quantity: 1, unitPrice: 89, taxRate: 20 }, { productId: 'p3', quantity: 2, unitPrice: 64, taxRate: 20 }] },
    { id: 'q2', number: 'DEV-2026-0042', customerId: 'c3', vehicleId: 'v3', status: 'Brouillon', lines: [{ productId: 'p2', quantity: 8, unitPrice: 72, taxRate: 20 }] },
  ]);
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'f1', number: 'FAC-2026-0098', customerId: 'c2', vehicleId: 'v2', paid: 389, status: 'Payée', lines: [{ productId: 'p2', quantity: 4.5, unitPrice: 72, taxRate: 20 }] },
    { id: 'f2', number: 'FAC-2026-0099', customerId: 'c1', vehicleId: 'v1', paid: 250, status: 'Acompte', lines: [{ productId: 'p1', quantity: 1, unitPrice: 89, taxRate: 20 }, { productId: 'p3', quantity: 2, unitPrice: 64, taxRate: 20 }] },
  ]);
  const [payments, setPayments] = useState<Payment[]>([
    { id: 'pay1', invoiceId: 'f1', amount: 389, method: 'Carte', date: '2026-05-12' },
    { id: 'pay2', invoiceId: 'f2', amount: 250, method: 'Virement', date: '2026-05-13' },
  ]);
  const [templates, setTemplates] = useState<Template[]>([
    { id: 't1', name: 'Facture standard', type: 'Facture', activity: 'Général', status: 'Actif', ...defaultTemplate, title: 'Facture moderne' },
    { id: 't2', name: 'Devis garage moderne', type: 'Devis', activity: 'Garage', status: 'Actif', ...defaultTemplate, title: 'Devis atelier' },
  ]);
  const [fields, setFields] = useState<CustomField[]>([
    { id: 'cf1', entity: 'Véhicule', label: 'Garantie constructeur', type: 'Date', activity: 'Garage' },
    { id: 'cf2', entity: 'Client', label: 'Code comptable', type: 'Texte', activity: 'Général' },
  ]);

  const metrics = useMemo(() => {
    const invoiced = invoices.reduce((sum, invoice) => sum + documentTotal(products, invoice.lines), 0);
    const collected = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
    return [
      { label: 'CA facturé', value: money(invoiced), trend: '+18%', icon: FileText },
      { label: 'Encaissements', value: money(collected), trend: `${Math.round((collected / invoiced) * 100)}% encaissé`, icon: CreditCard },
      { label: 'Devis ouverts', value: String(quotes.length), trend: `${quotes.filter((quote) => quote.status !== 'Accepté').length} à suivre`, icon: ClipboardList },
      { label: 'Véhicules suivis', value: String(vehicles.length), trend: '+24 ce mois', icon: Car },
    ];
  }, [invoices, products, quotes, vehicles]);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast('Synchronisé localement'), 1800);
  };
  const openEntity = (kind: NonNullable<RelationTarget>['kind'], entityId: string) => setRelationTarget({ kind, id: entityId });

  const renderPage = () => {
    switch (activePage) {
      case 'crm':
        return (
          <CrmPage
            customers={customers}
            vehicles={vehicles}
            quotes={quotes}
            invoices={invoices}
            products={products}
            query={query}
            onCreate={(customer) => {
              setCustomers((items) => [{ id: id('c'), ...customer }, ...items]);
              flash('Client créé');
            }}
            onUpdate={(customerId, patch) => {
              setCustomers((items) => items.map((item) => (item.id === customerId ? { ...item, ...patch } : item)));
              flash('Client modifié');
            }}
            onOpenEntity={openEntity}
          />
        );
      case 'catalog':
        return (
          <CatalogPage
            products={products}
            quotes={quotes}
            invoices={invoices}
            query={query}
            onCreate={(product) => {
              setProducts((items) => [{ id: id('p'), ...product }, ...items]);
              flash('Article ajouté au catalogue');
            }}
            onUpdate={(productId, patch) => {
              setProducts((items) => items.map((item) => (item.id === productId ? { ...item, ...patch } : item)));
              flash('Article modifié');
            }}
            onOpenEntity={openEntity}
          />
        );
      case 'quotes':
        return (
          <QuotesPage
            customers={customers}
            vehicles={vehicles}
            products={products}
            quotes={quotes}
            query={query}
            onCreate={(quote) => {
              setQuotes((items) => [{ id: id('q'), ...quote }, ...items]);
              flash('Devis créé avec client, article et dossier');
            }}
            onUpdate={(quoteId, patch) => {
              setQuotes((items) => items.map((item) => (item.id === quoteId ? { ...item, ...patch } : item)));
              flash('Devis modifié');
            }}
            onOpenEntity={openEntity}
          />
        );
      case 'invoices':
        return (
          <InvoicesPage
            customers={customers}
            vehicles={vehicles}
            products={products}
            invoices={invoices}
            query={query}
            onCreate={(invoice) => {
              setInvoices((items) => [{ id: id('f'), ...invoice }, ...items]);
              flash('Facture créée avec client, article et dossier');
            }}
            onUpdate={(invoiceId, patch) => {
              setInvoices((items) => items.map((item) => (item.id === invoiceId ? { ...item, ...patch } : item)));
              flash('Facture modifiée');
            }}
            onOpenEntity={openEntity}
          />
        );
      case 'payments':
        return (
          <PaymentsPage
            invoices={invoices}
            customers={customers}
            products={products}
            payments={payments}
            query={query}
            onCreate={(payment) => {
              setPayments((items) => [{ id: id('pay'), date: new Date().toISOString().slice(0, 10), ...payment }, ...items]);
              setInvoices((items) =>
                items.map((invoice) =>
                  invoice.id === payment.invoiceId
                    ? {
                        ...invoice,
                        paid: Math.min(documentTotal(products, invoice.lines), invoice.paid + payment.amount),
                        status: invoice.paid + payment.amount >= documentTotal(products, invoice.lines) ? 'Payée' : 'Acompte',
                      }
                    : invoice,
                ),
              );
              flash('Paiement enregistré');
            }}
            onUpdate={(paymentId, patch) => {
              setPayments((items) => items.map((item) => (item.id === paymentId ? { ...item, ...patch } : item)));
              flash('Paiement modifié');
            }}
            onOpenEntity={openEntity}
          />
        );
      case 'garage':
        return (
          <GarageWorkspace
            customers={customers}
            vehicles={vehicles}
            query={query}
            onCreateVehicle={(vehicle) => {
              setVehicles((items) => [{ id: id('v'), ...vehicle, plate: vehicle.plate.toUpperCase().replace(/\s/g, '') }, ...items]);
              flash('Véhicule ajouté à l’atelier');
            }}
            onUpdateVehicle={(vehicleId, patch) => {
              setVehicles((items) => items.map((item) => (item.id === vehicleId ? { ...item, ...patch, plate: (patch.plate ?? item.plate).toUpperCase().replace(/\s/g, '') } : item)));
              flash('Véhicule modifié');
            }}
            onOpenEntity={openEntity}
          />
        );
      case 'templates':
        return (
          <TemplatesPage
            templates={templates}
            fields={fields}
            onCreateTemplate={(item) => {
              setTemplates((items) => [{ id: id('t'), ...item }, ...items]);
              flash('Modèle ajouté');
            }}
            onUpdateTemplate={(templateId, patch) => {
              setTemplates((items) => items.map((item) => (item.id === templateId ? { ...item, ...patch } : item)));
              flash('Modèle modifié');
            }}
            onCreateField={(item) => {
              setFields((items) => [{ id: id('cf'), ...item }, ...items]);
              flash('Champ ajouté');
            }}
            onUpdateField={(fieldId, patch) => {
              setFields((items) => items.map((item) => (item.id === fieldId ? { ...item, ...patch } : item)));
              flash('Champ modifié');
            }}
          />
        );
      case 'settings':
        return <SettingsPage selectedActivity={selectedActivity} onActivityChange={(activity) => {
          setSelectedActivity(activity);
          flash('Expérience métier modifiée');
        }} onSaved={() => flash('Paramètres modifiés')} />;
      default:
        return <DashboardPage metrics={metrics} selectedActivity={selectedActivity} invoices={invoices} quotes={quotes} products={products} customers={customers} setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-white xl:w-64">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 size={19} />
          </div>
          <div>
            <div className="text-sm font-semibold">Invoxa</div>
            <div className="text-xs text-muted-foreground">Gestion devis & factures</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm transition ${
                activePage === item.key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={15} className="text-emerald-700" />
            Données entreprise protégées
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-white px-4 xl:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search size={18} className="text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher client, facture, devis, véhicule, immatriculation..." />
          </div>
          <div className="relative flex items-center gap-2">
            <Button variant="outline" size="icon" title="Notifications" onClick={() => setShowNotifications((open) => !open)}>
              <Bell size={17} />
            </Button>
            <Button onClick={() => setActivePage('quotes')}>
              <Plus size={17} />
              Nouveau document
            </Button>
            {showNotifications && (
              <Card className="absolute right-0 top-12 z-10 w-80 p-4">
                <div className="mb-3 font-medium">Notifications</div>
                <NotificationLine title="Facture FAC-2026-0099" body="Acompte reçu, solde à relancer." />
                <NotificationLine title="Garage" body="2 véhicules sont en diagnostic." />
              </Card>
            )}
          </div>
        </header>

        <div className="space-y-6 p-4 xl:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 size={16} className="text-emerald-700" />
              {toast}
            </div>
            <Badge>{query ? `Filtre: ${query}` : 'Données démo locales'}</Badge>
          </div>
          {renderPage()}
        </div>
      </main>
      <DetailOverlay
        target={relationTarget}
        customers={customers}
        products={products}
        vehicles={vehicles}
        quotes={quotes}
        invoices={invoices}
        payments={payments}
        onBack={() => setRelationTarget(null)}
        onOpen={openEntity}
      />
    </div>
  );
}

function DashboardPage({
  metrics,
  selectedActivity,
  invoices,
  quotes,
  products,
  customers,
  setActivePage,
}: {
  metrics: Array<{ label: string; value: string; trend: string; icon: typeof FileText }>;
  selectedActivity: ActivityKey;
  invoices: Invoice[];
  quotes: Quote[];
  products: Product[];
  customers: Customer[];
  setActivePage: (page: Page) => void;
}) {
  const experience = activities.find((activity) => activity.key === selectedActivity) ?? activities[0];
  const ExperienceIcon = experience.icon;

  return (
    <>
      <section className="flex flex-col items-stretch justify-between gap-5 xl:flex-row xl:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge>Desktop & tablette</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-normal">Pilotage métier, devis et facturation</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Une interface complète pour suivre les clients, articles, devis, factures, paiements et dossiers atelier.
          </p>
        </div>
        <Card className="w-full p-4 xl:w-[360px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-medium">Expérience métier</div>
            <Button variant="outline" size="sm" onClick={() => setActivePage('settings')}>Modifier</Button>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <ExperienceIcon size={18} className="text-primary" />
              {experience.label}
            </div>
            <p className="text-sm leading-5 text-muted-foreground">{experience.description}</p>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => setActivePage(selectedActivity === 'garage' ? 'garage' : 'settings')}>
              Ouvrir l’espace adapté
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <metric.icon size={18} className="text-primary" />
            </div>
            <div className="text-2xl font-semibold">{metric.value}</div>
            <div className="mt-1 text-xs text-emerald-700">{metric.trend}</div>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Documents récents" action="Créer un devis" onAction={() => setActivePage('quotes')} />
          <div className="space-y-3">
            {[...invoices, ...quotes].slice(0, 4).map((document) => (
              <div key={document.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div>
                  <div className="font-medium">{document.number}</div>
                  <div className="text-muted-foreground">{customerName(customers, document.customerId)}</div>
                  <div className="text-xs text-muted-foreground">{documentSummary(products, document.lines)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{money(documentTotal(products, document.lines))}</div>
                  <Badge>{document.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Liens entre les données" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            {['Clients dans devis/factures', 'Articles du catalogue', 'Véhicules associés', 'Paiements rattachés'].map((label) => (
              <div key={label} className="rounded-md bg-muted p-4">
                <div className="font-medium">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">Accessible et modifiable depuis les pages concernées</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}

function CrmPage({
  customers,
  vehicles,
  quotes,
  invoices,
  products,
  query,
  onCreate,
  onUpdate,
  onOpenEntity,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  quotes: Quote[];
  invoices: Invoice[];
  products: Product[];
  query: string;
  onCreate: (customer: Omit<Customer, 'id'>) => void;
  onUpdate: (id: string, patch: Omit<Customer, 'id'>) => void;
  onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void;
}) {
  const empty = { name: '', companyName: '', email: '', phone: '', mobile: '', type: 'Entreprise', taxNumber: '', paymentTerms: '30 jours', currency: 'EUR', website: '', billingAddress: '', shippingAddress: '', notes: '' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Customer | null>(null);
  const filtered = customers.filter((customer) => matches(query, [customer.name, customer.email, customer.phone, customer.type]));

  return (
    <PageShell title="CRM clients et contacts" description="Fichier client partagé entre les devis, factures et dossiers métier.">
      <FormCard title="Créer un client" onSubmit={(event) => {
        event.preventDefault();
        if (!form.name) return;
        onCreate(form);
        setForm(empty);
      }}>
        <CustomerFields value={form} onChange={setForm} />
      </FormCard>
      <DataTable headers={['Client', 'Société', 'Email', 'Téléphone', 'Conditions', 'Liens', 'Actions']}>
        {filtered.map((customer) => {
          const customerQuotes = quotes.filter((quote) => quote.customerId === customer.id);
          const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id);
          const customerVehicles = vehicles.filter((vehicle) => vehicle.customerId === customer.id);
          return (
            <tr key={customer.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium"><LinkButton onClick={() => onOpenEntity('customer', customer.id)}>{customer.name}</LinkButton></td>
              <td className="px-4 py-3">{customer.companyName}<div><Badge>{customer.type}</Badge></div></td>
              <td className="px-4 py-3">{customer.email}</td>
              <td className="px-4 py-3">{customer.phone}</td>
              <td className="px-4 py-3">{customer.paymentTerms}<div className="text-xs text-muted-foreground">{customer.taxNumber}</div></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                <button className="text-primary hover:underline" onClick={() => customerQuotes[0] && onOpenEntity('quote', customerQuotes[0].id)}>{customerQuotes.length} devis</button>,{' '}
                <button className="text-primary hover:underline" onClick={() => customerInvoices[0] && onOpenEntity('invoice', customerInvoices[0].id)}>{customerInvoices.length} facture(s)</button>,{' '}
                <button className="text-primary hover:underline" onClick={() => customerVehicles[0] && onOpenEntity('vehicle', customerVehicles[0].id)}>{customerVehicles.length} véhicule(s)</button>
                <div>{customerInvoices.slice(0, 1).map((invoice) => documentSummary(products, invoice.lines)).join('')}</div>
              </td>
              <td className="px-4 py-3"><EditButton onClick={() => setEditing(customer)} /></td>
            </tr>
          );
        })}
      </DataTable>
      <EditDialog title="Modifier le client" open={!!editing} onClose={() => setEditing(null)} onSubmit={() => {
        if (!editing) return;
        onUpdate(editing.id, { name: editing.name, companyName: editing.companyName, email: editing.email, phone: editing.phone, mobile: editing.mobile, type: editing.type, taxNumber: editing.taxNumber, paymentTerms: editing.paymentTerms, currency: editing.currency, website: editing.website, billingAddress: editing.billingAddress, shippingAddress: editing.shippingAddress, notes: editing.notes });
        setEditing(null);
      }}>
        {editing && <CustomerFields value={editing} onChange={(value) => setEditing({ ...editing, ...value })} />}
      </EditDialog>
    </PageShell>
  );
}

function CatalogPage({ products, quotes, invoices, query, onCreate, onUpdate, onOpenEntity }: { products: Product[]; quotes: Quote[]; invoices: Invoice[]; query: string; onCreate: (product: Omit<Product, 'id'>) => void; onUpdate: (id: string, patch: Omit<Product, 'id'>) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  const empty = { name: '', type: 'Service', unit: 'forfait', unitPrice: 0, taxRate: 20 };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Product | null>(null);
  const filtered = products.filter((product) => matches(query, [product.name, product.type, product.unit]));
  const usage = (productId: string) => quotes.filter((quote) => quote.lines.some((line) => line.productId === productId)).length + invoices.filter((invoice) => invoice.lines.some((line) => line.productId === productId)).length;

  return (
    <PageShell title="Catalogue produits et prestations" description="Articles réutilisables dans les devis, factures et dossiers d’intervention.">
      <FormCard title="Ajouter un article" onSubmit={(event) => {
        event.preventDefault();
        if (!form.name) return;
        onCreate(form);
        setForm(empty);
      }}>
        <ProductFields value={form} onChange={setForm} />
      </FormCard>
      <DataTable headers={['Article', 'Type', 'Unité', 'Prix HT', 'TVA', 'Utilisations', 'Actions']}>
        {filtered.map((product) => (
          <tr key={product.id} className="border-t border-border">
            <td className="px-4 py-3 font-medium"><LinkButton onClick={() => onOpenEntity('product', product.id)}>{product.name}</LinkButton></td>
            <td className="px-4 py-3"><Badge>{product.type}</Badge></td>
            <td className="px-4 py-3">{product.unit}</td>
            <td className="px-4 py-3">{money(product.unitPrice)}</td>
            <td className="px-4 py-3">{product.taxRate}%</td>
            <td className="px-4 py-3 text-muted-foreground">{usage(product.id)} document(s)</td>
            <td className="px-4 py-3"><EditButton onClick={() => setEditing(product)} /></td>
          </tr>
        ))}
      </DataTable>
      <EditDialog title="Modifier l’article" open={!!editing} onClose={() => setEditing(null)} onSubmit={() => {
        if (!editing) return;
        onUpdate(editing.id, { name: editing.name, type: editing.type, unit: editing.unit, unitPrice: editing.unitPrice, taxRate: editing.taxRate });
        setEditing(null);
      }}>
        {editing && <ProductFields value={editing} onChange={(value) => setEditing({ ...editing, ...value })} />}
      </EditDialog>
    </PageShell>
  );
}

function QuotesPage({ customers, vehicles, products, quotes, query, onCreate, onUpdate, onOpenEntity }: { customers: Customer[]; vehicles: Vehicle[]; products: Product[]; quotes: Quote[]; query: string; onCreate: (quote: Omit<Quote, 'id'>) => void; onUpdate: (id: string, patch: Omit<Quote, 'id'>) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  const empty = { customerId: customers[0]?.id ?? '', vehicleId: vehicles[0]?.id ?? '', productId: products[0]?.id ?? '', quantity: 1, status: 'Brouillon' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Quote | null>(null);
  const filtered = quotes.filter((quote) => matches(query, [quote.number, customerName(customers, quote.customerId), quote.status, vehicleLabel(vehicles, quote.vehicleId), documentSummary(products, quote.lines)]));

  return (
    <PageShell title="Devis" description="Chaque devis rattache un client, des articles du catalogue et un dossier associé.">
      <FormCard title="Créer un devis" onSubmit={(event) => {
        event.preventDefault();
        onCreate({ number: `DEV-2026-${String(quotes.length + 43).padStart(4, '0')}`, customerId: form.customerId, vehicleId: form.vehicleId, status: form.status, lines: [lineFromProduct(products, form.productId, form.quantity)] });
      }}>
        <DocumentFields customers={customers} vehicles={vehicles} products={products} value={form} onChange={setForm} />
      </FormCard>
      <DataTable headers={['Numéro', 'Client', 'Article', 'Dossier', 'Statut', 'Total', 'Actions']}>
        {filtered.map((quote) => (
          <tr key={quote.id} className="border-t border-border">
            <td className="px-4 py-3 font-medium"><LinkButton onClick={() => onOpenEntity('quote', quote.id)}>{quote.number}</LinkButton></td>
            <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('customer', quote.customerId)}>{customerName(customers, quote.customerId)}</LinkButton></td>
            <td className="px-4 py-3">{quote.lines.map((line, index) => <span key={line.productId}>{index > 0 ? ', ' : ''}<LinkButton onClick={() => onOpenEntity('product', line.productId)}>{line.quantity} x {productName(products, line.productId)}</LinkButton></span>)}</td>
            <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('vehicle', quote.vehicleId)}>{vehicleLabel(vehicles, quote.vehicleId)}</LinkButton></td>
            <td className="px-4 py-3"><Badge>{quote.status}</Badge></td>
            <td className="px-4 py-3 font-semibold">{money(documentTotal(products, quote.lines))}</td>
            <td className="px-4 py-3"><EditButton onClick={() => setEditing(quote)} /></td>
          </tr>
        ))}
      </DataTable>
      <DocumentEditDialog kind="devis" customers={customers} vehicles={vehicles} products={products} document={editing} onClose={() => setEditing(null)} onSave={(patch) => {
        if (!editing) return;
        onUpdate(editing.id, { number: editing.number, ...patch });
        setEditing(null);
      }} />
    </PageShell>
  );
}

function InvoicesPage({ customers, vehicles, products, invoices, query, onCreate, onUpdate, onOpenEntity }: { customers: Customer[]; vehicles: Vehicle[]; products: Product[]; invoices: Invoice[]; query: string; onCreate: (invoice: Omit<Invoice, 'id'>) => void; onUpdate: (id: string, patch: Omit<Invoice, 'id'>) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  const empty = { customerId: customers[0]?.id ?? '', vehicleId: vehicles[0]?.id ?? '', paid: 0, status: 'À payer', lines: [lineFromProduct(products, products[0]?.id ?? '', 1)] };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const filtered = invoices.filter((invoice) => matches(query, [invoice.number, customerName(customers, invoice.customerId), invoice.status, vehicleLabel(vehicles, invoice.vehicleId), documentSummary(products, invoice.lines)]));
  const invoiceSubtotal = form.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const invoiceTax = form.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (line.taxRate / 100), 0);
  const invoiceTotal = invoiceSubtotal + invoiceTax;

  return (
    <PageShell title="Factures" description="Chaque facture rattache un client, des articles du catalogue, un dossier et ses paiements.">
      <Card className="p-5">
      <form onSubmit={(event) => {
        event.preventDefault();
        onCreate({ number: `FAC-2026-${String(invoices.length + 100).padStart(4, '0')}`, customerId: form.customerId, vehicleId: form.vehicleId, paid: form.paid, status: form.paid >= invoiceTotal ? 'Payée' : form.paid > 0 ? 'Acompte' : form.status, lines: form.lines });
      }}>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-semibold">Générer une facture</h2>
            <p className="mt-1 text-sm text-muted-foreground">Les prix récupérés du catalogue restent modifiables avant génération.</p>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-4">
          <Select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </Select>
          <Select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} - {vehicle.model}</option>)}
          </Select>
          <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option>À payer</option>
            <option>Acompte</option>
            <option>Payée</option>
          </Select>
          <Input type="number" value={form.paid} onChange={(event) => setForm({ ...form, paid: Number(event.target.value) })} placeholder="Acompte payé" />
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[940px] border-collapse text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Article</th>
                <th className="px-3 py-3">Qté</th>
                <th className="px-3 py-3">Prix HT modifiable</th>
                <th className="px-3 py-3">TVA</th>
                <th className="px-3 py-3 text-right">Total TTC</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, index) => (
                <tr key={`${line.productId}-${index}`} className="border-t border-border">
                  <td className="px-3 py-3">
                    <Select value={line.productId} onChange={(event) => {
                      const nextProduct = products.find((product) => product.id === event.target.value);
                      setForm({ ...form, lines: form.lines.map((item, lineIndex) => lineIndex === index ? { ...item, productId: event.target.value, unitPrice: nextProduct?.unitPrice ?? item.unitPrice, taxRate: nextProduct?.taxRate ?? item.taxRate } : item) });
                    }}>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </Select>
                  </td>
                  <td className="px-3 py-3"><Input type="number" value={line.quantity} onChange={(event) => setForm({ ...form, lines: form.lines.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: Number(event.target.value) } : item) })} /></td>
                  <td className="px-3 py-3"><Input type="number" value={line.unitPrice} onChange={(event) => setForm({ ...form, lines: form.lines.map((item, lineIndex) => lineIndex === index ? { ...item, unitPrice: Number(event.target.value) } : item) })} /></td>
                  <td className="px-3 py-3"><Input type="number" value={line.taxRate} onChange={(event) => setForm({ ...form, lines: form.lines.map((item, lineIndex) => lineIndex === index ? { ...item, taxRate: Number(event.target.value) } : item) })} /></td>
                  <td className="px-3 py-3 text-right font-semibold">{money(line.quantity * line.unitPrice * (1 + line.taxRate / 100))}</td>
                  <td className="px-3 py-3"><Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, lines: form.lines.filter((_item, lineIndex) => lineIndex !== index) })}>Retirer</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded-md bg-muted p-4 text-sm xl:ml-auto xl:w-96">
          <div className="flex justify-between"><span>Sous-total HT</span><strong>{money(invoiceSubtotal)}</strong></div>
          <div className="flex justify-between"><span>TVA</span><strong>{money(invoiceTax)}</strong></div>
          <div className="flex justify-between text-lg"><span>Total TTC</span><strong>{money(invoiceTotal)}</strong></div>
          <div className="mt-2 grid grid-cols-1 gap-2 xl:grid-cols-3">
            <Button type="button" variant="secondary" onClick={() => setForm({ ...form, lines: [...form.lines, lineFromProduct(products, products[0]?.id ?? '', 1)] })}>Ajouter ligne</Button>
            <Button type="submit"><Plus size={16} />Créer</Button>
            <Button type="button" variant="outline" onClick={() => window.print()}><FileText size={16} />PDF</Button>
          </div>
        </div>
      </form>
      </Card>
      <DataTable headers={['Numéro', 'Client', 'Article', 'Dossier', 'Statut', 'Payé', 'Total', 'Actions']}>
        {filtered.map((invoice) => (
          <tr key={invoice.id} className="border-t border-border">
            <td className="px-4 py-3 font-medium"><LinkButton onClick={() => onOpenEntity('invoice', invoice.id)}>{invoice.number}</LinkButton></td>
            <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('customer', invoice.customerId)}>{customerName(customers, invoice.customerId)}</LinkButton></td>
            <td className="px-4 py-3">{invoice.lines.map((line, index) => <span key={line.productId}>{index > 0 ? ', ' : ''}<LinkButton onClick={() => onOpenEntity('product', line.productId)}>{line.quantity} x {productName(products, line.productId)}</LinkButton></span>)}</td>
            <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('vehicle', invoice.vehicleId)}>{vehicleLabel(vehicles, invoice.vehicleId)}</LinkButton></td>
            <td className="px-4 py-3"><Badge className={invoice.status === 'Payée' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}>{invoice.status}</Badge></td>
            <td className="px-4 py-3">{money(invoice.paid)}</td>
            <td className="px-4 py-3 font-semibold">{money(documentTotal(products, invoice.lines))}</td>
            <td className="px-4 py-3"><EditButton onClick={() => setEditing(invoice)} /></td>
          </tr>
        ))}
      </DataTable>
      <DocumentEditDialog kind="facture" customers={customers} vehicles={vehicles} products={products} document={editing} onClose={() => setEditing(null)} onSave={(patch) => {
        if (!editing) return;
        onUpdate(editing.id, { number: editing.number, paid: editing.paid, ...patch });
        setEditing(null);
      }} />
    </PageShell>
  );
}

function PaymentsPage({ invoices, customers, products, payments, query, onCreate, onUpdate, onOpenEntity }: { invoices: Invoice[]; customers: Customer[]; products: Product[]; payments: Payment[]; query: string; onCreate: (payment: Omit<Payment, 'id' | 'date'>) => void; onUpdate: (id: string, patch: Payment) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  const empty = { invoiceId: invoices[0]?.id ?? '', amount: 0, method: 'Carte' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Payment | null>(null);
  const filtered = payments.filter((payment) => {
    const invoice = invoices.find((item) => item.id === payment.invoiceId);
    return matches(query, [invoice?.number ?? '', invoice ? customerName(customers, invoice.customerId) : '', payment.method, payment.amount]);
  });

  return (
    <PageShell title="Paiements et acomptes" description="Enregistrement des paiements et rattachement immédiat aux factures.">
      <FormCard title="Encaisser" onSubmit={(event) => {
        event.preventDefault();
        onCreate(form);
        setForm(empty);
      }}>
        <PaymentFields invoices={invoices} customers={customers} products={products} value={form} onChange={setForm} />
      </FormCard>
      <DataTable headers={['Facture', 'Client', 'Montant', 'Moyen', 'Date', 'Actions']}>
        {filtered.map((payment) => {
          const invoice = invoices.find((item) => item.id === payment.invoiceId);
          return (
            <tr key={payment.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{invoice && <LinkButton onClick={() => onOpenEntity('invoice', invoice.id)}>{invoice.number}</LinkButton>}</td>
              <td className="px-4 py-3">{invoice ? <LinkButton onClick={() => onOpenEntity('customer', invoice.customerId)}>{customerName(customers, invoice.customerId)}</LinkButton> : '-'}</td>
              <td className="px-4 py-3 font-semibold">{money(payment.amount)}</td>
              <td className="px-4 py-3"><Badge>{payment.method}</Badge></td>
              <td className="px-4 py-3">{payment.date}</td>
              <td className="px-4 py-3"><EditButton onClick={() => setEditing(payment)} /></td>
            </tr>
          );
        })}
      </DataTable>
      <EditDialog title="Modifier le paiement" open={!!editing} onClose={() => setEditing(null)} onSubmit={() => {
        if (!editing) return;
        onUpdate(editing.id, editing);
        setEditing(null);
      }}>
        {editing && <PaymentFields invoices={invoices} customers={customers} products={products} value={editing} onChange={(value) => setEditing({ ...editing, ...value })} />}
      </EditDialog>
    </PageShell>
  );
}

function TemplatesPage({ templates, fields, onCreateTemplate, onUpdateTemplate, onCreateField, onUpdateField }: { templates: Template[]; fields: CustomField[]; onCreateTemplate: (template: Omit<Template, 'id'>) => void; onUpdateTemplate: (id: string, patch: Omit<Template, 'id'>) => void; onCreateField: (field: Omit<CustomField, 'id'>) => void; onUpdateField: (id: string, patch: Omit<CustomField, 'id'>) => void }) {
  const [template, setTemplate] = useState({ name: '', type: 'Devis', activity: 'Général', status: 'Actif', ...defaultTemplate });
  const [field, setField] = useState({ entity: 'Client', label: '', type: 'Texte', activity: 'Général' });
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '');
  const [previewData, setPreviewData] = useState({ company: 'Invoxa Démo', email: 'contact@invoxa.example', customer: 'Martin Services', address: '12 rue des Ateliers, 33000 Bordeaux', number: 'DEV-2026-0102', total: '742 €', line: 'Diagnostic électronique + plaquettes de frein' });
  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) ?? templates[0];

  return (
    <PageShell title="Modèles et champs personnalisés" description="Personnalisation par entreprise, activité, type de document et dossier.">
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <FormCard title="Créer un modèle PDF" onSubmit={(event) => {
          event.preventDefault();
          if (!template.name) return;
          onCreateTemplate(template);
          setTemplate({ name: '', type: 'Devis', activity: 'Général', status: 'Actif', ...defaultTemplate });
        }}>
          <TemplateFields value={template} onChange={setTemplate} />
        </FormCard>
        <FormCard title="Créer un champ personnalisé" onSubmit={(event) => {
          event.preventDefault();
          if (!field.label) return;
          onCreateField(field);
          setField({ entity: 'Client', label: '', type: 'Texte', activity: 'Général' });
        }}>
          <FieldFields value={field} onChange={setField} />
        </FormCard>
      </div>
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Modèles" />
          {templates.map((item) => <EditableListRow key={item.id} values={[item.name, item.type, item.activity, item.status]} onEdit={() => setEditingTemplate(item)} />)}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Champs personnalisés" />
          {fields.map((item) => <EditableListRow key={item.id} values={[item.label, item.entity, item.type, item.activity]} onEdit={() => setEditingField(item)} />)}
        </Card>
      </div>
      {selectedTemplate && (
        <Card className="p-5">
          <SectionTitle title="Personnaliser le modèle" />
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <Select value={selectedTemplate.id} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
              <Input value={previewData.company} onChange={(event) => setPreviewData({ ...previewData, company: event.target.value })} placeholder="Nom entreprise" />
              <Input value={previewData.customer} onChange={(event) => setPreviewData({ ...previewData, customer: event.target.value })} placeholder="Client" />
              <Input value={previewData.number} onChange={(event) => setPreviewData({ ...previewData, number: event.target.value })} placeholder="Numéro document" />
              <Input value={previewData.total} onChange={(event) => setPreviewData({ ...previewData, total: event.target.value })} placeholder="Total" />
              <Input value={selectedTemplate.title} onChange={(event) => onUpdateTemplate(selectedTemplate.id, { ...selectedTemplate, title: event.target.value })} placeholder="Titre affiché" />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">Couleur principale<Input type="color" value={selectedTemplate.primaryColor} onChange={(event) => onUpdateTemplate(selectedTemplate.id, { ...selectedTemplate, primaryColor: event.target.value })} /></label>
                <label className="text-sm font-medium">Couleur douce<Input type="color" value={selectedTemplate.accentColor} onChange={(event) => onUpdateTemplate(selectedTemplate.id, { ...selectedTemplate, accentColor: event.target.value })} /></label>
              </div>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-input bg-white p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                value={selectedTemplate.introText}
                onChange={(event) => onUpdateTemplate(selectedTemplate.id, { ...selectedTemplate, introText: event.target.value })}
                placeholder="Texte d’introduction"
              />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-white p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                value={selectedTemplate.paymentText}
                onChange={(event) => onUpdateTemplate(selectedTemplate.id, { ...selectedTemplate, paymentText: event.target.value })}
                placeholder="Conditions de paiement"
              />
              <textarea
                className="min-h-[70px] w-full rounded-md border border-input bg-white p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                value={selectedTemplate.footerText}
                onChange={(event) => onUpdateTemplate(selectedTemplate.id, { ...selectedTemplate, footerText: event.target.value })}
                placeholder="Pied de page"
              />
            </div>
            <div className="rounded-md border border-border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-medium">Aperçu PDF</div>
                <Badge>{selectedTemplate.type}</Badge>
              </div>
              <QuoteTemplatePreview template={selectedTemplate} data={previewData} />
            </div>
          </div>
        </Card>
      )}
      <EditDialog title="Modifier le modèle" open={!!editingTemplate} onClose={() => setEditingTemplate(null)} onSubmit={() => {
        if (!editingTemplate) return;
        onUpdateTemplate(editingTemplate.id, { name: editingTemplate.name, type: editingTemplate.type, activity: editingTemplate.activity, status: editingTemplate.status, title: editingTemplate.title, primaryColor: editingTemplate.primaryColor, accentColor: editingTemplate.accentColor, introText: editingTemplate.introText, footerText: editingTemplate.footerText, paymentText: editingTemplate.paymentText });
        setEditingTemplate(null);
      }}>
        {editingTemplate && <TemplateFields value={editingTemplate} onChange={(value) => setEditingTemplate({ ...editingTemplate, ...value })} />}
      </EditDialog>
      <EditDialog title="Modifier le champ" open={!!editingField} onClose={() => setEditingField(null)} onSubmit={() => {
        if (!editingField) return;
        onUpdateField(editingField.id, { entity: editingField.entity, label: editingField.label, type: editingField.type, activity: editingField.activity });
        setEditingField(null);
      }}>
        {editingField && <FieldFields value={editingField} onChange={(value) => setEditingField({ ...editingField, ...value })} />}
      </EditDialog>
    </PageShell>
  );
}

function SettingsPage({ selectedActivity, onActivityChange, onSaved }: { selectedActivity: ActivityKey; onActivityChange: (activity: ActivityKey) => void; onSaved: () => void }) {
  const [company, setCompany] = useState({ name: 'Invoxa Démo', email: 'contact@invoxa.example', vat: 'FR 12 345678901' });
  return (
    <PageShell title="Paramètres entreprise" description="Configuration entreprise, utilisateurs, rôles, activités et préférences documentaires.">
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-3">
        <Card className="p-5">
          <SectionTitle title="Entreprise" action="Enregistrer" onAction={onSaved} />
          <div className="space-y-3">
            <Input value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} />
            <Input value={company.email} onChange={(event) => setCompany({ ...company, email: event.target.value })} />
            <Input value={company.vat} onChange={(event) => setCompany({ ...company, vat: event.target.value })} />
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Rôles" />
          <SimplePill label="Direction" value="Tous droits" />
          <SimplePill label="Atelier" value="Garage et devis" />
          <SimplePill label="Comptabilité" value="Factures et paiements" />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Expérience métier" />
          <div className="space-y-3">
            {activities.map((activity) => (
              <button
                key={activity.key}
                type="button"
                onClick={() => onActivityChange(activity.key as ActivityKey)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedActivity === activity.key ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-white hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <activity.icon size={16} className="text-primary" />
                  {activity.label}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{activity.description}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function CustomerFields({ value, onChange }: { value: Omit<Customer, 'id'>; onChange: (value: Omit<Customer, 'id'>) => void }) {
  return (
    <>
      <Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Nom client" />
      <Input value={value.companyName} onChange={(event) => onChange({ ...value, companyName: event.target.value })} placeholder="Nom société" />
      <Input value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} placeholder="Email" />
      <Input value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} placeholder="Téléphone" />
      <Input value={value.mobile} onChange={(event) => onChange({ ...value, mobile: event.target.value })} placeholder="Mobile" />
      <Select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>
        <option>Entreprise</option>
        <option>Particulier</option>
        <option>Professionnel</option>
        <option>Flotte</option>
      </Select>
      <Input value={value.taxNumber} onChange={(event) => onChange({ ...value, taxNumber: event.target.value })} placeholder="N° TVA / fiscal" />
      <Select value={value.paymentTerms} onChange={(event) => onChange({ ...value, paymentTerms: event.target.value })}>
        <option>Comptant</option>
        <option>15 jours</option>
        <option>30 jours</option>
        <option>45 jours</option>
        <option>60 jours</option>
      </Select>
      <Select value={value.currency} onChange={(event) => onChange({ ...value, currency: event.target.value })}>
        <option>EUR</option>
        <option>USD</option>
        <option>GBP</option>
      </Select>
      <Input value={value.website} onChange={(event) => onChange({ ...value, website: event.target.value })} placeholder="Site web" />
      <Input value={value.billingAddress} onChange={(event) => onChange({ ...value, billingAddress: event.target.value })} placeholder="Adresse de facturation" />
      <Input value={value.shippingAddress} onChange={(event) => onChange({ ...value, shippingAddress: event.target.value })} placeholder="Adresse de livraison" />
      <Input value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Notes internes" />
    </>
  );
}

function ProductFields({ value, onChange }: { value: Omit<Product, 'id'>; onChange: (value: Omit<Product, 'id'>) => void }) {
  return (
    <>
      <Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Nom" />
      <Select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>
        <option>Service</option>
        <option>Produit</option>
        <option>Forfait</option>
      </Select>
      <Input value={value.unit} onChange={(event) => onChange({ ...value, unit: event.target.value })} placeholder="Unité" />
      <Input type="number" value={value.unitPrice} onChange={(event) => onChange({ ...value, unitPrice: Number(event.target.value) })} placeholder="Prix HT" />
      <Input type="number" value={value.taxRate} onChange={(event) => onChange({ ...value, taxRate: Number(event.target.value) })} placeholder="TVA" />
    </>
  );
}

function DocumentFields({
  customers,
  vehicles,
  products,
  value,
  onChange,
  showPaid = false,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  products: Product[];
  value: { customerId: string; vehicleId: string; productId: string; quantity: number; status: string; paid?: number };
  onChange: (value: any) => void;
  showPaid?: boolean;
}) {
  return (
    <>
      <Select value={value.customerId} onChange={(event) => onChange({ ...value, customerId: event.target.value })}>
        {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
      </Select>
      <Select value={value.productId} onChange={(event) => onChange({ ...value, productId: event.target.value })}>
        {products.map((product) => <option key={product.id} value={product.id}>{product.name} - {money(product.unitPrice)}</option>)}
      </Select>
      <Input type="number" value={value.quantity} onChange={(event) => onChange({ ...value, quantity: Number(event.target.value) })} placeholder="Quantité" />
      <Select value={value.vehicleId} onChange={(event) => onChange({ ...value, vehicleId: event.target.value })}>
        {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} - {vehicle.model}</option>)}
      </Select>
      <Select value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })}>
        <option>Brouillon</option>
        <option>Envoyé</option>
        <option>Accepté</option>
        <option>À payer</option>
        <option>Acompte</option>
        <option>Payée</option>
      </Select>
      {showPaid && <Input type="number" value={value.paid ?? 0} onChange={(event) => onChange({ ...value, paid: Number(event.target.value) })} placeholder="Acompte payé" />}
    </>
  );
}

function DocumentEditDialog({
  kind,
  customers,
  vehicles,
  products,
  document,
  onClose,
  onSave,
}: {
  kind: string;
  customers: Customer[];
  vehicles: Vehicle[];
  products: Product[];
  document: Quote | Invoice | null;
  onClose: () => void;
  onSave: (patch: any) => void;
}) {
  const line = document?.lines[0];
  const value = {
    customerId: document?.customerId ?? '',
    vehicleId: document?.vehicleId ?? '',
    productId: line?.productId ?? '',
    quantity: line?.quantity ?? 1,
    status: document?.status ?? 'Brouillon',
    paid: 'paid' in (document ?? {}) ? (document as Invoice).paid : 0,
  };
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [document?.id]);

  if (!document) return null;

  return (
    <EditDialog title={`Modifier le ${kind}`} open={!!document} onClose={onClose} onSubmit={() => onSave({ customerId: draft.customerId, vehicleId: draft.vehicleId, status: draft.status, paid: draft.paid, lines: [lineFromProduct(products, draft.productId, draft.quantity)] })}>
      <DocumentFields customers={customers} vehicles={vehicles} products={products} value={draft} onChange={setDraft} showPaid={kind === 'facture'} />
    </EditDialog>
  );
}

function PaymentFields({ invoices, customers, products, value, onChange }: { invoices: Invoice[]; customers: Customer[]; products: Product[]; value: { invoiceId: string; amount: number; method: string }; onChange: (value: any) => void }) {
  return (
    <>
      <Select value={value.invoiceId} onChange={(event) => onChange({ ...value, invoiceId: event.target.value })}>
        {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} - {customerName(customers, invoice.customerId)} - {money(documentTotal(products, invoice.lines))}</option>)}
      </Select>
      <Input type="number" value={value.amount} onChange={(event) => onChange({ ...value, amount: Number(event.target.value) })} placeholder="Montant" />
      <Select value={value.method} onChange={(event) => onChange({ ...value, method: event.target.value })}>
        <option>Carte</option>
        <option>Virement</option>
        <option>Espèces</option>
        <option>Chèque</option>
      </Select>
    </>
  );
}

function TemplateFields({ value, onChange }: { value: Omit<Template, 'id'>; onChange: (value: Omit<Template, 'id'>) => void }) {
  return (
    <>
      <Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Nom du modèle" />
      <Select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>
        <option>Facture</option>
        <option>Devis</option>
        <option>PDF atelier</option>
      </Select>
      <Select value={value.activity} onChange={(event) => onChange({ ...value, activity: event.target.value })}>
        <option>Général</option>
        <option>Garage</option>
      </Select>
      <Select value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })}>
        <option>Actif</option>
        <option>Brouillon</option>
      </Select>
      <Input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} placeholder="Titre affiché" />
      <Input type="color" value={value.primaryColor} onChange={(event) => onChange({ ...value, primaryColor: event.target.value })} title="Couleur principale" />
      <Input type="color" value={value.accentColor} onChange={(event) => onChange({ ...value, accentColor: event.target.value })} title="Couleur douce" />
      <Input value={value.introText} onChange={(event) => onChange({ ...value, introText: event.target.value })} placeholder="Texte d’introduction" />
      <Input value={value.paymentText} onChange={(event) => onChange({ ...value, paymentText: event.target.value })} placeholder="Conditions de paiement" />
      <Input value={value.footerText} onChange={(event) => onChange({ ...value, footerText: event.target.value })} placeholder="Pied de page" />
    </>
  );
}

function FieldFields({ value, onChange }: { value: Omit<CustomField, 'id'>; onChange: (value: Omit<CustomField, 'id'>) => void }) {
  return (
    <>
      <Input value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} placeholder="Libellé" />
      <Select value={value.entity} onChange={(event) => onChange({ ...value, entity: event.target.value })}>
        <option>Client</option>
        <option>Véhicule</option>
        <option>Facture</option>
      </Select>
      <Select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}>
        <option>Texte</option>
        <option>Nombre</option>
        <option>Date</option>
        <option>Interrupteur</option>
      </Select>
      <Select value={value.activity} onChange={(event) => onChange({ ...value, activity: event.target.value })}>
        <option>Général</option>
        <option>Garage</option>
      </Select>
    </>
  );
}

function PageShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function FormCard({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <Card className="p-5">
      <form onSubmit={onSubmit}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <Button type="submit" size="sm"><Plus size={15} />Ajouter</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-4">{children}</div>
      </form>
    </Card>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-semibold">{title}</h2>
      {action && <Button variant="outline" size="sm" onClick={onAction}>{action}</Button>}
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Edit3 size={15} />
      Modifier
    </Button>
  );
}

function EditDialog({ title, open, onClose, onSubmit, children }: { title: string; open: boolean; onClose: () => void; onSubmit: () => void; children: ReactNode }) {
  return (
    <Dialog title={title} open={open} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit"><Edit3 size={16} />Enregistrer</Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditableListRow({ values, onEdit }: { values: string[]; onEdit: () => void }) {
  return (
    <div className="mb-2 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 rounded-md border border-border p-3 text-sm">
      {values.map((cell) => <span key={cell}>{cell}</span>)}
      <EditButton onClick={onEdit} />
    </div>
  );
}

function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="font-medium text-primary hover:underline" onClick={onClick}>
      {children}
    </button>
  );
}

function QuoteTemplatePreview({ template, data }: { template: Template; data: { company: string; email: string; customer: string; address: string; number: string; total: string; line: string } }) {
  return (
    <div className="min-h-[480px] overflow-hidden rounded-md border border-border bg-white text-sm">
      <div className="p-8 text-white" style={{ backgroundColor: template.primaryColor }}>
        <div className="text-xs uppercase tracking-[0.18em] opacity-80">{template.type}</div>
        <div className="mt-3 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-semibold">{template.title}</h2>
            <p className="mt-2 opacity-85">{data.company} - {data.email}</p>
          </div>
          <div className="rounded-md bg-white/15 px-4 py-3 text-right">
            <div className="text-xs opacity-80">Numéro</div>
            <div className="text-lg font-semibold">{data.number}</div>
          </div>
        </div>
      </div>
      <div className="p-8">
        <div className="mb-6 rounded-md p-4" style={{ backgroundColor: template.accentColor }}>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Client</div>
          <div className="mt-1 text-lg font-semibold">{data.customer}</div>
          <div className="text-muted-foreground">{data.address}</div>
        </div>
        <p className="mb-6 leading-6 text-muted-foreground">{template.introText}</p>
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[1fr_140px] bg-muted px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
            <span>Prestation</span>
            <span className="text-right">Total</span>
          </div>
          <div className="grid grid-cols-[1fr_140px] px-4 py-5">
            <span>{data.line}</span>
            <span className="text-right font-semibold">{data.total}</span>
          </div>
        </div>
        <div className="mt-6 rounded-md border border-border p-4">
          <div className="font-medium">Conditions</div>
          <p className="mt-1 text-muted-foreground">{template.paymentText}</p>
        </div>
        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">{template.footerText}</div>
      </div>
    </div>
  );
}

function DetailOverlay({
  target,
  customers,
  products,
  vehicles,
  quotes,
  invoices,
  payments,
  onBack,
  onOpen,
}: {
  target: RelationTarget;
  customers: Customer[];
  products: Product[];
  vehicles: Vehicle[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  onBack: () => void;
  onOpen: (kind: NonNullable<RelationTarget>['kind'], id: string) => void;
}) {
  if (!target) return null;

  const titleMap = {
    customer: 'Fiche client',
    product: 'Article du catalogue',
    quote: 'Devis',
    invoice: 'Facture',
    vehicle: 'Véhicule',
    payment: 'Paiement',
  };

  const customer = target.kind === 'customer' ? customers.find((item) => item.id === target.id) : undefined;
  const product = target.kind === 'product' ? products.find((item) => item.id === target.id) : undefined;
  const quote = target.kind === 'quote' ? quotes.find((item) => item.id === target.id) : undefined;
  const invoice = target.kind === 'invoice' ? invoices.find((item) => item.id === target.id) : undefined;
  const vehicle = target.kind === 'vehicle' ? vehicles.find((item) => item.id === target.id) : undefined;
  const payment = target.kind === 'payment' ? payments.find((item) => item.id === target.id) : undefined;
  const ownerId = customer?.id ?? quote?.customerId ?? invoice?.customerId ?? vehicle?.customerId ?? (payment ? invoices.find((item) => item.id === payment.invoiceId)?.customerId : undefined);
  const relatedQuotes = ownerId ? quotes.filter((item) => item.customerId === ownerId) : [];
  const relatedInvoices = ownerId ? invoices.filter((item) => item.customerId === ownerId) : [];
  const relatedVehicles = ownerId ? vehicles.filter((item) => item.customerId === ownerId) : [];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[min(980px,calc(100vw-224px))] overflow-auto border-l border-border bg-background p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{titleMap[target.kind]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Vue relationnelle avec éléments rattachés.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Retour</Button>
          <Button><Edit3 size={16} />Modifier</Button>
        </div>
      </div>
      <div className="space-y-5">
        {customer && <DetailGrid rows={[
          ['Nom', customer.name],
          ['Société', customer.companyName],
          ['Email', customer.email],
          ['Téléphone', customer.phone],
          ['Mobile', customer.mobile],
          ['TVA / fiscal', customer.taxNumber],
          ['Conditions', customer.paymentTerms],
          ['Devise', customer.currency],
          ['Site web', customer.website],
          ['Facturation', customer.billingAddress],
          ['Livraison', customer.shippingAddress],
          ['Notes', customer.notes],
        ]} />}
        {product && <DetailGrid rows={[
          ['Nom', product.name],
          ['Type', product.type],
          ['Unité', product.unit],
          ['Prix HT', money(product.unitPrice)],
          ['TVA', `${product.taxRate}%`],
        ]} />}
        {quote && <DocumentDetail document={quote} customers={customers} vehicles={vehicles} products={products} onOpen={onOpen} />}
        {invoice && <DocumentDetail document={invoice} customers={customers} vehicles={vehicles} products={products} onOpen={onOpen} />}
        {vehicle && <DetailGrid rows={[
          ['Immatriculation', vehicle.plate],
          ['Client', customerName(customers, vehicle.customerId)],
          ['Modèle', vehicle.model],
          ['Kilométrage', `${vehicle.mileage.toLocaleString('fr-FR')} km`],
          ['Statut', vehicle.status],
        ]} />}
        {payment && <DetailGrid rows={[
          ['Facture', invoices.find((item) => item.id === payment.invoiceId)?.number ?? '-'],
          ['Montant', money(payment.amount)],
          ['Moyen', payment.method],
          ['Date', payment.date],
        ]} />}
        {ownerId && (
          <Card className="p-4">
            <SectionTitle title="Relations" />
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <RelationColumn title="Devis" items={relatedQuotes.map((item) => ({ id: item.id, label: item.number, kind: 'quote' as const }))} onOpen={onOpen} />
              <RelationColumn title="Factures" items={relatedInvoices.map((item) => ({ id: item.id, label: item.number, kind: 'invoice' as const }))} onOpen={onOpen} />
              <RelationColumn title="Véhicules" items={relatedVehicles.map((item) => ({ id: item.id, label: vehicleLabel(vehicles, item.id), kind: 'vehicle' as const }))} onOpen={onOpen} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function DocumentDetail({ document, customers, vehicles, products, onOpen }: { document: Quote | Invoice; customers: Customer[]; vehicles: Vehicle[]; products: Product[]; onOpen: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  return (
    <DetailGrid rows={[
      ['Numéro', document.number],
      ['Client', customerName(customers, document.customerId)],
      ['Dossier', vehicleLabel(vehicles, document.vehicleId)],
      ['Articles', documentSummary(products, document.lines)],
      ['Statut', document.status],
      ['Total', money(documentTotal(products, document.lines))],
    ]}>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <LinkButton onClick={() => onOpen('customer', document.customerId)}>Ouvrir le client</LinkButton>
        <LinkButton onClick={() => onOpen('vehicle', document.vehicleId)}>Ouvrir le véhicule</LinkButton>
        {document.lines.map((line) => <LinkButton key={line.productId} onClick={() => onOpen('product', line.productId)}>Ouvrir {productName(products, line.productId)}</LinkButton>)}
      </div>
    </DetailGrid>
  );
}

function DetailGrid({ rows, children }: { rows: string[][]; children?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-muted p-3 text-sm">
            <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
            <div className="mt-1 font-medium">{value || '-'}</div>
          </div>
        ))}
      </div>
      {children}
    </Card>
  );
}

function RelationColumn({ title, items, onOpen }: { title: string; items: Array<{ id: string; label: string; kind: NonNullable<RelationTarget>['kind'] }>; onOpen: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="space-y-2">
        {items.length ? items.map((item) => <LinkButton key={item.id} onClick={() => onOpen(item.kind, item.id)}>{item.label}</LinkButton>) : <span className="text-sm text-muted-foreground">Aucun élément</span>}
      </div>
    </div>
  );
}

function NotificationLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-border py-3 text-sm first:border-t-0 first:pt-0">
      <div className="font-medium">{title}</div>
      <div className="text-muted-foreground">{body}</div>
    </div>
  );
}

function SimplePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-border p-3 text-sm">
      <span className="font-medium">{label}</span>
      <Badge>{value}</Badge>
    </div>
  );
}
