
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Card, Badge, ConfirmDialog, AlertDialog, DropdownMenu, DropdownItem, DropdownSeparator } from '../ui/brutalist';
import { Plus, Users, Settings, Volume2, VolumeX, AlertTriangle, Eye, EyeOff, Edit, FileText, Trash2, BarChart3, RotateCcw, Activity, LineChart, MoreVertical, Lock, Unlock } from 'lucide-react';
import { ExamForm } from './ExamForm';
import { QuestionManager } from './QuestionManager';
import { ExamResults } from './ExamResults';
import { LiveMonitor } from './LiveMonitor';
import { ExamAnalysis } from './ExamAnalysis';
import { ExamComparison } from './ExamComparison';
import { Exam } from '../../types';

type ViewState = 'LIST' | 'FORM' | 'QUESTIONS' | 'RESULTS' | 'LIVE' | 'ANALYSIS' | 'COMPARISON';

export const TeacherDashboard: React.FC = () => {
  const { exams, noiseLevel, setNoiseLevel, toggleExamStatus, addExam, updateExam, deleteExam, resetSystem, analyzeExam, isAnalyzing } = useApp();
  
  const [view, setView] = useState<ViewState>('LIST');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedExamsForComparison, setSelectedExamsForComparison] = useState<Set<string>>(new Set());
  
  // Custom dialogs for analysis
  const [showAnalysisConfirm, setShowAnalysisConfirm] = useState(false);
  const [examToAnalyze, setExamToAnalyze] = useState<Exam | null>(null);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState<{ title: string; message: string }>({ title: '', message: '' });
  
  // Loading states for actions
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleCreate = () => {
    setSelectedExam(null);
    setView('FORM');
  };

  const handleEdit = (exam: Exam) => {
    setSelectedExam(exam);
    setView('FORM');
  };

  const handleManageQuestions = (exam: Exam) => {
    setSelectedExam(exam);
    setView('QUESTIONS');
  };

  const handleViewResults = (exam: Exam) => {
    setSelectedExam(exam);
    setView('RESULTS');
  };

  const handleLiveMonitor = (exam: Exam) => {
    setSelectedExam(exam);
    setView('LIVE');
  };

  const handleAnalyzeExam = async (exam: Exam) => {
    if (isAnalyzing) return;
    
    // Check if exam has results published
    if (!exam.areResultsPublished) {
      setErrorMessage({
        title: 'Tidak Dapat Analisis',
        message: 'Hasil ujian belum dipublish. Publish hasil dulu sebelum melakukan analisis soal.'
      });
      setShowErrorAlert(true);
      return;
    }
    
    // Show confirmation dialog
    setExamToAnalyze(exam);
    setShowAnalysisConfirm(true);
  };

  const confirmAnalyzeExam = async () => {
    if (!examToAnalyze) return;
    
    // DON'T close dialog yet - let loading state show
    // setShowAnalysisConfirm(false); ❌
    
    try {
      const result = await analyzeExam(examToAnalyze.id);
      
      // Close dialog after analysis completes
      setShowAnalysisConfirm(false);
      
      // Auto redirect ke page analysis setelah sukses
      if (result.success) {
        setSelectedExam(examToAnalyze);
        setView('ANALYSIS');
      }
      
      setExamToAnalyze(null);
    } catch (error) {
      // Close dialog on error too
      setShowAnalysisConfirm(false);
      setExamToAnalyze(null);
    }
  };

  const handleViewAnalysis = (exam: Exam) => {
    setSelectedExam(exam);
    setView('ANALYSIS');
  };

  const handleSaveExam = async (exam: Exam) => {
    try {
      if (selectedExam) {
        await updateExam(exam);
      } else {
        await addExam(exam);
      }
      setView('LIST');
    } catch (error) {
      console.error('Error saving exam:', error);
      // Error already handled in context with alert
      throw error; // Re-throw untuk ExamForm handle
    }
  };

  const handleDelete = (id: string) => {
    setExamToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!examToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteExam(examToDelete);
      setShowDeleteConfirm(false);
      setExamToDelete(null);
    } catch (error) {
      console.error('Error deleting exam:', error);
      // Error already shown by context
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setIsResetting(true);
    try {
      await resetSystem();
      // Will reload page on success
    } catch (error) {
      console.error('Error resetting system:', error);
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes('T') || timeStr.includes('Z')) {
      try {
        const date = new Date(timeStr);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
      } catch (e) {
        return timeStr.slice(0, 5);
      }
    }
    return timeStr.slice(0, 5);
  };

  // Smart Primary Action Logic
  const getPrimaryAction = (exam: Exam) => {
    // Check if analysis exists for this exam
    const hasAnalysis = exam.areResultsPublished; // Simplified, ideally check questionAnalysis state
    
    if (exam.status === 'DIBUKA') {
      return {
        label: 'Monitor Live',
        icon: <Activity className="w-4 h-4" />,
        onClick: () => handleLiveMonitor(exam),
        variant: 'primary' as const,
        className: 'animate-pulse'
      };
    }
    
    if (exam.status === 'DITUTUP' && exam.areResultsPublished && hasAnalysis) {
      return {
        label: 'Detail Analisis',
        icon: <LineChart className="w-4 h-4" />,
        onClick: () => handleViewAnalysis(exam),
        variant: 'secondary' as const,
        className: ''
      };
    }
    
    if (exam.status === 'DITUTUP' && exam.areResultsPublished && !hasAnalysis) {
      return {
        label: 'Analisis Soal',
        icon: <LineChart className="w-4 h-4" />,
        onClick: () => handleAnalyzeExam(exam),
        variant: 'secondary' as const,
        className: ''
      };
    }
    
    if (exam.status === 'DITUTUP' && !exam.areResultsPublished) {
      return {
        label: 'Lihat Hasil',
        icon: <BarChart3 className="w-4 h-4" />,
        onClick: () => handleViewResults(exam),
        variant: 'primary' as const,
        className: ''
      };
    }
    
    // Default: Manage Questions (for DRAFT)
    return {
      label: 'Kelola Soal',
      icon: <FileText className="w-4 h-4" />,
      onClick: () => handleManageQuestions(exam),
      variant: 'primary' as const,
      className: ''
    };
  };

  // Render Sub-Components based on View State
  if (view === 'FORM') {
    return <ExamForm initialData={selectedExam} onSave={handleSaveExam} onCancel={() => setView('LIST')} />;
  }

  if (view === 'QUESTIONS' && selectedExam) {
    // Ensure context is available before rendering QuestionManager
    try {
      return (
        <QuestionManager 
          exam={selectedExam} 
          onUpdateExam={updateExam} 
          onBack={() => setView('LIST')} 
        />
      );
    } catch (error) {
      console.error('Error rendering QuestionManager:', error);
      return (
        <div className="p-8 text-center">
          <p className="font-bold text-red-600">Error loading question manager</p>
          <Button onClick={() => setView('LIST')} className="mt-4">Kembali</Button>
        </div>
      );
    }
  }

  if (view === 'RESULTS' && selectedExam) {
    return <ExamResults exam={selectedExam} onBack={() => setView('LIST')} />;
  }

  if (view === 'LIVE' && selectedExam) {
    return <LiveMonitor exam={selectedExam} onBack={() => setView('LIST')} />;
  }

  if (view === 'ANALYSIS' && selectedExam) {
    return <ExamAnalysis exam={selectedExam} onBack={() => setView('LIST')} />;
  }

  if (view === 'COMPARISON' && selectedExamsForComparison.size > 0) {
    return <ExamComparison examIds={Array.from(selectedExamsForComparison)} onBack={() => {
      setView('LIST');
      setComparisonMode(false);
      setSelectedExamsForComparison(new Set());
    }} />;
  }

  // Default List View
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Noise Control Center */}
      <Card className="bg-black text-white border-gray-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
           <h2 className="text-base sm:text-xl font-black flex items-center gap-2">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" /> <span className="truncate">Kontrol Kelas</span>
           </h2>
           <Button variant="destructive" size="sm" onClick={handleReset} title="Reset semua data" className="flex-shrink-0 text-xs sm:text-sm">
              <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> <span className="hidden xs:inline">Reset</span><span className="xs:hidden">R</span>
           </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Button 
            variant={noiseLevel === 'TENANG' ? 'primary' : 'outline'}
            className={`text-xs sm:text-sm px-1 sm:px-4 py-2 ${noiseLevel === 'TENANG' ? 'bg-[#51CF66] text-black border-white' : 'bg-transparent text-white border-white'}`}
            onClick={() => setNoiseLevel('TENANG')}
            title="Setel status kelas menjadi Tenang"
          >
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1 block mx-auto" /> <span className="hidden sm:inline">Tenang</span><span className="sm:hidden">OK</span>
          </Button>
          <Button 
            variant={noiseLevel === 'WARNING' ? 'primary' : 'outline'}
            className={`text-xs sm:text-sm px-1 sm:px-4 py-2 ${noiseLevel === 'WARNING' ? 'bg-[#FFD43B] text-black border-white' : 'bg-transparent text-white border-white'}`}
            onClick={() => setNoiseLevel('WARNING')}
            title="Setel status kelas menjadi Warning (Perhatian)"
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1 block mx-auto" /> <span className="hidden sm:inline">Warning</span><span className="sm:hidden">!</span>
          </Button>
          <Button 
            variant={noiseLevel === 'BERISIK' ? 'primary' : 'outline'}
            className={`text-xs sm:text-sm px-1 sm:px-4 py-2 ${noiseLevel === 'BERISIK' ? 'bg-[#FF6B6B] text-black border-white' : 'bg-transparent text-white border-white'}`}
            onClick={() => setNoiseLevel('BERISIK')}
            title="Setel status kelas menjadi Berisik"
          >
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1 block mx-auto" /> <span className="hidden sm:inline">Berisik</span><span className="sm:hidden">X</span>
          </Button>
        </div>
      </Card>

      {/* Exam Management */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-black">Daftar Ujian</h2>
          <div className="flex gap-2 flex-wrap">
            {comparisonMode ? (
              <>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => {
                    if (selectedExamsForComparison.size >= 2 && selectedExamsForComparison.size <= 3) {
                      setView('COMPARISON');
                    } else {
                      alert('Pilih 2-3 ujian untuk dibandingkan!');
                    }
                  }}
                  disabled={selectedExamsForComparison.size < 2}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" /> 
                  Bandingkan ({selectedExamsForComparison.size})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setComparisonMode(false);
                    setSelectedExamsForComparison(new Set());
                  }}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  Batal
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setComparisonMode(true)}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Mode Perbandingan</span><span className="sm:hidden">Compare</span>
                </Button>
                <Button variant="primary" size="sm" onClick={handleCreate} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Buat Ujian Baru</span><span className="sm:hidden">Buat</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-4 border-black bg-gray-100">
                {comparisonMode && (
                  <th className="p-4 font-black text-sm uppercase tracking-wider w-16">
                    <input 
                      type="checkbox"
                      className="w-4 h-4"
                      disabled
                    />
                  </th>
                )}
                <th className="p-4 font-black text-sm uppercase tracking-wider">Judul & Kelas</th>
                <th className="p-4 font-black text-sm uppercase tracking-wider">Waktu Pelaksanaan</th>
                <th className="p-4 font-black text-sm uppercase tracking-wider">Token</th>
                <th className="p-4 font-black text-sm uppercase tracking-wider">Status</th>
                {!comparisonMode && (
                  <th className="p-4 font-black text-sm uppercase tracking-wider text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center opacity-50 font-bold animate-in fade-in duration-500">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-12 h-12 opacity-30" />
                      <p>Belum ada data ujian. Silakan buat baru.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                exams.map((exam, idx) => (
                  <tr key={exam.id} className={`group hover:bg-[#FDFDF7] transition-all duration-200 animate-in fade-in slide-in-from-left ${
                    comparisonMode && selectedExamsForComparison.has(exam.id) ? 'bg-blue-50 ring-2 ring-[#4F46E5] ring-offset-1' : ''
                  }`} style={{ animationDelay: `${idx * 50}ms` }}>
                    {comparisonMode && (
                      <td className="p-4">
                        <input 
                          type="checkbox"
                          checked={selectedExamsForComparison.has(exam.id)}
                          onChange={() => {
                            const newSet = new Set(selectedExamsForComparison);
                            if (newSet.has(exam.id)) {
                              newSet.delete(exam.id);
                            } else {
                              if (newSet.size >= 3) {
                                alert('Maksimal 3 ujian untuk dibandingkan!');
                                return;
                              }
                              // Only allow analyzed exams
                              if (!exam.areResultsPublished) {
                                alert('Hanya ujian yang sudah dianalisis yang bisa dibandingkan!');
                                return;
                              }
                              newSet.add(exam.id);
                            }
                            setSelectedExamsForComparison(newSet);
                          }}
                          disabled={!exam.areResultsPublished && !selectedExamsForComparison.has(exam.id)}
                          className="w-5 h-5 accent-[#4F46E5] cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <div className="font-bold text-lg leading-tight">{exam.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {exam.subject && (
                          <span className="text-xs font-bold text-[#4F46E5] bg-[#E0F2F1] px-2 py-0.5 rounded border border-[#4F46E5]">
                            {exam.subject}
                          </span>
                        )}
                        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-1 rounded">{exam.classGrade}</span>
                      </div>
                      <div className="mt-1 text-xs opacity-70">{exam.questions.length} Soal</div>
                    </td>
                    <td className="p-4 text-sm font-medium">
                      <div className="font-bold text-black whitespace-nowrap">
                        {new Date(exam.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        {formatTime(exam.startTime)} - {formatTime(exam.endTime)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold bg-black text-white px-2 py-1 rounded text-sm tracking-widest">{exam.token}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={exam.status === 'DIBUKA' ? 'success' : exam.status === 'DITUTUP' ? 'danger' : 'default'}>
                        {exam.status}
                      </Badge>
                    </td>
                    {!comparisonMode && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {/* Smart Primary Action */}
                        {(() => {
                          const primaryAction = getPrimaryAction(exam);
                          return (
                            <Button 
                              variant={primaryAction.variant}
                              size="md"
                              onClick={primaryAction.onClick}
                              className={`flex items-center gap-2 ${primaryAction.className}`}
                              disabled={isAnalyzing}
                            >
                              {primaryAction.icon}
                              <span>{primaryAction.label}</span>
                            </Button>
                          );
                        })()}

                        {/* Actions Dropdown */}
                        <DropdownMenu
                          trigger={
                            <Button 
                              variant="outline"
                              size="icon"
                              className="h-10 w-10"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          }
                          align="right"
                        >
                          {/* View & Monitor Section */}
                          {exam.status !== 'DIBUKA' && (
                            <DropdownItem 
                              icon={<Activity className="w-4 h-4" />}
                              onClick={() => handleLiveMonitor(exam)}
                            >
                              Monitor Live
                            </DropdownItem>
                          )}
                          <DropdownItem 
                            icon={<BarChart3 className="w-4 h-4" />}
                            onClick={() => handleViewResults(exam)}
                          >
                            Lihat Hasil
                          </DropdownItem>
                          
                          {/* Analysis Section */}
                          {exam.areResultsPublished && (
                            <>
                              <DropdownSeparator />
                              <DropdownItem 
                                icon={<LineChart className="w-4 h-4" />}
                                onClick={() => handleAnalyzeExam(exam)}
                                disabled={isAnalyzing}
                              >
                                Analisis Soal
                              </DropdownItem>
                              <DropdownItem 
                                icon={<LineChart className="w-4 h-4" />}
                                onClick={() => handleViewAnalysis(exam)}
                              >
                                Detail Analisis
                              </DropdownItem>
                            </>
                          )}
                          
                          {/* Edit & Manage Section */}
                          <DropdownSeparator />
                          <DropdownItem 
                            icon={<FileText className="w-4 h-4" />}
                            onClick={() => handleManageQuestions(exam)}
                          >
                            Kelola Soal
                          </DropdownItem>
                          <DropdownItem 
                            icon={<Edit className="w-4 h-4" />}
                            onClick={() => handleEdit(exam)}
                          >
                            Edit Info Ujian
                          </DropdownItem>
                          
                          {/* Status Section */}
                          <DropdownSeparator />
                          <DropdownItem 
                            icon={exam.status === 'DIBUKA' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            onClick={() => toggleExamStatus(exam.id)}
                          >
                            {exam.status === 'DIBUKA' ? 'Tutup Ujian' : 'Buka Ujian'}
                          </DropdownItem>
                        </DropdownMenu>

                        {/* Delete Button (Separate) */}
                        <Button 
                          variant="destructive"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => handleDelete(exam.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
            setExamToDelete(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Hapus Ujian?"
        message="Yakin hapus ujian ini? Data tidak bisa dikembalikan."
        variant="danger"
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeleting}
        keepOpenOnConfirm={true}
        loadingText="Menghapus Ujian..."
        loadingSubtext="Mohon tunggu, data sedang dihapus"
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => {
          if (!isResetting) {
            setShowResetConfirm(false);
          }
        }}
        onConfirm={confirmReset}
        title="⚠️ BAHAYA: Reset Sistem"
        message="Ini akan menghapus semua data ujian, soal, dan nilai siswa yang tersimpan di database. Lanjutkan?"
        variant="danger"
        confirmText="Ya, Reset"
        cancelText="Batal"
        isLoading={isResetting}
        keepOpenOnConfirm={true}
        loadingText="Mereset Sistem..."
        loadingSubtext="Mohon tunggu, sistem sedang direset"
      />

      {/* Confirm Dialog for Analysis */}
      <ConfirmDialog
        isOpen={showAnalysisConfirm}
        onClose={() => {
          setShowAnalysisConfirm(false);
          setExamToAnalyze(null);
        }}
        onConfirm={confirmAnalyzeExam}
        title="Analisis Soal"
        message={`Analisis soal untuk "${examToAnalyze?.title}"?\n\nAnalisis akan menghitung:\n• Tingkat kesukaran (Difficulty Index)\n• Daya pembeda (Discrimination Index)\n• Efektivitas distractor\n• Kualitas soal secara keseluruhan`}
        confirmText="Mulai Analisis"
        cancelText="Batal"
        isLoading={isAnalyzing}
        keepOpenOnConfirm={true}
        loadingText="Menganalisis Soal..."
        loadingSubtext="Mohon tunggu, analisis sedang berjalan"
      />

      {/* Error Alert Dialog */}
      <AlertDialog
        isOpen={showErrorAlert}
        onClose={() => setShowErrorAlert(false)}
        title={errorMessage.title}
        message={errorMessage.message}
        variant="warning"
        confirmText="OK"
      />
    </div>
  );
};
