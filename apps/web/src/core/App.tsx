import { Children, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  Edit3,
  FileCog,
  FileText,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Palette,
  PanelTop,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sigma,
  Sparkles,
  Table2,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { GarageWorkspace } from '../modules/garage/pages/GarageWorkspace';

type Page = 'dashboard' | 'crm' | 'catalog' | 'quotes' | 'invoices' | 'payments' | 'garage' | 'templates' | 'settings' | 'help';
type ActivityKey = 'garage' | 'services';
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
type Quote = { id: string; number: string; customerId: string; vehicleId: string; status: string; lines: LineItem[]; issueDate?: string; validUntil?: string; notes?: string };
type Invoice = { id: string; number: string; customerId: string; vehicleId: string; paid: number; status: string; lines: LineItem[]; issueDate?: string; dueDate?: string; notes?: string };
type Payment = { id: string; invoiceId: string; amount: number; method: string; date: string };
type Template = {
  id: string;
  name: string;
  type: string;
  activity: string;
  status: string;
  title: string;
  primaryColor: string;
  accentColor: string;
  introText: string;
  footerText: string;
  paymentText: string;
  paperSize: string;
  orientation: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  includePayment: boolean;
  companyName: string;
  companyAddress: string;
  companyPostalCity: string;
  companyPhone: string;
  companyEmail: string;
  companyLegal: string;
  companyRegistration: string;
  companyVat: string;
  cgv: string;
};
type CustomField = { id: string; entity: string; label: string; type: string; activity: string };
type RelationTarget = { kind: 'customer' | 'product' | 'quote' | 'invoice' | 'vehicle' | 'payment'; id: string } | null;

const nav: Array<{ key: Page; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'invoices', label: 'Nouvelle facture', icon: FileText },
  { key: 'crm', label: 'Clients', icon: Users },
  { key: 'garage', label: 'Garage', icon: Car },
  { key: 'catalog', label: 'Catalogue', icon: Package },
  { key: 'payments', label: 'Historique', icon: Clock },
  { key: 'templates', label: 'Modèle facture', icon: Sparkles },
];

const activities = [
  { key: 'garage', label: 'Garage automobile', description: 'Véhicules, atelier et ordres de réparation', icon: Car },
  { key: 'services', label: 'Commerce / Vente', description: 'Factures et ventes au comptoir', icon: Package },
];

const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR').format(new Date(value));
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
  title: 'Facture',
  primaryColor: '#111827',
  accentColor: '#f3f3f3',
  introText: 'Catégorie d’opérations : Livraison de marchandises',
  footerText: 'Powered by Invoxa',
  paymentText: 'Règlement à réception.',
  paperSize: 'A4',
  orientation: 'Portrait',
  marginTop: 0.7,
  marginBottom: 0.7,
  marginLeft: 0.55,
  marginRight: 0.45,
  includePayment: true,
  companyName: 'CENTER AUTO PIECE',
  companyAddress: '1 RUE DES ARTS',
  companyPostalCity: '59280 ARMENTIERES',
  companyPhone: '03 20 95 31 98',
  companyEmail: 'cap59280@hotmail.com',
  companyLegal: 'Société à responsabilité limitée (SARL) - Capital de 4 000 € - SIRET: 84238627800019',
  companyRegistration: 'RCS/RM: 842 386 278 R.C.S. Lille - Numéro TVA: FR95842386278',
  companyVat: 'FR95842386278',
  cgv: 'Les marchandises livrées demeurent notre propriété jusqu’au paiement intégral en application de la loi du 12 Mai 1980. Retard de paiement : pénalités calculées sur la base de 3 fois le taux d’intérêt légal en vigueur + indemnité forfaitaire de 40 € pour frais de recouvrement. Pas d’escompte pour paiement anticipé. Rétraction et politique de remboursement : un achat effectué en magasin est réputé ferme et définitif.',
};

const templatePreviewData = {
  company: '{{ entreprise.nom }}',
  email: '{{ entreprise.email }}',
  recipient: '{{ destinataire.nom }}',
  recipientAddress: '{{ destinataire.adresse_facturation }}',
  number: '{{ document.numero }}',
  total: '{{ document.total_ttc }}',
  line: '{{ ligne.description }}',
};

const templateVariables = [
  '{{ entreprise.nom }}',
  '{{ document.numero }}',
  '{{ document.date }}',
  '{{ destinataire.nom }}',
  '{{ ligne.description }}',
  '{{ document.total_ttc }}',
];

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'invoxa2026') {
      onLogin();
    } else {
      setError('Identifiants incorrects');
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="text-3xl font-black tracking-tight">Invoxa</div>
          <div className="mt-1 text-sm text-muted-foreground">Connectez-vous pour continuer</div>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identifiant</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mot de passe</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" className="w-full">Se connecter</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('invoxa_auth') === 'ok');
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState('Bienvenue');
  const [selectedActivity, setSelectedActivity] = useState<ActivityKey>('garage');
  const [company, setCompany] = useState({
    name: 'CENTER AUTO PIECE',
    address: '1 RUE DES ARTS',
    postalCity: '59280 ARMENTIERES',
    phone: '03 20 95 31 98',
    email: 'cap59280@hotmail.com',
    legal: 'Société à responsabilité limitée (SARL) - Capital de 4 000 € - SIRET: 84238627800019',
    registration: 'RCS/RM: 842 386 278 R.C.S. Lille - Numéro TVA: FR95842386278',
    vat: 'FR95842386278',
    cgv: "Les marchandises livrées demeurent notre propriété jusqu'au paiement intégral en application de la loi du 12 Mai 1980. Retard de paiement : pénalités calculées sur la base de 3 fois le taux d'intérêt légal en vigueur + indemnité forfaitaire de 40 € pour frais de recouvrement. Pas d'escompte pour paiement anticipé. Rétraction et politique de remboursement : un achat effectué en magasin est réputé ferme et définitif.",
  });
  const [relationTarget, setRelationTarget] = useState<RelationTarget>(null);
  const [relationHistory, setRelationHistory] = useState<NonNullable<RelationTarget>[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'c1', name: 'Martin Services', companyName: 'Martin Services SARL', email: 'contact@martin.example', phone: '06 21 48 90 12', mobile: '06 21 48 90 13', type: 'Entreprise', taxNumber: 'FR 45 123456789', paymentTerms: '30 jours', currency: 'EUR', website: 'martin-services.example', billingAddress: '12 rue des Ateliers, 33000 Bordeaux', shippingAddress: '12 rue des Ateliers, 33000 Bordeaux', notes: 'Client flotte utilitaires.' },
    { id: 'c2', name: 'Cabinet Dentaire Nova', companyName: 'Cabinet Dentaire Nova', email: 'admin@nova.example', phone: '05 59 11 20 30', mobile: '06 70 10 20 30', type: 'Professionnel', taxNumber: 'FR 31 987654321', paymentTerms: 'Comptant', currency: 'EUR', website: 'nova-dentaire.example', billingAddress: '8 avenue Santé, 64000 Pau', shippingAddress: '8 avenue Santé, 64000 Pau', notes: 'Priorité véhicule de remplacement.' },
    { id: 'c3', name: 'Logisud', companyName: 'Logisud Transport', email: 'fleet@logisud.example', phone: '04 88 91 42 10', mobile: '06 88 91 42 10', type: 'Flotte', taxNumber: 'FR 89 456789123', paymentTerms: '45 jours', currency: 'EUR', website: 'logisud.example', billingAddress: '22 quai Logistique, 13002 Marseille', shippingAddress: 'Dépôt Sud, 13015 Marseille', notes: 'Validation par responsable parc.' },
  ]);
  const [products, setProducts] = useState<Product[]>([
    { id: 'p1', name: 'Diagnostic électronique', type: 'Service', unit: 'forfait', unitPrice: 89, taxRate: 20 },
    { id: 'p2', name: "Main-d'oeuvre mécanique", type: 'Service', unit: 'heure', unitPrice: 72, taxRate: 20 },
    { id: 'p3', name: 'Plaquettes de frein', type: 'Produit', unit: 'jeu', unitPrice: 64, taxRate: 20 },
  ]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: 'v1', plate: 'AB-482-KL', customerId: 'c1', model: 'Renault Master', mileage: 182400, status: 'Diagnostic' },
    { id: 'v2', plate: 'GH-219-TQ', customerId: 'c2', model: 'Peugeot 308', mileage: 73120, status: 'En atelier' },
    { id: 'v3', plate: 'PT-902-RS', customerId: 'c3', model: 'Mercedes Vito', mileage: 241850, status: 'Prêt' },
  ]);
  const [quotes, setQuotes] = useState<Quote[]>([
    { id: 'q1', number: 'DEV-2026-0041', customerId: 'c1', vehicleId: 'v1', status: 'Envoyé', lines: [{ productId: 'p1', quantity: 1, unitPrice: 89, taxRate: 20 }, { productId: 'p3', quantity: 2, unitPrice: 64, taxRate: 20 }], issueDate: '2026-05-08', validUntil: '2026-06-08', notes: '' },
    { id: 'q2', number: 'DEV-2026-0042', customerId: 'c3', vehicleId: 'v3', status: 'Brouillon', lines: [{ productId: 'p2', quantity: 8, unitPrice: 72, taxRate: 20 }], issueDate: '2026-05-12', validUntil: '2026-06-12', notes: 'Main-d\'oeuvre en attente de confirmation des pièces.' },
  ]);
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'f1', number: 'FAC-2026-0098', customerId: 'c2', vehicleId: 'v2', paid: 389, status: 'Payée', lines: [{ productId: 'p2', quantity: 4.5, unitPrice: 72, taxRate: 20 }], issueDate: '2026-05-01', dueDate: '2026-05-31' },
    { id: 'f2', number: 'FAC-2026-0099', customerId: 'c1', vehicleId: 'v1', paid: 250, status: 'Acompte', lines: [{ productId: 'p1', quantity: 1, unitPrice: 89, taxRate: 20 }, { productId: 'p3', quantity: 2, unitPrice: 64, taxRate: 20 }], issueDate: '2026-05-10', dueDate: '2026-06-10', notes: 'Acompte de 250 EUR recu le 13 mai.' },
  ]);
  const [payments, setPayments] = useState<Payment[]>([
    { id: 'pay1', invoiceId: 'f1', amount: 389, method: 'Carte', date: '2026-05-12' },
    { id: 'pay2', invoiceId: 'f2', amount: 250, method: 'Virement', date: '2026-05-13' },
  ]);
  const [templates, setTemplates] = useState<Template[]>([
    { id: 't1', name: 'Garage Central - Lyon', type: 'Facture', activity: 'Garage', status: 'Par défaut', ...defaultTemplate },
    { id: 't2', name: 'Devis garage simple', type: 'Devis', activity: 'Garage', status: 'Actif', ...defaultTemplate, title: 'Devis', introText: 'Proposition de réparation et entretien véhicule.' },
  ]);
  const [fields, setFields] = useState<CustomField[]>([
    { id: 'cf1', entity: 'Véhicule', label: 'Garantie constructeur', type: 'Date', activity: 'Garage' },
    { id: 'cf2', entity: 'Client', label: 'Code comptable', type: 'Texte', activity: 'Général' },
  ]);

  useEffect(() => {
    if (!query) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = window.setTimeout(() => setIsSearching(false), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const metrics = useMemo(() => {
    const invoiced = invoices.reduce((sum, invoice) => sum + documentTotal(products, invoice.lines), 0);
    const collected = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
    const unpaid = invoiced - collected;
    return [
      { label: "Chiffre d'affaires global", value: money(invoiced), trend: `${invoices.length} facture${invoices.length !== 1 ? 's' : ''}`, icon: FileText },
      { label: 'Factures encaissées', value: money(collected), trend: invoiced > 0 ? `${Math.round((collected / invoiced) * 100)}% du total réglé` : '—', icon: CreditCard },
      { label: 'En attente / impayés', value: money(unpaid), trend: unpaid > 0 ? 'Relances à prévoir' : 'Tout encaissé', icon: Clock },
    ];
  }, [invoices, products, quotes, vehicles]);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast('Enregistré'), 1800);
  };
  const companyTemplate = {
    ...defaultTemplate,
    companyName: company.name,
    companyAddress: company.address,
    companyPostalCity: company.postalCity,
    companyPhone: company.phone,
    companyEmail: company.email,
    companyLegal: company.legal,
    companyRegistration: company.registration,
    companyVat: company.vat,
    cgv: company.cgv,
  };
  const openEntity = (kind: NonNullable<RelationTarget>['kind'], entityId: string) => {
    const next = { kind, id: entityId };
    setRelationTarget((current) => {
      if (current && (current.kind !== next.kind || current.id !== next.id)) {
        setRelationHistory((items) => [...items, current]);
      }
      return next;
    });
  };
  const backEntity = () => {
    setRelationHistory((items) => {
      const previous = items[items.length - 1];
      if (previous) {
        setRelationTarget(previous);
        return items.slice(0, -1);
      }
      setRelationTarget(null);
      return [];
    });
  };
  const navigateTo = (page: Page) => {
    setActivePage(page);
    setRelationTarget(null);
    setRelationHistory([]);
  };
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
            onDelete={(customerId) => {
              const removedInvoiceIds = invoices.filter((invoice) => invoice.customerId === customerId).map((invoice) => invoice.id);
              setCustomers((items) => items.filter((item) => item.id !== customerId));
              setVehicles((items) => items.filter((item) => item.customerId !== customerId));
              setQuotes((items) => items.filter((item) => item.customerId !== customerId));
              setInvoices((items) => items.filter((item) => item.customerId !== customerId));
              setPayments((items) => items.filter((item) => !removedInvoiceIds.includes(item.invoiceId)));
              flash('Client supprimé');
            }}
            onOpenEntity={openEntity}
          />
        );
      case 'catalog':
        return (
          <CatalogPage
            customers={customers}
            products={products}
            quotes={quotes}
            invoices={invoices}
            query={query}
            onCreate={(product) => {
              setProducts((items) => [{ id: id('p'), ...product }, ...items]);
              flash('Article créé');
            }}
            onUpdate={(productId, patch) => {
              setProducts((items) => items.map((item) => (item.id === productId ? { ...item, ...patch } : item)));
              flash('Article modifié');
            }}
            onDelete={(productId) => {
              setProducts((items) => items.filter((item) => item.id !== productId));
              setQuotes((items) => items.map((item) => ({ ...item, lines: item.lines.filter((line) => line.productId !== productId) })));
              setInvoices((items) => items.map((item) => ({ ...item, lines: item.lines.filter((line) => line.productId !== productId) })));
              flash('Article supprimé');
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
            templates={templates}
            quotes={quotes}
            query={query}
            companyOverride={companyTemplate}
            onCreate={(quote) => {
              setQuotes((items) => [{ id: id('q'), ...quote }, ...items]);
              flash('Devis créé');
            }}
            onUpdate={(quoteId, patch) => {
              setQuotes((items) => items.map((item) => (item.id === quoteId ? { ...item, ...patch } : item)));
              flash('Devis modifié');
            }}
            onOpenEntity={openEntity}
            onCreateCustomer={(customer) => { const newId = id('c'); setCustomers((items) => [{ id: newId, ...customer }, ...items]); flash('Client créé'); return newId; }}
            onCreateProduct={(product) => { const newId = id('p'); setProducts((items) => [{ id: newId, ...product }, ...items]); flash('Article créé'); return newId; }}
          />
        );
      case 'invoices':
        return (
          <InvoicesPage
            customers={customers}
            vehicles={vehicles}
            products={products}
            templates={templates}
            invoices={invoices}
            query={query}
            startCreate
            companyOverride={companyTemplate}
            onCreate={(invoice) => {
              setInvoices((items) => [{ id: id('f'), ...invoice }, ...items]);
              flash('Facture créée');
            }}
            onUpdate={(invoiceId, patch) => {
              setInvoices((items) => items.map((item) => (item.id === invoiceId ? { ...item, ...patch } : item)));
              flash('Facture modifiée');
            }}
            onOpenEntity={openEntity}
            onCreateCustomer={(customer) => { const newId = id('c'); setCustomers((items) => [{ id: newId, ...customer }, ...items]); flash('Client créé'); return newId; }}
            onCreateProduct={(product) => { const newId = id('p'); setProducts((items) => [{ id: newId, ...product }, ...items]); flash('Article créé'); return newId; }}
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
              flash("Véhicule ajouté à l'atelier");
            }}
            onUpdateVehicle={(vehicleId, patch) => {
              setVehicles((items) => items.map((item) => (item.id === vehicleId ? { ...item, ...patch, plate: (patch.plate ?? item.plate).toUpperCase().replace(/\s/g, '') } : item)));
              flash('Véhicule modifié');
            }}
            onCreateGarageQuote={(vehicle) => {
              setQuotes((items) => [{ id: id('q'), number: `DEV-2026-${String(items.length + 43).padStart(4, '0')}`, customerId: vehicle.customerId, vehicleId: vehicle.id, status: 'Brouillon', issueDate: new Date().toISOString().slice(0, 10), validUntil: '', notes: `Devis atelier pour ${vehicle.plate} - ${vehicle.model}`, lines: [lineFromProduct(products, products[0]?.id ?? '', 1)] }, ...items]);
              navigateTo('quotes');
              flash('Devis garage créé');
            }}
            onCreateGarageInvoice={(vehicle) => {
              navigateTo('invoices');
              flash('Saisissez le numéro de facture avant validation');
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
            onClose={() => navigateTo('settings')}
          />
        );
      case 'settings':
        return <SettingsPage
          company={company}
          onCompanyChange={(updated) => { setCompany(updated); flash('Paramètres enregistrés'); }}
          selectedActivity={selectedActivity}
          onActivityChange={(activity) => { setSelectedActivity(activity); flash('Paramètres enregistrés'); }}
          onSaved={() => flash('Paramètres enregistrés')}
        />;
      case 'help':
        return <HelpPage setActivePage={navigateTo} />;
      default:
        return <DashboardPage metrics={metrics} selectedActivity={selectedActivity} invoices={invoices} quotes={quotes} products={products} customers={customers} setActivePage={navigateTo} />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => { localStorage.setItem('invoxa_auth', 'ok'); setIsLoggedIn(true); }} />;
  }

  if (activePage === 'templates') {
    return renderPage();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-white xl:w-64">
        <div className="flex h-20 items-center border-b border-border px-5">
          <div className="text-2xl font-black tracking-tight">Invoxa</div>
        </div>
        <nav className="flex-1 space-y-2 px-4 py-8">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => navigateTo(item.key)}
              className={`flex h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-bold transition ${
                activePage === item.key ? 'border border-black bg-white text-black shadow-sm' : 'text-muted-foreground hover:bg-white hover:text-black'
              }`}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-4 space-y-3">
          <div className="rounded-2xl bg-black p-4 text-white">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
              <Sparkles size={15} />
              {company.name}
            </div>
            <p className="mt-2 text-xs leading-5 text-white/70">Garage automobile · Factures &amp; devis</p>
          </div>
          <button
            type="button"
            onClick={() => { localStorage.removeItem('invoxa_auth'); setIsLoggedIn(false); }}
            className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
          >
            <X size={14} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-white px-4 xl:px-6">
          <div className="relative hidden lg:block">
            <select
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-border appearance-none pr-7"
            >
              <option>CENTER AUTO PIECE</option>
              <option>CAP - Dépôt Nord</option>
            </select>
            <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground" style={{display:'none'}} />
            <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search size={18} className="text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un client, une facture, un véhicule..." />
          </div>
          <div className="relative flex items-center gap-2">
            <Button variant="outline" size="icon" title="Notifications" onClick={() => setShowNotifications((open) => !open)}>
              <Bell size={17} />
            </Button>
            <Button onClick={() => navigateTo('invoices')}>
              <Plus size={17} />
              Nouvelle facture
            </Button>
            {showNotifications && (
              <Card className="absolute right-0 top-12 z-10 w-80 p-4">
                <div className="mb-3 font-semibold">Alertes</div>
                {invoices.filter((inv) => inv.status !== 'Payée').slice(0, 3).map((inv) => (
                  <NotificationLine key={inv.id} title={inv.number} body={`${customerName(customers, inv.customerId)} — ${money(documentTotal(products, inv.lines) - inv.paid)} restant`} />
                ))}
                {quotes.filter((q) => q.status === 'Envoyé').slice(0, 2).map((q) => (
                  <NotificationLine key={q.id} title={q.number} body={`Devis envoyé à ${customerName(customers, q.customerId)} — en attente`} />
                ))}
                {invoices.filter((inv) => inv.status !== 'Payée').length === 0 && quotes.filter((q) => q.status === 'Envoyé').length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune alerte en cours.</p>
                )}
              </Card>
            )}
          </div>
        </header>

        <div className="space-y-6 p-4 xl:p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSearching ? <LoaderCircle size={16} className="animate-spin text-primary" /> : <CheckCircle2 size={16} className="text-emerald-700" />}
            {isSearching ? 'Recherche…' : toast}
          </div>
          {renderPage()}
        </div>
      </main>
      {relationTarget && (
        <DetailOverlay
          target={relationTarget}
          customers={customers}
          products={products}
          vehicles={vehicles}
          quotes={quotes}
          invoices={invoices}
          payments={payments}
          onBack={backEntity}
          onOpen={openEntity}
          onUpdateCustomer={(customerId, patch) => { setCustomers((items) => items.map((item) => item.id === customerId ? { ...item, ...patch } : item)); flash('Client modifié'); }}
          onUpdateProduct={(productId, patch) => { setProducts((items) => items.map((item) => item.id === productId ? { ...item, ...patch } : item)); flash('Article modifié'); }}
          onUpdateVehicle={(vehicleId, patch) => { setVehicles((items) => items.map((item) => item.id === vehicleId ? { ...item, ...patch, plate: (patch.plate ?? item.plate).toUpperCase().replace(/\s/g, '') } : item)); flash('Véhicule modifié'); }}
          onUpdatePayment={(paymentId, patch) => { setPayments((items) => items.map((item) => item.id === paymentId ? { ...item, ...patch } : item)); flash('Paiement modifié'); }}
        />
      )}
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
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActivePage('invoices')}><FileText size={15} /> Nouvelle facture</Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><metric.icon size={14} className="text-primary" /></div>
            </div>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{metric.trend}</div>
          </Card>
        ))}
      </section>

      {(invoices.filter((inv) => inv.status !== 'Payée').length > 0 || quotes.filter((q) => q.status === 'Envoyé').length > 0) && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {invoices.filter((inv) => inv.status !== 'Payée').length > 0 && (
            <Card className="border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-700" />
                <span className="font-semibold text-amber-950">
                  {invoices.filter((inv) => inv.status !== 'Payée').length} facture{invoices.filter((inv) => inv.status !== 'Payée').length !== 1 ? 's' : ''} à encaisser
                </span>
              </div>
              <div className="space-y-2">
                {invoices.filter((inv) => inv.status !== 'Payée').slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-amber-950">{inv.number}</span>
                    <span className="text-amber-800">{customerName(customers, inv.customerId)}</span>
                    <span className="font-semibold text-amber-950">{money(documentTotal(products, inv.lines) - inv.paid)}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setActivePage('invoices')} className="mt-3 text-xs font-bold text-amber-900 hover:underline">Voir les factures →</button>
            </Card>
          )}
          {quotes.filter((q) => q.status === 'Envoyé').length > 0 && (
            <Card className="border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock size={16} className="text-blue-700" />
                <span className="font-semibold text-blue-950">
                  {quotes.filter((q) => q.status === 'Envoyé').length} devis envoyé{quotes.filter((q) => q.status === 'Envoyé').length !== 1 ? 's' : ''} sans réponse
                </span>
              </div>
              <div className="space-y-2">
                {quotes.filter((q) => q.status === 'Envoyé').slice(0, 3).map((q) => (
                  <div key={q.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-950">{q.number}</span>
                    <span className="text-blue-800">{customerName(customers, q.customerId)}</span>
                    <span className="font-semibold text-blue-950">{money(documentTotal(products, q.lines))}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setActivePage('quotes')} className="mt-3 text-xs font-bold text-blue-900 hover:underline">Voir les devis →</button>
            </Card>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Derniers documents" action="Voir les factures" onAction={() => setActivePage('invoices')} />
          <div className="space-y-2">
            {[...invoices, ...quotes].slice(0, 5).map((document) => (
              <div key={document.id} className="flex items-center justify-between rounded-md border border-border bg-white p-3 text-sm">
                <div>
                  <div className="font-medium">{document.number}</div>
                  <div className="text-xs text-muted-foreground">{customerName(customers, document.customerId)}</div>
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
          <SectionTitle title="Accès rapides" />
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Mes clients', icon: Users, page: 'crm' },
              { label: 'Atelier / Véhicules', icon: Car, page: 'garage' },
              { label: 'Articles & tarifs', icon: Package, page: 'catalog' },
              { label: 'Encaissements', icon: Wallet, page: 'payments' },
            ] as Array<{ label: string; icon: typeof Users; page: Page }>).map(({ label, icon: Icon, page }) => (
              <button key={page} type="button" onClick={() => setActivePage(page)}
                className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                <Icon size={18} className="text-primary" />
                {label}
              </button>
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
  onDelete,
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
  onDelete: (id: string) => void;
  onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void;
}) {
  const empty = { name: '', companyName: '', email: '', phone: '', mobile: '', type: 'Entreprise', taxNumber: '', paymentTerms: '30 jours', currency: 'EUR', website: '', billingAddress: '', shippingAddress: '', notes: '' };
  const [form, setForm] = useState<Omit<Customer, 'id'>>(empty);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'notes' | 'statement'>('overview');
  const [moreOpen, setMoreOpen] = useState(false);
  const [inactiveIds, setInactiveIds] = useState<string[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; confirmLabel: string; tone?: 'danger' | 'warning'; onConfirm: () => void } | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;
  useEffect(() => setPage(1), [query]);
  const filtered = customers.filter((customer) => matches(query, [customer.name, customer.email, customer.phone, customer.type]));
  useEffect(() => {
    if (selectedCustomerId && !filtered.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId('');
    }
  }, [filtered, selectedCustomerId]);
  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, companyName: c.companyName, email: c.email, phone: c.phone, mobile: c.mobile, type: c.type, taxNumber: c.taxNumber, paymentTerms: c.paymentTerms, currency: c.currency, website: c.website, billingAddress: c.billingAddress, shippingAddress: c.shippingAddress, notes: c.notes }); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const handleSubmit = () => { if (!form.name) return; if (editing) { onUpdate(editing.id, form); } else { onCreate(form); } closeModal(); };
  const selectedCustomer = selectedCustomerId ? customers.find((customer) => customer.id === selectedCustomerId) ?? filtered[0] : undefined;
  const selectedQuotes = selectedCustomer ? quotes.filter((quote) => quote.customerId === selectedCustomer.id) : [];
  const selectedInvoices = selectedCustomer ? invoices.filter((invoice) => invoice.customerId === selectedCustomer.id) : [];
  const selectedVehicles = selectedCustomer ? vehicles.filter((vehicle) => vehicle.customerId === selectedCustomer.id) : [];
  const unpaid = selectedInvoices.reduce((sum, invoice) => sum + Math.max(0, documentTotal(products, invoice.lines) - invoice.paid), 0);
  const credits = selectedInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.paid - documentTotal(products, invoice.lines)), 0);
  const revenue = selectedInvoices.reduce((sum, invoice) => sum + documentTotal(products, invoice.lines), 0);
  const monthlyBars = [0.64, 0.18, 0.42, 0.08, 0.32, 0.14];
  const selectedComments = selectedCustomer ? comments[selectedCustomer.id] ?? [] : [];
  const addComment = () => {
    if (!selectedCustomer || !commentDraft.trim()) return;
    setComments((items) => ({ ...items, [selectedCustomer.id]: [commentDraft.trim(), ...(items[selectedCustomer.id] ?? [])] }));
    setCommentDraft('');
  };
  const wrapComment = (before: string, after = before) => setCommentDraft((value) => value ? `${before}${value}${after}` : before + after);
  const cloneCustomer = () => {
    if (!selectedCustomer) return;
    onCreate({ name: `${selectedCustomer.name} - copie`, companyName: selectedCustomer.companyName, email: '', phone: selectedCustomer.phone, mobile: selectedCustomer.mobile, type: selectedCustomer.type, taxNumber: selectedCustomer.taxNumber, paymentTerms: selectedCustomer.paymentTerms, currency: selectedCustomer.currency, website: selectedCustomer.website, billingAddress: selectedCustomer.billingAddress, shippingAddress: selectedCustomer.shippingAddress, notes: selectedCustomer.notes });
    setMoreOpen(false);
  };
  const toggleCustomerInactive = () => {
    if (!selectedCustomer) return;
    const willReactivate = inactiveIds.includes(selectedCustomer.id);
    setMoreOpen(false);
    setConfirmAction({
      title: willReactivate ? 'Réactiver ce client ?' : 'Marquer ce client comme inactif ?',
      description: willReactivate ? `${selectedCustomer.name} redeviendra disponible dans les listes actives.` : `${selectedCustomer.name} restera consultable, mais sera signalé comme inactif.`,
      confirmLabel: willReactivate ? 'Réactiver' : 'Marquer inactif',
      tone: 'warning',
      onConfirm: () => setInactiveIds((items) => items.includes(selectedCustomer.id) ? items.filter((item) => item !== selectedCustomer.id) : [...items, selectedCustomer.id]),
    });
  };
  const deleteCustomer = () => {
    if (!selectedCustomer) return;
    setMoreOpen(false);
    setConfirmAction({
      title: 'Supprimer ce client ?',
      description: `Cette action supprimera définitivement ${selectedCustomer.name}, ses véhicules, devis, factures et paiements liés. Elle ne peut pas être annulée.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
      onConfirm: () => {
        onDelete(selectedCustomer.id);
        setSelectedCustomerId('');
      },
    });
  };
  const customerDue = (customerId: string) => invoices.filter((invoice) => invoice.customerId === customerId).reduce((sum, invoice) => sum + Math.max(0, documentTotal(products, invoice.lines) - invoice.paid), 0);
  const customerCredits = (customerId: string) => invoices.filter((invoice) => invoice.customerId === customerId).reduce((sum, invoice) => sum + Math.max(0, invoice.paid - documentTotal(products, invoice.lines)), 0);

  if (!selectedCustomer) {
    return (
      <PageShell title="Clients actifs" description="Liste complète des clients avec comptes, contacts et soldes." action={<Button onClick={openCreate}><Plus size={15} /> Nouveau client</Button>}>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2 text-lg font-semibold">Clients actifs <ChevronDown size={18} className="text-primary" /></div>
            <span className="text-sm text-muted-foreground">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-border" /></th>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Nom de l’entreprise</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Téléphone professionnel</th>
                  <th className="px-4 py-3 text-right font-medium">Comptes débiteurs</th>
                  <th className="px-4 py-3 text-right font-medium">Crédits inutilisés</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice((page - 1) * perPage, page * perPage).map((customer) => (
                  <tr key={customer.id} className="bg-white transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-border" /></td>
                    <td className="px-4 py-3 font-semibold"><LinkButton onClick={() => { setSelectedCustomerId(customer.id); setActiveTab('overview'); }}>{customer.name}</LinkButton></td>
                    <td className="px-4 py-3">{customer.companyName || '-'}</td>
                    <td className="px-4 py-3">{customer.email || '-'}</td>
                    <td className="px-4 py-3">{customer.phone || customer.mobile || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(customerDue(customer.id))}</td>
                    <td className="px-4 py-3 text-right">{money(customerCredits(customer.id))}</td>
                    <td className="px-4 py-3 text-center"><EditButton onClick={() => openEdit(customer)} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Aucun client trouvé.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onChange={setPage} />
        </Card>
        <EditDialog title={editing ? 'Modifier le client' : 'Nouveau client'} open={modalOpen} onClose={closeModal} onSubmit={handleSubmit}>
          <CustomerFields value={form} onChange={setForm} />
        </EditDialog>
      </PageShell>
    );
  }

  return (
    <PageShell title="Clients" description="Vue relationnelle des clients, comptes, transactions et véhicules." action={<Button onClick={openCreate}><Plus size={15} /> Nouveau client</Button>}>
      <div className={`grid min-h-[720px] grid-cols-1 overflow-hidden rounded-lg border border-border bg-white ${selectedCustomer ? '2xl:grid-cols-[360px_1fr]' : ''}`}>
        <aside className={selectedCustomer ? 'border-r border-border' : ''}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-1 text-lg font-semibold">Clients actifs <ChevronDown size={18} className="text-primary" /></div>
            <div className="flex gap-2">
              <Button size="icon" onClick={openCreate}><Plus size={18} /></Button>
              <Button size="icon" variant="outline" onClick={() => setActiveTab('transactions')} title="Voir les transactions"><Settings size={17} /></Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.slice((page - 1) * perPage, page * perPage).map((customer) => {
              const due = invoices.filter((invoice) => invoice.customerId === customer.id).reduce((sum, invoice) => sum + Math.max(0, documentTotal(products, invoice.lines) - invoice.paid), 0);
              return (
                <button key={customer.id} type="button" onClick={() => { setSelectedCustomerId(customer.id); setActiveTab('overview'); }} className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/70 ${selectedCustomerId === customer.id ? 'bg-accent/60' : ''}`}>
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border" onClick={(event) => event.stopPropagation()} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{customer.name}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{money(due)}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onChange={setPage} />
        </aside>

        {selectedCustomer && (
          <section className="min-w-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-3xl font-semibold">{selectedCustomer.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => openEdit(selectedCustomer)}>Modifier</Button>
                <Button variant="outline" size="icon" title="Pièces jointes" onClick={() => setActiveTab('notes')}><FileText size={17} /></Button>
                <Button onClick={() => setActiveTab('transactions')}>Nouvelle transaction <ChevronDown size={16} /></Button>
                <div className="relative">
                  <Button variant="outline" onClick={() => setMoreOpen((open) => !open)}>Plus <ChevronDown size={16} /></Button>
                  {moreOpen && (
                    <ActionMenu>
                      <button type="button" onClick={() => { window.location.href = selectedCustomer.email ? `mailto:${selectedCustomer.email}` : 'mailto:'; setMoreOpen(false); }}>Envoyer un e-mail au client</button>
                      <button type="button" onClick={cloneCustomer}>Cloner</button>
                      <button type="button" onClick={toggleCustomerInactive}>{inactiveIds.includes(selectedCustomer.id) ? 'Marquer comme actif' : 'Marquer comme inactif'}</button>
                      <button type="button" onClick={() => { setActiveTab('statement'); setMoreOpen(false); }}>Voir le relevé</button>
                      <button type="button" className="text-red-600" onClick={deleteCustomer}>Supprimer</button>
                    </ActionMenu>
                  )}
                </div>
                <Button variant="outline" size="icon" onClick={() => setSelectedCustomerId('')} title="Fermer"><X size={20} /></Button>
              </div>
            </div>
            <div className="flex gap-8 border-b border-border px-6">
              {([
                ['overview', 'Vue d’ensemble'],
                ['notes', 'Commentaires'],
                ['transactions', 'Transactions'],
                ['statement', 'Relevé'],
              ] as Array<[typeof activeTab, string]>).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-3 px-0 py-4 text-sm font-semibold ${activeTab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[420px_1fr]">
                <div className="space-y-5">
                  <Card className="bg-muted/40 p-5">
                    <div className="mb-4 border-b border-border pb-4 text-lg font-semibold">{selectedCustomer.companyName || selectedCustomer.name}</div>
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-md bg-white text-2xl font-bold text-muted-foreground shadow-sm">{selectedCustomer.name.slice(0, 1)}</div>
                      <div className="min-w-0">
                        <div className="font-semibold">{selectedCustomer.name}</div>
                        <div className="break-all text-sm text-muted-foreground">{selectedCustomer.email || 'Aucun email'}</div>
                        <button type="button" onClick={() => { window.location.href = selectedCustomer.email ? `mailto:${selectedCustomer.email}` : 'mailto:'; }} className="mt-2 text-sm font-medium text-primary">Envoyer un e-mail</button>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <SectionTitle title="Adresse" />
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="font-semibold">Adresse de facturation</div>
                        <div className="mt-1 whitespace-pre-line text-muted-foreground">{selectedCustomer.billingAddress || 'Aucune adresse renseignée'}</div>
                      </div>
                      <div>
                        <div className="font-semibold">Adresse de livraison</div>
                        <div className="mt-1 text-muted-foreground">{selectedCustomer.shippingAddress || 'Aucune adresse d’expédition'}</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <SectionTitle title="Autres détails" />
                    <div className="grid grid-cols-[1fr_1.2fr] gap-y-3 text-sm">
                      <span className="text-muted-foreground">Type de client</span><span className="font-medium">{selectedCustomer.type}</span>
                      <span className="text-muted-foreground">N° TVA / fiscal</span><span className="font-medium">{selectedCustomer.taxNumber || '-'}</span>
                      <span className="text-muted-foreground">Devise</span><span className="font-medium">{selectedCustomer.currency}</span>
                      <span className="text-muted-foreground">Téléphone</span><span className="font-medium">{selectedCustomer.phone || '-'}</span>
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="p-5">
                    <div className="text-lg font-semibold">Période d’échéance du paiement</div>
                    <div className="mt-3 text-xl font-semibold">{selectedCustomer.paymentTerms || 'Dû à réception'}</div>
                  </Card>

                  <Card className="overflow-hidden">
                    <div className="px-5 py-4 text-lg font-semibold">Comptes clients</div>
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-xs uppercase text-muted-foreground">
                        <tr><th className="px-5 py-3 text-left">Devise</th><th className="px-5 py-3 text-right">Créances impayées</th><th className="px-5 py-3 text-right">Crédits inutilisés</th></tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border"><td className="px-5 py-4">EUR - Euro</td><td className="px-5 py-4 text-right font-semibold text-primary">{money(unpaid)}</td><td className="px-5 py-4 text-right">{money(credits)}</td></tr>
                      </tbody>
                    </table>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-lg font-semibold">Revenus</div>
                        <div className="mt-1 text-sm text-muted-foreground">Ce graphique est affiché dans la devise de base.</div>
                      </div>
                      <div className="text-sm text-primary">6 derniers mois</div>
                    </div>
                    <div className="mt-6 flex h-40 items-end gap-8 border-b border-border px-8">
                      {monthlyBars.map((height, index) => (
                        <div key={index} className="flex flex-1 flex-col items-center gap-2">
                          <div className="w-10 rounded-t bg-lime-300" style={{ height: `${Math.max(10, height * 150)}px` }} />
                          <span className="text-xs text-muted-foreground">{['nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.'][index]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 text-lg font-semibold">Revenu total (6 derniers mois) - {money(revenue)}</div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="p-6">
                <DataTable headers={['Type', 'Numéro', 'Statut', 'Total', 'Actions']}>
                  {[...selectedQuotes.map((item) => ({ ...item, docType: 'Devis' })), ...selectedInvoices.map((item) => ({ ...item, docType: 'Facture' }))].map((document) => (
                    <tr key={document.id} className="border-t border-border">
                      <td className="px-4 py-3"><Badge>{document.docType}</Badge></td>
                      <td className="px-4 py-3 font-medium">{document.number}</td>
                      <td className="px-4 py-3">{document.status}</td>
                      <td className="px-4 py-3 font-semibold">{money(documentTotal(products, document.lines))}</td>
                      <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity(document.docType === 'Devis' ? 'quote' : 'invoice', document.id)}>Ouvrir</LinkButton></td>
                    </tr>
                  ))}
                </DataTable>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-5 p-6">
                <Card className="max-w-3xl overflow-hidden">
                  <div className="flex gap-2 border-b border-border bg-muted px-4 py-3">
                    <button type="button" onClick={() => wrapComment('**')} className="rounded px-2 py-1 font-semibold hover:bg-white">B</button>
                    <button type="button" onClick={() => wrapComment('_')} className="rounded px-2 py-1 italic hover:bg-white">I</button>
                    <button type="button" onClick={() => wrapComment('<u>', '</u>')} className="rounded px-2 py-1 underline hover:bg-white">U</button>
                  </div>
                  <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} className="min-h-28 w-full border-0 p-4 text-sm outline-none" placeholder="Ajouter un commentaire..." />
                  <div className="border-t border-border p-3">
                    <Button type="button" variant="outline" onClick={addComment}>Ajouter un commentaire</Button>
                  </div>
                </Card>
                <Card className="max-w-3xl p-5">
                  <SectionTitle title="Tous les commentaires" />
                  {selectedComments.length ? (
                    <div className="space-y-3">
                      {selectedComments.map((comment, index) => <div key={`${comment}-${index}`} className="rounded-md border border-border p-3 text-sm">{comment}</div>)}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">Encore aucun commentaire.</p>
                  )}
                </Card>
              </div>
            )}
            {activeTab === 'statement' && <div className="p-6"><Card className="p-5"><SectionTitle title="Relevé client" /><p className="text-sm text-muted-foreground">Solde ouvert : <span className="font-semibold text-foreground">{money(unpaid)}</span></p></Card></div>}
          </section>
        )}
      </div>
      <EditDialog title={editing ? 'Modifier le client' : 'Nouveau client'} open={modalOpen} onClose={closeModal} onSubmit={handleSubmit}>
        <CustomerFields value={form} onChange={setForm} />
      </EditDialog>
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? 'Confirmer'}
        tone={confirmAction?.tone}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.onConfirm();
          setConfirmAction(null);
        }}
      />
    </PageShell>
  );
}

function CatalogPage({ customers, products, quotes, invoices, query, onCreate, onUpdate, onDelete, onOpenEntity }: { customers: Customer[]; products: Product[]; quotes: Quote[]; invoices: Invoice[]; query: string; onCreate: (product: Omit<Product, 'id'>) => void; onUpdate: (id: string, patch: Omit<Product, 'id'>) => void; onDelete: (id: string) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  const empty = { name: '', type: 'Service', unit: 'forfait', unitPrice: 0, taxRate: 20 };
  const [form, setForm] = useState<Omit<Product, 'id'>>(empty);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'history'>('overview');
  const [moreOpen, setMoreOpen] = useState(false);
  const [inactiveIds, setInactiveIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; confirmLabel: string; tone?: 'danger' | 'warning'; onConfirm: () => void } | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;
  useEffect(() => setPage(1), [query]);
  const filtered = products.filter((product) => matches(query, [product.name, product.type, product.unit]));
  useEffect(() => {
    if (selectedProductId && !filtered.some((product) => product.id === selectedProductId)) {
      setSelectedProductId('');
    }
  }, [filtered, selectedProductId]);
  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, type: p.type, unit: p.unit, unitPrice: p.unitPrice, taxRate: p.taxRate }); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const handleSubmit = () => { if (!form.name) return; if (editing) { onUpdate(editing.id, form); } else { onCreate(form); } closeModal(); };
  const usage = (productId: string) => quotes.filter((quote) => quote.lines.some((line) => line.productId === productId)).length + invoices.filter((invoice) => invoice.lines.some((line) => line.productId === productId)).length;
  const selectedProduct = selectedProductId ? products.find((product) => product.id === selectedProductId) ?? filtered[0] : undefined;
  const relatedQuotes = selectedProduct ? quotes.filter((quote) => quote.lines.some((line) => line.productId === selectedProduct.id)) : [];
  const relatedInvoices = selectedProduct ? invoices.filter((invoice) => invoice.lines.some((line) => line.productId === selectedProduct.id)) : [];
  const isInactive = selectedProduct ? inactiveIds.includes(selectedProduct.id) : false;
  const cloneSelected = () => {
    if (!selectedProduct) return;
    onCreate({ ...selectedProduct, name: `${selectedProduct.name} - copie` });
    setMoreOpen(false);
  };
  const toggleInactive = () => {
    if (!selectedProduct) return;
    const willReactivate = inactiveIds.includes(selectedProduct.id);
    setMoreOpen(false);
    setConfirmAction({
      title: willReactivate ? 'Réactiver cet article ?' : 'Marquer cet article comme inactif ?',
      description: willReactivate ? `${selectedProduct.name} redeviendra sélectionnable dans les documents.` : `${selectedProduct.name} restera dans l’historique, mais sera signalé comme inactif.`,
      confirmLabel: willReactivate ? 'Réactiver' : 'Marquer inactif',
      tone: 'warning',
      onConfirm: () => setInactiveIds((items) => items.includes(selectedProduct.id) ? items.filter((item) => item !== selectedProduct.id) : [...items, selectedProduct.id]),
    });
  };
  const deleteSelected = () => {
    if (!selectedProduct) return;
    setMoreOpen(false);
    setConfirmAction({
      title: 'Supprimer cet article ?',
      description: `Cette action supprimera ${selectedProduct.name}. Les lignes liées seront retirées des devis et factures existants.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
      onConfirm: () => {
        onDelete(selectedProduct.id);
        setSelectedProductId('');
      },
    });
  };

  return (
    <PageShell title="Articles actifs" description="Catalogue clair des prestations, pièces et forfaits utilisés dans les documents.">
      <div className={`grid min-h-[760px] overflow-hidden rounded-lg border border-border bg-white ${selectedProduct ? '2xl:grid-cols-[420px_1fr]' : ''}`}>
        <aside className={selectedProduct ? 'border-r border-border' : ''}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-1 text-lg font-semibold">Articles actifs <ChevronDown size={18} className="text-primary" /></div>
            <div className="flex gap-2">
              <Button size="icon" onClick={openCreate} title="Nouvel article"><Plus size={18} /></Button>
              <Button size="icon" variant="outline" onClick={() => setMoreOpen((open) => !open)} title="Actions"><Settings size={17} /></Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.slice((page - 1) * perPage, page * perPage).map((product) => {
              const rowInactive = inactiveIds.includes(product.id);
              return (
                <button key={product.id} type="button" onClick={() => { setSelectedProductId(product.id); setActiveTab('overview'); }} className={`grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/70 ${selectedProductId === product.id ? 'bg-accent/60' : ''}`}>
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border" onClick={(event) => event.stopPropagation()} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{product.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{product.type} · {product.unit}{rowInactive ? ' · Inactif' : ''}</div>
                  </div>
                  <div className="font-semibold">{money(product.unitPrice)}</div>
                </button>
              );
            })}
          </div>
          <Pagination total={filtered.length} page={page} perPage={perPage} onChange={setPage} />
        </aside>

        {selectedProduct && (
          <section className="min-w-0">
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <h2 className="truncate text-3xl font-semibold">{selectedProduct.name}</h2>
                {isInactive && <div className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Inactif</div>}
              </div>
              <div className="relative flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(selectedProduct)} title="Modifier"><Edit3 size={17} /></Button>
                <Button variant="outline" onClick={() => setMoreOpen((open) => !open)}>Plus <ChevronDown size={16} /></Button>
                <Button variant="outline" size="icon" onClick={() => setSelectedProductId('')} title="Fermer"><X size={20} /></Button>
                {moreOpen && (
                  <ActionMenu>
                    <button type="button" onClick={cloneSelected}>Cloner un article</button>
                    <button type="button" onClick={toggleInactive}>{isInactive ? 'Marquer comme actif' : 'Marquer comme inactif'}</button>
                    <button type="button" className="text-red-600" onClick={deleteSelected}>Supprimer</button>
                  </ActionMenu>
                )}
              </div>
            </div>
            <div className="flex gap-8 border-b border-border px-6">
              {([
                ['overview', 'Vue d’ensemble'],
                ['transactions', 'Transactions'],
                ['history', 'Historique'],
              ] as Array<[typeof activeTab, string]>).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)} className={`border-b-2 px-0 py-4 text-sm font-semibold ${activeTab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8 p-6">
                <div className="grid max-w-4xl grid-cols-[210px_1fr] gap-y-5 text-sm">
                  <span className="text-muted-foreground">Type d’élément</span><span className="font-medium">Articles achetés et en vente ({selectedProduct.type})</span>
                  <span className="text-muted-foreground">Source créée</span><span className="font-medium">Catalogue interne</span>
                </div>
                <div>
                  <h3 className="mb-5 text-lg font-semibold">Informations sur les ventes</h3>
                  <div className="grid max-w-4xl grid-cols-[210px_1fr] gap-y-4 text-sm">
                    <span className="text-muted-foreground">Prix de vente</span><span className="font-medium">{money(selectedProduct.unitPrice)}</span>
                    <span className="text-muted-foreground">Compte de vente</span><span className="font-medium">Ventes</span>
                    <span className="text-muted-foreground">Unité d’utilisation</span><span className="font-medium">{selectedProduct.unit}</span>
                    <span className="text-muted-foreground">TVA</span><span className="font-medium">{selectedProduct.taxRate}%</span>
                    <span className="text-muted-foreground">Description</span><span className="font-medium">{usage(selectedProduct.id) > 0 ? `Utilisé dans ${usage(selectedProduct.id)} document(s)` : 'Disponible pour les devis et factures'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-5 p-6">
                <TransactionSection title="Devis" empty="Il n’y a aucun devis.">
                  {relatedQuotes.map((quote) => (
                    <tr key={quote.id} className="border-t border-border">
                      <td className="px-4 py-3">{quote.issueDate ? formatDate(quote.issueDate) : '-'}</td>
                      <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('quote', quote.id)}>{quote.number}</LinkButton></td>
                      <td className="px-4 py-3">{customerName(customers, quote.customerId)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(documentTotal(products, quote.lines))}</td>
                      <td className="px-4 py-3"><Badge>{quote.status}</Badge></td>
                    </tr>
                  ))}
                </TransactionSection>
                <TransactionSection title="Factures" empty="Aucune facture liée.">
                  {relatedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-border">
                      <td className="px-4 py-3">{invoice.issueDate ? formatDate(invoice.issueDate) : '-'}</td>
                      <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('invoice', invoice.id)}>{invoice.number}</LinkButton></td>
                      <td className="px-4 py-3">{customerName(customers, invoice.customerId)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(documentTotal(products, invoice.lines))}</td>
                      <td className="px-4 py-3"><Badge>{invoice.status}</Badge></td>
                    </tr>
                  ))}
                </TransactionSection>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Détails</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-border"><td className="px-4 py-3">17-05-2026 21:24</td><td className="px-4 py-3">consulté par l’utilisateur</td></tr>
                    <tr className="border-t border-border"><td className="px-4 py-3">17-05-2026 21:20</td><td className="px-4 py-3">créé dans le catalogue</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
      <EditDialog title={editing ? "Modifier l'article" : 'Nouvel article'} open={modalOpen} onClose={closeModal} onSubmit={handleSubmit}>
        <ProductFields value={form} onChange={setForm} />
      </EditDialog>
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? 'Confirmer'}
        tone={confirmAction?.tone}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.onConfirm();
          setConfirmAction(null);
        }}
      />
    </PageShell>
  );
}

function QuotePreview({ form, customers, vehicles, products }: { form: { customerId: string; vehicleId: string; lines: LineItem[]; status: string; issueDate?: string; validUntil?: string; notes?: string; number?: string }; customers: Customer[]; vehicles: Vehicle[]; products: Product[] }) {
  const customer = customers.find((c) => c.id === form.customerId);
  const vehicle = vehicles.find((v) => v.id === form.vehicleId);
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  const sub = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmt = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
  const total = sub + taxAmt;
  const statusBg: Record<string, string> = { Accepté: '#d1fae5', Refusé: '#fee2e2', Envoyé: '#dbeafe', Brouillon: '#f1f5f9' };
  const statusColor: Record<string, string> = { Accepté: '#065f46', Refusé: '#991b1b', Envoyé: '#1e40af', Brouillon: '#475569' };
  const bg = statusBg[form.status] ?? '#f1f5f9';
  const fg = statusColor[form.status] ?? '#475569';
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm text-sm">
      <div style={{ background: '#111111' }} className="px-6 py-5 flex items-start justify-between">
        <div>
          <div className="text-lg font-bold text-white tracking-tight">Invoxa</div>
          <div className="text-xs text-white/60 mt-0.5">Garage professionnel</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-white uppercase tracking-widest">Devis</div>
          <div className="text-xs text-white/70 mt-1">{form.number ?? '—'}</div>
          <div className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: bg, color: fg }}>{form.status}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-muted/30 border-b border-border">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Destinataire</div>
          {customer ? (
            <>
              <div className="font-semibold text-foreground">{customer.name}</div>
              {customer.companyName && <div className="text-muted-foreground">{customer.companyName}</div>}
              {customer.billingAddress && <div className="text-muted-foreground text-xs mt-0.5">{customer.billingAddress}</div>}
            </>
          ) : <div className="text-muted-foreground italic">Client non sélectionné</div>}
        </div>
        <div className="text-right space-y-1">
          <div><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date : </span><span>{form.issueDate ?? '—'}</span></div>
          <div><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Validité : </span><span>{form.validUntil ?? '—'}</span></div>
          {vehicle && <div className="text-muted-foreground text-xs">{vehicle.plate} · {vehicle.model}</div>}
        </div>
      </div>
      <div className="px-6 py-4">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border">
            <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
            <th className="pb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qté</th>
            <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">HT</th>
            <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TVA</th>
            <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TTC</th>
          </tr></thead>
          <tbody className="divide-y divide-border/50">
            {form.lines.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground italic">Aucun article ajouté</td></tr>
            ) : form.lines.map((line, idx) => {
              const p = products.find((pr) => pr.id === line.productId);
              const ttc = line.quantity * line.unitPrice * (1 + line.taxRate / 100);
              return (
                <tr key={idx} className="py-2">
                  <td className="py-2 pr-2">{p?.name ?? <span className="italic text-muted-foreground">—</span>}</td>
                  <td className="py-2 text-center">{line.quantity}</td>
                  <td className="py-2 text-right">{fmt(line.unitPrice)}</td>
                  <td className="py-2 text-right">{line.taxRate}%</td>
                  <td className="py-2 text-right font-semibold">{fmt(ttc)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-6 py-4 bg-muted/20">
        <div className="flex justify-end">
          <div className="w-56 space-y-1.5">
            <div className="flex justify-between text-muted-foreground"><span>Sous-total HT</span><span>{fmt(sub)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>TVA</span><span>{fmt(taxAmt)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2"><span>Total TTC</span><span style={{ color: '#111111' }}>{fmt(total)}</span></div>
          </div>
        </div>
        {form.notes && <div className="mt-4 text-xs text-muted-foreground border-t border-border pt-3 italic">{form.notes}</div>}
      </div>
      <div className="px-6 py-3 bg-muted/30 text-center text-[10px] text-muted-foreground border-t border-border">Document généré par Invoxa · Ce devis est valable jusqu'au {form.validUntil ?? '—'}</div>
    </div>
  );
}

function QuotesPage({ customers, vehicles, products, templates, quotes, query, companyOverride, onCreate, onUpdate, onOpenEntity, onCreateCustomer, onCreateProduct }: { customers: Customer[]; vehicles: Vehicle[]; products: Product[]; templates: Template[]; quotes: Quote[]; query: string; companyOverride?: Partial<typeof defaultTemplate>; onCreate: (quote: Omit<Quote, 'id'>) => void; onUpdate: (id: string, patch: Omit<Quote, 'id'>) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void; onCreateCustomer: (customer: Omit<Customer, 'id'>) => string; onCreateProduct: (product: Omit<Product, 'id'>) => string }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const emptyForm = { customerId: '', vehicleId: '', lines: [] as LineItem[], status: 'Brouillon', issueDate: todayStr, validUntil: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Inline client modal
  const emptyClientForm = { name: '', companyName: '', email: '', phone: '', mobile: '', type: 'Particulier', taxNumber: '', paymentTerms: 'Comptant', currency: 'EUR', website: '', billingAddress: '', shippingAddress: '', notes: '' };
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState(emptyClientForm);

  // Inline product modal
  const emptyProductForm = { name: '', type: 'Service', unit: 'forfait', unitPrice: 0, taxRate: 20 };
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);

  useEffect(() => setPage(1), [statusFilter, query]);

  const filtered = quotes.filter((q) => {
    const ok = matches(query, [q.number, customerName(customers, q.customerId), q.status, vehicleLabel(vehicles, q.vehicleId), documentSummary(products, q.lines)]);
    return ok && (statusFilter === 'Tous' || q.status === statusFilter);
  });

  const sub = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmt = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
  const total = sub + taxAmt;

  const totalDevis = quotes.reduce((s, q) => s + documentTotal(products, q.lines), 0);
  const countAccepted = quotes.filter((q) => q.status === 'Accepté').length;
  const countPending = quotes.filter((q) => q.status === 'Envoyé' || q.status === 'Brouillon').length;
  const acceptRate = quotes.length > 0 ? Math.round((countAccepted / quotes.length) * 100) : 0;
  const previewNumber = `DEV-2026-${String(quotes.length + 43).padStart(4, '0')}`;
  const quoteTemplate = { ...(templates.find((template) => template.type === 'Devis') ?? templates[0] ?? defaultTemplate), ...companyOverride };

  const statusPill: Record<string, string> = {
    Accepté: 'bg-muted text-foreground border border-border',
    Refusé: 'bg-muted text-foreground border border-border',
    Envoyé: 'bg-muted text-foreground border border-border',
    Brouillon: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  const openClientModal = () => { setClientForm(emptyClientForm); setClientModalOpen(true); };
  const openProductModal = () => { setProductForm(emptyProductForm); setProductModalOpen(true); };

  const handleCreate = (status: string) => {
    if (!form.customerId || form.lines.length === 0) return;
    onCreate({ number: previewNumber, customerId: form.customerId, vehicleId: form.vehicleId, status, lines: form.lines, issueDate: form.issueDate, validUntil: form.validUntil, notes: form.notes });
    setForm(emptyForm);
    setShowCreate(false);
  };

  if (showCreate) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button type="button" onClick={() => setShowCreate(false)} className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
              <ChevronLeft size={16} /> Devis
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Nouveau devis</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleCreate('Brouillon')}>Brouillon</Button>
            <Button type="button" size="sm" onClick={() => handleCreate(form.status)}><Send size={14} /> Créer le devis</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-white px-6 py-4">
              <h2 className="font-semibold">Détails du devis</h2>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client <span className="text-red-500">*</span></label>
                <SearchCombobox
                  items={customers.map((c) => ({ id: c.id, label: c.name, sublabel: c.companyName }))}
                  value={form.customerId}
                  onChange={(cid) => setForm({ ...form, customerId: cid })}
                  placeholder="Sélectionner un client..."
                  actionLabel="Nouveau client"
                  onAction={openClientModal}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dossier / Véhicule</label>
                <SearchCombobox
                  items={[{ id: '', label: '— Aucun dossier —' }, ...vehicles.map((v) => ({ id: v.id, label: v.plate, sublabel: v.model }))]}
                  value={form.vehicleId}
                  onChange={(vid) => setForm({ ...form, vehicleId: vid })}
                  placeholder="Sélectionner un dossier..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date d'émission <span className="text-red-500">*</span></label>
                  <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</label>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Brouillon</option>
                    <option>Envoyé</option>
                    <option>Accepté</option>
                    <option>Refusé</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valide jusqu'au</label>
                  <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tableau d'articles <span className="text-red-500">*</span></div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-muted">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Article</th>
                      <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qté</th>
                      <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prix HT</th>
                      <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">TVA%</th>
                      <th className="w-8 px-3 py-2.5"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {form.lines.map((line, index) => (
                        <tr key={`${line.productId}-${index}`} className="bg-white transition-colors hover:bg-muted/30">
                          <td className="px-3 py-2.5">
                            <SearchCombobox
                              items={products.map((p) => ({ id: p.id, label: p.name, sublabel: money(p.unitPrice) + ' / ' + p.unit }))}
                              value={line.productId}
                              onChange={(pid) => {
                                const np = products.find((p) => p.id === pid);
                                setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, productId: pid, unitPrice: np?.unitPrice ?? it.unitPrice, taxRate: np?.taxRate ?? it.taxRate } : it) });
                              }}
                              placeholder="Choisir un article..."
                              actionLabel="Nouvel article"
                              onAction={openProductModal}
                            />
                          </td>
                          <td className="px-3 py-2.5"><Input type="number" value={line.quantity} onChange={(e) => setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, quantity: Number(e.target.value) } : it) })} /></td>
                          <td className="px-3 py-2.5"><Input type="number" value={line.unitPrice} onChange={(e) => setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, unitPrice: Number(e.target.value) } : it) })} /></td>
                          <td className="px-3 py-2.5"><Input type="number" value={line.taxRate} onChange={(e) => setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, taxRate: Number(e.target.value) } : it) })} /></td>
                          <td className="px-3 py-2.5 text-center">
                            <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_it, i) => i !== index) })} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-border bg-white px-3 py-2.5">
                    <button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, { productId: '', quantity: 1, unitPrice: 0, taxRate: 20 }] })} className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80">
                      <Plus size={14} /> Ajouter un article
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes client</label>
                <textarea className="min-h-[72px] w-full rounded-md border border-input bg-white p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Merci pour votre confiance. Ce devis est valable 30 jours." />
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Sous-total HT</span><span className="font-medium">{money(sub)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>TVA</span><span className="font-medium">{money(taxAmt)}</span></div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold"><span>Total TTC</span><span className="text-primary">{money(total)}</span></div>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aperçu du devis</p>
            <QuotePreview form={{ ...form, number: previewNumber }} customers={customers} vehicles={vehicles} products={products} />
          </div>
        </div>

        {/* Inline modals */}
        <EditDialog title="Nouveau client" open={clientModalOpen} onClose={() => setClientModalOpen(false)} onSubmit={() => {
          if (!clientForm.name) return;
          const newId = onCreateCustomer(clientForm);
          setForm((f) => ({ ...f, customerId: newId }));
          setClientModalOpen(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom <span className="text-red-500">*</span></label><Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Martin Services" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Société</label><Input value={clientForm.companyName} onChange={(e) => setClientForm({ ...clientForm, companyName: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label><Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Téléphone</label><Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</label><Select value={clientForm.type} onChange={(e) => setClientForm({ ...clientForm, type: e.target.value })}><option>Particulier</option><option>Professionnel</option><option>Entreprise</option><option>Flotte</option></Select></div>
          </div>
        </EditDialog>

        <EditDialog title="Nouvel article" open={productModalOpen} onClose={() => setProductModalOpen(false)} onSubmit={() => {
          if (!productForm.name) return;
          const newId = onCreateProduct(productForm);
          setForm((f) => ({ ...f, lines: [...f.lines, { productId: newId, quantity: 1, unitPrice: productForm.unitPrice, taxRate: productForm.taxRate }] }));
          setProductModalOpen(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom <span className="text-red-500">*</span></label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Main-d'oeuvre" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</label><Select value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}><option>Service</option><option>Produit</option><option>Forfait</option></Select></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unité</label><Input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prix HT (€)</label><Input type="number" value={productForm.unitPrice} onChange={(e) => setProductForm({ ...productForm, unitPrice: Number(e.target.value) })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">TVA (%)</label><Input type="number" value={productForm.taxRate} onChange={(e) => setProductForm({ ...productForm, taxRate: Number(e.target.value) })} /></div>
          </div>
        </EditDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">Tous les Devis <ChevronDown size={20} className="text-primary" /></h1>
          <p className="mt-1 text-sm text-muted-foreground">Liste simple des devis. Cliquez sur un numéro pour ouvrir le devis.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nouveau devis</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total devisé</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50"><ClipboardList size={14} className="text-blue-600" /></div>
          </div>
          <div className="text-2xl font-bold">{money(totalDevis)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{quotes.length} devis</div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acceptés</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50"><CheckCircle2 size={14} className="text-emerald-600" /></div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{countAccepted}</div>
          <div className="mt-1 text-xs text-emerald-600">devis confirmés</div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">En attente</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50"><Clock size={14} className="text-amber-600" /></div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{countPending}</div>
          <div className="mt-1 text-xs text-amber-600">à relancer</div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taux d'acceptation</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><TrendingUp size={14} className="text-primary" /></div>
          </div>
          <div className="text-2xl font-bold">{acceptRate}%</div>
          <div className="mt-1 text-xs text-muted-foreground">sur {quotes.length} devis</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-1">
            {['Tous', 'Brouillon', 'Envoyé', 'Accepté', 'Refusé'].map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="w-10 px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-border" /></th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Numéro de devis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Référence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom du client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Montant</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice((page - 1) * perPage, page * perPage).map((quote) => {
                const tot = documentTotal(products, quote.lines);
                const sc = statusPill[quote.status] ?? 'border border-border bg-muted text-muted-foreground';
                return (
                  <tr key={quote.id} className="bg-white transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-border" /></td>
                    <td className="px-4 py-3 font-medium">{quote.issueDate ? new Date(quote.issueDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('quote', quote.id)}><span className="font-semibold">{quote.number}</span></LinkButton></td>
                    <td className="px-4 py-3 text-muted-foreground">{quote.vehicleId ? vehicleLabel(vehicles, quote.vehicleId).split(' - ')[0] : '—'}</td>
                    <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('customer', quote.customerId)}>{customerName(customers, quote.customerId)}</LinkButton></td>
                    <td className="px-4 py-3"><span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${sc}`}>{quote.status}</span></td>
                    <td className="px-4 py-3 text-right font-semibold">{money(tot)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" title="Modifier" onClick={() => setEditing(quote)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Edit3 size={14} /></button>
                        <button type="button" title="Exporter PDF" onClick={() => exportQuotePDF(quote, customers, vehicles, products, quoteTemplate)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-blue-50 hover:text-primary"><Download size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Aucun devis trouvé.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={perPage} onChange={setPage} />
      </Card>

      <DocumentEditDialog kind="devis" customers={customers} vehicles={vehicles} products={products} document={editing} onClose={() => setEditing(null)} onSave={(patch) => {
        if (!editing) return;
        onUpdate(editing.id, { number: editing.number, ...patch } as Omit<Quote, 'id'>);
        setEditing(null);
      }} />
    </div>
  );
}




function exportInvoicePDF(invoice: Invoice, customers: Customer[], vehicles: Vehicle[], products: Product[], template: (Omit<Template, 'id' | 'name' | 'activity' | 'status' | 'type'> & { type?: string }) = defaultTemplate) {
  const customer = customers.find((c) => c.id === invoice.customerId);
  const vehicle = vehicles.find((v) => v.id === invoice.vehicleId);
  const fmtN = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const today = new Date().toLocaleDateString('fr-FR');
  const subtotal = invoice.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxByRate: Record<number, number> = {};
  invoice.lines.forEach((l) => {
    taxByRate[l.taxRate] = (taxByRate[l.taxRate] ?? 0) + l.quantity * l.unitPrice * (l.taxRate / 100);
  });
  const tax = Object.values(taxByRate).reduce((a, b) => a + b, 0);
  const total = subtotal + tax;
  const remaining = Math.max(0, total - invoice.paid);
  const documentLabel = template.type === 'Devis' ? 'Devis' : 'Facture';
  const linesHtml = invoice.lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    const lineHT = line.quantity * line.unitPrice;
    const lineTTC = lineHT * (1 + line.taxRate / 100);
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">- ${product?.name ?? 'Article'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${line.taxRate}%</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtN(line.unitPrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${line.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtN(lineHT)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtN(lineTTC)}</td>
    </tr>`;
  }).join('');
  const taxRowsHtml = Object.entries(taxByRate).map(([rate, amount]) =>
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb"><span>Total TVA ${rate}%</span><span>${fmtN(amount)}</span></div>`
  ).join('');
  const paymentsHtml = invoice.paid > 0 ? `
<div style="margin-top:22px">
  <div style="font-size:10px;font-weight:700;margin-bottom:6px;color:#4b5563;text-transform:uppercase;letter-spacing:.04em">Versements déjà effectués</div>
  <table style="width:52%;border-collapse:collapse">
    <thead><tr style="background:#f3f4f6">
      <th style="padding:6px 8px;font-size:10px;font-weight:700;text-align:left;color:#4b5563;border-bottom:1px solid #d1d5db">Règlement</th>
      <th style="padding:6px 8px;font-size:10px;font-weight:700;text-align:right;color:#4b5563;border-bottom:1px solid #d1d5db">Montant</th>
      <th style="padding:6px 8px;font-size:10px;font-weight:700;text-align:left;color:#4b5563;border-bottom:1px solid #d1d5db">Type</th>
      <th style="padding:6px 8px;font-size:10px;font-weight:700;text-align:left;color:#4b5563;border-bottom:1px solid #d1d5db">Num</th>
    </tr></thead>
    <tbody><tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${today}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtN(invoice.paid)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">Carte bancaire</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb"></td>
    </tr></tbody>
  </table>
</div>` : '';
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${documentLabel} ${invoice.number}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;padding:36px 42px;font-size:11.5px}
@media print{body{padding:0}@page{margin:14mm 12mm;size:A4}}
</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
  <div>
    <div style="font-size:17px;font-weight:900;letter-spacing:.02em;margin-bottom:8px">${template.companyName}</div>
    <div style="font-size:10.5px;line-height:1.6;color:#374151">${template.companyAddress}<br>${template.companyPostalCity}</div>
    <div style="font-size:10.5px;line-height:1.6;color:#374151;margin-top:4px">Tél.: ${template.companyPhone}<br>Email: ${template.companyEmail}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:19px;font-weight:800">${documentLabel} ${invoice.number}</div>
    <div style="display:grid;grid-template-columns:130px auto;gap:3px 14px;margin-top:14px;text-align:left;font-size:11px">
      <span style="color:#6b7280">Réf. client :</span><strong>${customer?.id.toUpperCase() ?? '-'}</strong>
      <span style="color:#6b7280">Date facturation :</span><strong>${invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('fr-FR') : today}</strong>
      <span style="color:#6b7280">Date échéance :</span><strong>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : today}</strong>
    </div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:24px">
  <div>
    <div style="font-weight:700;margin-bottom:6px">Émetteur</div>
    <div style="line-height:1.6;font-size:11px"><strong>${template.companyName}</strong><br>${template.companyAddress}<br>${template.companyPostalCity}<br><br>Tél.: ${template.companyPhone}<br>Email: ${template.companyEmail}</div>
  </div>
  <div>
    <div style="font-weight:700;margin-bottom:6px">Adressé à</div>
    <div style="line-height:1.6;font-size:11px"><strong>${customer?.name ?? 'client'}</strong>${customer?.companyName ? `<br>${customer.companyName}` : ''}${customer?.billingAddress ? `<br>${customer.billingAddress}` : ''}${customer?.taxNumber ? `<br>TVA : ${customer.taxNumber}` : ''}</div>
    ${vehicle ? `<div style="margin-top:8px;font-size:10.5px;color:#6b7280">Véhicule : ${vehicle.plate} - ${vehicle.model}</div>` : ''}
  </div>
</div>

<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;font-size:10.5px;color:#4b5563">
  <span>${template.introText}</span>
  <span>Montants exprimés en Euros</span>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <thead><tr style="background:#f3f4f6">
    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #d1d5db;text-align:left">Désignation</th>
    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #d1d5db;text-align:right">TVA</th>
    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #d1d5db;text-align:right">P.U. HT</th>
    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #d1d5db;text-align:right">Qté</th>
    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #d1d5db;text-align:right">Total HT</th>
    <th style="padding:7px 8px;font-size:10px;font-weight:700;text-transform:uppercase;color:#4b5563;border-bottom:1px solid #d1d5db;text-align:right">Total TTC</th>
  </tr></thead>
  <tbody>${linesHtml}</tbody>
</table>

<div style="display:flex;gap:32px;justify-content:flex-end">
  <div style="width:260px">
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb"><span>Total HT</span><span>${fmtN(subtotal)}</span></div>
    ${taxRowsHtml}
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:2px solid #111827;font-size:13px;font-weight:800"><span>Total TTC</span><span>${fmtN(total)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb"><span>Payé</span><span>${fmtN(invoice.paid)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Reste à payer</span><span>${fmtN(remaining)}</span></div>
  </div>
</div>

${paymentsHtml}
${invoice.notes ? `<div style="margin-top:18px;font-size:10.5px"><strong>Notes :</strong> ${invoice.notes}</div>` : ''}
<div style="margin-top:20px;border-top:1px solid #d1d5db;padding-top:8px;font-size:9px;color:#6b7280;display:flex;justify-content:space-between">
  <span>${template.companyLegal}<br>${template.companyRegistration}</span>
  <span>1/1</span>
</div>
<div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:8.5px;line-height:1.5;color:#4b5563"><strong>CGV :</strong> ${template.cgv}</div>
</body></html>`;
  const win = window.open('', '_blank', 'width=860,height=1100');
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500); }
}

function exportQuotePDF(quote: Quote, customers: Customer[], vehicles: Vehicle[], products: Product[], template = defaultTemplate) {
  const invoiceLike: Invoice = {
    id: quote.id,
    number: quote.number,
    customerId: quote.customerId,
    vehicleId: quote.vehicleId,
    paid: 0,
    status: quote.status,
    lines: quote.lines,
    issueDate: quote.issueDate,
    dueDate: quote.validUntil,
    notes: quote.notes,
  };
  exportInvoicePDF(invoiceLike, customers, vehicles, products, { ...template, type: 'Devis', title: template.title || 'Devis' });
}

function InvoicePreview({ form, customers, vehicles, products, template = defaultTemplate }: { form: { customerId: string; vehicleId: string; paid: number; status: string; lines: LineItem[]; issueDate?: string; dueDate?: string; notes?: string; number?: string }; customers: Customer[]; vehicles: Vehicle[]; products: Product[]; template?: Omit<Template, 'id' | 'name' | 'activity' | 'status' | 'type'> & { type?: string } }) {
  const customer = customers.find((c) => c.id === form.customerId);
  const vehicle = vehicles.find((v) => v.id === form.vehicleId);
  const subtotal = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const tax = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
  const total = subtotal + tax;
  const remaining = Math.max(0, total - form.paid);
  const today = new Date().toLocaleDateString('fr-FR');
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white p-6 text-sm shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-8">
        <div>
          <div className="text-base font-extrabold tracking-tight">{template.companyName}</div>
          <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{template.companyAddress}<br />{template.companyPostalCity}<br />Tél.: {template.companyPhone}<br />Email: {template.companyEmail}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold">{template.type === 'Devis' ? 'Devis' : 'Facture'} {form.number || 'à renseigner'}</div>
          <div className="mt-3 grid grid-cols-[92px_1fr] gap-x-2 gap-y-1 text-left text-[11px]">
            <span className="text-muted-foreground">Réf. client :</span><strong>{customer?.id.toUpperCase() ?? '-'}</strong>
            <span className="text-muted-foreground">Facturation :</span><strong>{form.issueDate ? new Date(form.issueDate).toLocaleDateString('fr-FR') : today}</strong>
            <span className="text-muted-foreground">Échéance :</span><strong>{form.dueDate ? new Date(form.dueDate).toLocaleDateString('fr-FR') : '-'}</strong>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="mb-1 text-xs font-bold">Émetteur</div>
            <div className="text-[12px] leading-5 text-muted-foreground"><strong className="text-foreground">{template.companyName}</strong><br />{template.companyAddress}<br />{template.companyPostalCity}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-bold">Adressé à</div>
            <div className="font-semibold">{customer?.name ?? <span className="text-muted-foreground italic">—</span>}</div>
            {customer && <><div className="text-[11px] text-muted-foreground">{customer.companyName}</div><div className="text-[11px] text-muted-foreground">{customer.billingAddress}</div></>}
            {vehicle && <div className="mt-2 text-[11px] text-muted-foreground">Véhicule : {vehicle.plate} - {vehicle.model}</div>}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead><tr className="bg-muted">
              <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Designation</th>
              <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-muted-foreground">TVA</th>
              <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-muted-foreground">P.U. HT</th>
              <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Qte</th>
              <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-widest text-muted-foreground">TTC</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {form.lines.map((line, i) => {
                const product = products.find((p) => p.id === line.productId);
                return <tr key={i}><td className="px-3 py-2 text-[11px]">{product?.name ?? '—'}</td><td className="px-3 py-2 text-right text-[11px]">{line.taxRate}%</td><td className="px-3 py-2 text-right text-[11px]">{money(line.unitPrice)}</td><td className="px-3 py-2 text-center text-[11px]">{line.quantity}</td><td className="px-3 py-2 text-right text-[11px] font-semibold">{money(line.quantity * line.unitPrice * (1 + line.taxRate / 100))}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-muted-foreground">{template.introText} · Montants exprimés en Euros</div>
        <div className="ml-auto w-44 space-y-1 text-[11px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{money(tax)}</span></div>
          {form.paid > 0 && <div className="flex justify-between text-emerald-600"><span>Acompte</span><span>−{money(form.paid)}</span></div>}
          <div className="flex justify-between border-t border-foreground pt-1.5 text-sm font-bold"><span>Total TTC</span><span>{money(total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Reste à payer</span><span>{money(remaining)}</span></div>
        </div>
        {form.notes && <div className="rounded-lg bg-muted px-3 py-2.5"><div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Notes</div><div className="text-[11px] text-muted-foreground">{form.notes}</div></div>}
        <div className="border-t border-border pt-3 text-[9px] leading-4 text-muted-foreground"><strong>CGV :</strong> {template.cgv}</div>
        <div className="flex justify-between border-t border-border pt-2 text-[9px] text-muted-foreground"><span>{template.companyLegal}</span><span>1 / 1</span></div>
      </div>
    </div>
  );
}

function SearchCombobox({
  items,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  actionLabel,
  onAction,
}: {
  items: Array<{ id: string; label: string; sublabel?: string }>;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const selected = items.find((item) => item.id === value);
  const filtered = items.filter(
    (item) =>
      query === '' ||
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      (item.sublabel ?? '').toLowerCase().includes(query.toLowerCase()),
  );
  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    }
    setOpen(true);
    setQuery('');
  };
  return (
    <div>
      <button
        type="button"
        ref={triggerRef}
        onClick={openDropdown}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[101] min-w-[220px] overflow-hidden rounded-md border border-border bg-white shadow-lg"
            style={{ top: dropPos.top + 4, left: dropPos.left, width: dropPos.width }}
          >
            <div className="border-b border-border p-2">
              <input
                autoFocus
                className="w-full rounded border border-input px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Rechercher..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-52 overflow-auto">
              {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Aucun résultat</div>}
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted ${item.id === value ? 'bg-accent' : ''}`}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.sublabel && <span className="text-xs text-muted-foreground">{item.sublabel}</span>}
                </button>
              ))}
            </div>
            {actionLabel && onAction && (
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    onAction();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
                >
                  <Plus size={13} /> {actionLabel}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Pagination({ total, page, perPage, onChange }: { total: number; page: number; perPage: number; onChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <span>
        {start}–{end} sur {total}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}


function InvoicesPage({ customers, vehicles, products, templates, invoices, query, startCreate = false, companyOverride, onCreate, onUpdate, onOpenEntity, onCreateCustomer, onCreateProduct }: { customers: Customer[]; vehicles: Vehicle[]; products: Product[]; templates: Template[]; invoices: Invoice[]; query: string; startCreate?: boolean; companyOverride?: Partial<typeof defaultTemplate>; onCreate: (invoice: Omit<Invoice, 'id'>) => void; onUpdate: (id: string, patch: Omit<Invoice, 'id'>) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void; onCreateCustomer: (customer: Omit<Customer, 'id'>) => string; onCreateProduct: (product: Omit<Product, 'id'>) => string }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const emptyForm = { number: '', customerId: '', vehicleId: '', paid: 0, status: 'À payer', lines: [] as LineItem[], issueDate: todayStr, dueDate: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState('Toutes');
  const [showCreate, setShowCreate] = useState(startCreate);
  const [page, setPage] = useState(1);

  const emptyClientForm = { name: '', companyName: '', email: '', phone: '', mobile: '', type: 'Particulier', taxNumber: '', paymentTerms: 'Comptant', currency: 'EUR', website: '', billingAddress: '', shippingAddress: '', notes: '' };
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState(emptyClientForm);

  const emptyProductForm = { name: '', type: 'Service', unit: 'forfait', unitPrice: 0, taxRate: 20 };
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const perPage = 10;

  useEffect(() => setPage(1), [statusFilter, query]);

  const filtered = invoices.filter((inv) => {
    const ok = matches(query, [inv.number, customerName(customers, inv.customerId), inv.status, vehicleLabel(vehicles, inv.vehicleId), documentSummary(products, inv.lines)]);
    return ok && (statusFilter === 'Toutes' || inv.status === statusFilter);
  });

  const sub = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmt = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.taxRate / 100), 0);
  const total = sub + taxAmt;
  const totalFacture = invoices.reduce((s, inv) => s + documentTotal(products, inv.lines), 0);
  const totalEncaisse = invoices.reduce((s, inv) => s + inv.paid, 0);
  const countOpen = invoices.filter((inv) => inv.status !== 'Payée').length;
  const invoiceTemplate = { ...(templates.find((template) => template.type === 'Facture') ?? templates[0] ?? defaultTemplate), ...companyOverride };

  const statusPill: Record<string, string> = {
    Payée: 'bg-muted text-foreground border border-border',
    Acompte: 'bg-muted text-foreground border border-border',
    'À payer': 'bg-muted text-foreground border border-border',
    Brouillon: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  const handleCreate = (status: string) => {
    if (!form.number.trim() || !form.customerId || form.lines.length === 0) return;
    const computedStatus = form.paid >= total ? 'Payée' : form.paid > 0 ? 'Acompte' : status;
    onCreate({ number: form.number.trim(), customerId: form.customerId, vehicleId: form.vehicleId, paid: form.paid, status: computedStatus, lines: form.lines, issueDate: form.issueDate, dueDate: form.dueDate, notes: form.notes });
    setForm(emptyForm);
    setShowCreate(false);
  };

  if (showCreate) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button type="button" onClick={() => setShowCreate(false)} className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
              <ChevronLeft size={16} /> Factures
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Nouvelle facture</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleCreate('Brouillon')}>Brouillon</Button>
            <Button type="button" size="sm" onClick={() => handleCreate(form.status)}><Send size={14} /> Créer la facture</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="border-b border-border bg-white px-6 py-4">
              <h2 className="font-semibold">Détails de la facture</h2>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">N° de facture <span className="text-red-500">*</span></label>
                <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="FA2605-3740" />
                <p className="mt-1 text-xs text-muted-foreground">Le numéro est saisi par le gestionnaire. Aucun numéro n’est généré automatiquement.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client <span className="text-red-500">*</span></label>
                <SearchCombobox
                  items={customers.map((c) => ({ id: c.id, label: c.name, sublabel: c.companyName }))}
                  value={form.customerId}
                  onChange={(cid) => setForm({ ...form, customerId: cid })}
                  placeholder="Sélectionner un client..."
                  actionLabel="Nouveau client"
                  onAction={() => { setClientForm(emptyClientForm); setClientModalOpen(true); }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dossier / Véhicule</label>
                <SearchCombobox
                  items={[{ id: '', label: '— Aucun dossier —' }, ...vehicles.map((v) => ({ id: v.id, label: v.plate, sublabel: v.model }))]}
                  value={form.vehicleId}
                  onChange={(vid) => setForm({ ...form, vehicleId: vid })}
                  placeholder="Sélectionner un dossier..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date d'émission <span className="text-red-500">*</span></label>
                  <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</label>
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>À payer</option>
                    <option>Acompte</option>
                    <option>Payée</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date d'échéance</label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acompte déjà reçu (€)</label>
                <Input type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: Number(e.target.value) })} placeholder="0" />
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tableau d'articles <span className="text-red-500">*</span></div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-muted">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Article</th>
                      <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qté</th>
                      <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prix HT</th>
                      <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">TVA%</th>
                      <th className="w-8 px-3 py-2.5"></th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {form.lines.map((line, index) => (
                        <tr key={`${line.productId}-${index}`} className="bg-white transition-colors hover:bg-muted/30">
                          <td className="px-3 py-2.5">
                            <SearchCombobox
                              items={products.map((p) => ({ id: p.id, label: p.name, sublabel: money(p.unitPrice) + ' / ' + p.unit }))}
                              value={line.productId}
                              onChange={(pid) => {
                                const np = products.find((p) => p.id === pid);
                                setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, productId: pid, unitPrice: np?.unitPrice ?? it.unitPrice, taxRate: np?.taxRate ?? it.taxRate } : it) });
                              }}
                              placeholder="Choisir un article..."
                              actionLabel="Nouvel article"
                              onAction={() => { setProductForm(emptyProductForm); setProductModalOpen(true); }}
                            />
                          </td>
                          <td className="px-3 py-2.5"><Input type="number" value={line.quantity} onChange={(e) => setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, quantity: Number(e.target.value) } : it) })} /></td>
                          <td className="px-3 py-2.5"><Input type="number" value={line.unitPrice} onChange={(e) => setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, unitPrice: Number(e.target.value) } : it) })} /></td>
                          <td className="px-3 py-2.5"><Input type="number" value={line.taxRate} onChange={(e) => setForm({ ...form, lines: form.lines.map((it, i) => i === index ? { ...it, taxRate: Number(e.target.value) } : it) })} /></td>
                          <td className="px-3 py-2.5 text-center">
                            <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_it, i) => i !== index) })} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-border bg-white px-3 py-2.5">
                    <button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, { productId: '', quantity: 1, unitPrice: 0, taxRate: 20 }] })} className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80">
                      <Plus size={14} /> Ajouter un article
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes client</label>
                <textarea className="min-h-[72px] w-full rounded-md border border-input bg-white p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Merci pour votre confiance. Veuillez régler avant la date d'échéance." />
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aperçu de la facture</p>
              <Button type="button" variant="outline" size="sm" onClick={() => exportInvoicePDF({ id: 'preview', ...form, number: form.number || 'FA2605-3740' }, customers, vehicles, products, invoiceTemplate)}>
                <Download size={14} /> Exporter PDF
              </Button>
            </div>
            <InvoicePreview form={form} customers={customers} vehicles={vehicles} products={products} template={invoiceTemplate} />
          </div>
        </div>

        {/* Inline modals */}
        <EditDialog title="Nouveau client" open={clientModalOpen} onClose={() => setClientModalOpen(false)} onSubmit={() => {
          if (!clientForm.name) return;
          const newId = onCreateCustomer(clientForm);
          setForm((f) => ({ ...f, customerId: newId }));
          setClientModalOpen(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom <span className="text-red-500">*</span></label><Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Martin Services" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Société</label><Input value={clientForm.companyName} onChange={(e) => setClientForm({ ...clientForm, companyName: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label><Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Téléphone</label><Input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</label><Select value={clientForm.type} onChange={(e) => setClientForm({ ...clientForm, type: e.target.value })}><option>Particulier</option><option>Professionnel</option><option>Entreprise</option><option>Flotte</option></Select></div>
          </div>
        </EditDialog>

        <EditDialog title="Nouvel article" open={productModalOpen} onClose={() => setProductModalOpen(false)} onSubmit={() => {
          if (!productForm.name) return;
          const newId = onCreateProduct(productForm);
          setForm((f) => ({ ...f, lines: [...f.lines, { productId: newId, quantity: 1, unitPrice: productForm.unitPrice, taxRate: productForm.taxRate }] }));
          setProductModalOpen(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom <span className="text-red-500">*</span></label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Main-d'oeuvre" /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</label><Select value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}><option>Service</option><option>Produit</option><option>Forfait</option></Select></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unité</label><Input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prix HT (€)</label><Input type="number" value={productForm.unitPrice} onChange={(e) => setProductForm({ ...productForm, unitPrice: Number(e.target.value) })} /></div>
            <div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">TVA (%)</label><Input type="number" value={productForm.taxRate} onChange={(e) => setProductForm({ ...productForm, taxRate: Number(e.target.value) })} /></div>
          </div>
        </EditDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-1 text-2xl font-semibold">Toutes les factures <ChevronDown size={20} className="text-primary" /></h1>
          <p className="mt-1 text-sm text-muted-foreground">Suivez les échéances, les règlements et les PDF à envoyer.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nouvelle facture</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total facturé</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><FileText size={14} /></div>
          </div>
          <div className="text-2xl font-bold">{money(totalFacture)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Encaissé</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><Wallet size={14} /></div>
          </div>
          <div className="text-2xl font-bold">{money(totalEncaisse)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{totalFacture > 0 ? Math.round((totalEncaisse / totalFacture) * 100) : 0}% du total</div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solde dû</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><Clock size={14} /></div>
          </div>
          <div className="text-2xl font-bold">{money(totalFacture - totalEncaisse)}</div>
          <div className="mt-1 text-xs text-muted-foreground">À encaisser</div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">En attente</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><AlertCircle size={14} /></div>
          </div>
          <div className="text-2xl font-bold">{countOpen}</div>
          <div className="mt-1 text-xs text-muted-foreground">non soldée{countOpen !== 1 ? 's' : ''}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-1">
            {['Toutes', 'À payer', 'Acompte', 'Payée', 'Brouillon'].map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="w-10 px-4 py-3 text-left"><input type="checkbox" className="h-4 w-4 rounded border-border" /></th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">N° de facture</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom du client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date d’échéance</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Montant</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice((page - 1) * perPage, page * perPage).map((invoice) => {
                const tot = documentTotal(products, invoice.lines);
                const sc = statusPill[invoice.status] ?? 'border border-border bg-muted text-muted-foreground';
                return (
                  <tr key={invoice.id} className="bg-white transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-border" /></td>
                    <td className="px-4 py-3">{invoice.issueDate ? formatDate(invoice.issueDate) : '-'}</td>
                    <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('invoice', invoice.id)}><span className="font-semibold">{invoice.number}</span></LinkButton></td>
                    <td className="px-4 py-3"><LinkButton onClick={() => onOpenEntity('customer', invoice.customerId)}>{customerName(customers, invoice.customerId)}</LinkButton></td>
                    <td className="px-4 py-3"><span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${sc}`}>{invoice.status}</span></td>
                    <td className="px-4 py-3">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(tot)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" title="Modifier" onClick={() => setEditing(invoice)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Edit3 size={14} /></button>
                        <button type="button" title="Exporter PDF" onClick={() => exportInvoicePDF(invoice, customers, vehicles, products, invoiceTemplate)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-blue-50 hover:text-primary"><Download size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Aucune facture trouvée.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={perPage} onChange={setPage} />
      </Card>

      <DocumentEditDialog kind="facture" customers={customers} vehicles={vehicles} products={products} document={editing} onClose={() => setEditing(null)} onSave={(patch) => {
        if (!editing) return;
        onUpdate(editing.id, { number: editing.number, paid: editing.paid, ...patch });
        setEditing(null);
      }} />
    </div>
  );
}

function PaymentsPage({ invoices, customers, products, payments, query, onCreate, onUpdate, onOpenEntity }: { invoices: Invoice[]; customers: Customer[]; products: Product[]; payments: Payment[]; query: string; onCreate: (payment: Omit<Payment, 'id' | 'date'>) => void; onUpdate: (id: string, patch: Payment) => void; onOpenEntity: (kind: NonNullable<RelationTarget>['kind'], id: string) => void }) {
  const empty = { invoiceId: '', amount: 0, method: 'Carte' };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;
  useEffect(() => setPage(1), [query]);
  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (p: Payment) => { setEditing(p); setForm({ invoiceId: p.invoiceId, amount: p.amount, method: p.method }); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const handleSubmit = () => {
    if (!form.invoiceId) return;
    if (editing) { onUpdate(editing.id, { id: editing.id, date: editing.date, invoiceId: form.invoiceId, amount: form.amount, method: form.method }); }
    else { onCreate(form); }
    closeModal();
  };
  const filtered = payments.filter((payment) => {
    const invoice = invoices.find((item) => item.id === payment.invoiceId);
    return matches(query, [invoice?.number ?? '', invoice ? customerName(customers, invoice.customerId) : '', payment.method, payment.amount]);
  });

  return (
    <PageShell title="Encaissements" description="Enregistrez un paiement et la facture est mise à jour automatiquement." action={<Button onClick={openCreate}><Plus size={15} /> Encaisser</Button>}>
      <DataTable headers={['Facture', 'Client', 'Montant', 'Moyen', 'Date', 'Actions']}>
        {filtered.slice((page - 1) * perPage, page * perPage).map((payment) => {
          const invoice = invoices.find((item) => item.id === payment.invoiceId);
          return (
            <tr key={payment.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{invoice && <LinkButton onClick={() => onOpenEntity('invoice', invoice.id)}>{invoice.number}</LinkButton>}</td>
              <td className="px-4 py-3">{invoice ? <LinkButton onClick={() => onOpenEntity('customer', invoice.customerId)}>{customerName(customers, invoice.customerId)}</LinkButton> : '-'}</td>
              <td className="px-4 py-3 font-semibold">{money(payment.amount)}</td>
              <td className="px-4 py-3"><Badge>{payment.method}</Badge></td>
              <td className="px-4 py-3">{payment.date}</td>
              <td className="px-4 py-3"><EditButton onClick={() => openEdit(payment)} /></td>
            </tr>
          );
        })}
      </DataTable>
      <Pagination total={filtered.length} page={page} perPage={perPage} onChange={setPage} />
      <EditDialog title={editing ? 'Modifier le paiement' : 'Encaisser'} open={modalOpen} onClose={closeModal} onSubmit={handleSubmit}>
        <PaymentFields invoices={invoices} customers={customers} products={products} value={form} onChange={setForm} />
      </EditDialog>
    </PageShell>
  );
}

function TemplatesPage({ templates, onUpdateTemplate, onClose }: { templates: Template[]; fields: CustomField[]; onCreateTemplate: (template: Omit<Template, 'id'>) => void; onUpdateTemplate: (id: string, patch: Omit<Template, 'id'>) => void; onCreateField: (field: Omit<CustomField, 'id'>) => void; onUpdateField: (id: string, patch: Omit<CustomField, 'id'>) => void; onClose: () => void }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '');
  const [editorSection, setEditorSection] = useState('Général');
  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) ?? templates[0];
  const editorSections = [
    { label: 'Général', icon: FileCog },
    { label: 'En-tête', icon: PanelTop },
    { label: 'Table', icon: Table2 },
    { label: 'Total', icon: Sigma },
    { label: 'Textes', icon: FileText },
  ];
  const updateSelectedTemplate = (patch: Partial<Omit<Template, 'id'>>) => {
    if (!selectedTemplate) return;
    onUpdateTemplate(selectedTemplate.id, { ...selectedTemplate, ...patch });
  };
  const themeOptions = [
    { label: 'Noir classique', primaryColor: '#111111', accentColor: '#f3f3f3' },
    { label: 'Contraste fort', primaryColor: '#000000', accentColor: '#ffffff' },
    { label: 'Gris atelier', primaryColor: '#2b2b2b', accentColor: '#eeeeee' },
  ];
  const renderPanel = () => {
    if (!selectedTemplate) return null;
    if (editorSection === 'En-tête') {
      return (
        <div className="space-y-5">
          <SectionHeading title="Informations du garage" />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nom du garage</label>
            <Input value={selectedTemplate.companyName} onChange={(event) => updateSelectedTemplate({ companyName: event.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Adresse</label>
            <Input value={selectedTemplate.companyAddress} onChange={(event) => updateSelectedTemplate({ companyAddress: event.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Code postal et ville</label>
            <Input value={selectedTemplate.companyPostalCity} onChange={(event) => updateSelectedTemplate({ companyPostalCity: event.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Téléphone</label>
              <Input value={selectedTemplate.companyPhone} onChange={(event) => updateSelectedTemplate({ companyPhone: event.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input value={selectedTemplate.companyEmail} onChange={(event) => updateSelectedTemplate({ companyEmail: event.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">TVA intracommunautaire</label>
            <Input value={selectedTemplate.companyVat} onChange={(event) => updateSelectedTemplate({ companyVat: event.target.value })} />
          </div>
          <TextAreaControl label="Mentions société" value={selectedTemplate.companyLegal} onChange={(value) => updateSelectedTemplate({ companyLegal: value })} />
          <TextAreaControl label="Registre / TVA" value={selectedTemplate.companyRegistration} onChange={(value) => updateSelectedTemplate({ companyRegistration: value })} />
          <ColorInput label="Couleur d’arrière-plan" value={selectedTemplate.accentColor} onChange={(value) => updateSelectedTemplate({ accentColor: value })} />
          <TextAreaControl label="Pied de page" value={selectedTemplate.footerText} onChange={(value) => updateSelectedTemplate({ footerText: value })} />
        </div>
      );
    }
    if (editorSection === 'Table') {
      return (
        <div className="space-y-5">
          <SectionHeading title="Propriétés du tableau" />
          <div className="grid grid-cols-[1fr_92px] gap-3">
            {['Article & description', 'Quantité', 'Taux', 'Montant'].map((label, index) => (
              <label key={label} className="contents">
                <ToggleRow label={label} checked />
                <Input type="number" value={index === 0 ? 45 : 15} readOnly />
              </label>
            ))}
          </div>
        </div>
      );
    }
    if (editorSection === 'Total') {
      return (
        <div className="space-y-5">
          <SectionHeading title="Section total" />
          <ToggleRow label="Afficher le sous-total" checked />
          <ToggleRow label="Afficher la TVA" checked />
          <ToggleRow label="Afficher le total TTC" checked />
          <ToggleRow label="Afficher les détails du paiement" checked={selectedTemplate.includePayment} onChange={(value) => updateSelectedTemplate({ includePayment: value })} />
        </div>
      );
    }
    if (editorSection === 'Textes') {
      return (
        <div className="space-y-5">
          <SectionHeading title="Textes du modèle" />
          <TextAreaControl label="Catégorie / introduction" value={selectedTemplate.introText} onChange={(value) => updateSelectedTemplate({ introText: value })} />
          <TextAreaControl label="Conditions de paiement" value={selectedTemplate.paymentText} onChange={(value) => updateSelectedTemplate({ paymentText: value })} />
          <TextAreaControl label="CGV" value={selectedTemplate.cgv} onChange={(value) => updateSelectedTemplate({ cgv: value })} />
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="text-sm font-semibold">Variables disponibles</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {templateVariables.map((variable) => (
                <span key={variable} className="rounded-md border border-border bg-white px-2.5 py-1 font-mono text-xs text-muted-foreground">{variable}</span>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <SectionHeading title="Propriétés du modèle" />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-red-600">Nom du modèle*</label>
          <Input value={selectedTemplate.name} onChange={(event) => updateSelectedTemplate({ name: event.target.value })} />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Document</div>
          <SegmentedOptions value={selectedTemplate.type} options={['Facture', 'Devis']} onChange={(value) => updateSelectedTemplate({ type: value })} />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Taille du papier</div>
          <SegmentedOptions value={selectedTemplate.paperSize} options={['A5', 'A4', 'Lettre US']} onChange={(value) => updateSelectedTemplate({ paperSize: value })} />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Orientation</div>
          <SegmentedOptions value={selectedTemplate.orientation} options={['Portrait', 'Paysage']} onChange={(value) => updateSelectedTemplate({ orientation: value })} />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Marges <span className="text-muted-foreground">(pouces)</span></div>
          <div className="grid grid-cols-4 gap-3">
            <LabeledNumber label="Haut" value={selectedTemplate.marginTop} onChange={(value) => updateSelectedTemplate({ marginTop: value })} />
            <LabeledNumber label="Bas" value={selectedTemplate.marginBottom} onChange={(value) => updateSelectedTemplate({ marginBottom: value })} />
            <LabeledNumber label="Gauche" value={selectedTemplate.marginLeft} onChange={(value) => updateSelectedTemplate({ marginLeft: value })} />
            <LabeledNumber label="Droite" value={selectedTemplate.marginRight} onChange={(value) => updateSelectedTemplate({ marginRight: value })} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Titre affiché</label>
          <Input value={selectedTemplate.title} onChange={(event) => updateSelectedTemplate({ title: event.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorInput label="Principale" value={selectedTemplate.primaryColor} onChange={(value) => updateSelectedTemplate({ primaryColor: value })} />
          <ColorInput label="Accent" value={selectedTemplate.accentColor} onChange={(value) => updateSelectedTemplate({ accentColor: value })} />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#f7f7f7]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-5">
        <h1 className="shrink-0 whitespace-nowrap text-2xl font-semibold">Éditer un modèle</h1>
        <div className="ml-4 flex min-w-0 items-center gap-3 overflow-x-auto">
          <Select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="w-52">
            {templates.map((item) => <option key={item.id} value={item.id}>{item.type} · {item.name}</option>)}
          </Select>
          <Select value={selectedTemplate?.primaryColor ?? '#111111'} onChange={(event) => {
            const theme = themeOptions.find((item) => item.primaryColor === event.target.value);
            if (theme) updateSelectedTemplate({ primaryColor: theme.primaryColor, accentColor: theme.accentColor });
          }} className="w-72">
            {themeOptions.map((theme) => <option key={theme.primaryColor} value={theme.primaryColor}>Sélectionner un thème · {theme.label}</option>)}
          </Select>
          <Button type="button" variant="outline"><RefreshCw size={16} /> Actualiser l’aperçu</Button>
          <Button type="button"><Save size={16} /> Enregistrer</Button>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-md text-red-500 hover:bg-red-50" title="Fermer">
            <X size={24} />
          </button>
        </div>
      </header>

      {selectedTemplate && (
        <div className="grid min-h-0 flex-1 grid-cols-[104px_600px_minmax(0,1fr)]">
          <nav className="bg-black p-2">
            {editorSections.map((section) => (
              <button
                key={section.label}
                type="button"
                onClick={() => setEditorSection(section.label)}
                className={`mb-2 flex h-20 w-full flex-col items-center justify-center gap-1 rounded-md px-2 text-center text-xs font-medium transition-colors ${editorSection === section.label ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                <section.icon size={21} />
                {section.label}
              </button>
            ))}
          </nav>

          <aside className="min-h-0 overflow-auto border-r border-border bg-white p-7">
            {renderPanel()}
          </aside>

          <main className="min-h-0 overflow-auto p-10">
            <div className="mx-auto max-w-[1080px]">
              <QuoteTemplatePreview template={selectedTemplate} data={templatePreviewData} />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ company, onCompanyChange, selectedActivity, onActivityChange, onSaved }: { company: { name: string; address: string; postalCity: string; phone: string; email: string; legal: string; registration: string; vat: string; cgv: string }; onCompanyChange: (c: typeof company) => void; selectedActivity: ActivityKey; onActivityChange: (activity: ActivityKey) => void; onSaved: () => void }) {
  const set = (field: string, value: string) => onCompanyChange({ ...company, [field]: value });
  return (
    <PageShell title="Paramètres entreprise" description="Configuration entreprise, informations légales et préférences documentaires.">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2 2xl:col-span-1">
          <SectionTitle title="Informations entreprise" action="Enregistrer" onAction={onSaved} />
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Raison sociale</label>
              <Input value={company.name} onChange={(e) => set('name', e.target.value)} placeholder="CENTER AUTO PIECE" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Adresse</label>
                <Input value={company.address} onChange={(e) => set('address', e.target.value)} placeholder="1 RUE DES ARTS" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">CP / Ville</label>
                <Input value={company.postalCity} onChange={(e) => set('postalCity', e.target.value)} placeholder="59280 ARMENTIERES" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Téléphone</label>
                <Input value={company.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03 20 95 31 98" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                <Input type="email" value={company.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@exemple.fr" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mentions légales (SARL, capital, SIRET…)</label>
              <Input value={company.legal} onChange={(e) => set('legal', e.target.value)} placeholder="SARL - Capital 4 000 € - SIRET : 000 000 000 00000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">RCS / TVA</label>
              <Input value={company.registration} onChange={(e) => set('registration', e.target.value)} placeholder="RCS Lille - N° TVA : FR00000000000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">N° TVA intracommunautaire</label>
              <Input value={company.vat} onChange={(e) => set('vat', e.target.value)} placeholder="FR00000000000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">CGV (pied de page des factures)</label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-white p-3 text-xs outline-none transition focus:ring-2 focus:ring-ring"
                value={company.cgv}
                onChange={(e) => set('cgv', e.target.value)}
                placeholder="Conditions générales de vente..."
              />
            </div>
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

function HelpPage({ setActivePage }: { setActivePage: (page: Page) => void }) {
  const faqs = [
    { q: 'Comment créer un devis ?', a: 'Ouvre Devis, clique sur Nouveau devis, choisis un client, ajoute les articles puis enregistre ou télécharge le PDF.' },
    { q: 'Comment transformer le catalogue en facture ?', a: 'Dans Factures, ajoute une ligne puis sélectionne un article du catalogue. Le prix reste modifiable et le total se recalcule automatiquement.' },
    { q: 'Pourquoi les modèles affichent des variables ?', a: 'Un modèle ne contient pas de client réel. Les variables comme {{ destinataire.nom }} sont remplacées au moment de générer le PDF.' },
    { q: 'Comment utiliser le garage ?', a: 'L’expérience Garage rattache véhicules, ordres de réparation, devis et factures au même dossier atelier.' },
    { q: 'Comment retrouver une relation ?', a: 'Clique sur un nom client, un numéro de facture, un véhicule ou un article. La fiche relationnelle affiche les éléments liés.' },
    { q: 'Pourquoi il y a de la pagination ?', a: 'Pour garder l’interface rapide avec beaucoup de clients, factures ou véhicules. Les résultats se chargent par pages.' },
  ];
  const [selected, setSelected] = useState(faqs[0]);
  return (
    <PageShell title="Aide et FAQ" description="Un assistant simple pour comprendre les workflows principaux.">
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[360px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4 font-semibold">Questions fréquentes</div>
          <div className="divide-y divide-border">
            {faqs.map((faq) => (
              <button key={faq.q} type="button" onClick={() => setSelected(faq)} className={`w-full p-4 text-left text-sm transition-colors hover:bg-muted ${selected.q === faq.q ? 'bg-accent font-semibold text-accent-foreground' : ''}`}>
                {faq.q}
              </button>
            ))}
          </div>
        </Card>
        <Card className="flex min-h-[460px] flex-col overflow-hidden">
          <div className="border-b border-border bg-white px-5 py-4">
            <div className="text-sm font-semibold">Assistant Invoxa</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Réponses courtes, orientées action.</div>
          </div>
          <div className="flex-1 space-y-4 bg-muted/30 p-6">
            <div className="max-w-[75%] rounded-lg bg-white p-4 text-sm shadow-sm">{selected.q}</div>
            <div className="ml-auto max-w-[78%] rounded-lg bg-primary p-4 text-sm text-primary-foreground shadow-sm">{selected.a}</div>
            <div className="rounded-lg border border-dashed border-border bg-white p-4 text-sm text-muted-foreground">
              Besoin d’agir maintenant ? Utilise les raccourcis ci-dessous.
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border bg-white p-4">
            <Button type="button" variant="outline" onClick={() => setActivePage('quotes')}>Créer un devis</Button>
            <Button type="button" variant="outline" onClick={() => setActivePage('invoices')}>Créer une facture</Button>
            <Button type="button" variant="outline" onClick={() => setActivePage('garage')}>Ouvrir garage</Button>
            <Button type="button" variant="outline" onClick={() => setActivePage('templates')}>Modifier modèle</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function CustomerFields({ value, onChange }: { value: Omit<Customer, 'id'>; onChange: (value: Omit<Customer, 'id'>) => void }) {
  return (
    <>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Nom <span className="text-red-500">*</span></label><Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Martin Services" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Société</label><Input value={value.companyName} onChange={(event) => onChange({ ...value, companyName: event.target.value })} placeholder="Martin Services SARL" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label><Select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}><option>Entreprise</option><option>Particulier</option><option>Professionnel</option><option>Flotte</option></Select></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label><Input type="email" value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} placeholder="contact@exemple.fr" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Téléphone</label><Input value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} placeholder="05 56 00 00 00" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Mobile</label><Input value={value.mobile} onChange={(event) => onChange({ ...value, mobile: event.target.value })} placeholder="06 00 00 00 00" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">N° TVA / fiscal</label><Input value={value.taxNumber} onChange={(event) => onChange({ ...value, taxNumber: event.target.value })} placeholder="FR 00 123456789" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Conditions de paiement</label><Select value={value.paymentTerms} onChange={(event) => onChange({ ...value, paymentTerms: event.target.value })}><option>Comptant</option><option>15 jours</option><option>30 jours</option><option>45 jours</option><option>60 jours</option></Select></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Devise</label><Select value={value.currency} onChange={(event) => onChange({ ...value, currency: event.target.value })}><option>EUR</option><option>USD</option><option>GBP</option></Select></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Site web</label><Input value={value.website} onChange={(event) => onChange({ ...value, website: event.target.value })} placeholder="exemple.fr" /></div>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Adresse de facturation</label><Input value={value.billingAddress} onChange={(event) => onChange({ ...value, billingAddress: event.target.value })} placeholder="12 rue des Ateliers, 33000 Bordeaux" /></div>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Adresse de livraison</label><Input value={value.shippingAddress} onChange={(event) => onChange({ ...value, shippingAddress: event.target.value })} placeholder="Identique à la facturation" /></div>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Notes internes</label><Input value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Informations complémentaires..." /></div>
    </>
  );
}

function ProductFields({ value, onChange }: { value: Omit<Product, 'id'>; onChange: (value: Omit<Product, 'id'>) => void }) {
  return (
    <>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Nom <span className="text-red-500">*</span></label><Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Main-d'oeuvre mécanique" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label><Select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })}><option>Service</option><option>Produit</option><option>Forfait</option></Select></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Unité</label><Input value={value.unit} onChange={(event) => onChange({ ...value, unit: event.target.value })} placeholder="heure, forfait, pièce..." /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Prix HT (€)</label><Input type="number" value={value.unitPrice} onChange={(event) => onChange({ ...value, unitPrice: Number(event.target.value) })} placeholder="0" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">TVA (%)</label><Input type="number" value={value.taxRate} onChange={(event) => onChange({ ...value, taxRate: Number(event.target.value) })} placeholder="20" /></div>
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
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Client</label><Select value={value.customerId} onChange={(event) => onChange({ ...value, customerId: event.target.value })}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</Select></div>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Article</label><Select value={value.productId} onChange={(event) => onChange({ ...value, productId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} — {money(product.unitPrice)}</option>)}</Select></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Quantité</label><Input type="number" value={value.quantity} onChange={(event) => onChange({ ...value, quantity: Number(event.target.value) })} placeholder="1" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label><Select value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })}><option>Brouillon</option><option>Envoyé</option><option>Accepté</option><option>À payer</option><option>Acompte</option><option>Payée</option></Select></div>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Dossier / Véhicule</label><Select value={value.vehicleId} onChange={(event) => onChange({ ...value, vehicleId: event.target.value })}>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} — {vehicle.model}</option>)}</Select></div>
      {showPaid && <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Acompte déjà reçu (€)</label><Input type="number" value={value.paid ?? 0} onChange={(event) => onChange({ ...value, paid: Number(event.target.value) })} placeholder="0" /></div>}
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
  const value = {
    customerId: document?.customerId ?? '',
    vehicleId: document?.vehicleId ?? '',
    status: document?.status ?? 'Brouillon',
    lines: document?.lines ?? [],
    issueDate: document?.issueDate ?? new Date().toISOString().slice(0, 10),
    dueDate: 'dueDate' in (document ?? {}) ? (document as Invoice).dueDate ?? '' : '',
    validUntil: 'validUntil' in (document ?? {}) ? (document as Quote).validUntil ?? '' : '',
    notes: document?.notes ?? '',
    paid: 'paid' in (document ?? {}) ? (document as Invoice).paid : 0,
  };
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [document?.id]);

  if (!document) return null;
  const subtotal = draft.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const tax = draft.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (line.taxRate / 100), 0);
  const total = subtotal + tax;
  const isInvoice = kind === 'facture';
  const title = isInvoice ? 'Modifier la facture' : 'Modifier le devis';

  return (
    <Dialog title={title} open={!!document} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        onSave({
          customerId: draft.customerId,
          vehicleId: draft.vehicleId,
          status: draft.status,
          paid: draft.paid,
          lines: draft.lines,
          issueDate: draft.issueDate,
          dueDate: draft.dueDate,
          validUntil: draft.validUntil,
          notes: draft.notes,
        });
      }}>
        <div className="max-h-[72vh] space-y-5 overflow-auto pr-2">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</label>
              <Select value={draft.customerId} onChange={(event) => setDraft({ ...draft, customerId: event.target.value })}>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dossier / véhicule</label>
              <Select value={draft.vehicleId} onChange={(event) => setDraft({ ...draft, vehicleId: event.target.value })}>
                <option value="">Aucun dossier</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} — {vehicle.model}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date d’émission</label>
              <Input type="date" value={draft.issueDate} onChange={(event) => setDraft({ ...draft, issueDate: event.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isInvoice ? 'Date d’échéance' : 'Valide jusqu’au'}</label>
              <Input type="date" value={isInvoice ? draft.dueDate : draft.validUntil} onChange={(event) => setDraft({ ...draft, [isInvoice ? 'dueDate' : 'validUntil']: event.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</label>
              <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                {isInvoice ? (
                  <>
                    <option>À payer</option>
                    <option>Acompte</option>
                    <option>Payée</option>
                    <option>Brouillon</option>
                  </>
                ) : (
                  <>
                    <option>Brouillon</option>
                    <option>Envoyé</option>
                    <option>Accepté</option>
                    <option>Refusé</option>
                  </>
                )}
              </Select>
            </div>
            {isInvoice && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acompte reçu (€)</label>
                <Input type="number" value={draft.paid} onChange={(event) => setDraft({ ...draft, paid: Number(event.target.value) })} />
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Article</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Qté</th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Prix HT</th>
                  <th className="w-24 px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">TVA</th>
                  <th className="w-32 px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">TTC</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {draft.lines.map((line, index) => (
                  <tr key={`${line.productId}-${index}`}>
                    <td className="px-3 py-2">
                      <Select value={line.productId} onChange={(event) => {
                        const product = products.find((item) => item.id === event.target.value);
                        setDraft({ ...draft, lines: draft.lines.map((item, i) => i === index ? { ...item, productId: event.target.value, unitPrice: product?.unitPrice ?? item.unitPrice, taxRate: product?.taxRate ?? item.taxRate } : item) });
                      }}>
                        <option value="">Choisir un article</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </Select>
                    </td>
                    <td className="px-3 py-2"><Input type="number" value={line.quantity} onChange={(event) => setDraft({ ...draft, lines: draft.lines.map((item, i) => i === index ? { ...item, quantity: Number(event.target.value) } : item) })} /></td>
                    <td className="px-3 py-2"><Input type="number" value={line.unitPrice} onChange={(event) => setDraft({ ...draft, lines: draft.lines.map((item, i) => i === index ? { ...item, unitPrice: Number(event.target.value) } : item) })} /></td>
                    <td className="px-3 py-2"><Input type="number" value={line.taxRate} onChange={(event) => setDraft({ ...draft, lines: draft.lines.map((item, i) => i === index ? { ...item, taxRate: Number(event.target.value) } : item) })} /></td>
                    <td className="px-3 py-2 text-right font-semibold">{money(line.quantity * line.unitPrice * (1 + line.taxRate / 100))}</td>
                    <td className="px-3 py-2"><button type="button" onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_item, i) => i !== index) })} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border px-3 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { productId: products[0]?.id ?? '', quantity: 1, unitPrice: products[0]?.unitPrice ?? 0, taxRate: products[0]?.taxRate ?? 20 }] })}>
                <Plus size={14} /> Ajouter une ligne
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</label>
              <textarea className="min-h-[86px] w-full rounded-md border border-input bg-white p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sous-total HT</span><span>{money(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{money(tax)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 font-bold"><span>Total TTC</span><span className="text-primary">{money(total)}</span></div>
                {isInvoice && draft.paid > 0 && <div className="flex justify-between text-amber-700"><span>Solde</span><span>{money(Math.max(0, total - draft.paid))}</span></div>}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit"><Edit3 size={16} /> Enregistrer</Button>
        </div>
      </form>
    </Dialog>
  );
}

function PaymentFields({ invoices, customers, products, value, onChange }: { invoices: Invoice[]; customers: Customer[]; products: Product[]; value: { invoiceId: string; amount: number; method: string }; onChange: (value: any) => void }) {
  return (
    <>
      <div className="col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Facture</label><Select value={value.invoiceId} onChange={(event) => onChange({ ...value, invoiceId: event.target.value })}>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} — {customerName(customers, invoice.customerId)} — {money(documentTotal(products, invoice.lines))}</option>)}</Select></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Montant (€)</label><Input type="number" value={value.amount} onChange={(event) => onChange({ ...value, amount: Number(event.target.value) })} placeholder="0" /></div>
      <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Moyen de paiement</label><Select value={value.method} onChange={(event) => onChange({ ...value, method: event.target.value })}><option>Carte</option><option>Virement</option><option>Espèces</option><option>Chèque</option></Select></div>
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
        <option>Par défaut</option>
        <option>Actif</option>
        <option>Brouillon</option>
      </Select>
      <Input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} placeholder="Titre affiché" />
      <Input type="color" value={value.primaryColor} onChange={(event) => onChange({ ...value, primaryColor: event.target.value })} title="Couleur principale" />
      <Input type="color" value={value.accentColor} onChange={(event) => onChange({ ...value, accentColor: event.target.value })} title="Couleur douce" />
      <Input value={value.introText} onChange={(event) => onChange({ ...value, introText: event.target.value })} placeholder="Texte d'introduction" />
      <Input value={value.paymentText} onChange={(event) => onChange({ ...value, paymentText: event.target.value })} placeholder="Conditions de paiement" />
      <Input value={value.footerText} onChange={(event) => onChange({ ...value, footerText: event.target.value })} placeholder="Pied de page" />
    </>
  );
}

function SegmentedOptions({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${value === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function LabeledNumber({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Input type="number" step="0.05" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-md border border-border p-3">
      <span className="mb-2 block text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-8 cursor-pointer rounded border border-border" />
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
    </label>
  );
}

function TextAreaControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea className="min-h-[76px] w-full rounded-md border border-input bg-white p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ChevronDown size={18} className="text-primary" />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange?: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked)}
        readOnly={!onChange}
        className="h-5 w-5 rounded border-border text-blue-500 focus:ring-blue-500"
      />
      <span>{label}</span>
    </label>
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

function PageShell({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
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

function ActionMenu({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-10 top-12 z-20 min-w-56 overflow-hidden rounded-lg border border-border bg-white py-2 text-sm shadow-xl">
      <div className="[&>button]:block [&>button]:w-full [&>button]:px-4 [&>button]:py-2.5 [&>button]:text-left [&>button]:transition-colors [&>button:hover]:bg-muted">
        {children}
      </div>
    </div>
  );
}

function TransactionSection({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasRows = Children.count(children) > 0;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><ChevronDown size={18} className="text-primary" />{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Numéro</th>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3 text-right">Montant</th>
            <th className="px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {hasRows ? children : <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{empty}</td></tr>}
        </tbody>
      </table>
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

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'warning';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const isDanger = tone === 'danger';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-6">
      <Card className="w-full max-w-md overflow-hidden border-border bg-white shadow-2xl">
        <div className="flex gap-4 p-5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isDanger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <AlertCircle size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-5 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={isDanger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
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

function MiniTemplatePreview({ template }: { template: Template }) {
  return (
    <div className="mx-auto aspect-[0.72] w-full max-w-[250px] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold tracking-wide" style={{ color: template.primaryColor }}>{template.type.toUpperCase()}</div>
          <div className="mt-1 h-2 w-20 rounded-full bg-slate-100" />
          <div className="mt-2 h-2 w-14 rounded-full bg-slate-100" />
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white" style={{ backgroundColor: template.primaryColor }}>
          {template.name.slice(0, 1)}
        </div>
      </div>
      <div className="mb-5 ml-auto w-28 rounded-md p-3" style={{ backgroundColor: template.accentColor }}>
        <div className="mb-2 h-2 rounded-full bg-slate-300/70" />
        <div className="h-2 w-20 rounded-full bg-slate-300/70" />
      </div>
      <div className="overflow-hidden rounded-sm border border-slate-200">
        <div className="grid grid-cols-[1fr_45px_45px] px-2 py-2 text-[8px] font-semibold text-white" style={{ backgroundColor: template.primaryColor }}>
          <span>Article</span><span>Qté</span><span className="text-right">Total</span>
        </div>
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-[1fr_45px_45px] border-t border-slate-100 px-2 py-2">
            <span className="h-2 rounded-full bg-slate-100" />
            <span className="mx-2 h-2 rounded-full bg-slate-100" />
            <span className="h-2 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="mt-4 ml-auto w-28 space-y-2">
        <div className="h-2 rounded-full bg-slate-100" />
        <div className="h-3 rounded-full" style={{ backgroundColor: template.accentColor }} />
      </div>
    </div>
  );
}

function QuoteTemplatePreview({ template, data }: { template: Template; data: typeof templatePreviewData }) {
  const padding = `${Math.max(20, template.marginTop * 44)}px ${Math.max(20, template.marginRight * 44)}px ${Math.max(20, template.marginBottom * 44)}px ${Math.max(20, template.marginLeft * 44)}px`;
  const isLandscape = template.orientation === 'Paysage';
  return (
    <div className={`overflow-hidden rounded-md border border-border bg-white text-sm shadow-sm ${isLandscape ? 'min-h-[430px]' : 'min-h-[620px]'}`} style={{ padding }}>
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
          <div className="text-xs font-semibold uppercase text-muted-foreground">Destinataire</div>
          <div className="mt-1 font-mono text-lg font-semibold">{data.recipient}</div>
          <div className="font-mono text-muted-foreground">{data.recipientAddress}</div>
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
        {template.includePayment && (
          <div className="mt-6 rounded-md border border-border p-4">
            <div className="font-medium">Conditions</div>
            <p className="mt-1 text-muted-foreground">{template.paymentText}</p>
          </div>
        )}
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
  onUpdateCustomer,
  onUpdateProduct,
  onUpdateVehicle,
  onUpdatePayment,
}: {
  target: NonNullable<RelationTarget>;
  customers: Customer[];
  products: Product[];
  vehicles: Vehicle[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  onBack: () => void;
  onOpen: (kind: NonNullable<RelationTarget>['kind'], id: string) => void;
  onUpdateCustomer: (id: string, patch: Customer) => void;
  onUpdateProduct: (id: string, patch: Product) => void;
  onUpdateVehicle: (id: string, patch: Omit<Vehicle, 'id'>) => void;
  onUpdatePayment: (id: string, patch: Payment) => void;
}) {
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
  const panelTitle = quote ? `Devis ${quote.number}` : invoice ? `Facture ${invoice.number}` : target.kind === 'product' && product ? product.name : target.kind === 'customer' && customer ? customer.name : titleMap[target.kind];
  const [editing, setEditing] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<Customer | null>(customer ?? null);
  const [productDraft, setProductDraft] = useState<Product | null>(product ?? null);
  const [vehicleDraft, setVehicleDraft] = useState<Vehicle | null>(vehicle ?? null);
  const [paymentDraft, setPaymentDraft] = useState<Payment | null>(payment ?? null);

  useEffect(() => {
    setEditing(false);
    setCustomerDraft(customer ?? null);
    setProductDraft(product ?? null);
    setVehicleDraft(vehicle ?? null);
    setPaymentDraft(payment ?? null);
  }, [target.kind, target.id]);

  const saveSidebarEdit = () => {
    if (target.kind === 'customer' && customerDraft) onUpdateCustomer(target.id, customerDraft);
    if (target.kind === 'product' && productDraft) onUpdateProduct(target.id, productDraft);
    if (target.kind === 'vehicle' && vehicleDraft) onUpdateVehicle(target.id, { plate: vehicleDraft.plate, customerId: vehicleDraft.customerId, model: vehicleDraft.model, mileage: vehicleDraft.mileage, status: vehicleDraft.status });
    if (target.kind === 'payment' && paymentDraft) onUpdatePayment(target.id, paymentDraft);
    setEditing(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[min(980px,calc(100vw-224px))] overflow-auto border-l border-border bg-background p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{panelTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Vue relationnelle avec éléments rattachés.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={editing ? () => setEditing(false) : onBack}>{editing ? 'Annuler' : 'Retour'}</Button>
          {editing ? (
            <Button onClick={saveSidebarEdit}><Save size={16} />Enregistrer</Button>
          ) : (
            <Button onClick={() => setEditing(true)} disabled={target.kind === 'quote' || target.kind === 'invoice'}><Edit3 size={16} />Modifier</Button>
          )}
        </div>
      </div>
      <div className="space-y-5">
        {editing && customerDraft && <Card className="p-4"><div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><CustomerFields value={customerDraft} onChange={(value) => setCustomerDraft({ ...customerDraft, ...value })} /></div></Card>}
        {editing && productDraft && <Card className="p-4"><div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><ProductFields value={productDraft} onChange={(value) => setProductDraft({ ...productDraft, ...value })} /></div></Card>}
        {editing && vehicleDraft && <Card className="p-4"><div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Input value={vehicleDraft.plate} onChange={(event) => setVehicleDraft({ ...vehicleDraft, plate: event.target.value })} placeholder="Immatriculation" />
          <Select value={vehicleDraft.customerId} onChange={(event) => setVehicleDraft({ ...vehicleDraft, customerId: event.target.value })}>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Input value={vehicleDraft.model} onChange={(event) => setVehicleDraft({ ...vehicleDraft, model: event.target.value })} placeholder="Modèle" />
          <Input type="number" value={vehicleDraft.mileage} onChange={(event) => setVehicleDraft({ ...vehicleDraft, mileage: Number(event.target.value) })} placeholder="Kilométrage" />
          <Select value={vehicleDraft.status} onChange={(event) => setVehicleDraft({ ...vehicleDraft, status: event.target.value })}><option>Diagnostic</option><option>En atelier</option><option>Prêt</option></Select>
        </div></Card>}
        {editing && paymentDraft && <Card className="p-4"><div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Select value={paymentDraft.invoiceId} onChange={(event) => setPaymentDraft({ ...paymentDraft, invoiceId: event.target.value })}>{invoices.map((item) => <option key={item.id} value={item.id}>{item.number}</option>)}</Select>
          <Input type="number" value={paymentDraft.amount} onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: Number(event.target.value) })} />
          <Select value={paymentDraft.method} onChange={(event) => setPaymentDraft({ ...paymentDraft, method: event.target.value })}><option>Carte</option><option>Virement</option><option>Espèces</option><option>Chèque</option></Select>
          <Input type="date" value={paymentDraft.date} onChange={(event) => setPaymentDraft({ ...paymentDraft, date: event.target.value })} />
        </div></Card>}
        {!editing && customer && <DetailGrid rows={[
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
        {!editing && product && <DetailGrid rows={[
          ['Nom', product.name],
          ['Type', product.type],
          ['Unité', product.unit],
          ['Prix HT', money(product.unitPrice)],
          ['TVA', `${product.taxRate}%`],
        ]} />}
        {!editing && quote && <DocumentDetail document={quote} customers={customers} vehicles={vehicles} products={products} onOpen={onOpen} />}
        {!editing && invoice && <DocumentDetail document={invoice} customers={customers} vehicles={vehicles} products={products} onOpen={onOpen} />}
        {!editing && vehicle && <DetailGrid rows={[
          ['Immatriculation', vehicle.plate],
          ['Client', customerName(customers, vehicle.customerId)],
          ['Modèle', vehicle.model],
          ['Kilométrage', `${vehicle.mileage.toLocaleString('fr-FR')} km`],
          ['Statut', vehicle.status],
        ]} />}
        {!editing && payment && <DetailGrid rows={[
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
