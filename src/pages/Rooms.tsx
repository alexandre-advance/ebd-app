import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { School, Plus, Search, ChevronRight, Users, BookOpen, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import ConfirmDeleteModal from '@/src/components/ConfirmDeleteModal';
import type { Room, Congregation } from '@/src/types';

const roomCategories = [
  'INFANTIL (0-5 anos)',
  'INFANTIL (6-8 anos)',
  'INFANTIL (9-11 anos)',
  'ADOLESCENTE (12-14 anos)',
  'ADOLESCENTE (15-17 anos)',
  'JOVENS',
  'ADULTOS'
];

export default function Rooms() {
  const { profile, church } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{
    table: string;
    id: string | null;
    title: string;
    message: string;
  } | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [congregationId, setCongregationId] = useState('');

  const hasNoChurch = !church && profile?.role !== 'ADMIN_MASTER' && profile?.role !== 'ADMIN_APP';

  useEffect(() => {
    if (church) {
      fetchData();
    } else if (!loading && !church) {
      setLoading(false);
    }
  }, [church]);

  useEffect(() => {
    if (editingRoom) {
      setName(editingRoom.name);
      setCategory(editingRoom.category || '');
      setDescription(editingRoom.description || '');
      setCongregationId(editingRoom.congregation_id);
      setIsModalOpen(true);
    } else {
      setName('');
      setCategory('');
      setDescription('');
      if (profile?.role === 'SECRETARIO' && profile.congregation_id) {
        setCongregationId(profile.congregation_id);
      } else if (congregations.length > 0) {
        setCongregationId(congregations[0].id);
      }
    }
  }, [editingRoom, congregations, profile]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch congregations first to populate select
      let congQuery = supabase
        .from('congregations')
        .select('*');
        
      if (profile?.role === 'SECRETARIO' && profile.congregation_id) {
        congQuery = congQuery.eq('id', profile.congregation_id);
      } else {
        congQuery = congQuery.eq('church_id', church!.id);
      }
      
      const { data: congData } = await congQuery;
      
      if (congData) {
        setCongregations(congData);
      }

      // Fetch rooms
      let roomsQuery = supabase
        .from('rooms')
        .select('*, congregations!inner(*)');
        
      if (profile?.role === 'SECRETARIO' && profile.congregation_id) {
        roomsQuery = roomsQuery.eq('congregation_id', profile.congregation_id);
      } else {
        roomsQuery = roomsQuery.eq('congregations.church_id', church!.id);
      }

      const { data: roomsData } = await roomsQuery;

      if (roomsData) setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  }

  const [customName, setCustomName] = useState('');

  async function handleSaveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !congregationId || !category) return;

    setLoading(true);
    try {
      // Map display categories to granular fields
      let dbCategory = '';
      let subcategory = '';
      let minAge = 0;
      let maxAge = 99;
      let maritalStatus: 'Solteiro' | 'Casado' | null = null;

      switch (category) {
        case 'INFANTIL (0-5 anos)':
          dbCategory = 'INFANTIL';
          subcategory = '0-5';
          minAge = 0;
          maxAge = 5;
          break;
        case 'INFANTIL (6-8 anos)':
          dbCategory = 'INFANTIL';
          subcategory = '6-8';
          minAge = 6;
          maxAge = 8;
          break;
        case 'INFANTIL (9-11 anos)':
          dbCategory = 'INFANTIL';
          subcategory = '9-11';
          minAge = 9;
          maxAge = 11;
          break;
        case 'ADOLESCENTE (12-14 anos)':
          dbCategory = 'ADOLESCENTE';
          subcategory = '12-14';
          minAge = 12;
          maxAge = 14;
          break;
        case 'ADOLESCENTE (15-17 anos)':
          dbCategory = 'ADOLESCENTE';
          subcategory = '15-17';
          minAge = 15;
          maxAge = 17;
          break;
        case 'JOVENS':
          dbCategory = 'JOVENS';
          subcategory = '18-99';
          minAge = 18;
          maxAge = 99;
          maritalStatus = 'Solteiro';
          break;
        case 'ADULTOS':
          dbCategory = 'ADULTOS';
          subcategory = '18-99';
          minAge = 18;
          maxAge = 99;
          maritalStatus = 'Casado';
          break;
        default:
          dbCategory = category;
      }

      const roomPayload = { 
        name, 
        description, 
        category: dbCategory,
        subcategory,
        min_age: minAge,
        max_age: maxAge,
        marital_status: maritalStatus,
        congregation_id: congregationId 
      };

      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update(roomPayload)
          .eq('id', editingRoom.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert([roomPayload]);
        
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingRoom(null);
      setName('');
      setCategory('');
      setDescription('');
      fetchData();
      alert(editingRoom ? 'Sala atualizada com sucesso!' : 'Sala criada com sucesso!');
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Erro ao salvar sala. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Permission check: Secretário can manage rooms, but maybe only in their congregation?
  // For now, let's follow the request: "Secretário -> salas"
  const canCreate = ['ADMIN_APP', 'ADMIN_MASTER', 'SECRETARIO'].includes(profile?.role || '');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-700">Salas</h1>
          <p className="text-gray-700 text-sm mt-1">Gerencie salas da EBD.</p>
        </div>
        <Button onClick={() => {
          setEditingRoom(null);
          setName('');
          setCustomName('');
          setDescription('');
          setIsModalOpen(true);
        }} className="bg-brand-700 text-white hover:bg-brand-800 rounded-xl px-6 py-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105">
          <Plus size={20} />
          Nova Sala
        </Button>
      </div>

      {hasNoChurch ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-10 text-white">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <School size={32} className="text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Configuração Necessária</h2>
            <p className="text-sm sm:text-base text-white opacity-70 max-w-md mb-8">
              Para gerenciar salas, sua conta precisa estar vinculada a uma igreja. Entre em contato com o suporte ou seu administrador.
            </p>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full text-sm sm:text-base border-white text-white hover:bg-white/10">Voltar ao Início</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" size={18} />
                <Input 
                  placeholder="Buscar salas..." 
                  className="pl-10 w-full text-sm sm:text-base h-11 border-brand-200 focus:border-brand-700"
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
                {filteredRooms.map((room) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-brand-800 text-white rounded-2xl p-5 sm:p-6 shadow-lg group flex flex-col h-full"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl">
                          <School className="text-white" size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-lg truncate" title={room.name}>{room.name}</h3>
                          <p className="text-[10px] text-white opacity-50 uppercase font-bold tracking-widest truncate" title={room.category || 'TURMA'}>
                            {room.category || 'TURMA'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRoom(room);
                            setCongregationId(room.congregation_id);
                            setName(room.name);
                            setCategory(room.category || '');
                            setDescription(room.description || '');
                            setIsModalOpen(true);
                          }}
                          className="text-white hover:bg-white/10 rounded-lg p-2"
                        >
                          <Edit2 size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfig({
                            table: 'rooms',
                            id: room.id,
                            title: 'Excluir sala',
                            message: 'Tem certeza que deseja excluir esta sala? Todos os dados de alunos e aulas vinculados serão perdidos.'
                          })}
                          className="text-red-400 hover:bg-red-400/10 rounded-lg p-2"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-white mb-1 truncate">{room.name}</h3>
                      <p className="text-xs sm:text-sm text-white opacity-60 mb-4 line-clamp-2">{room.description || 'Sem descrição'}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 py-3 border-t border-white/10">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white">
                        <Users size={14} />
                        <span>Alunos</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white">
                        <BookOpen size={14} />
                        <span>Aulas</span>
                      </div>
                    </div>

                    <Link 
                      to={`/rooms/${room.id}`}
                      className="mt-4 w-full flex items-center justify-center gap-2 p-2.5 sm:p-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all text-sm sm:text-base"
                    >
                      Gerenciar Sala
                      <ChevronRight size={16} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && filteredRooms.length === 0 && (
              <div className="text-center py-12 sm:py-20 bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-10 text-white">
                <School size={40} className="mx-auto text-white/20 mb-4 sm:size-48" />
                <h3 className="text-base sm:text-lg font-bold text-white">Nenhuma sala encontrada</h3>
                <p className="text-xs sm:text-sm text-white opacity-60">Comece criando sua primeira sala para gerenciar os alunos.</p>
              </div>
            )}
          </>
        )}
      
      {/* Create Modal */}
        {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-brand-700 mb-6">
              {editingRoom ? 'Editar Sala' : 'Criar Sala'}
            </h2>
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Congregação</label>
                <select 
                  className={`w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-brand-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 outline-none transition-all bg-white text-sm ${profile?.role === 'SECRETARIO' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  value={congregationId}
                  onChange={(e) => setCongregationId(e.target.value)}
                  disabled={profile?.role === 'SECRETARIO'}
                  required
                >
                  <option value="">Selecione uma congregação</option>
                  {congregations.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {profile?.role === 'SECRETARIO' && (
                  <p className="text-[10px] text-gray-500 mt-1">Sua congregação é vinculada automaticamente.</p>
                )}
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Nome da Sala</label>
                <Input 
                  placeholder="Ex: Turma da Amizade" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Classificação das Salas</label>
                <select 
                  className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-brand-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 outline-none transition-all bg-white text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">Selecione a classificação</option>
                  {roomCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Descrição (Opcional)</label>
                <textarea 
                  className="w-full p-3 sm:p-4 rounded-xl border border-brand-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 outline-none transition-all resize-none h-20 sm:h-24 text-sm"
                  placeholder="Sobre o que é esta sala?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 order-2 sm:order-1" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRoom(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-brand-700 hover:bg-brand-800 order-1 sm:order-2">
                  {loading ? 'Salvando...' : (editingRoom ? 'Salvar Alterações' : 'Criar Sala')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteConfig}
        table={deleteConfig?.table || ""}
        recordId={deleteConfig?.id || null}
        title={deleteConfig?.title || ""}
        message={deleteConfig?.message || ""}
        onClose={() => setDeleteConfig(null)}
        onDeleted={fetchData}
      />
    </div>
  );
}
