import { FormEvent, useMemo, useState } from 'react';
import { Car, ClipboardCheck, Edit3, FilePlus2, Gauge, History, ReceiptText, Search, Wrench } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Dialog } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';

type Customer = { id: string; name: string; email: string; phone: string; type: string };
type Vehicle = { id: string; plate: string; customerId: string; model: string; mileage: number; status: string };

type GarageWorkspaceProps = {
  customers: Customer[];
  vehicles: Vehicle[];
  query: string;
  onCreateVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle: (vehicleId: string, patch: Omit<Vehicle, 'id'>) => void;
  onOpenEntity: (kind: 'customer' | 'vehicle', id: string) => void;
};

const workOrders = [
  { number: 'OR-2026-0184', title: 'Freinage et voyant ABS', total: '742,80 €', link: 'Facture liée véhicule' },
  { number: 'OR-2026-0185', title: 'Révision 180 000 km', total: '389,00 €', link: 'Devis lié véhicule' },
  { number: 'OR-2026-0186', title: 'Perte puissance moteur', total: '1 246,30 €', link: 'Diagnostic ouvert' },
];

const customerName = (customers: Customer[], customerId: string) => customers.find((customer) => customer.id === customerId)?.name ?? 'Client inconnu';

export function GarageWorkspace({ customers, vehicles, query, onCreateVehicle, onUpdateVehicle, onOpenEntity }: GarageWorkspaceProps) {
  const [plateQuery, setPlateQuery] = useState('');
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ plate: '', customerId: customers[0]?.id ?? '', model: '', mileage: 0, status: 'Diagnostic' });
  const search = `${query} ${plateQuery}`.trim().toLowerCase();

  const filteredVehicles = useMemo(() => {
    if (!search) return vehicles;
    return vehicles.filter((vehicle) => `${vehicle.plate} ${customerName(customers, vehicle.customerId)} ${vehicle.model} ${vehicle.status}`.toLowerCase().includes(search));
  }, [customers, search, vehicles]);

  const submitVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.plate || !form.model) return;
    onCreateVehicle(form);
    setForm({ plate: '', customerId: customers[0]?.id ?? '', model: '', mileage: 0, status: 'Diagnostic' });
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Garage automobile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Véhicules, recherche immatriculation, interventions, ordres de réparation, pièces et main-d’oeuvre.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-5">
          <div className="mb-5 flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Car size={18} />
                Garage
              </div>
              <h2 className="mt-1 text-xl font-semibold">Suivi atelier et facturation liée au véhicule</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 xl:flex">
              <Button variant="outline" className="w-full xl:w-auto">
                <FilePlus2 size={16} />
                Devis garage
              </Button>
              <Button className="w-full xl:w-auto">
                <ReceiptText size={16} />
                Facture garage
              </Button>
            </div>
          </div>

          <form onSubmit={submitVehicle} className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-5">
            <Input value={form.plate} onChange={(event) => setForm({ ...form, plate: event.target.value })} placeholder="Immatriculation" />
            <Select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </Select>
            <Input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="Marque et modèle" />
            <Input type="number" value={form.mileage} onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })} placeholder="Kilométrage" />
            <Button type="submit">
              <ClipboardCheck size={16} />
              Ajouter
            </Button>
          </form>

          <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" value={plateQuery} onChange={(event) => setPlateQuery(event.target.value)} placeholder="Recherche par immatriculation, VIN, client ou modèle..." />
            </div>
            <Button variant="secondary">
              <ClipboardCheck size={16} />
              Ouvrir un ordre
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Immatriculation</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Véhicule</th>
                  <th className="px-4 py-3 font-medium">Kilométrage</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-semibold"><button className="text-primary hover:underline" onClick={() => onOpenEntity('vehicle', vehicle.id)}>{vehicle.plate}</button></td>
                    <td className="px-4 py-3"><button className="text-primary hover:underline" onClick={() => onOpenEntity('customer', vehicle.customerId)}>{customerName(customers, vehicle.customerId)}</button></td>
                    <td className="px-4 py-3">{vehicle.model}</td>
                    <td className="px-4 py-3">{vehicle.mileage.toLocaleString('fr-FR')} km</td>
                    <td className="px-4 py-3">
                      <Badge className={vehicle.status === 'Prêt' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}>{vehicle.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(vehicle)}>
                        <Edit3 size={15} />
                        Modifier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Ordres de réparation</h3>
              <Wrench size={18} className="text-primary" />
            </div>
            <div className="space-y-3">
              {workOrders.map((order) => (
                <div key={order.number} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{order.number}</span>
                    <span className="text-sm font-semibold">{order.total}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{order.title}</div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                    <History size={14} />
                    {order.link}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Champs et documents</h3>
              <Gauge size={18} className="text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoTile title="Véhicule" body="VIN, énergie, flotte, garantie" />
              <InfoTile title="Document" body="PDF devis, facture, ordre atelier" />
              <InfoTile title="Dossier associé" body="Véhicule, client et historique" />
              <InfoTile title="Permissions" body="atelier, accueil, admin" />
            </div>
          </Card>
        </div>
      </div>

      <Dialog title="Modifier le véhicule" open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={(event) => {
            event.preventDefault();
            onUpdateVehicle(editing.id, { plate: editing.plate, customerId: editing.customerId, model: editing.model, mileage: editing.mileage, status: editing.status });
            setEditing(null);
          }}>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <Input value={editing.plate} onChange={(event) => setEditing({ ...editing, plate: event.target.value })} placeholder="Immatriculation" />
              <Select value={editing.customerId} onChange={(event) => setEditing({ ...editing, customerId: event.target.value })}>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </Select>
              <Input value={editing.model} onChange={(event) => setEditing({ ...editing, model: event.target.value })} placeholder="Marque et modèle" />
              <Input type="number" value={editing.mileage} onChange={(event) => setEditing({ ...editing, mileage: Number(event.target.value) })} />
              <Select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}>
                <option>Diagnostic</option>
                <option>En atelier</option>
                <option>Prêt</option>
              </Select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit"><Edit3 size={16} />Enregistrer</Button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}

function InfoTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}
