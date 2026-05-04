import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { 
  BookOpen, Users, LayoutDashboard, LogOut, 
  GraduationCap, School, Landmark as ChurchIcon, 
  Shield, Trophy, TrendingUp, FileText, 
  Calendar, DollarSign, BookOpenCheck, 
  Award, Medal, Cake
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatDate, parseLocalDate } from '@/src/lib/utils';
import type { Room, Student, Lesson, Congregation } from '@/src/types';

interface DashboardStats {
  totalStudents: number;
  totalRooms: number;
  totalLessons: number;
  totalOfferings: number;
}

interface RankingItem {
  id: string;
  name: string;
  score: number;
  rank: 'gold' | 'silver' | 'bronze' | 'none';
  metrics?: {
    attendance: number;
    visitors: number;
    bibles: number;
    magazines: number;
    offerings: number;
  };
}

interface CongregationRankingItem {
  id: string;
  name: string;
  studentCount: number;
  attendanceRate: number;
  rank: 'gold' | 'silver' | 'bronze' | 'none';
}

interface BirthdayStudent {
  id: string;
  name: string;
  dateStr: string;
  turningAge: number;
  day: number;
}

export default function Dashboard() {
  const { profile, church, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalRooms: 0,
    totalLessons: 0,
    totalOfferings: 0
  });
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankingInfanto, setRankingInfanto] = useState<RankingItem[]>([]);
  const [rankingJovens, setRankingJovens] = useState<RankingItem[]>([]);
  const [rankingAdultos, setRankingAdultos] = useState<RankingItem[]>([]);
  const [rankingInfantoAnnual, setRankingInfantoAnnual] = useState<RankingItem[]>([]);
  const [rankingJovensAnnual, setRankingJovensAnnual] = useState<RankingItem[]>([]);
  const [rankingAdultosAnnual, setRankingAdultosAnnual] = useState<RankingItem[]>([]);
  const [rankingPeriod, setRankingPeriod] = useState<'daily' | 'annual'>('daily');
  
  const [congRankingStudents, setCongRankingStudents] = useState<CongregationRankingItem[]>([]);
  const [congRankingAttendance, setCongRankingAttendance] = useState<CongregationRankingItem[]>([]);
  const [weeklyBirthdays, setWeeklyBirthdays] = useState<BirthdayStudent[]>([]);
  const [activeRanking, setActiveRanking] = useState<'rooms' | 'cong_students' | 'cong_attendance' | 'infanto' | 'jovens' | 'adultos'>('rooms');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (church && profile) {
      fetchDashboardData();
    }
  }, [church, profile]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      let congregationsQuery = supabase.from('congregations').select('*');
      let roomsQuery = supabase.from('rooms').select('*, congregations!inner(*)');
      let studentsQuery = supabase.from('students').select('*, rooms!inner(congregations!inner(*))');
      let lessonsQuery = supabase.from('lessons').select('*, rooms!inner(congregations!inner(*))');

      // Filter by scope
      if (profile?.role === 'ADMIN_MASTER') {
        congregationsQuery = supabase.from('congregations').select('*');
        roomsQuery = supabase.from('rooms').select('*, congregations!inner(*)');
        studentsQuery = supabase.from('students').select('*, rooms!inner(congregations!inner(*))');
        lessonsQuery = supabase.from('lessons').select('*, rooms!inner(congregations!inner(*))');
      } else if (profile?.role === 'ADMIN_APP') {
        congregationsQuery = congregationsQuery.eq('church_id', church!.id);
        roomsQuery = roomsQuery.eq('congregations.church_id', church!.id);
        studentsQuery = studentsQuery.eq('rooms.congregations.church_id', church!.id);
        lessonsQuery = lessonsQuery.eq('rooms.congregations.church_id', church!.id);
      } else if (profile?.role === 'SECRETARIO') {
        congregationsQuery = congregationsQuery.eq('church_id', church!.id);
        roomsQuery = roomsQuery.eq('congregations.church_id', church!.id);
        studentsQuery = studentsQuery.eq('rooms.congregations.church_id', church!.id);
        lessonsQuery = lessonsQuery.eq('rooms.congregations.church_id', church!.id);
        
        if (profile.congregation_id) {
          congregationsQuery = congregationsQuery.eq('id', profile.congregation_id);
          roomsQuery = roomsQuery.eq('congregation_id', profile.congregation_id);
          studentsQuery = studentsQuery.eq('rooms.congregation_id', profile.congregation_id);
          lessonsQuery = lessonsQuery.eq('rooms.congregation_id', profile.congregation_id);
        }
      }

      const [congRes, roomsRes, studentsRes, lessonsRes] = await Promise.all([
        congregationsQuery,
        roomsQuery,
        studentsQuery,
        lessonsQuery
      ]);

      const congregations = congRes.data || [];
      const rooms = roomsRes.data || [];
      const students = studentsRes.data || [];
      const lessons = lessonsRes.data || [];

      const totalOfferings = lessons.reduce((acc, curr) => acc + Number(curr.offerings_amount), 0);

      setStats({
        totalStudents: students.length,
        totalRooms: rooms.length,
        totalLessons: lessons.length,
        totalOfferings
      });

      // Helper: Calculate Age
      const calculateAge = (birthDate: string | null) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = parseLocalDate(birthDate);
        if (!birth) return 0;
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age;
      };

      // Helper: Categorize Room
      const getRoomCategory = (roomId: string) => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return 'none';

        const category = room.category || '';

        // Ranking 1 — Infanto-juvenil
        if (category.includes('INFANTIL')) {
          return 'infanto';
        }

        // Ranking 2 — Adolescentes e jovens solteiros
        if (category.includes('ADOLESCENTE') || category === 'JOVENS') {
          return 'jovens';
        }

        // Ranking 3 — Adultos casados
        if (category === 'ADULTOS') {
          return 'adultos';
        }

        // Fallback to age-based logic if category is missing (for legacy data)
        const roomStudents = students.filter(s => s.room_id === roomId);
        if (roomStudents.length === 0) return 'none';

        const ages = roomStudents.map(s => calculateAge(s.birth_date));
        const avgAge = ages.reduce((a, b) => a + (b || 0), 0) / ages.length;

        if (avgAge <= 11) return 'infanto';
        if (avgAge < 30) return 'jovens';
        
        return 'adultos';
      };

      // Helper: Calculate Score for a single lesson
      const calculateLessonScore = (lesson: Lesson, roomStudentsCount: number, maxOfferingInDay: number) => {
        if (roomStudentsCount === 0) return { score: 0, metrics: { attendance: 0, visitors: 0, bibles: 0, magazines: 0, offerings: 0 } };
        
        const totalPeople = lesson.attendance_count + lesson.visitors_count;
        const freq = (lesson.attendance_count / roomStudentsCount) * 100;
        const visit = totalPeople > 0
          ? Math.min((lesson.visitors_count / totalPeople) * 100, 100)
          : 0;
        const biblia = totalPeople > 0 ? (lesson.bibles_count / totalPeople) * 100 : 0;
        const revista = totalPeople > 0 ? (lesson.magazines_count / totalPeople) * 100 : 0;
        const oferta = maxOfferingInDay > 0 ? (lesson.offerings_amount / maxOfferingInDay) * 100 : 0;
        
        const score = (freq + visit + biblia + revista + oferta) / 5;
        
        return {
          score,
          metrics: {
            attendance: freq,
            visitors: visit,
            bibles: biblia,
            magazines: revista,
            offerings: oferta
          }
        };
      };

      // Group lessons by date to find max offering per day
      const lessonsByDate: Record<string, Lesson[]> = {};
      lessons.forEach(l => {
        const date = l.date.split('T')[0];
        if (!lessonsByDate[date]) lessonsByDate[date] = [];
        lessonsByDate[date].push(l);
      });

      const maxOfferingByDate: Record<string, number> = {};
      Object.entries(lessonsByDate).forEach(([date, dateLessons]) => {
        maxOfferingByDate[date] = Math.max(...dateLessons.map(l => l.offerings_amount));
      });

      // 🔹 Descobrir a data mais recente registrada (último domingo)
      const lastLessonDate = lessons
        .map(l => l.date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      // 🔹 Filtrar apenas as lições desse domingo
      const lessonsLastSunday = lessons.filter(
        l => l.date?.slice(0,10) === lastLessonDate?.slice(0,10)
      );

      // Calculate Daily Rankings (based on latest lesson for each room)
      const latestLessons: Record<string, Lesson> = {};
      lessonsLastSunday.forEach(l => {
        if (!latestLessons[l.room_id] || new Date(l.date) > new Date(latestLessons[l.room_id].date)) {
          latestLessons[l.room_id] = l;
        }
      });

      const roomDailyScores: Record<string, RankingItem> = {};
      rooms.forEach(r => {
        const lesson = latestLessons[r.id];
        const roomStudents = students.filter(s => s.room_id === r.id);
        if (lesson) {
          const date = lesson.date.split('T')[0];
          const result = calculateLessonScore(lesson, roomStudents.length, maxOfferingByDate[date]);
          roomDailyScores[r.id] = {
            id: r.id,
            name: r.name,
            score: result.score,
            metrics: result.metrics,
            rank: 'none'
          };
        }
      });

      // Calculate Annual Rankings
      const roomAnnualScores: Record<string, RankingItem> = {};
      rooms.forEach(r => {
        const roomLessons = lessons.filter(l => l.room_id === r.id);
        const roomStudents = students.filter(s => s.room_id === r.id);
        
        if (roomLessons.length > 0) {
          let totalFreq = 0, totalVisit = 0, totalBiblia = 0, totalRevista = 0, totalOferta = 0;
          
          roomLessons.forEach(l => {
            const date = l.date.split('T')[0];
            const res = calculateLessonScore(l, roomStudents.length, maxOfferingByDate[date]);
            totalFreq += res.metrics.attendance;
            totalVisit += res.metrics.visitors;
            totalBiblia += res.metrics.bibles;
            totalRevista += res.metrics.magazines;
            totalOferta += res.metrics.offerings;
          });

          const avgFreq = totalFreq / roomLessons.length;
          const avgVisit = totalVisit / roomLessons.length;
          const avgBiblia = totalBiblia / roomLessons.length;
          const avgRevista = totalRevista / roomLessons.length;
          const avgOferta = totalOferta / roomLessons.length;
          
          const score = (avgFreq + avgVisit + avgBiblia + avgRevista + avgOferta) / 5;

          roomAnnualScores[r.id] = {
            id: r.id,
            name: r.name,
            score,
            metrics: {
              attendance: avgFreq,
              visitors: avgVisit,
              bibles: avgBiblia,
              magazines: avgRevista,
              offerings: avgOferta
            },
            rank: 'none'
          };
        }
      });

      // Helper: Sort and Assign Ranks
      const sortAndRank = (items: RankingItem[]) => {
        const sorted = [...items].sort((a, b) => b.score - a.score);
        if (sorted[0]) sorted[0].rank = 'gold';
        if (sorted[1]) sorted[1].rank = 'silver';
        if (sorted[2]) sorted[2].rank = 'bronze';
        return sorted;
      };

      // Filter into categories
      const dailyInfanto = rooms.filter(r => getRoomCategory(r.id) === 'infanto').map(r => roomDailyScores[r.id]).filter(Boolean);
      const dailyJovens = rooms.filter(r => getRoomCategory(r.id) === 'jovens').map(r => roomDailyScores[r.id]).filter(Boolean);
      const dailyAdultos = rooms.filter(r => getRoomCategory(r.id) === 'adultos').map(r => roomDailyScores[r.id]).filter(Boolean);

      const annualInfanto = rooms.filter(r => getRoomCategory(r.id) === 'infanto').map(r => roomAnnualScores[r.id]).filter(Boolean);
      const annualJovens = rooms.filter(r => getRoomCategory(r.id) === 'jovens').map(r => roomAnnualScores[r.id]).filter(Boolean);
      const annualAdultos = rooms.filter(r => getRoomCategory(r.id) === 'adultos').map(r => roomAnnualScores[r.id]).filter(Boolean);

      setRankingInfanto(sortAndRank(dailyInfanto));
      setRankingJovens(sortAndRank(dailyJovens));
      setRankingAdultos(sortAndRank(dailyAdultos));
      setRankingInfantoAnnual(sortAndRank(annualInfanto));
      setRankingJovensAnnual(sortAndRank(annualJovens));
      setRankingAdultosAnnual(sortAndRank(annualAdultos));

      // Original Room Ranking (keep for compatibility or other roles)
      const roomScores: Record<string, { name: string, score: number }> = {};
      rooms.forEach(r => {
        roomScores[r.id] = { name: r.name, score: 0 };
      });

      lessons.forEach(l => {
        if (roomScores[l.room_id]) {
          const score = l.attendance_count + l.visitors_count + l.bibles_count + l.magazines_count + (l.offerings_amount / 10);
          roomScores[l.room_id].score += score;
        }
      });

      const sortedRanking: RankingItem[] = Object.entries(roomScores)
        .map(([id, data]) => ({
          id,
          name: data.name,
          score: Math.round(data.score),
          rank: 'none' as const
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (sortedRanking[0]) sortedRanking[0].rank = 'gold';
      if (sortedRanking[1]) sortedRanking[1].rank = 'silver';
      if (sortedRanking[2]) sortedRanking[2].rank = 'bronze';

      setRanking(sortedRanking);

      // Calculate Congregation Rankings
      const congStats: Record<string, { 
        name: string, 
        studentCount: number, 
        totalAttendance: number, 
        expectedAttendance: number 
      }> = {};

      congregations.forEach(c => {
        congStats[c.id] = { name: c.name, studentCount: 0, totalAttendance: 0, expectedAttendance: 0 };
      });

      students.forEach(s => {
        const roomId = s.room_id;
        const room = rooms.find(r => r.id === roomId);
        if (room && congStats[room.congregation_id]) {
          congStats[room.congregation_id].studentCount++;
        }
      });

      lessons.forEach(l => {
        const roomId = l.room_id;
        const room = rooms.find(r => r.id === roomId);
        if (room && congStats[room.congregation_id]) {
          congStats[room.congregation_id].totalAttendance += l.attendance_count;
          const roomStudents = students.filter(s => s.room_id === roomId).length;
          congStats[room.congregation_id].expectedAttendance += roomStudents;
        }
      });

      const congRankingData: CongregationRankingItem[] = Object.entries(congStats).map(([id, data]) => ({
        id,
        name: data.name,
        studentCount: data.studentCount,
        attendanceRate: data.expectedAttendance > 0 ? (data.totalAttendance / data.expectedAttendance) * 100 : 0,
        rank: 'none' as const
      }));

      const sortedByStudents = [...congRankingData]
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 5);
      if (sortedByStudents[0]) sortedByStudents[0].rank = 'gold';
      if (sortedByStudents[1]) sortedByStudents[1].rank = 'silver';
      if (sortedByStudents[2]) sortedByStudents[2].rank = 'bronze';
      setCongRankingStudents(sortedByStudents);

      const sortedByAttendance = [...congRankingData]
        .sort((a, b) => b.attendanceRate - a.attendanceRate)
        .slice(0, 5);
      if (sortedByAttendance[0]) sortedByAttendance[0].rank = 'gold';
      if (sortedByAttendance[1]) sortedByAttendance[1].rank = 'silver';
      if (sortedByAttendance[2]) sortedByAttendance[2].rank = 'bronze';
      setCongRankingAttendance(sortedByAttendance);

      // Calculate Weekly Birthdays
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Today at midnight local

      const currentDay = today.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const birthdays: BirthdayStudent[] = students
        .filter(s => s.birth_date)
        .map(s => {
          const birth = parseLocalDate(s.birth_date);
          if (!birth) return null;

          const birthdayThisYear = new Date(birth);
          birthdayThisYear.setFullYear(today.getFullYear());
          birthdayThisYear.setHours(12, 0, 0, 0); // Avoid timezone issues

          if (birthdayThisYear >= monday && birthdayThisYear <= sunday) {
            return {
              id: s.id,
              name: s.full_name,
              dateStr: `${String(birth.getDate()).padStart(2, '0')}/${String(birth.getMonth() + 1).padStart(2, '0')}`,
              turningAge: today.getFullYear() - birth.getFullYear(),
              day: birth.getDate()
            };
          }
          return null;
        })
        .filter((b): b is BirthdayStudent => b !== null)
        .sort((a, b) => a.day - b.day);

      setWeeklyBirthdays(birthdays);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const hasNoChurch = !church && profile?.role !== 'ADMIN_MASTER' && profile?.role !== 'ADMIN_APP';

  const rankingDate = stats.totalLessons > 0
  ? new Date().toLocaleDateString('pt-BR')
  : '';

  return (
    <div className="w-full px-6 1g:px-10 py-8 space-y-8">
      {hasNoChurch ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg px-4 p-6 sm:p-10 text-white">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
            <ChurchIcon size={32} className="text-white sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Bem-vindo ao EBD Digital!</h2>
          <p className="text-sm sm:text-base text-white opacity-80 max-w-md mb-8">
            Sua conta ainda não está vinculada a uma igreja. Entre em contato com o administrador master ou aguarde a configuração inicial do sistema.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl">
            <div className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-2xl shadow-lg">
              <Shield className="text-white mb-4" size={24} />
              <h3 className="font-bold text-white mb-2">Segurança</h3>
              <p className="text-xs text-white opacity-60">Seus dados estão protegidos e aguardando vinculação.</p>
            </div>
            <div className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-2xl shadow-lg">
              <LayoutDashboard className="text-white mb-4" size={24} />
              <h3 className="font-bold text-white mb-2">Estrutura</h3>
              <p className="text-xs text-white opacity-60">Toda a interface está pronta para receber os dados da sua igreja.</p>
            </div>
            <div className="p-4 sm:p-6 bg-white/5 border border-white/10 rounded-2xl shadow-lg sm:col-span-2 md:col-span-1">
              <Users className="text-white mb-4" size={24} />
              <h3 className="font-bold text-white mb-2">Suporte</h3>
              <p className="text-xs text-white opacity-60">Precisa de ajuda? Entre em contato com a ikhaex.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-700 uppercase">Bem-vindo ao EBD Digital {profile?.name?.split(' ')[0]}</h1>
              <p className="text-gray-700 text-sm mt-1">
                {profile?.role === 'ADMIN_MASTER' ? 'Visão geral de toda a plataforma.' : 
                 profile?.role === 'ADMIN_APP' ? 'Dados da sua igreja.' : 
                 profile?.role === 'SECRETARIO' ? 'Gerenciamento da congregação.' :
                 'Acompanhe o crescimento da EBD em tempo real.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {profile?.role === 'ADMIN_MASTER' && (
                <Link 
                  to="/churches"
                  className="bg-brand-700 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-brand-800 transition-all flex items-center gap-2"
                >
                  <ChurchIcon size={18} />
                  Gerenciar Igrejas
                </Link>
              )}
              <div className="flex items-center gap-3 bg-brand-800 px-4 py-2 rounded-xl border border-brand-700/20 shadow-sm">
                <Calendar className="text-white" size={20} />
                <span className="text-white font-bold text-sm uppercase">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              </div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-stretch"
          >
            <StatCard label="Total de Alunos" value={stats.totalStudents} icon={<GraduationCap className="text-white" size={16} />} />
            <StatCard label="Salas Ativas" value={stats.totalRooms} icon={<School className="text-white" size={16} />} />
            </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3 bg-brand-800 text-white rounded-2xl p-6 sm:p-8 shadow-lg space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Trophy className="text-white" size={24} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    RANKING {rankingDate && `— ${rankingDate}`}
                  </h2>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
                  <button 
                    onClick={() => setActiveRanking('rooms')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0
                      ${activeRanking === 'rooms' ? 'bg-white text-brand-700 shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}
                    `}
                  >
                    Turmas
                  </button>
                  {profile?.role === 'SECRETARIO' && (
                    <>
                      <button 
                        onClick={() => setActiveRanking('infanto')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0
                          ${activeRanking === 'infanto' ? 'bg-white text-brand-700 shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}
                        `}
                      >
                        Infanto-juvenil
                      </button>
                      <button 
                        onClick={() => setActiveRanking('jovens')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0
                          ${activeRanking === 'jovens' ? 'bg-white text-brand-700 shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}
                        `}
                      >
                        Jovens
                      </button>
                      <button 
                        onClick={() => setActiveRanking('adultos')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0
                          ${activeRanking === 'adultos' ? 'bg-white text-brand-700 shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}
                        `}
                      >
                        Adultos
                      </button>
                    </>
                  )}
                  {(profile?.role === 'ADMIN_APP' || profile?.role === 'ADMIN_MASTER') && (
                    <>
                      <button 
                        onClick={() => setActiveRanking('cong_students')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0
                          ${activeRanking === 'cong_students' ? 'bg-white text-brand-700 shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}
                        `}
                      >
                        Congregações (Alunos)
                      </button>
                      <button 
                        onClick={() => setActiveRanking('cong_attendance')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0
                          ${activeRanking === 'cong_attendance' ? 'bg-white text-brand-700 shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}
                        `}
                      >
                        Congregações (Frequência)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {['infanto', 'jovens', 'adultos'].includes(activeRanking) && (
                <div className="flex items-center gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
                  <button 
                    onClick={() => setRankingPeriod('daily')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all
                      ${rankingPeriod === 'daily' ? 'bg-white text-brand-700 shadow-sm' : 'text-white/40 hover:text-white/60'}
                    `}
                  >
                    Diário
                  </button>
                  <button 
                    onClick={() => setRankingPeriod('annual')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all
                      ${rankingPeriod === 'annual' ? 'bg-white text-brand-700 shadow-sm' : 'text-white/40 hover:text-white/60'}
                    `}
                  >
                    Anual
                  </button>
                </div>
              )}

              <div className="space-y-3 sm:space-y-4">
                {activeRanking === 'rooms' && ranking.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border-2 border-white hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0
                        ${item.rank === 'gold' ? 'bg-yellow-400 text-brand-900' : 
                          item.rank === 'silver' ? 'bg-slate-300 text-brand-900' : 
                          item.rank === 'bronze' ? 'bg-orange-400 text-brand-900' : 
                          'bg-white/10 text-white'}
                      `}>
                        {item.rank === 'gold' ? <Medal size={18} className="sm:w-5 sm:h-5" /> : 
                         item.rank === 'silver' ? <Medal size={18} className="sm:w-5 sm:h-5" /> : 
                         item.rank === 'bronze' ? <Medal size={18} className="sm:w-5 sm:h-5" /> : 
                         index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm sm:text-base line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-white line-clamp-1">Pontuação baseada em frequência</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-base sm:text-lg font-bold text-white">{item.score}</p>
                      <p className="text-[10px] text-white uppercase font-bold tracking-widest">Pontos</p>
                    </div>
                  </div>
                ))}

                {(activeRanking === 'cong_students' || activeRanking === 'cong_attendance') && 
                  (activeRanking === 'cong_students' ? congRankingStudents : congRankingAttendance).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border-2 border-white hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0
                          ${item.rank === 'gold' ? 'bg-yellow-400 text-bordo-900' : 
                            item.rank === 'silver' ? 'bg-slate-300 text-bordo-900' : 
                            item.rank === 'bronze' ? 'bg-orange-400 text-bordo-900' : 
                            'bg-white/10 text-white'}
                        `}>
                          {item.rank === 'gold' ? <Medal size={18} className="sm:w-5 sm:h-5" /> : 
                           item.rank === 'silver' ? <Medal size={18} className="sm:w-5 sm:h-5" /> : 
                           item.rank === 'bronze' ? <Medal size={18} className="sm:w-5 sm:h-5" /> : 
                           index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm sm:text-base line-clamp-1">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-white uppercase font-bold tracking-widest">
                              {item.studentCount} Alunos
                            </span>
                            <span className="text-[10px] text-white uppercase font-bold tracking-widest">
                              {item.attendanceRate.toFixed(1)}% Frequência
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-base sm:text-lg font-bold text-white">
                          {activeRanking === 'cong_students' ? item.studentCount : `${item.attendanceRate.toFixed(1)}%`}
                        </p>
                        <p className="text-[10px] text-white uppercase font-bold tracking-widest">
                          {activeRanking === 'cong_students' ? 'Matriculados' : 'Índice'}
                        </p>
                      </div>
                    </div>
                  ))
                }

                {['infanto', 'jovens', 'adultos'].includes(activeRanking) && (
                  (activeRanking === 'infanto' ? (rankingPeriod === 'daily' ? rankingInfanto : rankingInfantoAnnual) :
                   activeRanking === 'jovens' ? (rankingPeriod === 'daily' ? rankingJovens : rankingJovensAnnual) :
                   (rankingPeriod === 'daily' ? rankingAdultos : rankingAdultosAnnual)).map((item, index) => (
                    <div key={item.id} className="flex flex-col p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                            ${item.rank === 'gold' ? 'bg-yellow-400 text-brand-900' : 
                              item.rank === 'silver' ? 'bg-slate-300 text-brand-900' : 
                              item.rank === 'bronze' ? 'bg-orange-400 text-brand-900' : 
                              'bg-white/10 text-white'}
                          `}>
                            {item.rank === 'gold' ? <Medal size={20} /> : 
                             item.rank === 'silver' ? <Medal size={20} /> : 
                             item.rank === 'bronze' ? <Medal size={20} /> : 
                             index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-white">{item.name}</p>
                            <p className="text-[10px] text-white opacity-40 uppercase font-bold tracking-widest">Score Geral: {item.score.toFixed(1)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-white">
                            <TrendingUp size={14} className="text-green-400" />
                            <span className="text-lg font-bold">{item.score.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/5">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase">Freq</p>
                          <p className="text-xs font-bold text-white">{item.metrics?.attendance.toFixed(0)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase">Visitas</p>
                          <p className="text-xs font-bold text-white">{item.metrics?.visitors.toFixed(0)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase">Bíblias</p>
                          <p className="text-xs font-bold text-white">{item.metrics?.bibles.toFixed(0)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase">Revistas</p>
                          <p className="text-xs font-bold text-white">{item.metrics?.magazines.toFixed(0)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase">Ofertas</p>
                          <p className="text-xs font-bold text-white">{item.metrics?.offerings.toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}

              <div className="bg-brand-800 text-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-white hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Cake className="text-white" size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-white">ANIVERSARIANTES DA SEMANA</h2>
                </div>
                
                <div className="space-y-4">
                  {weeklyBirthdays.length > 0 ? (
                    weeklyBirthdays.map((b, index) => (
                      <div
                        key={b.id}
                        className={`flex flex-col p-4 rounded-3xl border transition-all gap-4
                          ${index === 0
                            ? "bg-gold/20 border-white/40 hover:bg-gold/30"
                            : "bg-white/5 border-white/20 hover:bg-white/10"
                          }`}
                      >
                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-4">

                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white flex items-center justify-center text-white">
                              <Cake size={20} />
                            </div>

                            <div>
                              <p className="font-bold text-white">{b.name}</p>
                              <p className="text-[14px] text-white opacity-90 uppercase font-bold tracking-widest">
                                {b.dateStr} — {b.turningAge} anos
                              </p>
                            </div>

                          </div>

                          <span className="text-lg">🎉</span>

                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-white/40">Nenhum aniversariante nesta semana</p>
                    </div>
                  )}
                </div>

                {((activeRanking === 'rooms' && ranking.length === 0) || 
                  (activeRanking === 'infanto' && (rankingPeriod === 'daily' ? rankingInfanto : rankingInfantoAnnual).length === 0) ||
                  (activeRanking === 'jovens' && (rankingPeriod === 'daily' ? rankingJovens : rankingJovensAnnual).length === 0) ||
                  (activeRanking === 'adultos' && (rankingPeriod === 'daily' ? rankingAdultos : rankingAdultosAnnual).length === 0) ||
                  (activeRanking === 'cong_students' && congRankingStudents.length === 0) ||
                  (activeRanking === 'cong_attendance' && congRankingAttendance.length === 0)) && (
                  <div className="text-center py-8 sm:py-12">
                    <Trophy size={40} className="mx-auto text-white/20 mb-4 sm:w-12 sm:h-12" />
                    <p className="text-sm sm:text-base text-white opacity-50">Nenhum dado de ranking disponível ainda.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-brand-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-white hover:bg-white/10 transition-all">
                <h2 className="text-lg font-bold text-white mb-6">ASSINATURA</h2>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Plano</span>
                    <span className="text-sm font-bold text-white uppercase">{church?.subscription_plan || 'BASIC'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Status</span>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${church?.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {church?.subscription_status || 'INATIVO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Expira em</span>
                    <span className="text-sm font-medium text-white">
                      {church?.subscription_expires_at ? formatDate(church.subscription_expires_at) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-brand-800 p-6 rounded-2xl shadow-lg flex items-center justify-between group hover:scale-[1.02] transition-transform">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
      </div>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0 ml-3">
        {icon}
      </div>
    </div>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
      <div className="mb-2 text-white/60 group-hover:text-white">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white">{label}</span>
    </Link>
  );
}
