import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/Button';
import { 
  FileText, Download, Filter, ChevronLeft, 
  Table as TableIcon, FileSpreadsheet, File as FilePdf,
  Calendar, Users, BookOpen, DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import type { Room, Lesson, Congregation } from '@/src/types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@/src/lib/utils';

export default function Reports() {
  const { profile, church } = useAuth();
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);

  const hasNoChurch = !church && profile?.role !== 'ADMIN_MASTER' && profile?.role !== 'ADMIN_APP';

  const congregationSummary = congregations.map((c) => {
    const congregationLessons = lessons.filter(
      (l: any) => l.rooms.congregation_id === c.id
    );

    const totalAttendance = congregationLessons.reduce((sum, l) => sum + l.attendance_count, 0);
    const totalVisitors = congregationLessons.reduce((sum, l) => sum + l.visitors_count, 0);
    const totalOfferings = congregationLessons.reduce((sum, l) => sum + l.offerings_amount, 0);

    const totalStudents = congregationLessons.length
      ? congregationLessons.reduce((sum, l) => sum + l.attendance_count, 0)
      : 0;

    const frequency =
      totalStudents > 0
        ? Math.round((totalAttendance / totalStudents) * 100)
        : 0;

    return {
      name: c.name,
      totalAttendance,
      totalVisitors,
      totalOfferings,
      frequency
    };
  });

  // Filters
  const [selectedCongregation, setSelectedCongregation] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (church) {
      fetchInitialData();
    }
  }, [church, profile]);

  async function fetchInitialData() {
    try {
      let congQuery = supabase
        .from('congregations')
        .select('*');
        
      if (profile?.role === 'SECRETARIO' && profile.congregation_id) {
        congQuery = congQuery.eq('id', profile.congregation_id);
        setSelectedCongregation(profile.congregation_id);
      } else {
        congQuery = congQuery.eq('church_id', church!.id);
      }
      
      const { data: congData } = await congQuery;
      
      if (congData) setCongregations(congData);

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
      console.error('Error fetching initial data:', error);
    }
  }

  async function generateReport() {
    if (hasNoChurch) return;
    setLoading(true);
    try {
      let query = supabase
        .from('lessons')
        .select('*, rooms!inner(name, congregation_id, congregations!inner(name), max_age, students(count))')
        .eq('rooms.congregations.church_id', church!.id);

      if (profile?.role === 'SECRETARIO') {
        query = query.eq('rooms.congregation_id', profile.congregation_id);
      } else if (selectedCongregation !== 'all') {
        query = query.eq('rooms.congregation_id', selectedCongregation);
      }

      if (selectedRoom !== 'all') {
        query = query.eq('room_id', selectedRoom);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query
        .order('rooms.max_age', { ascending: false })
        .order('date', { ascending: false });

      if (data) {
        setLessons(data as any);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportCSV = () => {
    if (lessons.length === 0) return;

    const headers = ['Data', 'Turma', 'Título', 'Presença', 'Visitantes', 'Bíblias', 'Revistas', 'Ofertas'];
    const rows = lessons.map(l => [
      formatDate(l.date),
      (l as any).rooms.name,
      l.title,
      l.attendance_count,
      l.visitors_count,
      l.bibles_count,
      l.magazines_count,
      l.offerings_amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_ebd_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (lessons.length === 0) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Relatório EBD Digital', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Igreja: ${church?.name}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, 14, 36);

    // Table
    autoTable(doc, {
      startY: 45,
      head: [['Data', 'Turma', 'Título', 'Pres.', 'Vis.', 'Bíb.', 'Rev.', 'Ofertas']],
      body: lessons.map(l => [
        formatDate(l.date),
        (l as any).rooms.name,
        l.title,
        l.attendance_count,
        l.visitors_count,
        l.bibles_count,
        l.magazines_count,
        `R$ ${l.offerings_amount.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [29, 78, 216] }, // brand-blue
    });

    doc.save(`relatorio_ebd_${new Date().getTime()}.pdf`);
  };

  const totals = lessons.reduce((acc: any, l: any) => {
    const totalStudents = l.rooms?.students?.[0]?.count || 0;

    acc.students += totalStudents;
    acc.attendance += l.attendance_count;
    acc.absent += (totalStudents - l.attendance_count);
    acc.visitors += l.visitors_count;
    acc.bibles += l.bibles_count;
    acc.magazines += l.magazines_count;
    acc.offerings += l.offerings_amount;

    return acc;
  }, {
    students: 0,
    attendance: 0,
    absent: 0,
    visitors: 0,
    bibles: 0,
    magazines: 0,
    offerings: 0
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 hover:bg-brand-50 rounded-xl transition-colors text-brand-700 border border-brand-200">
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-brand-700">Relatórios</h1>
              <p className="text-gray-700 text-sm mt-1">Gere e exporte relatórios da EBD</p>
            </div>
          </div>
        </div>

        <main className="w-full flex-1">
        {hasNoChurch ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg px-4 p-6 sm:p-10 text-white">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <FileText size={32} className="text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Configuração Necessária</h2>
            <p className="text-sm sm:text-base text-white opacity-70 max-w-md mb-8">
              Para gerar relatórios, sua conta precisa estar vinculada a uma igreja. Entre em contato com o suporte ou seu administrador.
            </p>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-sm sm:text-base border-white text-white hover:bg-white/10">Voltar ao Início</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Filters Card */}
            <div className="bg-brand-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-lg text-white mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-6 text-white">
                <Filter size={18} />
                <h2 className="font-bold uppercase tracking-widest text-[10px] sm:text-xs text-white">Filtros de Pesquisa</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-white uppercase mb-2 block">Congregação</label>
                  <select 
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-white/10 focus:border-white outline-none bg-white/5 text-sm text-white"
                    value={selectedCongregation}
                    onChange={(e) => setSelectedCongregation(e.target.value)}
                  >
                    {(profile?.role === 'ADMIN_MASTER' || profile?.role === 'ADMIN_APP') && (
                      <option value="all" className="bg-bordo-800">
                        Todas as Congregações
                      </option>
                    )}

                    {congregations
                      .filter(c =>
                        profile?.role === 'SECRETARIO'
                          ? c.id === profile.congregation_id
                          : true
                      )
                      .map(c => (
                        <option key={c.id} value={c.id} className="bg-brand-800">
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-white uppercase mb-2 block">Turma</label>
                  <select 
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-white/10 focus:border-white outline-none bg-white/5 text-sm text-white"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                  >
                    <option value="all" className="bg-brand-800">Todas as Turmas</option>
                    {rooms
                      .filter(r => selectedCongregation === 'all' || r.congregation_id === selectedCongregation)
                      .map(r => (
                        <option key={r.id} value={r.id} className="bg-brand-800">{r.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-white uppercase mb-2 block">Data Início</label>
                  <input 
                    type="date" 
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-white/10 focus:border-white outline-none bg-white/5 text-sm text-white"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-white uppercase mb-2 block">Data Fim</label>
                  <input 
                    type="date" 
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-white/10 focus:border-white outline-none bg-white/5 text-sm text-white"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 sm:mt-8 flex justify-end">
                <Button 
                  onClick={generateReport} 
                  disabled={loading}
                  className="bg-white text-bordo-800 hover:bg-white/90 px-6 sm:px-8 w-full sm:w-auto text-sm sm:text-base h-10 sm:h-12 rounded-xl shadow-lg"
                >
                  {loading ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </div>
            </div>

            {/* Results Table */}
            {lessons.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-800 text-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden"
              >
                <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 gap-4">
                  <div className="flex items-center gap-2">
                    <TableIcon size={18} className="text-white opacity-40" />
                    <span className="font-bold text-white text-sm sm:text-base">
                      {selectedCongregation === 'all'
                        ? `${congregationSummary.length} Congregações`
                        : `${lessons.length} Registros`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportCSV} className="flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10 border-white text-white hover:bg-white/10">
                      <FileSpreadsheet size={16} className="mr-1.5 sm:mr-2" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPDF} className="flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10 border-white text-white hover:bg-white/10">
                      <FilePdf size={16} className="mr-1.5 sm:mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                    <thead>
                      {selectedCongregation === 'all' ? (
                        <tr className="bg-white/5">
                          <th className="p-4 text-xs font-bold uppercase text-white/40">Congregação</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Matriculados</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">% Frequência</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Visitantes</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-right">Ofertas</th>
                        </tr>
                      ) : (
                        <tr className="bg-white/5">
                          <th className="p-4 text-xs font-bold uppercase text-white/40">Data</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40">Sala</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40">Título</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Matric.</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Pres.</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Aus.</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Vis.</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Bíb.</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Rev.</th>
                          <th className="p-4 text-xs font-bold uppercase text-white/40 text-right">Ofertas</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {selectedCongregation === 'all'
                        ? congregationSummary.map((c, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-4 font-bold">{c.name}</td>
                              <td className="p-4 text-center">{c.totalAttendance}</td>
                              <td className="p-4 text-center">{c.frequency}%</td>
                              <td className="p-4 text-center">{c.totalVisitors}</td>
                              <td className="p-4 text-right text-emerald-400">
                                R$ {c.totalOfferings.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        : lessons.map((lesson: any) => {
                            const totalStudents = lesson.rooms.students?.[0]?.count || 0;
                            const absent = totalStudents - lesson.attendance_count;

                            return (
                              <tr key={lesson.id} className="hover:bg-white/5">
                                <td className="p-4">{formatDate(lesson.date)}</td>
                                <td className="p-4 font-bold">{lesson.rooms.name}</td>
                                <td className="p-4">{lesson.title}</td>

                                <td className="p-4 text-center">{totalStudents}</td>
                                <td className="p-4 text-center">{lesson.attendance_count}</td>
                                <td className="p-4 text-center">{absent}</td>

                                <td className="p-4 text-center">{lesson.visitors_count}</td>
                                <td className="p-4 text-center">{lesson.bibles_count}</td>
                                <td className="p-4 text-center">{lesson.magazines_count}</td>

                                <td className="p-4 text-right text-emerald-400">
                                  R$ {lesson.offerings_amount.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                      }

                      {selectedCongregation !== 'all' && (
                        <tr className="bg-white/10 font-bold">
                          <td className="p-4">TOTAL</td>
                          <td></td>
                          <td></td>

                          <td className="p-4 text-center">{totals.students}</td>
                          <td className="p-4 text-center">{totals.attendance}</td>
                          <td className="p-4 text-center">{totals.absent}</td>

                          <td className="p-4 text-center">{totals.visitors}</td>
                          <td className="p-4 text-center">{totals.bibles}</td>
                          <td className="p-4 text-center">{totals.magazines}</td>

                          <td className="p-4 text-right text-emerald-400">
                            R$ {totals.offerings.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              !loading && (
                <div className="text-center py-12 sm:py-20 bg-brand-800 rounded-2xl sm:rounded-3xl shadow-lg px-4 text-white">
                  <FileText size={40} className="mx-auto text-white opacity-10 mb-4" />
                  <p className="text-sm sm:text-base text-white font-medium">Use os filtros acima para gerar um relatório.</p>
                </div>
              )
            )}
          </>
        )}
      </main>
    </div>
  </div>
);
}
