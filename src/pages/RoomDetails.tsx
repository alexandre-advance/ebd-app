import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { formatDate, formatDayMonth, parseLocalDate } from '@/src/lib/utils';
import { 
  School, Users, BookOpen, Plus, Trash2, Edit, 
  Calendar, Save, CheckCircle, AlertCircle, 
  ChevronLeft, MoreVertical, UserPlus, UserMinus, 
  FileText, DollarSign, BookOpenCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDeleteModal from '@/src/components/ConfirmDeleteModal';
import type { Room, Student, Lesson } from '@/src/types';

export default function RoomDetails() {
  const { roomId } = useParams<{ roomId: string }>();
  const { profile, church } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'lessons'>('students');

  const hasNoChurch = !church && profile?.role !== 'ADMIN_MASTER' && profile?.role !== 'ADMIN_APP';

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Estados para exclusão
  const [deleteConfig, setDeleteConfig] = useState<{
    table: string;
    id: string | null;
    title: string;
    message: string;
  } | null>(null);

  // Form states - Student
  const [studentName, setStudentName] = useState('');
  const [studentBirthDate, setStudentBirthDate] = useState('');
  const [studentMaritalStatus, setStudentMaritalStatus] = useState<'Solteiro' | 'Casado' | 'Outro'>('Solteiro');
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const validateEnrollment = (room: Room, birthDate: string, maritalStatus: string) => {
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

  // Form states - Lesson
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonAttendance, setLessonAttendance] = useState(0);
  const [lessonVisitors, setLessonVisitors] = useState(0);
  const [lessonBibles, setLessonBibles] = useState(0);
  const [lessonMagazines, setLessonMagazines] = useState(0);
  const [lessonOfferings, setLessonOfferings] = useState(0);
  const [lessonIsDraft, setLessonIsDraft] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  useEffect(() => {
    if (roomId && church) {
      fetchRoomData();
    } else if (hasNoChurch) {
      setLoading(false);
    }
  }, [roomId, church, hasNoChurch]);

  async function fetchRoomData() {
    setLoading(true);
    try {
      let query = supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId!);

        if (profile?.role === 'SECRETARIO') {
          query = query.eq('congregation_id', profile.congregation_id);
        }

      const { data: roomData, error: roomError } = await query.single();

      // 🚨 Só bloqueia se realmente não encontrou a sala
      if (!roomData) {
        console.warn('Sala não encontrada ou sem permissão');
        setRoom(null);
        setStudents([]);
        setLessons([]);
        return;
      }

      // ⚠️ Loga erro real (sem bloquear indevidamente)
      if (roomError) {
        console.error('Erro ao buscar sala:', roomError);
      }

      if (roomData) setRoom(roomData);

      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('room_id', roomId!)
        .order('full_name');

      if (studentsData) setStudents(studentsData);

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('room_id', roomId!)
        .order('date', { ascending: false });

      if (lessonsData) setLessons(lessonsData);
    } catch (error) {
      console.error('Error fetching room data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Student CRUD
  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName || !room) return;

    const error = validateEnrollment(room, studentBirthDate, studentMaritalStatus);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    const studentData = {
      full_name: studentName,
      birth_date: studentBirthDate || null,
      marital_status: studentMaritalStatus,
      room_id: roomId!
    };

    let errorRes;
    if (editingStudent) {
      const { error: err } = await supabase.from('students').update(studentData).eq('id', editingStudent.id);
      errorRes = err;
    } else {
      const { error: err } = await supabase.from('students').insert([studentData]);
      errorRes = err;
    }

    if (!errorRes) {
      closeStudentModal();
      fetchRoomData();
    } else {
      console.error('Error saving student:', errorRes);
      alert('Erro ao salvar aluno.');
    }
  }

  function openStudentModal(student?: Student) {
    if (student) {
      setEditingStudent(student);
      setStudentName(student.full_name);
      setStudentBirthDate(student.birth_date || '');
      setStudentMaritalStatus(student.marital_status || 'Solteiro');
    } else {
      setEditingStudent(null);
      setStudentName('');
      setStudentBirthDate('');
      setStudentMaritalStatus('Solteiro');
    }
    setValidationError(null);
    setIsStudentModalOpen(true);
  }

  function closeStudentModal() {
    setIsStudentModalOpen(false);
    setEditingStudent(null);
  }

  // Lesson CRUD
  async function handleSaveLesson(e: React.FormEvent, isDraft: boolean) {
    e.preventDefault();
    if (!lessonTitle) return;

    const lessonData = {
      title: lessonTitle,
      date: lessonDate,
      attendance_count: Object.values(attendanceMap).filter(Boolean).length,
      visitors_count: lessonVisitors,
      bibles_count: lessonBibles,
      magazines_count: lessonMagazines,
      offerings_amount: lessonOfferings,
      is_draft: isDraft,
      room_id: roomId!
    };

    let lessonId = editingLesson?.id;
    let error;

    if (editingLesson) {
      const { error: err } = await supabase.from('lessons').update(lessonData).eq('id', editingLesson.id);
      error = err;
    } else {
      const { data: newLesson, error: err } = await supabase.from('lessons').insert([lessonData]).select().single();
      error = err;
      if (newLesson) lessonId = newLesson.id;
    }

    if (!error && lessonId) {
      // Save attendance records
      const attendanceData = students.map(student => ({
        lesson_id: lessonId!,
        student_id: student.id,
        present: !!attendanceMap[student.id]
      }));

      // Upsert attendance records
      const { error: attError } = await supabase.from('attendance').upsert(attendanceData, { onConflict: 'lesson_id,student_id' });
      
      if (attError) {
        console.error('Error saving attendance:', attError);
      }

      closeLessonModal();
      fetchRoomData();
    } else if (error) {
      console.error('Error saving lesson:', error);
      alert('Erro ao salvar aula.');
    }
  }

  async function openLessonModal(lesson?: Lesson) {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonTitle(lesson.title);
      setLessonDate(lesson.date);
      setLessonAttendance(lesson.attendance_count);
      setLessonVisitors(lesson.visitors_count);
      setLessonBibles(lesson.bibles_count);
      setLessonMagazines(lesson.magazines_count);
      setLessonOfferings(lesson.offerings_amount);
      setLessonIsDraft(lesson.is_draft);

      // Fetch attendance
      setIsFetchingAttendance(true);
      const { data: attData } = await supabase.from('attendance').select('*').eq('lesson_id', lesson.id);
      const map: Record<string, boolean> = {};
      attData?.forEach(att => {
        map[att.student_id] = att.present;
      });
      setAttendanceMap(map);
      setIsFetchingAttendance(false);
    } else {
      setEditingLesson(null);
      setLessonTitle('');
      setLessonDate(new Date().toISOString().split('T')[0]);
      setLessonAttendance(0);
      setLessonVisitors(0);
      setLessonBibles(0);
      setLessonMagazines(0);
      setLessonOfferings(0);
      setLessonIsDraft(true);
      
      // Initialize attendance map with all students as absent (or present)
      // User said "Se marcado -> aluno presente", so default to absent
      const map: Record<string, boolean> = {};
      students.forEach(s => {
        map[s.id] = false;
      });
      setAttendanceMap(map);
    }
    setIsLessonModalOpen(true);
  }

  function closeLessonModal() {
    setIsLessonModalOpen(false);
    setEditingLesson(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/rooms" className="p-2 hover:bg-brand-50 rounded-xl transition-colors text-brand-700 border border-brand-200 shrink-0">
              <ChevronLeft size={24} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-brand-700 leading-tight truncate">{room?.name}</h1>
              <p className="text-gray-700 text-sm mt-1">Gerenciamento de Turma</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {activeTab === 'students' ? (
              <Button onClick={() => openStudentModal()} className="bg-brand-700 hover:bg-brand-800 text-sm px-6 py-3 rounded-xl shadow-lg shadow-brand-700/20">
                <UserPlus size={18} className="mr-2" />
                Matricular Aluno
              </Button>
            ) : (
              <Button onClick={() => openLessonModal()} className="bg-brand-700 hover:bg-brand-800 text-sm px-6 py-3 rounded-xl shadow-lg shadow-brand-700/20">
                <Plus size={18} className="mr-2" />
                Nova Aula
              </Button>
            )}
          </div>
        </div>

        <main className="w-full flex-1">
        {hasNoChurch ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg px-4 p-6 sm:p-10 text-white">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <School size={32} className="text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Configuração Necessária</h2>
            <p className="text-sm sm:text-base text-white opacity-70 max-w-md mb-8">
              Para gerenciar detalhes da turma, sua conta precisa estar vinculada a uma igreja. Entre em contato com o suporte ou seu administrador.
            </p>
            <Link to="/dashboard">
              <Button variant="outline" className="text-sm sm:text-base border-white text-white hover:bg-white/10">Voltar ao Início</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-brand-50 rounded-2xl w-fit mb-6 sm:mb-8 border border-brand-200">
              <button 
                onClick={() => setActiveTab('students')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${activeTab === 'students' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-700 opacity-50 hover:text-brand-700'}`}
              >
                <Users size={16} />
                Alunos
                <span className="ml-1 text-[10px] sm:text-xs">({students.length})</span>
              </button>
              <button 
                onClick={() => setActiveTab('lessons')}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm ${activeTab === 'lessons' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-700 opacity-50 hover:text-brand-700'}`}
              >
                <BookOpen size={16} />
                Aulas
                <span className="ml-1 text-[10px] sm:text-xs">({lessons.length})</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'students' ? (
                <motion.div 
                  key="students"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {students.map((student) => (
                    <div key={student.id} className="bg-brand-800 p-4 sm:p-5 rounded-2xl shadow-lg flex items-center justify-between group text-white">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold shrink-0">
                          {student.full_name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm sm:text-base truncate">{student.full_name}</p>
                          <p className="text-[10px] sm:text-xs text-white opacity-50 truncate">
                            {student.birth_date ? formatDate(student.birth_date) : 'Nascimento não informado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openStudentModal(student)} className="p-1.5 sm:p-2 text-white/40 hover:text-white transition-colors">
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfig({
                            table: "students",
                            id: student.id,
                            title: "Excluir aluno",
                            message: "Tem certeza que deseja excluir este aluno?"
                          })} 
                          className="p-1.5 sm:p-2 text-white/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {students.length === 0 && (
                    <div className="col-span-full py-12 sm:py-20 text-center bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg px-4 text-white">
                      <Users size={40} className="mx-auto text-white opacity-10 mb-4" />
                      <p className="text-sm sm:text-base text-white opacity-40 font-medium">Nenhum aluno matriculado nesta turma.</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="lessons"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="bg-brand-800 p-5 sm:p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 group text-white">
                      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${lesson.is_draft ? 'bg-amber-400/20 text-amber-400' : 'bg-white/10 text-white'}`}>
                          <Calendar size={18} />
                          <span className="text-[8px] sm:text-[10px] font-bold mt-1">{formatDayMonth(lesson.date)}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 min-w-0">
                            <h3 className="font-bold text-white text-sm sm:text-base truncate">{lesson.title}</h3>
                            {lesson.is_draft && (
                              <span className="text-[8px] sm:text-[10px] px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded-full font-bold uppercase shrink-0">Rascunho</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <StatMini icon={<Users size={12} />} label="Presença" value={lesson.attendance_count} />
                            <StatMini icon={<UserPlus size={12} />} label="Visitas" value={lesson.visitors_count} />
                            <StatMini icon={<DollarSign size={12} />} label="Ofertas" value={`R$ ${lesson.offerings_amount.toFixed(2)}`} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Button variant="outline" onClick={() => openLessonModal(lesson)} className="flex-1 sm:flex-none text-xs sm:text-sm px-4 py-2 border-white text-white hover:bg-white/10">
                          <Edit size={14} className="mr-2" />
                          Editar
                        </Button>
                        <button 
                          onClick={() => setDeleteConfig({
                            table: "lessons",
                            id: lesson.id,
                            title: "Excluir aula",
                            message: "Tem certeza que deseja excluir esta aula?"
                          })}
                          className="p-2 text-white/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {lessons.length === 0 && (
                    <div className="py-12 sm:py-20 text-center bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg px-4 text-white">
                      <BookOpen size={40} className="mx-auto text-white opacity-10 mb-4" />
                      <p className="text-sm sm:text-base text-white opacity-40 font-medium">Nenhuma aula registrada ainda.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-brand-700 mb-6">
              {editingStudent ? 'Editar Aluno' : 'Matricular Aluno'}
            </h2>
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Nome Completo</label>
                <Input 
                  placeholder="Nome do aluno" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Data de Nascimento</label>
                <Input 
                  type="date"
                  value={studentBirthDate}
                  onChange={(e) => setStudentBirthDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Estado Civil</label>
                  <select
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-brand-200 focus:border-brand-700 focus:ring-1 focus:ring-brand-700 outline-none transition-all bg-white text-sm"
                    value={studentMaritalStatus}
                    onChange={(e) => setStudentMaritalStatus(e.target.value as any)}
                    required
                  >
                    <option value="Solteiro">Solteiro</option>
                    <option value="Casado">Casado</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              {validationError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs sm:text-sm">
                  <AlertCircle size={14} className="w-4 h-4 sm:w-5 sm:h5" />
                  {validationError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1 text-sm order-2 sm:order-1" onClick={closeStudentModal}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-brand-700 hover:bg-brand-800 text-sm order-1 sm:order-2">
                  {editingStudent ? 'Salvar' : 'Matricular'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfig}
        table={deleteConfig?.table || ""}
        recordId={deleteConfig?.id || null}
        title={deleteConfig?.title || ""}
        message={deleteConfig?.message || ""}
        onClose={() => setDeleteConfig(null)}
        onDeleted={fetchRoomData}
      />

      {/* Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-brand-700 mb-6">
              {editingLesson ? 'Editar Aula' : 'Nova Aula'}
            </h2>
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Título da Lição</label>
                  <Input 
                    placeholder="Ex: A Criação do Mundo" 
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Data</label>
                  <Input 
                    type="date"
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Frequência (Alunos)</label>
                  <Input 
                    type="number"
                    value={Object.values(attendanceMap).filter(Boolean).length}
                    readOnly
                    className="bg-brand-50 text-sm"
                  />
                  <p className="text-[8px] sm:text-[10px] text-gray-500 mt-1">Calculado automaticamente</p>
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Visitantes</label>
                  <Input 
                    type="number"
                    value={lessonVisitors}
                    onChange={(e) => setLessonVisitors(parseInt(e.target.value) || 0)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Bíblias</label>
                  <Input 
                    type="number"
                    value={lessonBibles}
                    onChange={(e) => setLessonBibles(parseInt(e.target.value) || 0)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Revistas</label>
                  <Input 
                    type="number"
                    value={lessonMagazines}
                    onChange={(e) => setLessonMagazines(parseInt(e.target.value) || 0)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-bold text-brand-700 mb-1 block">Ofertas (R$)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={lessonOfferings}
                    onChange={(e) => setLessonOfferings(parseFloat(e.target.value) || 0)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Attendance List */}
              <div className="border-t border-brand-200 pt-6">
                <h3 className="text-base sm:text-lg font-bold text-brand-700 mb-4 flex items-center gap-2">
                  <Users size={18} />
                  Frequência Nominal
                </h3>
                {isFetchingAttendance ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-700"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {students.length === 0 ? (
                      <p className="text-xs sm:text-sm text-gray-500 text-center py-4">Nenhum aluno matriculado nesta turma.</p>
                    ) : (
                      students.map(student => (
                        <div 
                          key={student.id} 
                          className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${attendanceMap[student.id] ? 'bg-green-50 border-green-200' : 'bg-brand-50/50 border-brand-200'}`}
                          onClick={() => setAttendanceMap(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 ${attendanceMap[student.id] ? 'bg-green-100 text-green-700' : 'bg-brand-800/10 text-brand-800/40'}`}>
                              {student.full_name[0]}
                            </div>
                            <span className={`text-xs sm:text-sm font-medium truncate ${attendanceMap[student.id] ? 'text-green-800' : 'text-brand-800'}`}>
                              {student.full_name}
                            </span>
                          </div>
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${attendanceMap[student.id] ? 'bg-green-500 border-green-500' : 'border-brand-200'}`}>
                            {attendanceMap[student.id] && <CheckCircle size={12} className="text-white" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1 text-sm order-4 sm:order-1" onClick={closeLessonModal}>
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 text-sm order-3 sm:order-2"
                  onClick={(e) => handleSaveLesson(e as any, true)}
                >
                  <Save size={16} className="mr-2" />
                  Salvar Rascunho
                </Button>
                <Button 
                  type="button"
                  className="flex-1 bg-brand-700 hover:bg-brand-800 text-sm order-2 sm:order-3"
                  onClick={(e) => handleSaveLesson(e as any, false)}
                >
                  <CheckCircle size={16} className="mr-2" />
                  Finalizar Aula
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  </div>
);
}

function StatMini({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-white opacity-60">
      <span className="text-white opacity-60">{icon}</span>
      <span className="font-medium text-white">{value}</span>
      <span className="opacity-60">{label}</span>
    </div>
  );
}
