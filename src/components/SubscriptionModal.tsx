import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { useEffect, useState } from 'react';
import type { Church } from '@/src/types';
import { supabase } from '@/src/lib/supabase';

interface SubscriptionModalProps {
  open: boolean;
  church: Church | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SubscriptionModal({
  open,
  church,
  onClose,
  onSaved,
}: SubscriptionModalProps) {

  const [status, setStatus] = useState<'active' | 'trial' | 'inactive'>('active');
  const [duration, setDuration] = useState(365);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!church) return;

    setStatus(
        (church.subscription_status as 'active' | 'trial' | 'inactive') ??
        'active'
    );

    if (!church.subscription_expires_at) {
        setDuration(365);
        return;
    }

    const today = new Date();

    const expires = new Date(church.subscription_expires_at);

    const diffDays = Math.round(
        (expires.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 30) {
        setDuration(30);
    } else if (diffDays <= 365) {
        setDuration(365);
    } else if (diffDays <= 730) {
        setDuration(730);
    } else {
        setDuration(1825);
    }

    }, [church]);

    async function handleSave() {
      if (!church) return;

      setSaving(true);

      try {
          let expiresAt: string | null = null;

          if (status !== 'inactive') {
          const date = new Date();

          date.setDate(date.getDate() + duration);

          expiresAt = date.toISOString();
          }

          const { error } = await supabase
          .from('churches')
          .update({
              subscription_status: status,
              subscription_expires_at: expiresAt,
          })
          .eq('id', church.id);

          if (error) throw error;

          onSaved();
          onClose();

      } catch (err) {
          console.error(err);
          alert('Erro ao atualizar assinatura.');
      } finally {
          setSaving(false);
      }
  }

  if (!open || !church) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between bg-brand-800 px-6 py-4 text-white">
            <div>
              <h2 className="text-lg font-bold">
                Gerenciar Assinatura
              </h2>

              <p className="text-sm opacity-80">
                {church.name}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 transition hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="space-y-6 p-6">

            <div>
                <h3 className="font-semibold text-brand-800 mb-3">
                Status da Assinatura
                </h3>

                <div className="space-y-2">

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="status"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    />
                    <span>🟢 Ativa</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="status"
                    checked={status === 'trial'}
                    onChange={() => setStatus('trial')}
                    />
                    <span>🔵 Teste Gratuito</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="status"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    />
                    <span>🔴 Bloqueada</span>
                </label>

                </div>
            </div>

            <div>
                <h3 className="font-semibold text-brand-800 mb-3">
                Período
                </h3>

                <div className="space-y-2">

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="duration"
                    checked={duration === 30}
                    onChange={() => setDuration(30)}
                    />
                    <span>30 dias (Teste)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="duration"
                    checked={duration === 365}
                    onChange={() => setDuration(365)}
                    />
                    <span>1 Ano</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="duration"
                    checked={duration === 730}
                    onChange={() => setDuration(730)}
                    />
                    <span>2 Anos</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                    type="radio"
                    name="duration"
                    checked={duration === 1825}
                    onChange={() => setDuration(1825)}
                    />
                    <span>5 Anos</span>
                </label>

                </div>
            </div>

            </div>

          {/* Rodapé */}
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}