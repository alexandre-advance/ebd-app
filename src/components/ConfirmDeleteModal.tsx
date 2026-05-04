import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  table: string;
  recordId: string | null;
  title: string;
  message: string;
  onClose: () => void;
  onDeleted?: () => void;
  customDelete?: (id: string) => Promise<void>;
}

export default function ConfirmDeleteModal({
  isOpen,
  table,
  recordId,
  title,
  message,
  onClose,
  onDeleted,
  customDelete
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!recordId) return;

    setIsDeleting(true);
    try {
      if (customDelete) {
        await customDelete(recordId);
      } else {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', recordId);

        if (error) {
          // Handle foreign key violation (PostgREST error code 23503)
          if (error.code === '23503') {
            if (table === 'congregations') {
              alert('Não é possível excluir esta congregação porque existem salas vinculadas a ela.');
            } else if (table === 'churches') {
              alert('Não é possível excluir esta igreja porque existem congregações vinculadas a ela.');
            } else {
              alert('Não é possível excluir este registro porque existem outros dados vinculados a ele.');
            }
            return;
          }
          throw error;
        }
      }

      alert('Registro excluído com sucesso.');
      if (onDeleted) onDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Erro ao excluir o registro. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
            </div>

            <p className="text-gray-600 mb-8 leading-relaxed">
              {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 order-2 sm:order-1 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={onClose}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white order-1 sm:order-2 rounded-xl shadow-lg shadow-red-600/20"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
