import React, { useState, useEffect } from 'react';
import { 
  Landmark as ChurchIcon, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Users as UsersIcon,
  ChevronRight,
  AlertCircle,
  X,
  Save,
  Loader2,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import type { Congregation, Church as ChurchType } from '@/src/types';
import { Button } from '@/src/components/ui/Button';
import ConfirmDeleteModal from '@/src/components/ConfirmDeleteModal';

export default function Church() {
  const { profile, church: initialChurch, refreshAuth } = useAuth();

  // 🔒 BLOQUEIO TOTAL PARA SECRETARIO
  if (!profile) return null;

  if (profile.role === 'SECRETARIO') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-6">
          <h2 className="text-xl font-bold text-brand-700 mb-2">
            Acesso restrito
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar o ambiente Igreja.
          </p>
        </div>
      </div>
    );
  }

  const [church, setChurch] = useState<ChurchType | null>(initialChurch);
  const [loading, setLoading] = useState(true);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [isEditingChurch, setIsEditingChurch] = useState(false);
  const [churchName, setChurchName] = useState(initialChurch?.name || '');
  const [churchStreet, setChurchStreet] = useState(initialChurch?.street || '');
  const [churchNumber, setChurchNumber] = useState(initialChurch?.number || '');
  const [churchNeighborhood, setChurchNeighborhood] = useState(initialChurch?.neighborhood || '');
  const [churchCity, setChurchCity] = useState(initialChurch?.city || '');
  const [churchState, setChurchState] = useState(initialChurch?.state || '');
  const [isSavingChurch, setIsSavingChurch] = useState(false);
  
  const [isCongregationModalOpen, setIsCongregationModalOpen] = useState(false);
  const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{
    table: string;
    id: string | null;
    title: string;
    message: string;
  } | null>(null);
  const [congregationName, setCongregationName] = useState('');
  const [congStreet, setCongStreet] = useState('');
  const [congNumber, setCongNumber] = useState('');
  const [congNeighborhood, setCongNeighborhood] = useState('');
  const [congCity, setCongCity] = useState('');
  const [congState, setCongState] = useState('');
  const [isSavingCongregation, setIsSavingCongregation] = useState(false);

  const hasNoChurch = !church && profile?.role !== 'ADMIN_APP';

  useEffect(() => {
    if (initialChurch) {
      setChurch(initialChurch);
      setChurchName(initialChurch.name);
      setChurchStreet(initialChurch.street || '');
      setChurchNumber(initialChurch.number || '');
      setChurchNeighborhood(initialChurch.neighborhood || '');
      setChurchCity(initialChurch.city || '');
      setChurchState(initialChurch.state || '');
      fetchCongregations(initialChurch.id);
    } else if (profile?.role === 'ADMIN_APP') {
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [initialChurch, profile]);

  async function fetchCongregations(churchId: string) {
    try {
      let query = supabase
        .from('congregations')
        .select('*')
        .eq('church_id', churchId)
        .order('name');

      if (profile.role === 'SECRETARIO') {
        query = query.eq('id', profile.congregation_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCongregations(data || []);
    } catch (error) {
      console.error('Error fetching congregations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateChurch() {
    if (!profile || profile.role !== 'ADMIN_APP') return;
    if (!churchName.trim()) {
      alert('Por favor, informe o nome da igreja.');
      return;
    }

    setIsSavingChurch(true);
    try {
      const churchData = {
        name: churchName,
        street: churchStreet,
        number: churchNumber,
        neighborhood: churchNeighborhood,
        city: churchCity,
        state: churchState
      };

      const { data: newChurch, error: churchError } = await supabase
        .from('churches')
        .insert([churchData])
        .select()
        .single();

      if (churchError) throw churchError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ church_id: newChurch.id })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      await refreshAuth();
      setIsEditingChurch(false);
      alert('Igreja criada com sucesso!');
    } catch (error) {
      console.error('Error creating church:', error);
      alert('Erro ao criar igreja: ' + (error as any).message);
    } finally {
      setIsSavingChurch(true);
    }
  }

  async function handleDeleteChurch() {
    if (!church || profile?.role !== 'ADMIN_MASTER') return;
    
    setDeleteConfig({
      table: 'churches',
      id: church.id,
      title: 'Excluir igreja',
      message: 'Tem certeza que deseja excluir esta igreja? Esta ação é irreversível e excluirá todas as congregações, turmas e alunos vinculados.'
    });
  }

  async function handleUpdateChurch() {
    if (!church || !churchName.trim()) return;
    
    setIsSavingChurch(true);
    try {
      const updateData = { 
        name: churchName,
        street: churchStreet,
        number: churchNumber,
        neighborhood: churchNeighborhood,
        city: churchCity,
        state: churchState
      };

      const { error } = await supabase
        .from('churches')
        .update(updateData)
        .eq('id', church.id);

      if (error) throw error;
      
      await refreshAuth();
      setIsEditingChurch(false);
    } catch (error) {
      console.error('Error updating church:', error);
      alert('Erro ao atualizar dados da igreja');
    } finally {
      setIsSavingChurch(false);
    }
  }

  async function handleSaveCongregation(e: React.FormEvent) {
    e.preventDefault();
    if (!church || !congregationName.trim() || !profile) return;

    // Block creation/editing for SECRETARIO
    if (profile.role === 'SECRETARIO') {
      alert('Você não tem permissão para esta ação');
      return;
    }

    setIsSavingCongregation(true);
    try {
      const congData = {
        name: congregationName,
        street: congStreet,
        number: congNumber,
        neighborhood: congNeighborhood,
        city: congCity,
        state: congState,
        church_id: church.id
      };

      if (editingCongregation) {
        const { error } = await supabase
          .from('congregations')
          .update(congData)
          .eq('id', editingCongregation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('congregations')
          .insert([congData]);

        if (error) throw error;
      }

      await fetchCongregations(church.id);
      closeCongregationModal();
    } catch (error) {
      console.error('Error saving congregation:', error);
      alert('Erro ao salvar congregação');
    } finally {
      setIsSavingCongregation(false);
    }
  }

  function openCongregationModal(congregation?: Congregation) {
    if (!profile) return;

    // Block opening modal for new congregation if SECRETARIO
    if (!congregation && profile.role === 'SECRETARIO') {
      alert('Você não tem permissão para criar congregações');
      return;
    }

    if (congregation) {
      setEditingCongregation(congregation);
      setCongregationName(congregation.name);
      setCongStreet(congregation.street || '');
      setCongNumber(congregation.number || '');
      setCongNeighborhood(congregation.neighborhood || '');
      setCongCity(congregation.city || '');
      setCongState(congregation.state || '');
    } else {
      setEditingCongregation(null);
      setCongregationName('');
      setCongStreet('');
      setCongNumber('');
      setCongNeighborhood('');
      setCongCity('');
      setCongState('');
    }
    setIsCongregationModalOpen(true);
  }

  function closeCongregationModal() {
    setIsCongregationModalOpen(false);
    setEditingCongregation(null);
    setCongregationName('');
    setCongStreet('');
    setCongNumber('');
    setCongNeighborhood('');
    setCongCity('');
    setCongState('');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-700">IGREJA</h1>
          <p className="text-gray-700 text-sm mt-1">Gerencie Matriz e congregações.</p>
        </div>
        {!hasNoChurch && (profile?.role === 'ADMIN_MASTER' || profile?.role === 'ADMIN_APP') && (
          <Button
            onClick={() => openCongregationModal()}
            className="bg-brand-700 text-white hover:bg-brand-800 rounded-xl px-6 py-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus size={20} />
            Nova Congregação
          </Button>
        )}
      </div>

        {hasNoChurch ? (
          <div className="bg-brand-800 rounded-2xl p-6 sm:p-10 shadow-lg text-center max-w-2xl mx-auto text-white">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-white" size={32} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Igreja não vinculada</h2>
            <p className="text-sm sm:text-base text-white opacity-80 mb-8 leading-relaxed">
              Para gerenciar congregações e outras funcionalidades, seu perfil precisa estar vinculado a uma igreja. 
              Por favor, entre em contato com o administrador do sistema para realizar este vínculo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <Building2 size={16} className="text-white" />
                  Sede e Filiais
                </h3>
                <p className="text-[10px] sm:text-xs text-white opacity-60">Estruture igreja com Matriz e congregações ilimitadas.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <UsersIcon size={16} className="text-white" />
                  Equipe de Gestão
                </h3>
                <p className="text-[10px] sm:text-xs text-white opacity-60">Defina secretários e administradores para cada localidade.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sede Info */}
            <div className="bg-brand-800 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <ChurchIcon className="text-white" size={24} />
                  </div>
                  <h2 className="text-lg font-bold text-white">Dados da Sede</h2>
                </div>
                {!isEditingChurch ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingChurch(true)}
                    className="text-white hover:bg-white/10 rounded-xl"
                  >
                    <Edit2 size={18} />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingChurch(false)}
                    className="text-white hover:bg-white/10 rounded-xl"
                  >
                    <X size={18} />
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[10px] text-white uppercase font-bold tracking-widest mb-1">Nome da Instituição</p>
                  {isEditingChurch ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={churchName}
                        onChange={(e) => setChurchName(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                      <Button
                        size="sm"
                        onClick={church ? handleUpdateChurch : handleCreateChurch}
                        className="bg-white text-brand-700 hover:bg-white/90 rounded-lg"
                      >
                        {church ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-white font-bold text-lg">{church?.name || 'Igreja não criada'}</p>
                  )}
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[10px] text-white uppercase font-bold tracking-widest mb-1">Endereço Completo</p>
                  {isEditingChurch ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Rua"
                        value={churchStreet}
                        onChange={(e) => setChurchStreet(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Número"
                          value={churchNumber}
                          onChange={(e) => setChurchNumber(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <input
                          type="text"
                          placeholder="Bairro"
                          value={churchNeighborhood}
                          onChange={(e) => setChurchNeighborhood(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Cidade"
                          value={churchCity}
                          onChange={(e) => setChurchCity(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <input
                          type="text"
                          placeholder="Estado"
                          value={churchState}
                          onChange={(e) => setChurchState(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-white font-bold">
                      {church?.street ? (
                        `${church.street}${church.number ? `, ${church.number}` : ''}${church.neighborhood ? ` - ${church.neighborhood}` : ''}${church.city ? ` - ${church.city}/${church.state || ''}` : ''}`
                      ) : (
                        'Não informado'
                      )}
                    </p>
                  )}
                </div>

                {church && profile?.role === 'ADMIN_MASTER' && (
                  <div className="pt-4">
                    <Button
                      variant="ghost"
                      onClick={handleDeleteChurch}
                      className="text-red-400 hover:bg-red-400/10 w-full flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Excluir Igreja
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Congregations List */}
            <div className="bg-brand-800 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <MapPin className="text-white" size={24} />
                  </div>
                  <h2 className="text-lg font-bold text-white">Congregações</h2>
                </div>
                <span className="bg-white text-brand-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  {congregations.length} Total
                </span>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {congregations.map((cong) => (
                  <div
                    key={cong.id}
                    className="group p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
                        {cong.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{cong.name}</h3>
                      </div>
                    </div>
                    {(profile?.role === 'ADMIN_MASTER' || profile?.role === 'ADMIN_APP') && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCongregationModal(cong)}
                          className="text-white hover:bg-white/10 rounded-lg p-2"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfig({
                            table: "congregations",
                            id: cong.id,
                            title: "Excluir congregação",
                            message: "Tem certeza que deseja excluir esta congregação?"
                          })}
                          className="text-red-400 hover:bg-red-400/10 rounded-lg p-2"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {congregations.length === 0 && (
                  <div className="text-center py-12">
                    <MapPin size={40} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white opacity-40 text-sm">Nenhuma congregação cadastrada.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Congregation Modal */}
      <AnimatePresence>
        {isCongregationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCongregationModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-brand-200 flex items-center justify-between bg-brand-800 text-white">
                <h3 className="text-xl font-bold">
                  {editingCongregation ? 'Editar Congregação' : 'Nova Congregação'}
                </h3>
                <button 
                  onClick={closeCongregationModal}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCongregation} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-700 mb-1">
                    Nome da Congregação *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-black"
                    placeholder="Ex: Congregação Central"
                    value={congregationName}
                    onChange={(e) => setCongregationName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-brand-700">
                    Endereço
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      className="col-span-3 px-4 py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                      placeholder="Rua"
                      value={congStreet}
                      onChange={(e) => setCongStreet(e.target.value)}
                    />
                    <input
                      type="text"
                      className="px-4 py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                      placeholder="Nº"
                      value={congNumber}
                      onChange={(e) => setCongNumber(e.target.value)}
                    />
                  </div>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                    placeholder="Setor/Bairro"
                    value={congNeighborhood}
                    onChange={(e) => setCongNeighborhood(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="px-4 py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                      placeholder="Cidade"
                      value={congCity}
                      onChange={(e) => setCongCity(e.target.value)}
                    />
                    <input
                      type="text"
                      className="px-4 py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                      placeholder="Estado"
                      value={congState}
                      onChange={(e) => setCongState(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={closeCongregationModal}
                    className="flex-1 px-6 py-3 border border-brand-200 text-brand-700 rounded-xl font-semibold hover:bg-brand-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCongregation}
                    className="flex-1 px-6 py-3 bg-brand-700 text-white rounded-xl font-semibold hover:bg-brand-800 transition-all shadow-lg shadow-brand-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingCongregation ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <Save size={20} />
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
        table={deleteConfig?.table || ""}
        recordId={deleteConfig?.id || null}
        title={deleteConfig?.title || ""}
        message={deleteConfig?.message || ""}
        onClose={() => setDeleteConfig(null)}
        onDeleted={async () => {
          await refreshAuth();
          if (church) fetchCongregations(church.id);
        }}
      />
    </div>
  );
}
