import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  User, 
  Calendar,
  AlertCircle,
  School,
  Building2,
  X,
  MapPin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, parseLocalDate } from '@/src/lib/utils';
import type { Student, Room } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Students() {
  const { profile, church } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'Solteiro' | 'Casado' | 'Outro'>('Solteiro');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const hasNoChurch = !church && profile?.role !== 'ADMIN_MASTER' && profile?.role !== 'ADMIN_APP';

  useEffect(() => {
    if (church) {
      fetchData();
    } else if (!loading && !church) {
      setLoading(false);
    }
  }, [church]);

  useEffect(() => {
    if (editingStudent) {
      setFullName(editingStudent.full_name);
      setBirthDate(editingStudent.birth_date || '');
      setRoomId(editingStudent.room_id);
      setMaritalStatus(editingStudent.marital_status || 'Solteiro');
      setIsModalOpen(true);
    } else {
      setFullName('');
      setBirthDate('');
      setMaritalStatus('Solteiro');
      if (rooms.length > 0) setRoomId(rooms[0].id);
    }
  }, [editingStudent, rooms]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = parseLocalDate(birthDate);
    if (!birth) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const validateEnrollment = (roomId: string, birthDate: string, maritalStatus: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return null;

    const age = calculateAge(birthDate);
    const category = room.category;

    if (age !== null && category) {
      if (category === 'INFANTIL (0-5 anos)') {
        if (age > 5) return 'Esta sala é para crianças de 0 a 5 anos.';
      } else if (category === 'INFANTIL (6-8 anos)') {
        if (age < 6 || age > 8) return 'Esta sala é para crianças de 6 a 8 anos.';
      } else if (category === 'INFANTIL (9-11 anos)') {
        if (age < 9 || age > 11) return 'Esta sala é para crianças de 9 a 11 anos.';
      } else if (category === 'ADOLESCENTE (12-14 anos)') {
        if (age < 12 || age > 14) return 'Esta sala é para adolescentes de 12 a 14 anos.';
      } else if (category === 'ADOLESCENTE (15-17 anos)') {
        if (age < 15 || age > 17) return 'Esta sala é para adolescentes de 15 a 17 anos.';
      } else if (category === 'JOVENS') {
        if (age < 18) return 'A sala de Jovens é para alunos a partir de 18 anos.';
        if (maritalStatus !== 'Solteiro') return 'A sala de Jovens é exclusiva para solteiros.';
      } else if (category === 'ADULTOS') {
        if (age < 18) return 'A sala de Adultos é para alunos a partir de 18 anos.';
        if (maritalStatus !== 'Casado') return 'A sala de Adultos é exclusiva para casados.';
      }
    } else if (age === null && category) {
      return 'Data de nascimento é obrigatória para validar a matrícula nesta sala.';
    }

    return null;
  };

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch rooms first to populate select
      let roomsQuery = supabase
        .from('rooms')
        .select('*, congregations!inner(*)');
        
      if (profile?.role === 'SECRETARIO' && profile.congregation_id) {
        roomsQuery = roomsQuery.eq('congregation_id', profile.congregation_id);
      } else {
        roomsQuery = roomsQuery.eq('congregations.church_id', church!.id);
      }
      
      const { data: roomsData } = await roomsQuery;
      
      if (roomsData) {
        setRooms(roomsData);
      }

      // Fetch students
      let studentsQuery = supabase
        .from('students')
        .select('*, rooms!inner(name, category, congregation_id, congregations!inner(name))');
        
      if (profile?.role === 'SECRETARIO' && profile.congregation_id) {
        studentsQuery = studentsQuery.eq('rooms.congregation_id', profile.congregation_id);
      } else {
        studentsQuery = studentsQuery.eq('rooms.congregations.church_id', church!.id);
      }

      const { data: studentsData } = await studentsQuery.order('full_name');

      if (studentsData) setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !roomId) return;

    const error = validateEnrollment(roomId, birthDate, maritalStatus);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    setLoading(true);
    try {
      const studentData = {
        full_name: fullName,
        birth_date: birthDate || null,
        room_id: roomId,
        marital_status: maritalStatus
      };

      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .insert([studentData]);
        
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingStudent(null);
      fetchData();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Erro ao salvar aluno. Verifique se os campos estão corretos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoMigrate() {
    if (!window.confirm('Deseja verificar e migrar automaticamente alunos que mudaram de faixa etária baseado na classificação das salas?')) return;

    setLoading(true);
    let migratedCount = 0;

    try {
      for (const student of students) {
        const age = calculateAge(student.birth_date);
        if (age === null) continue;

        let targetCategory = '';
        if (age <= 5) targetCategory = 'INFANTIL (0-5 anos)';
        else if (age <= 8) targetCategory = 'INFANTIL (6-8 anos)';
        else if (age <= 11) targetCategory = 'INFANTIL (9-11 anos)';
        else if (age <= 14) targetCategory = 'ADOLESCENTE (12-14 anos)';
        else if (age <= 17) targetCategory = 'ADOLESCENTE (15-17 anos)';
        else {
          if (student.marital_status === 'Solteiro') targetCategory = 'JOVENS';
          else if (student.marital_status === 'Casado') targetCategory = 'ADULTOS';
        }

        if (targetCategory && student.rooms?.category !== targetCategory) {
          const studentCongregationId = student.rooms?.congregation_id;
          const roomInSameCongregation = rooms.find(r => 
            r.category === targetCategory && 
            r.congregation_id === studentCongregationId
          );

          if (roomInSameCongregation && roomInSameCongregation.id !== student.room_id) {
            await supabase
              .from('students')
              .update({ room_id: roomInSameCongregation.id })
              .eq('id', student.id);
            migratedCount++;
          }
        }
      }
      alert(`${migratedCount} alunos foram migrados com sucesso para as salas adequadas!`);
      fetchData();
    } catch (error) {
      console.error('Error migrating students:', error);
      alert('Erro ao migrar alunos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStudent(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este aluno?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
      alert('Registro excluído com sucesso.');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Erro ao excluir aluno.');
    }
  }

  const filteredStudents = students.filter(student => 
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex justify-center py-12 sm:py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
      </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-700">Alunos</h1>
          <p className="text-gray-700 text-sm mt-1">Gerencie a lista de alunos da EBD.</p>
        </div>
        {!hasNoChurch && (
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleAutoMigrate}
              variant="outline"
              className="hidden sm:flex items-center gap-2 border-brand-700 text-brand-700 hover:bg-brand-50 rounded-xl px-6 py-3"
            >
              <AlertCircle size={18} />
              Migrar Alunos
            </Button>
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-brand-700 text-white hover:bg-brand-800 rounded-xl px-6 py-3 shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            >
              <Plus size={20} />
              Novo Aluno
            </Button>
          </div>
        )}
      </div>

        {hasNoChurch ? (
          <div className="bg-brand-800 rounded-2xl p-6 sm:p-10 shadow-lg text-center max-w-2xl mx-auto text-white">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-white" size={32} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Igreja não vinculada</h2>
            <p className="text-sm sm:text-base text-white opacity-80 mb-8 leading-relaxed">
              Para gerenciar alunos e matrículas, seu perfil precisa estar vinculado a uma igreja. 
              Por favor, entre em contato com o administrador do sistema para realizar este vínculo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <School size={16} className="text-white" />
                  Matrículas em Turmas
                </h3>
                <p className="text-[10px] sm:text-xs text-white opacity-60">Vincule alunos a turmas e acompanhe o progresso.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <Building2 size={16} className="text-white" />
                  Filtro por Congregação
                </h3>
                <p className="text-[10px] sm:text-xs text-white opacity-60">Organize os alunos por localidade e congregação.</p>
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
                  placeholder="Buscar aluno por nome..."
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

            {/* Students List */}
            {filteredStudents.length === 0 ? (
              <div className="bg-brand-800 rounded-2xl p-12 sm:p-16 shadow-lg flex flex-col items-center justify-center text-center text-white">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <GraduationCap className="text-white/20" size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Nenhum aluno encontrado</h3>
                <p className="text-xs sm:text-sm text-white opacity-60 max-w-sm mx-auto mb-8">
                  Ainda não existem alunos cadastrados na sua igreja ou nenhum aluno atende aos filtros selecionados.
                </p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="text-white font-bold hover:underline flex items-center gap-2 text-sm sm:text-base"
                >
                  <Plus size={18} />
                  Cadastrar primeiro aluno
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredStudents.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-800 text-white rounded-2xl p-5 sm:p-6 shadow-lg transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold shadow-md">
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">{student.full_name}</h3>
                          <p className="text-xs text-white opacity-50 uppercase font-bold tracking-widest">{student.rooms?.name || 'Sem Turma'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStudent(student)}
                          className="text-white hover:bg-white/10 rounded-lg p-2"
                        >
                          <Edit2 size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-400 hover:bg-red-400/10 rounded-lg p-2"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-white" size={16} />
                          <span className="text-xs text-white opacity-60">Nascimento</span>
                        </div>
                        <span className="text-sm font-bold text-white">
                          {student.birth_date ? formatDate(student.birth_date) : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2">
                          <MapPin className="text-white" size={16} />
                          <span className="text-xs text-white opacity-60">Congregação</span>
                        </div>
                        <span className="text-sm font-bold text-white truncate max-w-[120px]">
                          {student.rooms?.congregations?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Student Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
            >
              <div className="p-5 sm:p-6 border-b border-brand-200 flex items-center justify-between bg-brand-800 text-white">
                <h2 className="text-lg sm:text-xl font-bold">
                  {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                </h2>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-bold text-brand-700 mb-1">Nome Completo</label>
                    <Input
                      placeholder="Nome do aluno"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-brand-700 mb-1">Data de Nascimento</label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-brand-700 mb-1">Estado Civil</label>
                    <select
                      className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-brand-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 outline-none transition-all bg-white text-sm"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value as any)}
                      required
                    >
                      <option value="Solteiro">Solteiro</option>
                      <option value="Casado">Casado</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-bold text-brand-700 mb-1">Turma</label>
                    <select
                      className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-brand-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 outline-none transition-all bg-white text-sm"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      required
                    >
                      <option value="">Selecione uma turma</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name} ({ (room as any).congregations?.name })
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {validationError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs sm:text-sm">
                    <AlertCircle size={16} />
                    {validationError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 order-2 sm:order-1"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingStudent(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-700 hover:bg-brand-800 text-white order-1 sm:order-2"
                  >
                    {loading ? 'Salvando...' : (editingStudent ? 'Salvar Alterações' : 'Cadastrar Aluno')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
