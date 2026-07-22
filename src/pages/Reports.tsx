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
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nominalAttendance, setNominalAttendance] = useState<any[]>([]);

  const hasNoChurch = !church && profile?.role !== 'ADMIN_MASTER' && profile?.role !== 'ADMIN_APP';

  const congregationSummary = congregations.map((c) => {
    const congregationRooms = rooms.filter(r => r.congregation_id === c.id);
    const congregationLessons = lessons.filter(
      (l: any) => l.rooms.congregation_id === c.id
    );

    const totalAttendance = congregationLessons.reduce((sum, l) => sum + l.attendance_count, 0);
    const totalVisitors = congregationLessons.reduce((sum, l) => sum + l.visitors_count, 0);
    const totalOfferings = congregationLessons.reduce((sum, l) => sum + l.offerings_amount, 0);

    const matriculados = students.filter(s => 
      congregationRooms.some(r => r.id === s.room_id)
    ).length;

    const frequency =
      matriculados > 0
        ? Math.round((totalAttendance / matriculados) * 100)
        : 0;

    return {
      name: c.name,
      matriculados,
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

      // Fetch students to count enrollment
      let studentsQuery = supabase
        .from('students')
        .select('*, rooms!inner(congregations!inner(*))');
      
      if (profile?.role === 'SECRETARIO' && profile.congregation_id) {
        studentsQuery = studentsQuery.eq('rooms.congregation_id', profile.congregation_id);
      } else if (profile?.role !== 'ADMIN_MASTER') {
        studentsQuery = studentsQuery.eq('rooms.congregations.church_id', church!.id);
      }

      const { data: studentsData } = await studentsQuery;
      if (studentsData) setStudents(studentsData);
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
        .select('*, rooms!inner(name, congregation_id, congregations!inner(name))')
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

      const { data, error } = await query.order('date', { ascending: false });

      if (data) {
        setLessons(data as any);

        if (selectedRoom !== 'all' && data.length > 0) {
          const lessonIds = data.map(l => l.id);
          
          // Buscar todos os alunos da sala selecionada
          const { data: roomStudentsData } = await supabase
            .from('students')
            .select('id, full_name')
            .eq('room_id', selectedRoom);

          if (roomStudentsData) {
            // Buscar todas as presenças para as aulas selecionadas
            const { data: attData } = await supabase
              .from('attendance')
              .select('student_id, present')
              .in('lesson_id', lessonIds);

            const attendanceRecords = attData || [];

            const nominalData = roomStudentsData.map(student => {
              const studentAtt = attendanceRecords.filter(a => a.student_id === student.id);
              const presentCount = studentAtt.filter(a => a.present === true).length;
              const absentCount = studentAtt.filter(a => a.present === false).length;
              const totalCalls = presentCount + absentCount;
              const frequencyPercentage = totalCalls > 0 ? (presentCount / totalCalls) * 100 : 0;

              return {
                id: student.id,
                full_name: student.full_name,
                presentCount,
                absentCount,
                frequencyPercentage
              };
            });

            // Ordenar alfabeticamente pelo nome do aluno
            nominalData.sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));

            setNominalAttendance(nominalData);
          } else {
            setNominalAttendance([]);
          }
        } else {
          setNominalAttendance([]);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportCSV = () => {
    if (lessons.length === 0) return;

    const headers = ['Data', 'Turma', 'Título', 'Matriculados', 'Presença', 'Visitantes', 'Bíblias', 'Revistas', 'Ofertas'];
    const rows = lessons.map(l => {
      const roomStudentsCount = students.filter(s => s.room_id === (l as any).room_id).length;
      return [
        formatDate(l.date),
        (l as any).rooms.name,
        l.title,
        roomStudentsCount,
        l.attendance_count,
        l.visitors_count,
        l.bibles_count,
        l.magazines_count,
        l.offerings_amount.toFixed(2)
      ];
    });

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
    const appLogo = "https://qaccpjtjwuxhczkyafuo.supabase.co/storage/v1/object/public/Tecnecio%20LOGO/EBD%20Digital.png";
    const brandLogo = "https://ipjoswzdhfeovcdwlqbz.supabase.co/storage/v1/object/public/ikhaex/ikhaex-Logo.png";

    // Header
    try {
      doc.addImage(appLogo, 'PNG', 14, 10, 20, 20);
      doc.addImage(brandLogo, 'PNG', 176, 10, 20, 20);
    } catch (e) {
      console.error('Logo error:', e);
    }

    doc.setFontSize(18);
    doc.setTextColor(29, 78, 216); // brand-blue
    doc.text('RELATÓRIO', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Igreja: ${church?.name}`, 105, 28, { align: 'center' });
    doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 34, { align: 'center' });

    // Table
    let tableHead = [];
    let tableBody = [];

    if (selectedCongregation === 'all') {
      tableHead = [['Congregação', 'Matriculados', 'Freq. Total', '% Frequência', 'Visitantes', 'Ofertas']];
      tableBody = congregationSummary.map(c => [
        c.name,
        c.matriculados,
        c.totalAttendance,
        `${c.frequency}%`,
        c.totalVisitors,
        `R$ ${c.totalOfferings.toFixed(2)}`
      ]);

      const totalMatriculados = congregationSummary.reduce((acc, curr) => acc + curr.matriculados, 0);
      const totalAttendance = congregationSummary.reduce((acc, curr) => acc + curr.totalAttendance, 0);
      const totalVisitors = congregationSummary.reduce((acc, curr) => acc + curr.totalVisitors, 0);
      const totalOfferings = congregationSummary.reduce((acc, curr) => acc + curr.totalOfferings, 0);
      const totalFrequency = Math.round((totalAttendance / (totalMatriculados || 1)) * 100);

      tableBody.push([
        'TOTAL GERAL',
        totalMatriculados,
        totalAttendance,
        `${totalFrequency}%`,
        totalVisitors,
        `R$ ${totalOfferings.toFixed(2)}`
      ]);
    } else {
      tableHead = [['Turma', 'Título', 'Matr.', 'Pres.', 'Vis.', 'Bíb.', 'Rev.', 'Ofertas']];
      
      // Prepara os dados do relatório incluindo as informações completas da sala para ordenação
      const reportData = lessons.map(l => ({
        ...l,
        room: rooms.find(r => r.id === l.room_id)
      }));

      // Ordenação obrigatória por idade mínima da sala
      const sortedReportData = [...reportData].sort((a, b) => {
        const minAgeA = (a as any).room?.min_age ?? 999;
        const minAgeB = (b as any).room?.min_age ?? 999;

        if (minAgeA !== minAgeB) {
          return minAgeA - minAgeB;
        }

        const maxAgeA = (a as any).room?.max_age ?? 999;
        const maxAgeB = (b as any).room?.max_age ?? 999;

        return maxAgeA - maxAgeB;
      });

      tableBody = sortedReportData.map(l => {
        const roomStudentsCount = students.filter(s => s.room_id === l.room_id).length;
        return [
          (l as any).room?.name || '—',
          l.title,
          roomStudentsCount,
          l.attendance_count,
          l.visitors_count,
          l.bibles_count,
          l.magazines_count,
          `R$ ${l.offerings_amount.toFixed(2)}`
        ];
      });

      const totalMatriculados = lessons.reduce((acc, l) => {
        const roomStudentsCount = students.filter(s => s.room_id === (l as any).room_id).length;
        return acc + roomStudentsCount;
      }, 0);
      const totalAttendance = lessons.reduce((acc, l) => acc + l.attendance_count, 0);
      const totalVisitors = lessons.reduce((acc, l) => acc + l.visitors_count, 0);
      const totalBibles = lessons.reduce((acc, l) => acc + l.bibles_count, 0);
      const totalMagazines = lessons.reduce((acc, l) => acc + l.magazines_count, 0);
      const totalOfferings = lessons.reduce((acc, l) => acc + l.offerings_amount, 0);

      tableBody.push([
        'TOTAL GERAL',
        '',
        totalMatriculados,
        totalAttendance,
        totalVisitors,
        totalBibles,
        totalMagazines,
        `R$ ${totalOfferings.toFixed(2)}`
      ]);
    }

    autoTable(doc, {
      startY: 40,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [29, 78, 216], fontSize: 9 }, // brand-blue
      bodyStyles: { fontSize: 8 },
      columnStyles: selectedCongregation === 'all' ? {} : {
        0: { cellWidth: 40 }, // Turma
        1: { cellWidth: 50 }, // Título
        2: { cellWidth: 15 }, // Matr.
        3: { cellWidth: 15 }, // Pres.
        4: { cellWidth: 12 }, // Vis.
        5: { cellWidth: 12 }, // Bíb.
        6: { cellWidth: 12 }, // Rev.
        7: { cellWidth: 22 }, // Ofertas
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    if (selectedRoom !== 'all' && nominalAttendance.length > 0) {
      let finalY = (doc as any).lastAutoTable?.finalY || 40;
      
      if (finalY > 230) {
        doc.addPage();
        finalY = 20;
      } else {
        finalY += 15;
      }

      doc.setFontSize(14);
      doc.setTextColor(29, 78, 216); // brand-blue
      doc.setFont('helvetica', 'bold');
      doc.text('Frequência Individual dos Alunos', 14, finalY);

      const nominalHead = [['Aluno', 'Presenças', 'Faltas', 'Frequência (%)']];
      const nominalBody = nominalAttendance.map(item => [
        item.full_name,
        item.presentCount,
        item.absentCount,
        `${item.frequencyPercentage.toFixed(2).replace('.', ',')}%`
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: nominalHead,
        body: nominalBody,
        theme: 'striped',
        headStyles: { fillColor: [29, 78, 216], fontSize: 9 }, // brand-blue
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 80 },  // Aluno
          1: { cellWidth: 35 },  // Presenças
          2: { cellWidth: 35 },  // Faltas
          3: { cellWidth: 35 },  // Frequência
        }
      });
    }

    doc.save(`relatorio_ebd_${new Date().getTime()}.pdf`);
  };

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
                      <option value="all" className="bg-brand-800">
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
                  className="bg-brand-700 text-white hover:bg-brand-800 border border-white/30 px-6 sm:px-8 w-full sm:w-auto text-sm sm:text-base h-10 sm:h-12 rounded-xl shadow-lg"
                >
                  {loading ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </div>
            </div>

            {/* Results Table */}
            {lessons.length > 0 ? (
              <>
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
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Freq. Total</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">% Frequência</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Visitantes</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-right">Ofertas</th>
                          </tr>
                        ) : (
                          <tr className="bg-white/5">
                            <th className="p-4 text-xs font-bold uppercase text-white/40">Data</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40">Turma</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40">Título</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Matr.</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Pres.</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Vis.</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Bíb.</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Rev.</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-right">Ofertas</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {selectedCongregation === 'all'
                          ? [
                              ...congregationSummary.map((c, i) => (
                                <tr key={i} className="hover:bg-white/5">
                                  <td className="p-4 font-bold">{c.name}</td>
                                  <td className="p-4 text-center">{c.matriculados}</td>
                                  <td className="p-4 text-center">{c.totalAttendance}</td>
                                  <td className="p-4 text-center">{c.frequency}%</td>
                                  <td className="p-4 text-center">{c.totalVisitors}</td>
                                  <td className="p-4 text-right text-emerald-400">
                                    R$ {c.totalOfferings.toFixed(2)}
                                  </td>
                                </tr>
                              )),
                              <tr key="total" className="bg-white/10 font-bold border-t border-brand-500">
                                <td className="p-4">TOTAL GERAL</td>
                                <td className="p-4 text-center">{congregationSummary.reduce((acc, curr) => acc + curr.matriculados, 0)}</td>
                                <td className="p-4 text-center">{congregationSummary.reduce((acc, curr) => acc + curr.totalAttendance, 0)}</td>
                                <td className="p-4 text-center">
                                  {Math.round(
                                    (congregationSummary.reduce((acc, curr) => acc + curr.totalAttendance, 0) / 
                                     (congregationSummary.reduce((acc, curr) => acc + curr.matriculados, 0) || 1)) * 100
                                  )}%
                                </td>
                                <td className="p-4 text-center">{congregationSummary.reduce((acc, curr) => acc + curr.totalVisitors, 0)}</td>
                                <td className="p-4 text-right text-emerald-400">
                                  R$ {congregationSummary.reduce((acc, curr) => acc + curr.totalOfferings, 0).toFixed(2)}
                                </td>
                              </tr>
                            ]
                          : [
                              ...lessons.map((lesson) => {
                                const roomStudentsCount = students.filter(s => s.room_id === lesson.room_id).length;
                                return (
                                  <tr key={lesson.id} className="hover:bg-white/5">
                                    <td className="p-4">{formatDate(lesson.date)}</td>
                                    <td className="p-4 font-bold">{(lesson as any).rooms.name}</td>
                                    <td className="p-4">{lesson.title}</td>
                                    <td className="p-4 text-center">{roomStudentsCount}</td>
                                    <td className="p-4 text-center">{lesson.attendance_count}</td>
                                    <td className="p-4 text-center">{lesson.visitors_count}</td>
                                    <td className="p-4 text-center">{lesson.bibles_count}</td>
                                    <td className="p-4 text-center">{lesson.magazines_count}</td>
                                    <td className="p-4 text-right text-emerald-400">
                                      R$ {lesson.offerings_amount.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              }),
                              <tr key="total" className="bg-white/10 font-bold border-t border-brand-500">
                                <td className="p-4">TOTAL GERAL</td>
                                <td className="p-4"></td>
                                <td className="p-4"></td>
                                <td className="p-4 text-center">
                                  {lessons.reduce((acc, lesson) => {
                                    const roomStudentsCount = students.filter(s => s.room_id === lesson.room_id).length;
                                    return acc + roomStudentsCount;
                                  }, 0)}
                                </td>
                                <td className="p-4 text-center">{lessons.reduce((acc, l) => acc + l.attendance_count, 0)}</td>
                                <td className="p-4 text-center">{lessons.reduce((acc, l) => acc + l.visitors_count, 0)}</td>
                                <td className="p-4 text-center">{lessons.reduce((acc, l) => acc + l.bibles_count, 0)}</td>
                                <td className="p-4 text-center">{lessons.reduce((acc, l) => acc + l.magazines_count, 0)}</td>
                                <td className="p-4 text-right text-emerald-400">
                                  R$ {lessons.reduce((acc, l) => acc + l.offerings_amount, 0).toFixed(2)}
                                </td>
                              </tr>
                            ]}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {selectedRoom !== 'all' && nominalAttendance.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-800 text-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden mt-6 sm:mt-8"
                  >
                    <div className="p-4 sm:p-6 border-b border-white/10 flex items-center gap-2 bg-white/5">
                      <Users size={18} className="text-white opacity-40" />
                      <span className="font-bold text-white text-sm sm:text-base">
                        Frequência Individual dos Alunos
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="p-4 text-xs font-bold uppercase text-white/40">Aluno</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Presenças</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-center">Faltas</th>
                            <th className="p-4 text-xs font-bold uppercase text-white/40 text-right">Frequência (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nominalAttendance.map((item) => (
                            <tr key={item.id} className="hover:bg-white/5 border-b border-white/5">
                              <td className="p-4 font-bold">{item.full_name}</td>
                              <td className="p-4 text-center">{item.presentCount}</td>
                              <td className="p-4 text-center">{item.absentCount}</td>
                              <td className="p-4 text-right text-emerald-400">
                                {item.frequencyPercentage.toFixed(2).replace('.', ',')}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </>
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
