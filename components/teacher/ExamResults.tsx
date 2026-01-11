
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Exam, StudentAttempt } from '../../types';
import { Button, Card, Badge, DialogOverlay, Input, AlertDialog } from '../ui/brutalist';
import { ArrowLeft, User, TrendingUp, Award, Clock, Share2, EyeOff, FileText, Check, X, Download, FileSpreadsheet, FileText as FileTextIcon, ChevronDown, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import SmartPoller from '../../lib/polling';

interface ExamResultsProps {
  exam: Exam;
  onBack: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({ exam: initialExam, onBack }) => {
  const { exams, attempts, publishResults, updateScore, appConfig } = useApp();
  const [selectedAttempt, setSelectedAttempt] = useState<StudentAttempt | null>(null);
  const [manualScore, setManualScore] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showNewDataIndicator, setShowNewDataIndicator] = useState(false);
  const [lastAttemptCount, setLastAttemptCount] = useState(0);

  // Real-time polling for attempts
  const attemptsPollerRef = useRef<SmartPoller | null>(null);

  // FIX: Get the latest version of the exam from context
  const exam = exams.find(e => e.id === initialExam.id) || initialExam;

  // Real-time polling effect
  useEffect(() => {
    if (isRealTimeEnabled && exam.status === 'DIBUKA') {
      // Create poller for attempts when exam is active
      const poller = new SmartPoller(
        async () => {
          try {
            // Import api dynamically to avoid circular dependency
            const { api } = await import('../../lib/api');
            const data = await api.fetchAttempts(true);
            
            // Check if new attempts were added
            const currentExamAttempts = data.filter(a => a.examId === exam.id);
            if (currentExamAttempts.length > lastAttemptCount) {
              setShowNewDataIndicator(true);
              setTimeout(() => setShowNewDataIndicator(false), 3000); // Hide after 3 seconds
            }
            
            setLastAttemptCount(currentExamAttempts.length);
            setLastUpdate(new Date());
          } catch (error) {
            console.error('Failed to fetch attempts:', error);
          }
        },
        {
          baseInterval: 3000,        // 3 seconds for real-time feel
          maxInterval: 10000,        // 10 seconds max
          backoffMultiplier: 1.2,    // 1.2x backoff
          resetOnSuccess: true,
        }
      );

      attemptsPollerRef.current = poller;
      poller.start();

      return () => {
        poller.stop();
        attemptsPollerRef.current = null;
      };
    } else {
      // Stop polling when real-time is disabled or exam is closed
      if (attemptsPollerRef.current) {
        attemptsPollerRef.current.stop();
        attemptsPollerRef.current = null;
      }
    }
  }, [isRealTimeEnabled, exam.status, exam.id, lastAttemptCount]);

  // Filter attempts for this exam
  const examAttempts = attempts.filter(a => a.examId === exam.id);

  // Calculate stats
  const totalStudents = examAttempts.length;

  // Initialize lastAttemptCount on mount and when exam changes
  useEffect(() => {
    setLastAttemptCount(examAttempts.length);
  }, [exam.id]);

  const averageScore = totalStudents > 0 
    ? Math.round(examAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalStudents) 
    : 0;
  const highestScore = totalStudents > 0 
    ? Math.max(...examAttempts.map(a => a.score || 0)) 
    : 0;

  const togglePublish = () => {
    const newVal = !exam.areResultsPublished;
    publishResults(exam.id, newVal);
  };

  const handleOpenReview = (attempt: StudentAttempt) => {
    setSelectedAttempt(attempt);
    setManualScore(attempt.score?.toString() || '0');
  };

const handleUpdateScore = () => {
    if (selectedAttempt) {
      const scoreNum = parseInt(manualScore) || 0;
      
      // Update score via context
      updateScore(exam.id, selectedAttempt.studentName, scoreNum);
      setSelectedAttempt(null);
      
      // Update lastUpdate timestamp
      setLastUpdate(new Date());
    }
  };

  // Export functions
  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN HASIL UJIAN', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(appConfig.schoolName || 'SDN Utan Panjang 03', pageWidth / 2, 22, { align: 'center' });
    
    // Exam Info
    doc.setFontSize(10);
    doc.text(`Judul Ujian: ${exam.title}`, 14, 30);
    doc.text(`Mata Pelajaran: ${exam.subject || '-'}`, 14, 35);
    doc.text(`Kelas: ${exam.classGrade}`, 14, 40);
    doc.text(`Tanggal: ${exam.date}`, 14, 45);
    doc.text(`Total Siswa: ${totalStudents}`, 14, 50);
    doc.text(`Rata-rata Nilai: ${averageScore}`, 14, 55);
    doc.text(`Nilai Tertinggi: ${highestScore}`, 14, 60);
    
    const exportDate = new Date().toLocaleString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Dicetak: ${exportDate}`, pageWidth - 14, 30, { align: 'right' });
    
    // Table data
    const tableData = examAttempts.map((attempt, idx) => [
      idx + 1,
      attempt.studentName,
      attempt.score || 0,
      attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('id-ID') : '-',
      attempt.violationCount || 0
    ]);
    
    // Auto table
    autoTable(doc, {
      head: [['No', 'Nama Siswa', 'Nilai', 'Waktu Submit', 'Pelanggaran']],
      body: tableData,
      startY: 65,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        halign: 'left'
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 60 },
        2: { halign: 'center', cellWidth: 25 },
        3: { cellWidth: 50 },
        4: { halign: 'center', cellWidth: 30 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 65;
    if (finalY < pageHeight - 20) {
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Dicetak dari ${appConfig.appName || 'TKA SDNUP03'} - ${appConfig.schoolName || 'SDN Utan Panjang 03'}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    const fileName = `Hasil_Ujian_${exam.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    setShowExportMenu(false);
  };

  const exportToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['LAPORAN HASIL UJIAN'],
      [''],
      ['Judul Ujian', exam.title],
      ['Mata Pelajaran', exam.subject || '-'],
      ['Kelas', exam.classGrade],
      ['Tanggal', exam.date],
      [''],
      ['STATISTIK'],
      ['Total Siswa', totalStudents],
      ['Rata-rata Nilai', averageScore],
      ['Nilai Tertinggi', highestScore],
      ['Nilai Terendah', totalStudents > 0 ? Math.min(...examAttempts.map(a => a.score || 0)) : 0],
      [''],
      ['Dicetak', new Date().toLocaleString('id-ID')]
    ];
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Style summary sheet
    wsSummary['!cols'] = [
      { wch: 20 },
      { wch: 30 }
    ];
    
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
    
    // Results sheet
    const resultsData = [
      ['No', 'Nama Ujian', 'Nama Siswa', 'Nilai', 'Waktu Submit', 'Pelanggaran']
    ];
    
    examAttempts.forEach((attempt, idx) => {
      resultsData.push([
        idx + 1,
        attempt.examTitle || exam.title,
        attempt.studentName,
        attempt.score || 0,
        attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('id-ID') : '-',
        attempt.violationCount || 0
      ]);
    });
    
    const wsResults = XLSX.utils.aoa_to_sheet(resultsData);
    
    // Style results sheet
    wsResults['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 25 },
      { wch: 10 },
      { wch: 25 },
      { wch: 12 }
    ];
    
    // Freeze first row
    wsResults['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
    
    XLSX.utils.book_append_sheet(wb, wsResults, 'Hasil Ujian');
    
    // Save file
    const fileName = `Hasil_Ujian_${exam.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    setShowExportMenu(false);
  };

  const exportToCSV = () => {
    const headers = ['No', 'Nama Ujian', 'Nama Siswa', 'Nilai', 'Waktu Submit', 'Pelanggaran'];
    const rows = examAttempts.map((attempt, idx) => [
      idx + 1,
      attempt.examTitle || exam.title,
      attempt.studentName,
      attempt.score || 0,
      attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('id-ID') : '-',
      attempt.violationCount || 0
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Hasil_Ujian_${exam.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  // Helper to render student's answer for specific question type
  const renderAnswer = (qId: string, type: string, correctKey?: string, matchingPairs?: any[]) => {
    if (!selectedAttempt) return null;
    const ans = selectedAttempt.answers[qId] || '-';
    
    if (type === 'PILIHAN_GANDA' || type === 'BENAR_SALAH') {
        const isCorrect = ans === correctKey;
        return (
            <div className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                Jawab: {ans} {isCorrect ? '✅' : `❌ (Kunci: ${correctKey})`}
            </div>
        );
    }
    
    if (type === 'PILIHAN_GANDA_KOMPLEKS') {
        try {
            const correctArray: string[] = correctKey ? JSON.parse(correctKey) : [];
            const studentArray: string[] = ans ? JSON.parse(ans) : [];
            
            // Sort for comparison
            const sortedCorrect = [...correctArray].sort();
            const sortedStudent = [...studentArray].sort();
            const isCorrect = sortedCorrect.length === sortedStudent.length &&
                sortedCorrect.every((val, idx) => val === sortedStudent[idx]);
            
            return (
                <div className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                    <div>Jawab: [{studentArray.join(', ')}]</div>
                    <div className="text-sm mt-1">
                        {isCorrect ? '✅ Benar Semua' : `❌ Kunci: [${correctArray.join(', ')}]`}
                    </div>
                </div>
            );
        } catch (e) {
            return (
                <div className="font-bold text-red-500">
                    Jawab: {ans} ❌ (Format tidak valid)
                </div>
            );
        }
    }
    
    if (type === 'MENJODOHKAN') {
        return <div className="text-sm italic text-black" style={{ opacity: 0.8 }}>Jawaban Menjodohkan (Cek JSON: {ans.substring(0,20)}...)</div>;
    }
    
    if (type === 'URAIAN') {
        return (
            <div className="bg-yellow-50 p-2 border border-black/20 mt-1">
                <p className="font-medium whitespace-pre-wrap">{ans}</p>
            </div>
        );
    }
    
    // Default
    return <div className="font-bold">{ans}</div>;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft />
            </Button>
            <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-black truncate">Hasil: {exam.title}</h2>
            <p className="text-xs sm:text-sm font-bold text-black truncate">
              {exam.subject && <span className="text-[#4F46E5] font-black">{exam.subject} - </span>}
              <span className="text-black">{exam.classGrade} • {exam.date}</span>
            </p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm font-bold text-black">
                Status: {exam.areResultsPublished ? <span className="text-green-600 font-black">PUBLIK</span> : <span className="text-red-500 font-black">HIDDEN</span>}
            </span>
            
            {/* Real-time Indicator */}
            {exam.status === 'DIBUKA' && (
              <div className="flex items-center gap-2 bg-[#E0F2F1] px-2 py-1 border border-black/20 rounded">
                <Activity className="w-3 h-3 text-[#4F46E5] animate-pulse" />
                <span className="text-xs font-bold">
                  Real-time: {isRealTimeEnabled ? 'ON' : 'OFF'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
                  className="h-5 px-1 text-xs font-bold"
                  title={isRealTimeEnabled ? 'Disable real-time updates' : 'Enable real-time updates'}
                >
                  {isRealTimeEnabled ? '⏸' : '▶'}
                </Button>
              </div>
            )}
            
            <span className="text-xs text-gray-500">
              Update: {lastUpdate.toLocaleTimeString('id-ID')}
            </span>
            <Button 
                variant={exam.areResultsPublished ? 'destructive' : 'secondary'} 
                size="sm"
                onClick={togglePublish}
                className="flex items-center gap-1 sm:gap-2 transition-all active:scale-95 text-xs sm:text-sm"
            >
                {exam.areResultsPublished ? <><EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Sembunyikan</span><span className="sm:hidden">Hide</span></> : <><Share2 className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Umumkan Nilai</span><span className="sm:hidden">Publish</span></>}
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className={`bg-white border-2 sm:border-4 border-black p-2 sm:p-4 transition-all ${showNewDataIndicator ? 'ring-4 ring-[#4F46E5] ring-offset-2 animate-pulse' : ''}`} style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
            <div>
              <div className="flex items-center gap-1">
                <p className="font-bold text-[10px] sm:text-sm mb-0.5 sm:mb-1" style={{ color: '#000000', fontWeight: 'bold' }}>Siswa</p>
                {showNewDataIndicator && (
                  <span className="text-xs bg-[#4F46E5] text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                    NEW!
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-4xl font-black" style={{ color: '#000000', fontWeight: '900' }}>{totalStudents}</h3>
            </div>
            <User className="w-5 h-5 sm:w-8 sm:h-8 hidden sm:block" style={{ color: '#000000', opacity: 0.7 }} />
          </div>
        </Card>
        
        <Card className="bg-[#51CF66] border-2 sm:border-4 border-black p-2 sm:p-4" style={{ backgroundColor: '#51CF66' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
            <div>
              <p className="font-bold text-[10px] sm:text-sm mb-0.5 sm:mb-1" style={{ color: '#000000', fontWeight: 'bold' }}>Rata²</p>
              <h3 className="text-xl sm:text-4xl font-black" style={{ color: '#000000', fontWeight: '900' }}>{averageScore}</h3>
            </div>
            <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 hidden sm:block" style={{ color: '#000000', opacity: 0.7 }} />
          </div>
        </Card>

        <Card className="bg-[#FFD43B] border-2 sm:border-4 border-black p-2 sm:p-4" style={{ backgroundColor: '#FFD43B' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
            <div>
              <p className="font-bold text-[10px] sm:text-sm mb-0.5 sm:mb-1" style={{ color: '#000000', fontWeight: 'bold' }}>Max</p>
              <h3 className="text-xl sm:text-4xl font-black" style={{ color: '#000000', fontWeight: '900' }}>{highestScore}</h3>
            </div>
            <Award className="w-5 h-5 sm:w-8 sm:h-8 hidden sm:block" style={{ color: '#000000', opacity: 0.7 }} />
          </div>
        </Card>
      </div>

      {/* Export Button */}
      {examAttempts.length > 0 && (
        <div className="flex justify-end relative">
          <div className="relative">
            <Button
              variant="secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Data
              <ChevronDown className="w-4 h-4" />
            </Button>
            
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportMenu(false)}
                />
                <Card className="absolute right-0 top-full mt-2 z-20 min-w-[200px] border-4 border-black shadow-[8px_8px_0px_0px_#000] p-2">
                  <div className="space-y-1">
                    <Button
                      variant="outline"
                      onClick={exportToPDF}
                      className="w-full justify-start gap-2 text-left"
                    >
                      <FileTextIcon className="w-4 h-4" />
                      Export ke PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportToExcel}
                      className="w-full justify-start gap-2 text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export ke Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportToCSV}
                      className="w-full justify-start gap-2 text-left"
                    >
                      <FileText className="w-4 h-4" />
                      Export ke CSV
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* Results Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b-4 border-black bg-gray-100 flex justify-between items-center">
           <h3 className="font-black text-lg">Daftar Pengumpulan</h3>
           <Badge variant="default">{totalStudents} Data</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-3 font-bold text-sm">No</th>
                <th className="p-3 font-bold text-sm">Nama Siswa</th>
                <th className="p-3 font-bold text-sm">Waktu Submit</th>
                <th className="p-3 font-bold text-sm text-right">Nilai Akhir</th>
                <th className="p-3 font-bold text-sm text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10">
              {examAttempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-bold text-black" style={{ opacity: 0.7 }}>
                    Belum ada siswa yang mengumpulkan ujian ini.
                  </td>
                </tr>
              ) : (
                examAttempts.map((attempt, idx) => (
                  <tr key={idx} className="hover:bg-yellow-50 transition-colors font-medium">
                    <td className="p-3 border-r-2 border-black/10 w-12 text-center">{idx + 1}</td>
                    <td className="p-3 border-r-2 border-black/10">{attempt.studentName}</td>
                    <td className="p-3 border-r-2 border-black/10 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleTimeString('id-ID') : '-'}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`inline-block px-2 py-1 border-2 border-black font-black ${
                        (attempt.score || 0) >= 75 ? 'bg-[#51CF66]' : 'bg-[#FF6B6B] text-white'
                      }`}>
                        {attempt.score}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                        <Button variant="outline" size="sm" onClick={() => handleOpenReview(attempt)} className="text-xs h-8">
                            <FileText className="w-3 h-3 mr-1" /> Periksa / Edit
                        </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* REVIEW & GRADING MODAL */}
      <DialogOverlay isOpen={!!selectedAttempt} onClose={() => setSelectedAttempt(null)}>
         {selectedAttempt && (
             <div className="max-h-[80vh] flex flex-col">
                 <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-4">
                    <div>
                        <h3 className="font-black text-xl">{selectedAttempt.studentName}</h3>
                        <p className="text-sm font-bold text-black" style={{ opacity: 0.8 }}>Review Jawaban</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAttempt(null)}>
                        <X />
                    </Button>
                 </div>

                 {/* Questions Review List */}
                 <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                    {exam.questions.map((q, idx) => (
                        <div key={q.id} className="border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_#ccc]">
                            <div className="flex justify-between mb-2">
                                <Badge variant={q.type === 'URAIAN' ? 'warning' : 'default'}>{idx + 1}. {q.type}</Badge>
                                {q.type === 'URAIAN' && <span className="text-xs font-bold text-red-500 animate-pulse">PERLU CEK MANUAL</span>}
                            </div>
                            <p className="text-sm font-bold mb-2 text-black break-words" style={{ opacity: 0.9, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{q.text}</p>
                            
                            {/* Render Answer Logic */}
                            <div className="bg-gray-50 p-2 border border-black/10 text-sm">
                                {renderAnswer(q.id, q.type, q.correctKey, q.matchingPairs)}
                            </div>
                        </div>
                    ))}
                 </div>

                 {/* Manual Grading Input */}
                 <div className="bg-[#4F46E5] p-4 text-white border-2 border-black shadow-[4px_4px_0px_0px_#000]">
                    <label className="block font-bold text-sm mb-1 uppercase tracking-wider">Update Nilai Akhir</label>
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            value={manualScore} 
                            onChange={(e) => setManualScore(e.target.value)}
                            className="text-black font-black text-xl w-24 text-center"
                        />
                        <Button variant="secondary" className="flex-1" onClick={handleUpdateScore}>
                            <Check className="w-5 h-5 mr-2" /> Simpan Nilai Baru
                        </Button>
                    </div>
                    <p className="text-[10px] mt-2 text-white" style={{ opacity: 0.9 }}>
                        *Masukkan nilai total (0-100) setelah memeriksa jawaban esai. Nilai ini akan menggantikan nilai otomatis sistem.
                    </p>
                 </div>
             </div>
         )}
      </DialogOverlay>

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        variant="warning"
      />
    </div>
  );
};
