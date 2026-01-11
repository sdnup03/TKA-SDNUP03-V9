
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Exam } from '../../types';
import { Button, Card, Badge, ConfirmDialog } from '../ui/brutalist';
import { ArrowLeft, Activity, User, CheckCircle, RotateCcw } from 'lucide-react';

interface LiveMonitorProps {
  exam: Exam;
  onBack: () => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ exam, onBack }) => {
  const { liveProgress, resetStudentAttempt } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [studentToReset, setStudentToReset] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Filter progress relevant to this exam
  const examProgress = liveProgress.filter(p => p.examId === exam.id);

  const calculatePercentage = (answered: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((answered / total) * 100);
  };

  const getStatusColor = (status: string, lastActive: string) => {
    if (status === 'SUBMITTED') return 'bg-[#51CF66] text-black'; // Hijau
    
    // Check if idle (> 5 min inactive)
    const now = new Date().getTime();
    const last = new Date(lastActive).getTime();
    if (now - last > 5 * 60 * 1000) return 'bg-gray-300 text-black'; // Idle

    return 'bg-[#4F46E5] text-white animate-pulse'; // Active
  };

  const handleReset = (studentName: string) => {
    setStudentToReset(studentName);
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    if (!studentToReset) return;
    
    setIsResetting(true);
    try {
      // Small delay for loading feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await resetStudentAttempt(exam.id, studentToReset);
      setShowResetConfirm(false);
      setStudentToReset(null);
    } catch (error) {
      console.error('Error resetting student:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black flex items-center gap-2">
                <Activity className="w-5 h-5 sm:w-7 sm:h-7 text-red-500 flex-shrink-0" /> Live Monitor
              </h2>
              <p className="text-xs sm:text-sm opacity-70 font-bold mt-0.5 sm:mt-1 truncate max-w-[200px] sm:max-w-none">{exam.title}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-[10px] sm:text-xs">
            Auto-Update: 5s
          </Badge>
          <Badge variant="default" className="text-[10px] sm:text-xs">
            {examProgress.length} Siswa
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {examProgress.length === 0 ? (
           <div className="col-span-full py-16 text-center border-4 border-dashed border-black/20 rounded-lg bg-gray-50">
             <div className="flex flex-col items-center gap-3">
               <Activity className="w-12 h-12 text-gray-400" />
               <p className="font-black text-gray-600 text-lg">Belum ada aktivitas siswa terdeteksi</p>
               <p className="text-sm text-gray-500 font-bold max-w-md">
                 Pastikan siswa sudah masuk menggunakan Token ujian: <span className="font-black text-black">{exam.token}</span>
               </p>
             </div>
           </div>
        ) : (
            examProgress.map((student, idx) => {
                const percent = calculatePercentage(student.answeredCount, student.totalQuestions);
                const statusColor = getStatusColor(student.status, student.lastActive);
                const isSubmitted = student.status === 'SUBMITTED';
                
                return (
                    <Card key={idx} className={`relative overflow-hidden transition-all duration-300 group ${isSubmitted ? 'ring-2 ring-[#51CF66] ring-offset-2' : ''}`}>
                        {/* HEADER SECTION */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`p-2.5 rounded border-2 border-black ${statusColor} flex-shrink-0`}>
                                   <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-base leading-tight truncate">{student.studentName}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {isSubmitted ? (
                                            <Badge variant="success" className="text-xs px-2 py-0.5 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Selesai
                                            </Badge>
                                        ) : (
                                            <span className="text-xs font-bold opacity-60">
                                                {new Date(student.lastActive).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Reset Button */}
                            {!isSubmitted && (
                                <Button 
                                    size="icon" 
                                    variant="destructive" 
                                    className="w-8 h-8 flex-shrink-0"
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation(); 
                                        handleReset(student.studentName); 
                                    }}
                                    title="Reset Login / Kick"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        {/* Progress Bar Container */}
                        <div className="mb-3">
                            <div className="flex justify-between text-xs font-black mb-1.5">
                                <span className="text-gray-700">{student.answeredCount} / {student.totalQuestions} Soal</span>
                                <span className="font-black">{percent}%</span>
                            </div>
                            <div className="h-3 w-full bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ease-out ${isSubmitted ? 'bg-[#51CF66]' : 'bg-[#FFD43B]'}`} 
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>

                        {/* Violation Badge */}
                        {student.violationCount && student.violationCount > 0 && (
                            <div className="mb-2">
                                <Badge variant="danger" className="text-xs px-2 py-1">
                                    ⚠️ {student.violationCount}x Pelanggaran
                                </Badge>
                            </div>
                        )}

                        {/* Submitted Actions */}
                        {isSubmitted && (
                            <div className="pt-2 border-t-2 border-gray-200">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full text-xs"
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleReset(student.studentName); 
                                    }}
                                >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reset / Ulangi
                                </Button>
                            </div>
                        )}
                    </Card>
                );
            })
        )}
      </div>

      {examProgress.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="text-sm font-bold text-yellow-900">
            ℹ️ <span className="ml-1">Live Monitor memperbarui data setiap 5 detik dari database.</span>
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => {
          if (!isResetting) {
            setShowResetConfirm(false);
            setStudentToReset(null);
          }
        }}
        onConfirm={confirmReset}
        title="Reset Login Siswa?"
        message={studentToReset ? `Yakin reset login untuk ${studentToReset}? Data jawaban akan dihapus permanen dan siswa harus login ulang.` : ''}
        variant="warning"
        confirmText="Ya, Reset"
        cancelText="Batal"
        isLoading={isResetting}
        keepOpenOnConfirm={true}
        loadingText="Mereset Login Siswa..."
        loadingSubtext="Mohon tunggu, data sedang dihapus"
      />
    </div>
  );
};

