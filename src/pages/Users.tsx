import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Filter, 
  Shield, 
  Mail, 
  Phone, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  User, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Building2,
  Lock,
  X,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import type { Profile, Congregation, Church } from '@/src/types';
import { Button } from '@/src/components/ui/Button';
import ConfirmDeleteModal from '@/src/components/ConfirmDeleteModal';

export default function Users() {
  const { profile: currentUserProfile, church } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<Profile['role']>('SECRETARIO');
  const [userChurchId, setUserChurchId] = useState<string | null>(null);
  const [userCongregationId, setUserCongregationId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [sortField, setSortField] = useState<string>('full_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function renderSortIcon(field: string) {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="inline ml-1 opacity-60" />;
    }

    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="inline ml-1" />
      : <ArrowDown size={14} className="inline ml-1" />;
  }

  const fetchChurches = async () => {
    const { data, error } = await supabase
      .from("churches")
      .select("id, name")
      .order("name")

    if (!error && data) {
      setChurches(data as any)
    }
  }

  const [deleteConfig, setDeleteConfig] = useState<{
    table: string;
    id: string | null;
    title: string;
    message: string;
  } | null>(null);

  const hasNoChurch = !church && currentUserProfile?.role !== 'ADMIN_MASTER';

  useEffect(() => {
    fetchChurches();
    fetchUsers();
    if (church) {
      fetchCongregations(church.id);
      setUserChurchId(church.id);
    }
  }, [church, currentUserProfile]);

  useEffect(() => {
    if (userChurchId) {
      fetchCongregations(userChurchId);
    } else {
      setCongregations([]);
    }
  }, [userChurchId]);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase.rpc(
        'get_users_admin',
        {
          p_church_id:
            currentUserProfile?.role === 'ADMIN_MASTER'
              ? null
              : currentUserProfile?.church_id
        }
      );

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCongregations(churchId: string) {
    try {
      const { data, error } = await supabase
        .from('congregations')
        .select('*')
        .eq('church_id', churchId)
        .order('name');

      if (error) throw error;
      setCongregations(data || []);
    } catch (error) {
      console.error('Error fetching congregations:', error);
    }
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;
    if (!editingUser) {
      if (!userPassword.trim()) {
        alert('Por favor, informe uma senha para o novo usuário.');
        return;
      }
      if (userPassword.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            full_name: userName,
            role: userRole,
            church_id: userChurchId || null,
            congregation_id: userCongregationId || null
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        alert('Usuário atualizado com sucesso!');
      } else {
        // Create user via Supabase Edge Function
        const { data: result, error: functionError } = await supabase.functions.invoke('create-user', {
          body: {
            email: userEmail,
            password: userPassword,
            full_name: userName,
            role: userRole,
            church_id: userChurchId,
            congregation_id: userCongregationId
          }
        });

        if (functionError) {
          console.error('Function Error:', functionError);
          throw new Error(functionError.message || 'Erro ao chamar a função de criação de usuário');
        }
        
        if (result?.error) {
          console.error('Result Error:', result.error);
          throw new Error(result.error);
        }

        alert('Usuário criado com sucesso!');
      }

      await fetchUsers();
      closeModal();
    } catch (error: any) {
      console.error('Error saving user:', error);
      const message = error.message || 'Erro desconhecido';
      alert('Erro ao salvar usuário: ' + message);
    } finally {
      setIsSaving(false);
    }
  }

  async function customDeleteUser(id: string) {
    const { data: result, error: functionError } = await supabase.functions.invoke('delete-user', {
      body: { userId: id }
    });

    if (functionError) throw functionError;
    if (result?.error) throw new Error(result.error);
  }

  async function handleDeleteUser(id: string) {
    // This is now handled by ConfirmDeleteModal
    // But we need to check if it's the current user or an ADMIN_MASTER
    const userToDelete = users.find(u => u.id === id);
    
    if (userToDelete?.role === 'ADMIN_MASTER') {
      alert('Usuários ADMIN_MASTER não podem ser excluídos.');
      return;
    }

    if (currentUserProfile?.role === 'ADMIN_APP' && userToDelete?.role !== 'SECRETARIO') {
      alert('Você só tem permissão para excluir Secretários.');
      return;
    }
    
    if (id === currentUserProfile?.id) {
      alert('Você não pode excluir seu próprio perfil.');
      return;
    }

    setDeleteConfig({
      table: 'profiles',
      id: id,
      title: 'Excluir usuário',
      message: 'Tem certeza que deseja excluir este usuário do sistema? Esta ação removerá o perfil do usuário.'
    });
  }

  function openModal(user?: Profile) {
    fetchChurches();
    if (user) {
      setEditingUser(user);
      setUserName(user.name || '');
      setUserRole(user.role || 'SECRETARIO');
      setUserChurchId(user.church_id);
      setUserCongregationId(user.congregation_id);
      setUserEmail(user.email || '');
      setUserPassword('');
    } else {
      setEditingUser(null);
      setUserName('');
      setUserRole('SECRETARIO');
      setUserChurchId(church?.id || null);
      setUserCongregationId(null);
      setUserEmail('');
      setUserPassword('');
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingUser(null);
    setUserName('');
    setUserRole('SECRETARIO');
    setUserChurchId(church?.id || null);
    setUserCongregationId(null);
    setUserEmail('');
    setUserPassword('');
    setShowPassword(false);
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // ADMIN_APP can only see and manage SECRETARIO users of their church
    if (currentUserProfile?.role === 'ADMIN_APP') {
      return u.role === 'SECRETARIO';
    }

    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    switch (sortField) {
      case 'church_name':
        valueA = churches.find(c => c.id === a.church_id)?.name ?? '';
        valueB = churches.find(c => c.id === b.church_id)?.name ?? '';
        break;

      case 'congregation_name':
        valueA = congregations.find(c => c.id === a.congregation_id)?.name ?? '';
        valueB = congregations.find(c => c.id === b.congregation_id)?.name ?? '';
        break;

      default:
        valueA = (a as any)[sortField] ?? '';
        valueB = (b as any)[sortField] ?? '';
        break;
    }

    if (sortField === 'created_at') {
      const dateA = new Date(valueA).getTime();
      const dateB = new Date(valueB).getTime();

      return sortDirection === 'asc'
        ? dateA - dateB
        : dateB - dateA;
    }

    return sortDirection === 'asc'
      ? String(valueA).localeCompare(String(valueB), 'pt-BR')
      : String(valueB).localeCompare(String(valueA), 'pt-BR');
  });

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
          <h1 className="text-3xl font-bold text-brand-700">Usuários</h1>
          <p className="text-gray-700 text-sm mt-1">Gerencie os usuários e permissões do sistema.</p>
        </div>
        {!hasNoChurch && (
          <Button 
            onClick={() => openModal()}
            className="bg-brand-700 text-white hover:bg-brand-800 rounded-xl px-6 py-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus size={20} />
            Novo Usuário
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
              Para gerenciar usuários e suas permissões, seu perfil precisa estar vinculado a uma igreja. 
              Por favor, entre em contato com o administrador do sistema para realizar este vínculo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <Shield size={16} className="text-white" />
                  Níveis de Acesso
                </h3>
                <p className="text-[10px] sm:text-xs text-white opacity-60">Defina papéis como Administrador, Secretário ou Professor.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <Lock size={16} className="text-white" />
                  Controle de Segurança
                </h3>
                <p className="text-[10px] sm:text-xs text-white opacity-60">Gerencie o acesso de cada usuário a dados sensíveis.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" size={18} />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all shadow-sm text-sm sm:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-brand-200 text-gray-700 font-semibold rounded-xl hover:bg-brand-50 transition-all shadow-sm text-sm sm:text-base w-full md:w-auto">
                <Filter size={18} />
                Filtros
              </button>
            </div>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <div className="bg-brand-800 rounded-2xl p-12 sm:p-16 shadow-lg flex flex-col items-center justify-center text-center text-white">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <UsersIcon className="text-white/20" size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Nenhum usuário encontrado</h3>
                <p className="text-xs sm:text-sm text-white opacity-60 max-w-sm mx-auto mb-8">
                  Ainda não existem usuários cadastrados na sua igreja ou nenhum usuário atende aos filtros selecionados.
                </p>
                <button 
                  onClick={() => openModal()}
                  className="text-white font-bold hover:underline flex items-center gap-2 text-sm sm:text-base"
                >
                  <Plus size={18} />
                  Cadastrar primeiro usuário
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-brand-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-800 text-white">
                        <th
                          onClick={() => handleSort('full_name')}
                          className="p-4 text-xs font-bold uppercase tracking-widest cursor-pointer select-none hover:bg-brand-700 transition-colors"
                        >
                          Nome {renderSortIcon('full_name')}
                        </th>
                        <th
                          onClick={() => handleSort('email')}
                          className="p-4 text-xs font-bold uppercase tracking-widest cursor-pointer select-none hover:bg-brand-700 transition-colors"
                        >
                          Email {renderSortIcon('email')}
                        </th>
                        <th
                          onClick={() => handleSort('role')}
                          className="p-4 text-xs font-bold uppercase tracking-widest cursor-pointer select-none hover:bg-brand-700 transition-colors"
                        >
                          Perfil {renderSortIcon('role')}
                        </th>
                        <th
                          onClick={() => handleSort('church_name')}
                          className="p-4 text-xs font-bold uppercase tracking-widest cursor-pointer select-none hover:bg-brand-700 transition-colors"
                        >
                          Igreja {renderSortIcon('church_name')}
                        </th>
                        <th
                          onClick={() => handleSort('congregation_name')}
                          className="p-4 text-xs font-bold uppercase tracking-widest cursor-pointer select-none hover:bg-brand-700 transition-colors"
                        >
                          Congregação {renderSortIcon('congregation_name')}
                        </th>
                        <th
                          onClick={() => handleSort('created_at')}
                          className="p-4 text-xs font-bold uppercase tracking-widest cursor-pointer select-none hover:bg-brand-700 transition-colors"
                        >
                          Criação {renderSortIcon('created_at')}
                        </th>
                        <th className="p-4 text-xs font-bold uppercase tracking-widest text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-200">
                      {sortedUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-brand-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                                {u.full_name?.charAt(0) || 'U'}
                              </div>
                              <span className="font-semibold text-brand-700 text-sm">{u.full_name || 'Sem nome'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600">{u.email || '-'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'ADMIN_MASTER' ? 'bg-amber-100 text-amber-700' :
                              u.role === 'ADMIN_APP' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {churches.find(c => c.id === u.church_id)?.name || (u.church_id ? 'Carregando...' : '-')}
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {congregations.find(c => c.id === u.congregation_id)?.name || (u.congregation_id ? 'Carregando...' : 'Sede / Todas')}
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} className="opacity-40" />
                              {formatDate(u.created_at)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openModal(u)}
                                className="p-1.5 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              {u.role !== 'ADMIN_MASTER' && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      {/* User Modal */}
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
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
            >
              <div className="p-5 sm:p-6 border-b border-brand-200 flex items-center justify-between bg-brand-800 text-white">
                <h3 className="text-lg sm:text-xl font-bold">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h3>
                <button 
                  onClick={closeModal}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-brand-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                    placeholder="Nome do usuário"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-brand-700 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                    placeholder="email@exemplo.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    disabled={!!editingUser}
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-brand-700 mb-1">
                      Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black pr-10"
                        placeholder="Mínimo 6 caracteres"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-700 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-brand-700 mb-1">
                    Papel / Nível de Acesso *
                  </label>
                  <select
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                    value={userRole || ''}
                    onChange={(e) => setUserRole(e.target.value as any)}
                  >
                    {currentUserProfile?.role === 'ADMIN_MASTER' && (
                      <>
                        <option value="ADMIN_MASTER">ADMIN_MASTER</option>
                        <option value="ADMIN_APP">ADMIN_APP</option>
                      </>
                    )}
                    <option value="SECRETARIO">SECRETARIO</option>
                  </select>
                </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-brand-700 mb-1">
                      Igreja Vinculada
                    </label>
                    <select
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                      value={userChurchId || ''}
                      onChange={(e) => setUserChurchId(e.target.value || null)}
                    >
                      <option value="">Selecione a igreja</option>
                      {churches.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                {(userRole === 'SECRETARIO' || userRole === 'ADMIN_APP') && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-brand-700 mb-1">
                      Congregação Vinculada
                    </label>
                    <select
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 outline-none transition-all text-sm text-black"
                      value={userCongregationId || ''}
                      onChange={(e) => setUserCongregationId(e.target.value || null)}
                    >
                      <option value="">Sede / Todas</option>
                      {congregations.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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
        table={deleteConfig?.table || ""}
        recordId={deleteConfig?.id || null}
        title={deleteConfig?.title || ""}
        message={deleteConfig?.message || ""}
        onClose={() => setDeleteConfig(null)}
        customDelete={deleteConfig?.table === 'profiles' ? customDeleteUser : undefined}
        onDeleted={() => {
          fetchUsers();
        }}
      />
    </div>
  );
}
