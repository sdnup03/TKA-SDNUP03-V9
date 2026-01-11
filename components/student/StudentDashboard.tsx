
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card, Alert, Badge } from '../ui/brutalist';
import { Timetable } from './Timetable';
import { ExamCalendar } from './ExamCalendar';
import { NoiseIndicator } from '../common/NoiseIndicator';
import { Clock } from '../common/Clock';
import { LogIn, Calendar, List, Lock } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { exams, enterExam, attempts, currentUser } = useApp();
  const [tokenInput, setTokenInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState<'TIMETABLE' | 'CALENDAR'>('TIMETABLE');

  // 1. FILTER EXAMS BY CLASS ID
  const studentExams = exams.filter(e => {
    if (currentUser?.classId) {
      // Handle comma-separated classes (e.g. "VIII A, VIII B")
      const targetClasses = e.classGrade.split(',').map(c => c.trim().toLowerCase());
      return targetClasses.includes(currentUser.classId.toLowerCase());
    }
    return true; 
  });

  // 2. FILTER ATTEMPTS BY CURRENT USER
  const myAttempts = attempts.filter(a => a.studentName === currentUser?.name);

  // Helper to get first name
  const firstName = currentUser?.name.split(' ')[0] || 'Student';

  const handleEnterExam = () => {
    setErrorMsg('');
    const exam = exams.find(e => e.token.toUpperCase() === tokenInput.toUpperCase());

    if (!exam) {
      setErrorMsg('Token salah. Cek lagi punya guru.');
      return;
    }

    // Validate Class Assignment
    if (currentUser?.classId) {
        const targetClasses = exam.classGrade.split(',').map(c => c.trim().toLowerCase());
        const studentClass = currentUser.classId.toLowerCase();
        
        if (!targetClasses.includes(studentClass)) {
            setErrorMsg(`Token bener, tapi ini buat kelas ${exam.classGrade}, bukan kelas kamu (${currentUser.classId}).`);
            return;
        }
    }

    if (exam.status !== 'DIBUKA') {
      setErrorMsg('Ujian belum dibuka atau udah ditutup.');
      return;
    }

    // Check if already submitted (FIXED: Only check MY attempts)
    const hasAttempt = myAttempts.find(a => a.examId === exam.id);
    if (hasAttempt) {
      setErrorMsg('Kamu udah ngerjain ini.');
      return;
    }

    enterExam(exam.id);
  };

  // Identify missed exams (Closed exams for THIS CLASS with no attempt by THIS STUDENT)
  const missedExams = studentExams.filter(e => 
    e.status === 'DITUTUP' && !myAttempts.find(a => a.examId === e.id)
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Greeting Section - Enhanced with better visual hierarchy */}
      <div className="flex flex-col gap-2 mb-4 overflow-hidden bg-[#4F46E5] p-4 sm:p-6 border-2 border-black shadow-[6px_6px_0px_0px_#000] text-white">
         <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase italic tracking-tighter flex items-center gap-2 animate-in fade-in slide-in-from-left duration-500">
            Yo, {firstName}! 👋
         </h1>
         <p className="font-bold text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base flex-wrap animate-in fade-in slide-in-from-left duration-700">
            Siap bantai ujian bareng anak
            <span className="bg-white text-[#4F46E5] px-2 sm:px-3 py-1 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transform -rotate-2 font-black text-[10px] sm:text-xs md:text-sm whitespace-nowrap hover:rotate-0 transition-transform duration-200">
               {currentUser?.classId || 'KELAS ???'}
            </span>
            ? Gas! 🚀
         </p>
      </div>

      {/* Top Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Clock />
        <NoiseIndicator />
      </div>

      {/* Token Entry - Hero Section */}
      <Card className="bg-[#4F46E5] text-white border-black shadow-[6px_6px_0px_0px_#000] hover:shadow-[8px_8px_0px_0px_#000] transition-all duration-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 p-2 border-2 border-white/30 rounded-sm">
            <LogIn className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Join Ruang Ujian</h2>
            <p className="text-white/90 font-medium text-sm">Masukin token dari guru biar bisa akses soal</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Input 
            placeholder="MASUKIN TOKEN..." 
            className="text-lg h-12 font-bold tracking-widest placeholder:normal-case text-black"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full flex justify-center items-center gap-2"
            onClick={handleEnterExam}
          >
            <LogIn className="w-5 h-5" />
            Gas Masuk
          </Button>
        </div>

        {errorMsg && (
          <div className="mt-4 bg-[#FF6B6B] border-2 border-black p-2 text-white font-bold text-sm shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
            Info: {errorMsg}
          </div>
        )}
      </Card>

      {/* Main Content Area with Tabs */}
      <div>
        {/* Fix: Overflow-x-auto for tabs to prevent breaking on small screens */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button 
            size="sm" 
            variant={viewMode === 'TIMETABLE' ? 'primary' : 'outline'}
            onClick={() => setViewMode('TIMETABLE')}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <List className="w-4 h-4" /> Jadwal Kelas {currentUser?.classId}
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === 'CALENDAR' ? 'primary' : 'outline'}
            onClick={() => setViewMode('CALENDAR')}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Calendar className="w-4 h-4" /> Kalender
          </Button>
        </div>

        {studentExams.length === 0 ? (
            <Card className="text-center py-8 opacity-60">
                <p className="font-bold">Ga ada jadwal ujian buat kamu.</p>
            </Card>
        ) : (
             viewMode === 'TIMETABLE' ? (
                 <Timetable />
             ) : (
                 <ExamCalendar />
             )
        )}
      </div>
        
      {/* History & Status */}
      <div className="mt-8">
          <h3 className="font-black text-lg sm:text-xl mb-3 flex items-center gap-2 flex-wrap">
            <span className="bg-black text-white px-2 py-0.5 text-xs sm:text-sm">HISTORY</span> Riwayat
          </h3>
          <div className="space-y-3">
            {/* 1. Submitted Exams (Iterate ONLY over myAttempts) */}
            {myAttempts.map((a, i) => {
               const exam = exams.find(e => e.id === a.examId);
               // FIX: Use strict check for true to avoid undefined/falsy issues causing flickering
               const isPublished = exam?.areResultsPublished === true;
               
               return (
                <Card key={`attempt-${i}`} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 bg-white gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-sm uppercase text-gray-500">Udah Kelar</div>
                        <div className="font-black text-base sm:text-lg truncate">{exam ? exam.title : `Ujian #${a.examId}`}</div>
                    </div>
                    {isPublished ? (
                         <span className={`font-black text-lg sm:text-xl px-2 sm:px-3 py-1 border-2 border-black rounded flex-shrink-0 ${
                             (a.score || 0) >= 75 ? 'bg-[#51CF66]' : 'bg-[#FF6B6B] text-white'
                         }`}>
                             Nilai: {a.score}
                         </span>
                    ) : (
                        <div className="bg-gray-200 border-2 border-black px-2 sm:px-3 py-1 flex items-center gap-1 sm:gap-2 font-bold text-xs sm:text-sm flex-shrink-0">
                            <Lock className="w-4 h-4" /> Nunggu Hasil
                        </div>
                    )}
                </Card>
               );
            })}

            {/* 2. Missed Exams */}
            {missedExams.map((ex, i) => (
                <Card key={`missed-${i}`} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 bg-red-50 border-red-200 gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-sm uppercase text-red-500">Ujian Ditutup</div>
                        <div className="font-black text-base sm:text-lg opacity-60 truncate">{ex.title}</div>
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-red-600 bg-red-100 border border-red-300 px-2 py-1 rounded flex-shrink-0 whitespace-nowrap">
                        Skip / Ga Ngerjain
                    </span>
                </Card>
            ))}

            {myAttempts.length === 0 && missedExams.length === 0 && (
              <p className="text-gray-500 italic">History kamu masih kosong.</p>
            )}
          </div>
      </div>
    </div>
  );
};
