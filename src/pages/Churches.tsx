import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { formatDate } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/Button';
import { Landmark, Trash2, Search, Plus, Edit2, X, Save, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Church } from '@/src/types';
import ConfirmDeleteModal from '@/src/components/ConfirmDeleteModal';

export default function Churches() {
  const { profile } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);
  const [churchName, setChurchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [deleteConfig, setDeleteConfig] = useState<{
    id: string;
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (profile?.role === 'ADMIN_MASTER') {
      fetchChurches();
    }
  }, [profile]);

  async function fetchChurches() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) setChurches(data);
    } catch (error) {
      console.error('Error fetching churches:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveChurch(e: React.FormEvent) {
    e.preventDefault();
    if (!churchName.trim()) return;

    setIsSaving(true);
    try {
      if (editingChurch) {
        const { error } = await supabase
          .from('churches')
          .update({ name: churchName })
          .eq('id', editingChurch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('churches')
          .insert({ name: churchName });
        if (error) throw error;
      }

      await fetchChurches();
      closeModal();
    } catch (error) {
      console.error('Error saving church:', error);
      alert('Erro ao salvar igreja.');
    } finally {
      setIsSaving(false);
    }
  }

  function openModal(church?: Church) {
    if (church) {
      setEditingChurch(church);
      setChurchName(church.name);
    } else {
      setEditingChurch(null);
      setChurchName('');
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingChurch(null);
    setChurchName('');
  }

  const filteredChurches = churches.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'ADMIN_MASTER') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p>Apenas administradores da plataforma podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-700">Gerenciar Igrejas</h1>
          <p className="text-gray-700 text-sm mt-1">Visualize e gerencie todas as igrejas da plataforma.</p>
        </div>
        <Button 
          onClick={() => openModal()}
          className="bg-brand-700 text-white hover:bg-brand-800 rounded-xl px-6 py-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        >
          <Plus size={20} />
          Nova Igreja
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" size={18} />
          <input 
            placeholder="Buscar igrejas..." 
            className="pl-10 w-full h-11 rounded-xl border border-brand-200 focus:border-brand-700 outline-none transition-all text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 sm:py-20">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-brand-700"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredChurches.map((church) => (
            <motion.div
              key={church.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-brand-800 text-white rounded-2xl p-5 sm:p-6 shadow-lg group flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Landmark className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{church.name}</h3>
                    <p className="text-xs text-white opacity-90 uppercase font-bold tracking-widest">IGREJA</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(church)}
                    className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfig({
                      id: church.id,
                      title: 'Excluir Igreja',
                      message: `Tem certeza que deseja excluir a igreja "${church.name}"? Todos os dados vinculados (congregações, salas, alunos, aulas) serão perdidos permanentemente.`
                    })}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-xs text-white opacity-99">
                  <Calendar size={14} />
                  <span>Criada em: {formatDate(church.created_at)}</span>
                </div>
                <p className="text-xs sm:text-sm text-white opacity-99 line-clamp-2">
                  {church.address || 'Sem endereço cadastrado'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredChurches.length === 0 && (
        <div className="text-center py-12 sm:py-20 bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-10 text-white">
          <Landmark size={40} className="mx-auto text-white/20 mb-4 sm:size-48" />
          <h3 className="text-base sm:text-lg font-bold text-white">Nenhuma igreja encontrada</h3>
        </div>
      )}

      {/* Church Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-brand-200 flex items-center justify-between bg-brand-800 text-white">
                <h3 className="text-lg sm:text-xl font-bold">
                  {editingChurch ? 'Editar Igreja' : 'Nova Igreja'}
                </h3>
                <button 
                  onClick={closeModal}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveChurch} className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-brand-700 mb-1">
                    Nome da Igreja *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                    placeholder="Ex: Igreja Central"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-brand-200 text-brand-700 rounded-xl font-semibold hover:bg-brand-50 transition-all text-sm order-2 sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-700 text-white rounded-xl font-semibold hover:bg-brand-800 transition-all shadow-lg shadow-brand-700/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm order-1 sm:order-2"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Save size={18} />
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        isOpen={!!deleteConfig}
        table="churches"
        recordId={deleteConfig?.id || null}
        title={deleteConfig?.title || ""}
        message={deleteConfig?.message || ""}
        onClose={() => setDeleteConfig(null)}
        onDeleted={() => fetchChurches()}
      />
    </div>
  );
}
