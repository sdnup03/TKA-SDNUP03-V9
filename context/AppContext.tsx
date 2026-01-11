
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Exam, Role, NoiseLevel, StudentAttempt, Question, StudentProgress, ExamStatus, User, QuestionBankItem, QuestionAnalysis } from '../types';
import { MOCK_EXAMS } from '../constants';
import { api, GAS_API_URL } from '../lib/api';
import { AlertDialog } from '../components/ui/brutalist';
import SmartPoller from '../lib/polling';
import { cache, CACHE_KEYS } from '../lib/cache';

interface AppContextType extends AppState {
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  setNoiseLevel: (level: NoiseLevel) => void;
  enterExam: (examId: string) => void;
  submitExam: (examId: string, answers: Record<string, string>, violationCount?: number) => void;
  exitExam: () => void;
  addExam: (exam: Exam) => void;
  updateExam: (exam: Exam) => void;
  deleteExam: (examId: string) => void;
  toggleExamStatus: (examId: string) => void;
  publishResults: (examId: string, isPublished: boolean) => void;
  updateScore: (examId: string, studentName: string, newScore: number) => Promise<void>;
  resetStudentAttempt: (examId: string, studentName: string) => Promise<void>;
  resetSystem: () => void;
  updateStudentProgress: (examId: string, answeredCount: number, total: number, violationCount?: number) => void;
  isLoading: boolean; // Add loading state
  appConfig: { appName: string; schoolName: string }; // App configuration from spreadsheet
  // Bank Soal
  bankQuestions: QuestionBankItem[];
  refreshBankQuestions: (forceRefresh?: boolean) => Promise<void>;
  saveQuestionToBank: (question: Question, subject: string, difficulty?: 'Mudah' | 'Sedang' | 'Sulit', tags?: string) => Promise<void>;
  updateBankQuestion: (questionId: string, question: Question, subject: string, difficulty?: 'Mudah' | 'Sedang' | 'Sulit', tags?: string) => Promise<void>;
  deleteBankQuestion: (questionId: string) => Promise<void>;
  bulkDeleteBankQuestions: (questionIds: string[]) => Promise<{ success: boolean; message: string; deletedCount?: number }>;
  addQuestionsFromBank: (questionIds: string[]) => Question[]; // Convert bank questions to regular questions
  // Item Analysis
  analyzeExam: (examId: string) => Promise<{ success: boolean; message?: string; data?: any }>;
  questionAnalysis: QuestionAnalysis[];
  getQuestionAnalysis: (examId?: string) => Promise<void>;
  isAnalyzing: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to calculate score (Client side estimation)
const calculateScore = (questions: Question[], answers: Record<string, string>): number => {
  if (!questions || questions.length === 0) return 0;

  let totalScore = 0;
  let maxPossibleScore = questions.length;

  questions.forEach(q => {
    const studentAnswer = answers[q.id];
    if (!studentAnswer) return;

    if (q.type === 'PILIHAN_GANDA') {
      if (studentAnswer === q.correctKey) totalScore += 1;
    } else if (q.type === 'PILIHAN_GANDA_KOMPLEKS') {
      // Multiple select: must match exactly (all correct selected, no incorrect selected)
      try {
        const correctArray: string[] = q.correctKey ? JSON.parse(q.correctKey) : [];
        const studentArray: string[] = JSON.parse(studentAnswer);
        
        // Sort both arrays for comparison
        const sortedCorrect = [...correctArray].sort();
        const sortedStudent = [...studentArray].sort();
        
        // Check if arrays are exactly the same (same length and same elements)
        if (sortedCorrect.length === sortedStudent.length &&
            sortedCorrect.every((val, idx) => val === sortedStudent[idx])) {
          totalScore += 1;
        }
      } catch (e) {
        // Invalid JSON, no score
      }
    } else if (q.type === 'BENAR_SALAH') {
      if (studentAnswer === q.correctKey) totalScore += 1;
    } else if (q.type === 'BENAR_SALAH_TABEL' && q.statements) {
      try {
        const studentAnswers: string[] = JSON.parse(studentAnswer);
        const correctAnswers = q.statements.map(s => s.correctAnswer);
        let correctCount = 0;
        studentAnswers.forEach((ans, idx) => {
          if (ans === correctAnswers[idx]) {
            correctCount++;
          }
        });
        // Partial score: correctCount / total statements
        totalScore += (correctCount / q.statements.length);
      } catch (e) {
        // Invalid JSON, no score
      }
    } else if (q.type === 'ISIAN_SINGKAT') {
      if (q.correctKey && studentAnswer.toLowerCase().trim() === q.correctKey.toLowerCase().trim()) {
        totalScore += 1;
      }
    } else if (q.type === 'MENJODOHKAN' && q.matchingPairs) {
      try {
        const pairs = q.matchingPairs;
        const studentMap = JSON.parse(studentAnswer);
        let pairMatches = 0;
        pairs.forEach((pair, idx) => {
          if (studentMap[idx] === pair.right) pairMatches++;
        });
        totalScore += (pairMatches / pairs.length);
      } catch (e) { }
    } else if (q.type === 'SEQUENCING' && q.correctSequence) {
      try {
        const studentSequence: number[] = JSON.parse(studentAnswer);
        if (studentSequence.length === q.correctSequence.length) {
          const isCorrect = studentSequence.every((val, idx) => val === q.correctSequence![idx]);
          if (isCorrect) totalScore += 1;
        }
      } catch (e) { }
    } else if (q.type === 'CLASSIFICATION' && q.classificationMapping) {
      try {
        const studentMapping: Record<string, number> = JSON.parse(studentAnswer);
        let correctCount = 0;
        let totalMappings = 0;
        Object.keys(q.classificationMapping).forEach(itemIdx => {
          totalMappings++;
          if (studentMapping[itemIdx] === q.classificationMapping![itemIdx]) {
            correctCount++;
          }
        });
        if (totalMappings > 0) {
          totalScore += (correctCount / totalMappings);
        }
      } catch (e) { }
    }
  });

  return Math.round((totalScore / maxPossibleScore) * 100);
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel>('TENANG');
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [liveProgress, setLiveProgress] = useState<StudentProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<{ appName: string; schoolName: string }>({
    appName: 'TKA SDNUP03',
    schoolName: 'SDN Utan Panjang 03'
  });
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([]);
  const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'info' | 'warning' | 'error' | 'success' }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  });

  // Helper function untuk show alert
  const showAlert = (title: string, message: string, variant: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    setAlertState({ isOpen: true, title, message, variant });
  };
  
  // Helper untuk show toast via window global (set by ToastProvider)
  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    if ((window as any).__showToast) {
      (window as any).__showToast(message, type);
    }
  }, []);

  // Restore session from SessionStorage on load
  useEffect(() => {
    const savedUser = sessionStorage.getItem('ipa_user_session');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {}
    }
  }, []);

  // --- LOAD DATA FROM API ---
  const refreshData = async (forceRefresh: boolean = false) => {
    // If URL is placeholder, use Mocks (Safety fallback)
    if (GAS_API_URL.includes('PASTE_YOUR')) {
        console.warn("API URL not set. Using mocks.");
        setExams(MOCK_EXAMS);
        return;
    }

    setIsLoading(true);
    try {
        // Also refresh config to get latest appName and schoolName
        loadConfig();
        
        const [examsData, attemptsData] = await Promise.all([
            api.fetchExams(forceRefresh),
            api.fetchAttempts(forceRefresh)
        ]);
        setExams(examsData);
        setAttempts(attemptsData);
    } catch (error) {
        console.error("Failed to load data:", error);
        // Don't alert here to avoid spamming if offline
    } finally {
        setIsLoading(false);
    }
  };

  // Load config function
  const loadConfig = async () => {
    try {
      const config = await api.fetchConfig();
      setAppConfig(config);
    } catch (error) {
      console.error('Failed to load config:', error);
      // Keep default values
    }
  };

  // Load config on mount and when user logs in
  useEffect(() => {
    loadConfig();
  }, []);

  // Refresh config when user logs in (to get latest config)
  useEffect(() => {
    if (currentUser) {
      loadConfig();
    }
  }, [currentUser]);

  // Initial Load when logged in
  useEffect(() => {
    if (currentUser) {
      refreshData();
      if (currentUser.role === 'GURU') {
        refreshBankQuestions();
      }
    }
  }, [currentUser]);

  // Load Bank Questions
  const refreshBankQuestions = async (forceRefresh: boolean = false) => {
    if (GAS_API_URL.includes('PASTE_YOUR')) {
      setBankQuestions([]);
      return;
    }

    try {
      const data = await api.fetchBankQuestions(forceRefresh);
      setBankQuestions(data);
    } catch (error) {
      console.error("Failed to load bank questions:", error);
    }
  };

  // Save Question to Bank
  const saveQuestionToBank = async (
    question: Question, 
    subject: string, 
    difficulty: 'Mudah' | 'Sedang' | 'Sulit' = 'Sedang', 
    tags: string = ''
  ) => {
    if (!currentUser) {
      throw new Error('User not logged in');
    }

    setIsLoading(true);
    try {
      await api.saveToBank(question, subject, difficulty, tags, currentUser.username);
      // Refresh bank questions
      cache.delete(CACHE_KEYS.BANK_QUESTIONS);
      await refreshBankQuestions(true);
      toast('Soal berhasil disimpan ke bank soal!', 'success');
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error saving to bank:", error);
      toast(`Gagal menyimpan ke bank: ${error.message || 'Unknown error'}`, 'error');
      throw error;
    }
  };

  // Update Question in Bank
  const updateBankQuestion = async (
    questionId: string,
    question: Question, 
    subject: string, 
    difficulty: 'Mudah' | 'Sedang' | 'Sulit' = 'Sedang', 
    tags: string = ''
  ) => {
    setIsLoading(true);
    try {
      await api.updateBankQuestion(questionId, question, subject, difficulty, tags);
      // Refresh bank questions
      cache.delete(CACHE_KEYS.BANK_QUESTIONS);
      await refreshBankQuestions(true);
      toast('Soal berhasil diperbarui!', 'success');
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error updating bank question:", error);
      toast(`Gagal memperbarui soal: ${error.message || 'Unknown error'}`, 'error');
      throw error;
    }
  };

  // Delete Question from Bank
  const deleteBankQuestion = async (questionId: string) => {
    setIsLoading(true);
    try {
      await api.deleteBankQuestion(questionId);
      // Refresh bank questions
      cache.delete(CACHE_KEYS.BANK_QUESTIONS);
      await refreshBankQuestions(true);
      toast('Soal berhasil dihapus dari bank!', 'success');
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error deleting bank question:", error);
      toast(`Gagal menghapus soal: ${error.message || 'Unknown error'}`, 'error');
      throw error;
    }
  };

  const bulkDeleteBankQuestions = async (questionIds: string[]): Promise<{ success: boolean; message: string; deletedCount?: number }> => {
    setIsLoading(true);
    try {
      const result = await api.bulkDeleteBankQuestions(questionIds);
      
      // Refresh bank questions
      cache.delete(CACHE_KEYS.BANK_QUESTIONS);
      await refreshBankQuestions(true);
      
      const message = result.message || `${result.deletedCount} soal berhasil dihapus`;
      toast(message, 'success');
      showAlert(
        'Bulk Delete Berhasil',
        message,
        'success'
      );
      setIsLoading(false);
      
      return { success: true, message: result.message, deletedCount: result.deletedCount };
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error bulk deleting bank questions:", error);
      toast(`Gagal menghapus: ${error.message || 'Terjadi kesalahan'}`, 'error');
      showAlert('Bulk Delete Gagal', error.message || 'Terjadi kesalahan', 'error');
      return { success: false, message: error.message };
    }
  };

  // Convert Bank Questions to Regular Questions (for adding to exam)
  const addQuestionsFromBank = (questionIds: string[]): Question[] => {
    const selectedQuestions = bankQuestions.filter(q => questionIds.includes(q.id));
    
    // Convert QuestionBankItem to Question (remove metadata)
    return selectedQuestions.map(bankQ => {
      const { subject, difficulty, tags, createdAt, createdBy, usageCount, lastUsedAt, difficultyIndex, discriminationIndex, qualityStatus, lastAnalyzed, ...question } = bankQ;
      // Generate new ID untuk soal di ujian (agar tidak conflict)
      return {
        ...question,
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    });
  };

  // --- ITEM ANALYSIS ACTIONS ---
  const analyzeExam = async (examId: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    setIsAnalyzing(true);
    setIsLoading(true);
    try {
      const result = await api.analyzeExam(examId);
      
      if (result.success) {
        // Clear ALL caches to ensure fresh data with analysis metrics
        cache.clear();
        toast('Analisis soal berhasil!', 'success');
        
        // Refresh analysis data
        await getQuestionAnalysis(examId);
        
        // Refresh bank questions (metrics updated) - force refresh
        await refreshBankQuestions(true);
        
        setIsLoading(false);
        setIsAnalyzing(false);
        
        return { success: true, data: result };
      } else {
        setIsLoading(false);
        setIsAnalyzing(false);
        toast(`Analisis gagal: ${result.message || 'Terjadi kesalahan'}`, 'error');
        showAlert('Analisis Gagal', result.message || 'Terjadi kesalahan', 'error');
        return { success: false, message: result.message };
      }
    } catch (error: any) {
      setIsLoading(false);
      setIsAnalyzing(false);
      toast(`Gagal menganalisis: ${error.message || 'Terjadi kesalahan'}`, 'error');
      showAlert('Error', error.message || 'Gagal melakukan analisis', 'error');
      return { success: false, message: error.message };
    }
  };

  const getQuestionAnalysis = async (examId?: string): Promise<void> => {
    try {
      const data = await api.getQuestionAnalysis(examId);
      setQuestionAnalysis(data);
    } catch (error: any) {
      console.error('Failed to fetch question analysis:', error);
    }
  };

  // --- AUTH ACTIONS ---
  const login = async (u: string, p: string) => {
    setIsLoading(true);
    try {
      const user = await api.login(u, p);
      setCurrentUser(user);
      sessionStorage.setItem('ipa_user_session', JSON.stringify(user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveExamId(null);
    sessionStorage.removeItem('ipa_user_session');
  };

  // --- EXAM ACTIONS ---

  const enterExam = (examId: string) => {
    setActiveExamId(examId);
  };

  const exitExam = () => {
    setActiveExamId(null);
  };

  // Real-time Update (Fire and forget to API)
  const updateStudentProgress = (examId: string, answeredCount: number, total: number, violationCount: number = 0) => {
    const newProgress: StudentProgress = {
      examId,
      studentName: currentUser?.name || 'Siswa', 
      answeredCount,
      totalQuestions: total,
      lastActive: new Date().toISOString(),
      status: 'WORKING',
      violationCount
    };
    
    // Update local state for immediate feedback if needed, but mainly send to backend
    // Use void to explicitly mark as fire-and-forget
    void api.updateProgress(newProgress);
  };

  const submitExam = async (examId: string, answers: Record<string, string>, violationCount: number = 0) => {
    setIsLoading(true);
    const exam = exams.find(e => e.id === examId);
    const score = exam ? calculateScore(exam.questions, answers) : 0;
    const studentName = currentUser?.name || 'Siswa';
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = exam?.questions?.length || 0;

    const newAttempt: StudentAttempt = {
        examId,
        examTitle: exam?.title || '', // Include exam title for better reporting
        studentName,
        answers,
        isSubmitted: true,
        submittedAt: new Date().toISOString(),
        score: score,
        violationCount
    };

    // Optimistic UI Update for attempts
    setAttempts(prev => [...prev, newAttempt]);
    
    // Optimistic UI Update for liveProgress - IMPORTANT: Update local state immediately
    const submittedProgress: StudentProgress = {
      examId,
      studentName,
      answeredCount,
      totalQuestions,
      lastActive: new Date().toISOString(),
      status: 'SUBMITTED',
      violationCount
    };
    
    // Update local liveProgress state immediately (optimistic update)
    setLiveProgress(prev => {
      const existingIndex = prev.findIndex(
        p => p.examId === examId && p.studentName === studentName
      );
      
      if (existingIndex >= 0) {
        // Update existing entry
        const updated = [...prev];
        updated[existingIndex] = submittedProgress;
        return updated;
      } else {
        // Add new entry
        return [...prev, submittedProgress];
      }
    });
    
    setActiveExamId(null);

    // Send to Backend
    try {
        await api.submitAttempt(newAttempt);
        // Update live status to backend
        await api.updateProgress(submittedProgress);
        toast('Jawaban berhasil dikirim!', 'success');
        setIsLoading(false);
    } catch (e: any) {
        setIsLoading(false);
        toast('Gagal menyimpan ke server, tapi data tersimpan di sesi ini.', 'warning');
        showAlert("Peringatan", "Gagal menyimpan ke server, tapi data tersimpan di sesi ini.", 'warning');
    }
  };

  const addExam = async (exam: Exam) => {
    setIsLoading(true);
    // Optimistic Update
    setExams(prev => [...prev, exam]);
    try {
        await api.saveExam(exam);
        // Invalidate cache and refresh data
        cache.delete(CACHE_KEYS.EXAMS);
        await refreshData(true);
        toast('Ujian berhasil dibuat!', 'success');
        setIsLoading(false);
    } catch (e: any) {
        setIsLoading(false);
        console.error("Error saving exam:", e);
        toast(`Gagal menyimpan ujian: ${e.message || 'Unknown error'}`, 'error');
        showAlert("Error", `Gagal menyimpan ujian ke database: ${e.message || 'Unknown error'}`, 'error');
        // Revert optimistic update on error
        cache.delete(CACHE_KEYS.EXAMS);
        refreshData(true);
    }
  };

  const updateExam = async (updatedExam: Exam) => {
    setIsLoading(true);
    // Optimistic Update
    setExams(prev => prev.map(ex => ex.id === updatedExam.id ? updatedExam : ex));
    try {
        await api.saveExam(updatedExam);
        // Invalidate cache and force refresh untuk memastikan data terbaru
        cache.delete(CACHE_KEYS.EXAMS);
        await refreshData(true);
        toast('Ujian berhasil diperbarui!', 'success');
        setIsLoading(false);
    } catch (e: any) {
        setIsLoading(false);
        console.error("Error updating exam:", e);
        toast(`Gagal mengupdate ujian: ${e.message || 'Unknown error'}`, 'error');
        showAlert("Error", `Gagal mengupdate ujian di database: ${e.message || 'Unknown error'}`, 'error');
        // Revert optimistic update on error
        cache.delete(CACHE_KEYS.EXAMS);
        cache.delete(CACHE_KEYS.ATTEMPTS);
        refreshData(true);
    }
  };

  const deleteExam = async (examId: string) => {
    setIsLoading(true);
    // Optimistic Update
    setExams(prev => prev.filter(ex => ex.id !== examId));
    try {
        await api.deleteExam(examId);
        // Refresh data dari database untuk memastikan sinkronisasi
        await refreshData();
        toast('Ujian berhasil dihapus!', 'success');
        setIsLoading(false);
    } catch (e: any) {
        setIsLoading(false);
        console.error("Error deleting exam:", e);
        toast(`Gagal menghapus ujian: ${e.message || 'Unknown error'}`, 'error');
        showAlert("Error", `Gagal menghapus ujian dari database: ${e.message || 'Unknown error'}`, 'error');
        // Revert optimistic update on error
        cache.delete(CACHE_KEYS.EXAMS);
        cache.delete(CACHE_KEYS.ATTEMPTS);
        refreshData(true);
    }
  };

  const toggleExamStatus = async (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
        setIsLoading(true);
        const newStatus: ExamStatus = exam.status === 'DIBUKA' ? 'DITUTUP' : 'DIBUKA';
        const updatedExam: Exam = { ...exam, status: newStatus };
        
        // Optimistic
        setExams(prev => prev.map(ex => ex.id === examId ? updatedExam : ex));
        
        // API
        try {
            await api.saveExam(updatedExam);
            // Invalidate cache and refresh data
            cache.delete(CACHE_KEYS.EXAMS);
            await refreshData(true);
            toast(`Status ujian diubah menjadi ${newStatus}`, 'success');
            setIsLoading(false);
        } catch (e: any) {
            setIsLoading(false);
            console.error("Error toggling exam status:", e);
            toast(`Gagal mengupdate status: ${e.message || 'Unknown error'}`, 'error');
            showAlert("Error", `Gagal mengupdate status ujian: ${e.message || 'Unknown error'}`, 'error');
            cache.delete(CACHE_KEYS.EXAMS);
            refreshData(true); // Revert on error
        }
    }
  };
  
  const publishResults = async (examId: string, isPublished: boolean) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
        const updatedExam: Exam = { ...exam, areResultsPublished: isPublished };
        
        // Optimistic
        setExams(prev => prev.map(ex => ex.id === examId ? updatedExam : ex));
        
        // API
        try {
            await api.saveExam(updatedExam);
            // Invalidate cache and refresh data
            cache.delete(CACHE_KEYS.EXAMS);
            await refreshData(true);
        } catch (e: any) {
            console.error("Error publishing results:", e);
            showAlert("Error", `Gagal mengupdate publikasi hasil: ${e.message || 'Unknown error'}`, 'error');
            cache.delete(CACHE_KEYS.EXAMS);
            refreshData(true); // Revert on error
        }
    }
  };

  const updateScore = async (examId: string, studentName: string, newScore: number) => {
    setIsLoading(true);
    // 1. Optimistic Update
    setAttempts(prev => prev.map(att => {
        if (att.examId === examId && att.studentName === studentName) {
            return { ...att, score: newScore };
        }
        return att;
    }));

    // 2. API Call
    try {
        await api.updateStudentScore(examId, studentName, newScore);
        toast(`Nilai ${studentName} diperbarui menjadi ${newScore}`, 'success');
        setIsLoading(false);
    } catch (e: any) {
        setIsLoading(false);
        console.error("Gagal update score backend", e);
        toast(`Gagal update nilai: ${e.message || 'Cek koneksi'}`, 'error');
        showAlert("Error", "Gagal update nilai di server. Cek koneksi.", 'error');
        refreshData(); // Rollback if fail
    }
  };

  const resetStudentAttempt = async (examId: string, studentName: string) => {
    setIsLoading(true);
    // 1. Optimistic Update
    // Remove from Live Progress
    setLiveProgress(prev => prev.filter(p => !(p.examId === examId && p.studentName === studentName)));
    // Remove from Attempts
    setAttempts(prev => prev.filter(a => !(a.examId === examId && a.studentName === studentName)));

    // 2. API Call
    try {
        await api.resetStudentAttempt(examId, studentName);
        // 3. Force refresh data from server to ensure sync
        cache.delete(CACHE_KEYS.ATTEMPTS);
        cache.delete(CACHE_KEYS.LIVE_PROGRESS);
        // Refresh both attempts and live progress
        const [attemptsData, liveProgressData] = await Promise.all([
          api.fetchAttempts(true),
          api.fetchLiveProgress()
        ]);
        setAttempts(attemptsData);
        setLiveProgress(liveProgressData);
        toast(`Data ${studentName} berhasil direset!`, 'success');
        showAlert("Berhasil", `Data ${studentName} berhasil direset.`, 'success');
        setIsLoading(false);
    } catch (e: any) {
        setIsLoading(false);
        console.error(e);
        toast(`Gagal reset data: ${e.message || 'Terjadi kesalahan'}`, 'error');
        showAlert("Error", "Gagal reset data di server.", 'error');
        // On error, refresh to get actual state
        cache.delete(CACHE_KEYS.ATTEMPTS);
        cache.delete(CACHE_KEYS.LIVE_PROGRESS);
        const [attemptsData, liveProgressData] = await Promise.all([
          api.fetchAttempts(true),
          api.fetchLiveProgress()
        ]);
        setAttempts(attemptsData);
        setLiveProgress(liveProgressData);
    }
  };

  const resetSystem = async () => {
    setIsLoading(true);
    try {
        await api.resetSystem();
        toast('Sistem berhasil direset!', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
    } catch (e: any) {
        setIsLoading(false);
        toast(`Gagal reset sistem: ${e.message || 'Terjadi kesalahan'}`, 'error');
        showAlert("Error", "Gagal reset sistem.", 'error');
    }
  };

  // --- LIVE MONITORING POLLING (Smart Polling with Backoff) ---
  const liveProgressPollerRef = useRef<SmartPoller | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'GURU') {
      // Immediate fetch on role switch
      api.fetchLiveProgress().then(data => setLiveProgress(data));

      // Create smart poller with optimized config
      const poller = new SmartPoller(
        async () => {
          const data = await api.fetchLiveProgress();
          // Filter stale - but keep SUBMITTED entries regardless of time
          const now = new Date().getTime();
          const validData = data.filter(p => {
             // Always keep SUBMITTED entries
             if (p.status === 'SUBMITTED') return true;
             
             // For WORKING/IDLE, filter if older than 2 hours
             const lastActive = new Date(p.lastActive).getTime();
             return (now - lastActive) < 7200000; // 2 hours
          });
          
          // Merge strategy: Keep local SUBMITTED entries even if not in API response
          setLiveProgress(prev => {
            const submittedLocal = prev.filter(p => p.status === 'SUBMITTED');
            const merged = [...validData];
            
            // Add local SUBMITTED entries that aren't in API response
            submittedLocal.forEach(local => {
              const exists = merged.some(
                api => api.examId === local.examId && api.studentName === local.studentName
              );
              if (!exists) {
                merged.push(local);
              }
            });
            
            return merged;
          });
        },
        {
          baseInterval: 5000,      // Start with 5 seconds
          maxInterval: 30000,      // Max 30 seconds if errors occur
          backoffMultiplier: 1.5,  // 1.5x backoff on errors
          resetOnSuccess: true,    // Reset to base on success
        }
      );

      liveProgressPollerRef.current = poller;
      poller.start();

      return () => {
        poller.stop();
        liveProgressPollerRef.current = null;
      };
    }
  }, [currentUser]);

  return (
    <AppContext.Provider value={{
      currentUser,
      exams,
      activeExamId,
      noiseLevel,
      attempts,
      liveProgress,
      isLoading,
      login,
      logout,
      setNoiseLevel,
      enterExam,
      submitExam,
      exitExam,
      addExam,
      updateExam,
      deleteExam,
      toggleExamStatus,
      publishResults,
      updateScore,
      resetStudentAttempt,
      resetSystem,
      updateStudentProgress,
      appConfig,
      bankQuestions,
      refreshBankQuestions,
      saveQuestionToBank,
      updateBankQuestion,
      deleteBankQuestion,
      bulkDeleteBankQuestions,
      addQuestionsFromBank,
      analyzeExam,
      questionAnalysis,
      getQuestionAnalysis,
      isAnalyzing
    }}>
      {children}
      <AlertDialog
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
