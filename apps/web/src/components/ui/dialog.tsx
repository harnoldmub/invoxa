import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

type DialogProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ title, open, onClose, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-6">
      <Card className="max-h-[88vh] w-full max-w-3xl overflow-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} title="Fermer">
            <X size={18} />
          </Button>
        </div>
        {children}
      </Card>
    </div>
  );
}
