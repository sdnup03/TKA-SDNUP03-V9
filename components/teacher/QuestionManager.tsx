
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Exam, Question, QuestionType, QuestionBankItem, QuestionOption } from '../../types';
import { Button, Input, Textarea, Card, Badge, ConfirmDialog, AlertDialog, DialogOverlay } from '../ui/brutalist';
import { RichTextEditor } from '../ui/RichTextEditor';
import { Plus, Trash2, ArrowLeft, X, BookOpen, Edit, Image as ImageIcon, Loader2, Save, Database, Filter, Search, Download, History, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Sigma } from 'lucide-react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { QuestionHistoryModal } from './QuestionHistoryModal';
import { MathRenderer } from '../ui/MathRenderer';
import { MathInput } from '../ui/MathInput';

interface QuestionManagerProps {
  exam: Exam;
  onUpdateExam: (exam: Exam) => void;
  onBack: () => void;
}

export const QuestionManager: React.FC<QuestionManagerProps> = ({ exam, onUpdateExam, onBack }) => {
  const { bankQuestions, refreshBankQuestions, saveQuestionToBank, updateBankQuestion, deleteBankQuestion, bulkDeleteBankQuestions, addQuestionsFromBank } = useApp();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>(exam.questions);
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'CREATE' | 'BANK'>('CREATE'); // Tab mode
  const [isSaving, setIsSaving] = useState(false); // Loading state untuk save all
  const [isSavingQuestion, setIsSavingQuestion] = useState(false); // Loading state untuk single question
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track perubahan yang belum di-save
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null); // Track last autosave time
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoSavingRef = useRef(false); // Prevent concurrent autosave
  
  // LocalStorage key untuk backup (memoized)
  const STORAGE_KEY = useMemo(() => `exam_questions_backup_${exam.id}`, [exam.id]);
  
  // Restore dari localStorage saat mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Cek apakah backup lebih baru dari exam.questions
        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const backupTime = parsed.timestamp ? new Date(parsed.timestamp) : new Date(0);
          // Jika backup ada dan tidak kosong, restore
          if (parsed.questions.length > (exam.questions?.length || 0)) {
            setQuestions(parsed.questions);
            setHasUnsavedChanges(true);
            setAlertMessage({ 
              title: 'Data Ditemukan', 
              message: `Ditemukan ${parsed.questions.length} soal yang belum disimpan. Klik "Simpan Semua Soal" untuk menyimpan.`, 
              variant: 'info' 
            });
            setShowAlert(true);
          }
        }
      }
    } catch (e) {
      console.error('Error restoring from localStorage:', e);
    }
  }, [exam.id]); // Hanya sekali saat mount
  
  // Save ke localStorage sebagai backup
  const saveToLocalStorage = (questionsToSave: Question[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        examId: exam.id,
        questions: questionsToSave,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  };
  
  // Auto-save ke database (silent, tanpa alert)
  const autoSaveToDatabase = useCallback(async () => {
    if (isAutoSavingRef.current || isSaving || questions.length === 0) return;
    if (!hasUnsavedChanges) return;
    
    isAutoSavingRef.current = true;
    try {
      await onUpdateExam({ ...exam, questions });
      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
      // Clear localStorage backup setelah berhasil save
      const storageKey = `exam_questions_backup_${exam.id}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Silent fail untuk autosave - tidak tampilkan error
      console.warn('Autosave failed:', error);
    } finally {
      isAutoSavingRef.current = false;
    }
  }, [exam, questions, hasUnsavedChanges, isSaving, onUpdateExam]);
  
  // Auto-save interval (setiap 30 detik)
  useEffect(() => {
    if (hasUnsavedChanges && questions.length > 0) {
      autoSaveIntervalRef.current = setInterval(() => {
        autoSaveToDatabase();
      }, 30000); // 30 detik
      
      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    } else {
      // Clear interval jika tidak ada perubahan
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    }
  }, [hasUnsavedChanges, questions.length, autoSaveToDatabase]);
  
  // Save ke localStorage setiap kali questions berubah
  useEffect(() => {
    if (questions.length > 0) {
      saveToLocalStorage(questions);
    } else {
      // Clear backup jika questions kosong
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
    }
  }, [questions, exam.id]);
  
  // Handle beforeunload - save sebelum close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && questions.length > 0) {
        // Try to save before leaving
        autoSaveToDatabase();
        // Browser will show default confirmation dialog
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, questions.length]);
  
  // Sync local state dengan exam prop ketika exam berubah (setelah refresh dari backend)
  useEffect(() => {
    if (exam && exam.questions && Array.isArray(exam.questions)) {
      // Only update if questions actually changed (by comparing length and IDs)
      const currentQuestionIds = questions.map(q => q.id).sort().join(',');
      const newQuestionIds = exam.questions.map(q => q.id).sort().join(',');
      
      if (currentQuestionIds !== newQuestionIds || questions.length !== exam.questions.length) {
        setQuestions([...exam.questions]); // Create new array to trigger re-render
        setHasUnsavedChanges(false); // Reset unsaved changes setelah sync
        // Clear localStorage setelah sync berhasil
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [exam?.id, exam?.questions?.length]); // Update ketika exam.id atau jumlah questions berubah
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '', variant: 'warning' as 'info' | 'warning' | 'error' | 'success' });
  const [isDeleting, setIsDeleting] = useState(false);
  
  // New Question State
  const [newQType, setNewQType] = useState<QuestionType>('PILIHAN_GANDA');
  const [newQText, setNewQText] = useState('');
  const [newQImage, setNewQImage] = useState(''); // URL gambar
  const [newQPassage, setNewQPassage] = useState(''); // State for Passage
  const [showPassageInput, setShowPassageInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Multiple Choice State - support both string (backward compatible) and QuestionOption
  const [newQOptions, setNewQOptions] = useState<(string | QuestionOption)[]>(['', '', '', '']); 
  const [newQCorrect, setNewQCorrect] = useState('0');
  
  // Multiple Choice Complex State (multiple correct answers)
  const [newQComplexCorrect, setNewQComplexCorrect] = useState<string[]>([]); // Array of indices 

  // True/False State
  const [newQTrueFalse, setNewQTrueFalse] = useState<'true' | 'false'>('true');

  // Short Answer State
  const [newQShortAnswerKey, setNewQShortAnswerKey] = useState('');

  // Matching State
  const [newMatchingPairs, setNewMatchingPairs] = useState<{left: string, right: string}[]>([{left: '', right: ''}, {left: '', right: ''}]);

  // Benar/Salah Tabel State
  const [newStatements, setNewStatements] = useState<{text: string, correctAnswer: 'true' | 'false'}[]>([
    {text: '', correctAnswer: 'true'},
    {text: '', correctAnswer: 'true'}
  ]);

  // Drag & Drop State
  const [newDragItems, setNewDragItems] = useState<string[]>(['', '']);
  const [newDropZones, setNewDropZones] = useState<string[]>(['', '']);
  const [newDragDropMapping, setNewDragDropMapping] = useState<Record<string, number>>({});

  // Sequencing State
  const [newSequenceItems, setNewSequenceItems] = useState<string[]>(['', '']);

  // Hotspot State
  const [newHotspots, setNewHotspots] = useState<{x: number; y: number; width: number; height: number; label: string}[]>([]);
  const [newCorrectHotspot, setNewCorrectHotspot] = useState<number>(0);

  // Classification State
  const [newClassificationItems, setNewClassificationItems] = useState<string[]>(['', '']);
  const [newCategories, setNewCategories] = useState<string[]>(['', '']);
  const [newClassificationMapping, setNewClassificationMapping] = useState<Record<string, number>>({});

  // Bank Soal State
  const [saveToBank, setSaveToBank] = useState(false);
  const [bankSubject, setBankSubject] = useState(exam.subject || '');
  const [bankDifficulty, setBankDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit'>('Sedang');
  const [bankTags, setBankTags] = useState('');

  // Smart Default: Calculate if question should be saved to bank by default
  const calculateSmartDefault = useCallback((): boolean => {
    // HIGH VALUE questions → default ON
    if (newQImage) return true;                    // Has image (high effort)
    if (newQPassage && newQPassage.length > 50) return true;  // Has substantial passage (reusable)
    if (bankSubject && bankTags) return true;      // Has complete metadata (organized)
    
    // Complex question types → default ON
    if (['MENJODOHKAN', 'BENAR_SALAH_TABEL', 'SEQUENCING', 'CLASSIFICATION'].includes(newQType)) {
      return true;
    }
    
    // Multiple choice with 5+ options → default ON
    if (newQType === 'PILIHAN_GANDA' && newQOptions.length >= 5) return true;
    
    // Default OFF for simple questions
    return false;
  }, [newQImage, newQPassage, newQType, newQOptions.length, bankSubject, bankTags]);

  // Bank Soal View State
  const [bankFilterSubject, setBankFilterSubject] = useState<string>('');
  const [bankFilterType, setBankFilterType] = useState<string>('');
  const [bankFilterDifficulty, setBankFilterDifficulty] = useState<string>('');
  const [bankFilterQuality, setBankFilterQuality] = useState<string>(''); // NEW: Quality filter
  const [bankFilterTag, setBankFilterTag] = useState<string>('');
  const [bankSearchText, setBankSearchText] = useState('');
  // Phase 2.5: Advanced Filters
  const [bankFilterUsage, setBankFilterUsage] = useState<string>(''); // '0', '1-3', '4+'
  const [bankFilterDateFrom, setBankFilterDateFrom] = useState<string>('');
  const [bankFilterDateTo, setBankFilterDateTo] = useState<string>('');
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());
  const [showBankPreview, setShowBankPreview] = useState<string | null>(null);
  const [editingBankQuestion, setEditingBankQuestion] = useState<QuestionBankItem | null>(null);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // 20 soal per halaman

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [bankFilterSubject, bankFilterType, bankFilterDifficulty, bankFilterQuality, bankFilterTag, bankSearchText, bankFilterUsage, bankFilterDateFrom, bankFilterDateTo]);
  const [showDeleteBankConfirm, setShowDeleteBankConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeletingBankQuestion, setIsDeletingBankQuestion] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<{ questionId: string; questionText: string } | null>(null);
  const [showOptionMathModal, setShowOptionMathModal] = useState(false);
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number>(0);
  
  // Auto-update smart default when question properties change
  useEffect(() => {
    // Only apply smart default for NEW questions (not when editing)
    if (!editingQId && !editingBankQuestion) {
      const shouldSave = calculateSmartDefault();
      setSaveToBank(shouldSave);
    }
  }, [calculateSmartDefault, editingQId, editingBankQuestion]);
  
  // Get all unique tags from bank questions for auto-suggest
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    bankQuestions.forEach(q => {
      if (q.tags) {
        q.tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [bankQuestions]);

  const resetForm = () => {
    setNewQText('');
    setNewQImage('');
    setNewQPassage('');
    setShowPassageInput(false);
    setNewQOptions(['', '', '', '']);
    setNewQCorrect('0');
    setNewQComplexCorrect([]);
    setNewQTrueFalse('true');
    setNewQShortAnswerKey('');
    setNewMatchingPairs([{left: '', right: ''}, {left: '', right: ''}]);
    setNewStatements([{text: '', correctAnswer: 'true'}, {text: '', correctAnswer: 'true'}]);
    setNewDragItems(['', '']);
    setNewDropZones(['', '']);
    setNewDragDropMapping({});
    setNewSequenceItems(['', '']);
    setNewHotspots([]);
    setNewCorrectHotspot(0);
    setNewClassificationItems(['', '']);
    setNewCategories(['', '']);
    setNewClassificationMapping({});
    setSaveToBank(false);
    setBankSubject(exam.subject || '');
    setBankDifficulty('Sedang');
    setBankTags('');
    setEditingBankQuestion(null);
    setNewQType('PILIHAN_GANDA');
    setEditingQId(null);
    setIsAdding(false);
    setIsUploading(false);
  };

  const handleEditClick = (q: Question) => {
    // 1. Set basic info
    setEditingQId(q.id);
    setIsAdding(true); // Open form
    setNewQType(q.type);
    setNewQText(q.text);
    setNewQImage(q.imageUrl || '');

    // 2. Set Passage
    if (q.passage) {
      setShowPassageInput(true);
      setNewQPassage(q.passage);
    } else {
      setShowPassageInput(false);
      setNewQPassage('');
    }

    // 3. Set Specific Type Data
    if (q.type === 'PILIHAN_GANDA') {
      setNewQOptions(q.options || ['', '', '', '']);
      setNewQCorrect(q.correctKey || '0');
    } else if (q.type === 'PILIHAN_GANDA_KOMPLEKS') {
      setNewQOptions(q.options || ['', '', '', '']);
      // Parse correctKey as JSON array
      try {
        const correctArray = q.correctKey ? JSON.parse(q.correctKey) : [];
        setNewQComplexCorrect(Array.isArray(correctArray) ? correctArray : []);
      } catch (e) {
        setNewQComplexCorrect([]);
      }
    } else if (q.type === 'BENAR_SALAH') {
      setNewQTrueFalse((q.correctKey as 'true' | 'false') || 'true');
    } else if (q.type === 'ISIAN_SINGKAT') {
      setNewQShortAnswerKey(q.correctKey || '');
    } else if (q.type === 'MENJODOHKAN') {
      setNewMatchingPairs(q.matchingPairs || [{left: '', right: ''}, {left: '', right: ''}]);
    } else if (q.type === 'BENAR_SALAH_TABEL') {
      setNewStatements(q.statements || [{text: '', correctAnswer: 'true'}, {text: '', correctAnswer: 'true'}]);
    } else if (q.type === 'SEQUENCING') {
      setNewSequenceItems(q.sequenceItems || ['', '']);
    } else if (q.type === 'CLASSIFICATION') {
      setNewClassificationItems(q.classificationItems || ['', '']);
      setNewCategories(q.categories || ['', '']);
      setNewClassificationMapping(q.classificationMapping || {});
    }
    
    // Scroll to form (optional, simplified)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleSaveQuestion = async () => {
    // Set loading state
    setIsSavingQuestion(true);
    
    try {
      // Validasi input
      if (!newQText.trim()) {
        setAlertMessage({ title: 'Pertanyaan Kosong', message: 'Isi pertanyaan dulu ya!', variant: 'warning' });
        setShowAlert(true);
        setIsSavingQuestion(false);
        return;
      }

      // Validasi untuk BENAR_SALAH_TABEL
      if (newQType === 'BENAR_SALAH_TABEL') {
        if (!newStatements || newStatements.length < 2) {
          setAlertMessage({ title: 'Pernyataan Kurang', message: 'Minimal 2 pernyataan untuk soal Benar/Salah Tabel!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
        const hasEmptyStatement = newStatements.some(s => !s.text.trim());
        if (hasEmptyStatement) {
          setAlertMessage({ title: 'Pernyataan Kosong', message: 'Semua pernyataan harus diisi!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
      }

      // Validasi untuk SEQUENCING
      if (newQType === 'SEQUENCING') {
        if (newSequenceItems.length < 2) {
          setAlertMessage({ title: 'Item Kurang', message: 'Minimal 2 item untuk diurutkan!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
        const hasEmptyItem = newSequenceItems.some(i => !i.trim());
        if (hasEmptyItem) {
          setAlertMessage({ title: 'Item Kosong', message: 'Semua item harus diisi!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
      }

      // Validasi untuk PILIHAN_GANDA dan PILIHAN_GANDA_KOMPLEKS
      if (newQType === 'PILIHAN_GANDA' || newQType === 'PILIHAN_GANDA_KOMPLEKS') {
        if (newQOptions.length < 2) {
          setAlertMessage({ title: 'Opsi Kurang', message: 'Minimal 2 opsi jawaban!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
        // Handle backward compatibility: opsi bisa string atau QuestionOption
        const hasEmptyOption = newQOptions.some(o => {
          if (typeof o === 'string') {
            return !o.trim();
          } else {
            return !o.text || !o.text.trim();
          }
        });
        if (hasEmptyOption) {
          setAlertMessage({ title: 'Opsi Kosong', message: 'Semua opsi harus diisi!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
        if (newQType === 'PILIHAN_GANDA_KOMPLEKS' && newQComplexCorrect.length === 0) {
          setAlertMessage({ title: 'Jawaban Belum Dipilih', message: 'Pilih minimal 1 jawaban benar!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
      }

      // Validasi untuk CLASSIFICATION
      if (newQType === 'CLASSIFICATION') {
        if (newClassificationItems.length < 2 || newCategories.length < 2) {
          setAlertMessage({ title: 'Data Kurang', message: 'Minimal 2 item dan 2 kategori!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
        const hasEmptyItem = newClassificationItems.some(i => !i.trim()) || newCategories.some(c => !c.trim());
        if (hasEmptyItem) {
          setAlertMessage({ title: 'Data Kosong', message: 'Semua item dan kategori harus diisi!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
        if (Object.keys(newClassificationMapping).length === 0) {
          setAlertMessage({ title: 'Mapping Kosong', message: 'Set mapping item ke kategori!', variant: 'warning' });
          setShowAlert(true);
          setIsSavingQuestion(false);
          return;
        }
      }

      const questionData: Question = {
      id: editingQId ? editingQId : `q-${Date.now()}`, // Use existing ID if editing
      text: newQText,
      imageUrl: newQImage,
      type: newQType,
      passage: showPassageInput && newQPassage.trim() ? newQPassage : undefined,
      options: (newQType === 'PILIHAN_GANDA' || newQType === 'PILIHAN_GANDA_KOMPLEKS') ? newQOptions : undefined,
      matchingPairs: newQType === 'MENJODOHKAN' ? newMatchingPairs : undefined,
      statements: newQType === 'BENAR_SALAH_TABEL' ? newStatements : undefined,
      sequenceItems: newQType === 'SEQUENCING' ? newSequenceItems : undefined,
      correctSequence: newQType === 'SEQUENCING' ? newSequenceItems.map((_, i) => i) : undefined,
      classificationItems: newQType === 'CLASSIFICATION' ? newClassificationItems : undefined,
      categories: newQType === 'CLASSIFICATION' ? newCategories : undefined,
      classificationMapping: newQType === 'CLASSIFICATION' ? newClassificationMapping : undefined,
      correctKey: 
        newQType === 'PILIHAN_GANDA' ? newQCorrect : 
        newQType === 'PILIHAN_GANDA_KOMPLEKS' ? JSON.stringify(newQComplexCorrect.sort()) :
        newQType === 'BENAR_SALAH' ? newQTrueFalse : 
        newQType === 'BENAR_SALAH_TABEL' ? JSON.stringify(newStatements.map(s => s.correctAnswer)) :
        newQType === 'SEQUENCING' ? JSON.stringify(newSequenceItems.map((_, i) => i)) :
        newQType === 'CLASSIFICATION' ? JSON.stringify(newClassificationMapping) :
        newQType === 'ISIAN_SINGKAT' ? newQShortAnswerKey :
        undefined
    };

    let updatedQuestions: Question[];

    if (editingQId) {
      // Update existing
      updatedQuestions = questions.map(q => q.id === editingQId ? questionData : q);
    } else {
      // Add new
      updatedQuestions = [...questions, questionData];
    }

      // If editing bank question, only update bank (don't add to exam)
      if (editingBankQuestion) {
        try {
          await updateBankQuestion(editingBankQuestion.id, questionData, bankSubject, bankDifficulty, bankTags);
          showToast('Soal di bank berhasil diupdate!', 'success');
          setAlertMessage({ 
            title: 'Berhasil', 
            message: 'Soal di bank berhasil diupdate!', 
            variant: 'success' 
          });
          setShowAlert(true);
          setEditingBankQuestion(null);
          resetForm();
          return; // Don't add to exam questions
        } catch (error: any) {
          console.error('Error updating bank question:', error);
          showToast(`Gagal mengupdate soal di bank: ${error.message || 'Unknown error'}`, 'error');
          setAlertMessage({ 
            title: 'Error', 
            message: 'Gagal mengupdate soal di bank: ' + (error.message || 'Unknown error'), 
            variant: 'error' 
          });
          setShowAlert(true);
          return;
        } finally {
          setIsSavingQuestion(false);
        }
      }

      setQuestions(updatedQuestions);
      setHasUnsavedChanges(true); // Mark ada perubahan yang belum di-save
      showToast(editingQId ? 'Soal berhasil diperbarui!' : 'Soal berhasil ditambahkan!', 'success');
      
      // Save to bank if toggle is active
      if (saveToBank) {
          // Duplicate Detection for new question
          const similarQuestions = bankQuestions.filter(bankQ => {
            // Simple similarity check: compare text (first 50 chars) and type
            const textSimilarity = bankQ.text.substring(0, 50).toLowerCase() === questionData.text.substring(0, 50).toLowerCase();
            const typeMatch = bankQ.type === questionData.type;
            return textSimilarity && typeMatch;
          });

          if (similarQuestions.length > 0) {
            // Show warning but allow save
            setAlertMessage({ 
              title: '⚠️ Soal Serupa Ditemukan', 
              message: `Ditemukan ${similarQuestions.length} soal serupa di bank. Yakin ingin menyimpan?`, 
              variant: 'warning' 
            });
            setShowAlert(true);
          }

          try {
            await saveQuestionToBank(questionData, bankSubject, bankDifficulty, bankTags);
            showToast('Soal berhasil disimpan ke bank soal!', 'success');
            setAlertMessage({ 
              title: 'Berhasil', 
              message: 'Soal berhasil disimpan ke bank soal!', 
              variant: 'success' 
            });
            setShowAlert(true);
          } catch (error: any) {
            console.error('Error saving to bank:', error);
            showToast(`Gagal menyimpan ke bank: ${error.message || 'Unknown error'}`, 'warning');
            setAlertMessage({ 
              title: 'Peringatan', 
              message: 'Soal berhasil ditambahkan ke ujian, tapi gagal menyimpan ke bank soal: ' + (error.message || 'Unknown error'), 
              variant: 'warning' 
            });
            setShowAlert(true);
          }
        }
      
      resetForm();
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Save semua soal ke database
  const handleSaveAll = async () => {
    if (questions.length === 0) {
      showToast('Tambah minimal 1 soal dulu!', 'warning');
      setAlertMessage({ title: 'Belum Ada Soal', message: 'Tambah minimal 1 soal dulu!', variant: 'warning' });
      setShowAlert(true);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateExam({ ...exam, questions });
      setHasUnsavedChanges(false);
      setLastAutoSave(new Date());
      // Clear localStorage backup setelah berhasil save
      localStorage.removeItem(STORAGE_KEY);
      showToast(`${questions.length} soal berhasil disimpan!`, 'success');
      setAlertMessage({ title: 'Berhasil!', message: `${questions.length} soal berhasil disimpan ke database.`, variant: 'success' });
      setShowAlert(true);
    } catch (error: any) {
      showToast(`Gagal menyimpan: ${error.message || 'Terjadi kesalahan'}`, 'error');
      setAlertMessage({ title: 'Gagal Menyimpan', message: error.message || 'Terjadi kesalahan saat menyimpan.', variant: 'error' });
      setShowAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    setIsDeleting(true);
    try {
      // Small delay for loading feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updated = questions.filter(q => q.id !== questionToDelete);
      setQuestions(updated);
      setHasUnsavedChanges(true); // Mark ada perubahan yang belum di-save
      
      // If we deleted the question currently being edited, reset form
      if (editingQId === questionToDelete) {
        resetForm();
      }
      
      showToast('Soal berhasil dihapus!', 'success');
      setShowDeleteConfirm(false);
      setQuestionToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = () => {
    if (selectedBankQuestions.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    const questionIds = Array.from(selectedBankQuestions);
    
    const result = await bulkDeleteBankQuestions(questionIds);
    
    if (result.success) {
      setSelectedBankQuestions(new Set());
    }
    
    setIsBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
  };

  // Bulk Export Handler
  const handleBulkExport = () => {
    if (selectedBankQuestions.size === 0) return;
    
    const selectedQuestions = bankQuestions.filter(q => selectedBankQuestions.has(q.id));
    const dataStr = JSON.stringify(selectedQuestions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-soal-export-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setAlertMessage({ 
      title: 'Export Berhasil', 
      message: `${selectedBankQuestions.size} soal berhasil di-export!`, 
      variant: 'success' 
    });
    setShowAlert(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size client side (e.g. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAlertMessage({ title: 'Ukuran File Terlalu Besar', message: 'Gambar kegedean. Maksimal 2MB ya.', variant: 'warning' });
      setShowAlert(true);
      return;
    }

    setIsUploading(true);
    showToast('Mengupload gambar...', 'info');
    
    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            const res = await api.uploadImage(base64String, file.name);
            
            // Backend now returns simple URL, no need to wait
            setNewQImage(res.url);
            
            // Preload the image to ensure it's ready
            const img = new Image();
            img.onload = () => {
              showToast('Gambar berhasil diupload!', 'success');
              setAlertMessage({ 
                title: 'Upload Berhasil', 
                message: 'Gambar berhasil diupload dan siap digunakan!', 
                variant: 'success' 
              });
              setShowAlert(true);
            };
            img.onerror = () => {
              // Image URL might not be ready yet, but set it anyway
              showToast('Gambar berhasil diupload!', 'success');
              setAlertMessage({ 
                title: 'Upload Berhasil', 
                message: 'Gambar berhasil diupload. Jika preview belum muncul, tunggu sebentar dan save soal.', 
                variant: 'success' 
              });
              setShowAlert(true);
            };
            img.src = res.url;
            
        } catch (err: any) {
            console.error(err);
            
            // Show specific error message for rate limiting
            let errorMessage = 'Gagal upload gambar. Cek koneksi atau script backend.';
            if (err.message && (err.message.includes('429') || err.message.includes('rate limit') || err.message.includes('Too Many Requests'))) {
              errorMessage = 'Terlalu banyak upload sekaligus. Tunggu 2-3 menit, lalu coba lagi. PENTING: Upload satu gambar, tunggu selesai, baru upload lagi.';
            }
            
            showToast(errorMessage, 'error');
            setAlertMessage({ 
              title: 'Upload Gagal', 
              message: errorMessage, 
              variant: 'error' 
            });
            setShowAlert(true);
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  // Helper function to get option text (backward compatible)
  const getOptionText = (opt: string | QuestionOption): string => {
    if (typeof opt === 'string') {
      return opt || '';
    }
    return opt?.text || '';
  };

  // Helper function to get option image (backward compatible)
  const getOptionImage = (opt: string | QuestionOption): string | undefined => {
    if (typeof opt === 'string') {
      return undefined;
    }
    return opt?.imageUrl;
  };

  // Helper function to set option text
  const setOptionText = (index: number, text: string) => {
    const newOpts = [...newQOptions];
    if (typeof newOpts[index] === 'string') {
      newOpts[index] = text;
    } else {
      newOpts[index] = { ...newOpts[index] as QuestionOption, text };
    }
    setNewQOptions(newOpts);
  };

  // Helper function to set option image
  const setOptionImage = (index: number, imageUrl: string) => {
    const newOpts = [...newQOptions];
    if (typeof newOpts[index] === 'string') {
      newOpts[index] = { text: newOpts[index] as string, imageUrl };
    } else {
      newOpts[index] = { ...newOpts[index] as QuestionOption, imageUrl };
    }
    setNewQOptions(newOpts);
  };

  // Helper function to remove option image
  const removeOptionImage = (index: number) => {
    const newOpts = [...newQOptions];
    if (typeof newOpts[index] === 'object') {
      const opt = newOpts[index] as QuestionOption;
      if (opt.imageUrl) {
        newOpts[index] = { text: opt.text };
      }
    }
    setNewQOptions(newOpts);
  };

  // Handle image upload for option
  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, optionIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size client side (e.g. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Gambar kegedean. Maksimal 2MB ya.', 'warning');
      setAlertMessage({ title: 'Ukuran File Terlalu Besar', message: 'Gambar kegedean. Maksimal 2MB ya.', variant: 'warning' });
      setShowAlert(true);
      return;
    }

    setIsUploading(true);
    showToast('Mengupload gambar opsi...', 'info');
    
    // Convert to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            const res = await api.uploadImage(base64String, file.name);
            setOptionImage(optionIndex, res.url);
            showToast('Gambar opsi berhasil diupload!', 'success');
            setAlertMessage({ 
              title: 'Upload Berhasil', 
              message: 'Gambar opsi berhasil diupload!', 
              variant: 'success' 
            });
            setShowAlert(true);
        } catch (err: any) {
            console.error(err);
            let errorMessage = 'Gagal upload gambar. Cek koneksi atau script backend.';
            if (err.message && (err.message.includes('429') || err.message.includes('rate limit') || err.message.includes('Too Many Requests'))) {
              errorMessage = 'Terlalu banyak upload sekaligus. Tunggu 2-3 menit, lalu coba lagi.';
            }
            showToast(errorMessage, 'error');
            setAlertMessage({ 
              title: 'Upload Gagal', 
              message: errorMessage, 
              variant: 'error' 
            });
            setShowAlert(true);
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsDataURL(file);
  };


  const handleInsertOptionMath = (latex: string) => {
    if (latex) {
      const mathHtml = `[MATH]${latex}[/MATH]`;
      const currentOpt = newQOptions[currentOptionIndex];
      const currentText = typeof currentOpt === 'string' ? currentOpt : currentOpt.text || '';
      const newText = currentText ? `${currentText} ${mathHtml}` : mathHtml;
      setOptionText(currentOptionIndex, newText);
    }
    setShowOptionMathModal(false);
  };

  const updateMatchingPair = (index: number, field: 'left' | 'right', value: string) => {
    const updated = [...newMatchingPairs];
    updated[index][field] = value;
    setNewMatchingPairs(updated);
  };

  const addMatchingPair = () => {
    setNewMatchingPairs([...newMatchingPairs, {left: '', right: ''}]);
  };

  const removeMatchingPair = (index: number) => {
    if (newMatchingPairs.length <= 2) return;
    const updated = newMatchingPairs.filter((_, i) => i !== index);
    setNewMatchingPairs(updated);
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header with Save Button */}
      <div className="sticky top-0 z-50 bg-white border-b-4 border-black shadow-[4px_4px_0px_0px_#000] -mx-4 sm:-mx-6 px-3 sm:px-6 py-3 sm:py-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => {
                if (hasUnsavedChanges) {
                  setAlertMessage({
                    title: 'Perubahan Belum Disimpan',
                    message: 'Ada perubahan yang belum disimpan. Yakin ingin keluar?',
                    variant: 'warning'
                  });
                  setShowAlert(true);
                  // Store callback untuk confirm
                  (window as any).__confirmBack = () => {
                    setShowAlert(false);
                    onBack();
                  };
                } else {
                  onBack();
                }
              }} 
              className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
              title="Kembali ke daftar ujian"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-black truncate">Kelola Soal: {exam.title}</h2>
              <p className="text-xs sm:text-sm opacity-60 font-bold truncate">
                {exam.subject && <span className="text-[#4F46E5] font-black">{exam.subject} • </span>}
                {questions.length} Soal {hasUnsavedChanges && <span className="text-yellow-600">(Belum Disimpan)</span>}
                {lastAutoSave && !hasUnsavedChanges && (
                  <span className="text-green-600 text-[10px] sm:text-xs ml-1 sm:ml-2">
                    ✓ Tersimpan {lastAutoSave.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Save All Button */}
          {hasUnsavedChanges && (
            <Button 
              variant="primary" 
              onClick={handleSaveAll}
              disabled={isSaving || questions.length === 0}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto justify-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span className="hidden xs:inline">Menyimpan...</span><span className="xs:hidden">...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Simpan Semua Soal ({questions.length})</span><span className="sm:hidden">Simpan ({questions.length})</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* List Existing Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className={`relative group transition-all duration-200 hover:shadow-[6px_6px_0px_0px_#000] animate-in fade-in slide-in-from-bottom-2 ${editingQId === q.id ? 'border-[#4F46E5] ring-2 ring-[#4F46E5] ring-offset-2 scale-[1.01]' : ''}`} style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-white hover:bg-yellow-100 hover:scale-110 transition-transform duration-200" 
                onClick={() => handleEditClick(q)}
                title="Edit Soal"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-8 w-8 hover:scale-110 transition-transform duration-200" 
                onClick={() => handleDeleteQuestion(q.id)}
                title="Hapus Soal"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2 mb-2">
              <Badge variant="default">No. {idx + 1} • {q.type.replace('_', ' ')}</Badge>
              {q.passage && <Badge variant="warning">Ada Wacana</Badge>}
              {q.imageUrl && <Badge variant="success">Ada Gambar</Badge>}
            </div>

{q.passage && (
               <div className="mb-3 p-3 bg-gray-100 border-l-4 border-black text-sm">
                  <div className="font-bold mb-1 opacity-50 uppercase text-xs">Preview Wacana:</div>
                  <div 
                     className="line-clamp-3 opacity-70 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4"
                  >
                     <div className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                       <MathRenderer text={q.passage} />
                     </div>
                  </div>
               </div>
             )}

            {q.imageUrl && (
                <div className="mb-4">
                    <img 
                      src={q.imageUrl} 
                      alt="Soal" 
                      className="max-h-48 border-2 border-black object-contain"
                    />
                </div>
            )}

            <div className="font-bold mb-2 pr-20 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
               <MathRenderer text={q.text} />
             </div>
            
            {q.type === 'PILIHAN_GANDA' && q.options && (
              <ul className="list-disc pl-5 text-sm space-y-2">
                {q.options.map((opt, i) => {
                  const optText = typeof opt === 'string' ? (opt || '') : (opt?.text || '');
                  const optImage = typeof opt === 'string' ? undefined : (opt?.imageUrl);
                  return (
                    <li key={i} className={`${i.toString() === q.correctKey ? "font-bold text-green-700 underline" : ""} break-words`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <MathRenderer text={optText} />
                      {optImage && (
                        <div className="mt-2 ml-4">
                          <img
                            src={optImage}
                            alt={`Gambar opsi ${String.fromCharCode(65 + i)}`}
                            className="max-w-full h-auto max-h-48 border-2 border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {q.type === 'PILIHAN_GANDA_KOMPLEKS' && q.options && (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {q.options.map((opt, i) => {
                  let correctIndices: string[] = [];
                  try {
                    if (q.correctKey) {
                      correctIndices = JSON.parse(q.correctKey);
                    }
                  } catch (e) {
                    correctIndices = [];
                  }
                  const isCorrect = correctIndices.includes(i.toString());
                  const optText = typeof opt === 'string' ? (opt || '') : (opt?.text || '');
                  const optImage = typeof opt === 'string' ? undefined : (opt?.imageUrl);
                  return (
                    <li key={i} className={`${isCorrect ? "font-bold text-green-700 underline" : ""} break-words`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <MathRenderer text={optText} /> {isCorrect && "✓"}
                      {optImage && (
                        <div className="mt-2 ml-4">
                          <img
                            src={optImage}
                            alt={`Gambar opsi ${String.fromCharCode(65 + i)}`}
                            className="max-w-full h-auto max-h-48 border-2 border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {q.type === 'BENAR_SALAH' && (
              <div className="text-sm font-bold mt-2">
                Kunci: <span className={q.correctKey === 'true' ? 'text-green-600' : 'text-red-600'}>{q.correctKey === 'true' ? 'BENAR' : 'SALAH'}</span>
              </div>
            )}

            {q.type === 'ISIAN_SINGKAT' && (
<div className="text-sm font-bold mt-2 text-green-700">
                 Kunci Jawaban: "<MathRenderer text={q.correctKey} />"
               </div>
            )}

            {q.type === 'MENJODOHKAN' && q.matchingPairs && (
              <div className="mt-2 grid gap-1 text-sm bg-gray-50 p-2 border-2 border-black/10">
                {q.matchingPairs.map((pair, i) => (
<div key={i} className="flex justify-between border-b border-gray-300 last:border-0 pb-1 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                     <span><MathRenderer text={pair.left} /></span>
                     <span className="font-bold">→ <MathRenderer text={pair.right} /></span>
                   </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        {questions.length === 0 && !isAdding && (
          <div className="text-center py-10 opacity-50 border-2 border-dashed border-black">
            Belum ada soal. Klik tombol di bawah untuk menambah.
          </div>
        )}
      </div>

      {/* Add/Edit Question Form */}
      {isAdding ? (
        <Card className="border-[#4F46E5] border-4 shadow-none">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-black text-lg text-[#4F46E5]">
                {editingBankQuestion ? 'Edit Soal di Bank' : editingQId ? 'Edit Soal' : 'Tambah Soal Baru'}
             </h3>
             {editingBankQuestion && <Badge variant="warning">Edit Bank Soal</Badge>}
             {editingQId && !editingBankQuestion && <Badge variant="warning">Mode Edit</Badge>}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block font-bold text-sm mb-1">Tipe Soal</label>
              <select 
                className="w-full border-2 border-black p-2 font-bold"
                value={newQType}
                onChange={(e) => setNewQType(e.target.value as QuestionType)}
              >
                <option value="PILIHAN_GANDA">Pilihan Ganda</option>
                <option value="PILIHAN_GANDA_KOMPLEKS">Pilihan Ganda Kompleks (Bisa Pilih Lebih dari Satu)</option>
                <option value="BENAR_SALAH">Benar / Salah</option>
                <option value="BENAR_SALAH_TABEL">Benar / Salah Tabel (Banyak Pernyataan)</option>
                <option value="MENJODOHKAN">Menjodohkan</option>
                <option value="SEQUENCING">Sequencing (Urutkan Item)</option>
                <option value="CLASSIFICATION">Classification (Kelompokkan ke Kategori)</option>
                <option value="ISIAN_SINGKAT">Isian Singkat</option>
                <option value="URAIAN">Uraian (Esai)</option>
              </select>
            </div>

            {/* PASSAGE TOGGLE */}
            <div>
               <div className="flex items-center justify-between mb-2">
                 <label className="font-bold text-sm">Wacana / Stimulus</label>
                 <div className="flex gap-2">
                   {/* Reuse Passage Button */}
                   {questions.length > 0 && questions.some(q => q.passage) && (
                     <select
                       className="text-xs border-2 border-black px-2 py-1 font-bold bg-white hover:bg-gray-50 cursor-pointer"
                       onChange={(e) => {
                         if (e.target.value) {
                           const selectedQ = questions.find(q => q.id === e.target.value);
                           if (selectedQ?.passage) {
                             setNewQPassage(selectedQ.passage);
                             setShowPassageInput(true);
                           }
                           e.target.value = ''; // Reset select
                         }
                       }}
                       defaultValue=""
                     >
                       <option value="">📋 Reuse Wacana...</option>
                       {questions
                         .filter(q => q.passage && q.passage.trim())
                         .map((q, idx) => (
                           <option key={q.id} value={q.id}>
                             Soal {idx + 1}: {q.passage.substring(0, 50)}...
                           </option>
                         ))}
                     </select>
                   )}
                   <Button 
                      type="button" 
                      size="sm" 
                      variant={showPassageInput ? 'destructive' : 'secondary'} 
                      onClick={() => setShowPassageInput(!showPassageInput)}
                   >
                      {showPassageInput ? 'Hapus Wacana' : '+ Tambah Wacana'}
                   </Button>
                 </div>
               </div>
               
               {showPassageInput && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                    <RichTextEditor
                      value={newQPassage}
                      onChange={setNewQPassage}
                      placeholder="Tulis wacana atau instruksi soal di sini..."
                      className="min-h-[200px]"
                    />
                 </div>
               )}
            </div>

            {/* IMAGE UPLOAD TOGGLE */}
            <div>
                <label className="block font-bold text-sm mb-1">Gambar Soal (Opsional)</label>
                
                {newQImage ? (
                    <div className="mb-2 relative inline-block">
                        <img 
                          src={newQImage} 
                          alt="Preview" 
                          className="h-32 border-2 border-black object-contain bg-gray-100"
                        />
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                            onClick={() => setNewQImage('')}
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        <Button 
                            type="button"
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full border-dashed"
                        >
                            {isUploading ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Mengupload ke Drive...</>
                            ) : (
                                <><ImageIcon className="w-4 h-4 mr-2"/> Upload Gambar (Max 2MB)</>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            <div>
              <label className="block font-bold text-sm mb-1">Pertanyaan / Instruksi</label>
              <RichTextEditor
                value={newQText}
                onChange={setNewQText}
                placeholder="Tulis pertanyaan disini..."
                className="min-h-[100px]"
              />
            </div>

            {/* FORM: PILIHAN GANDA */}
            {newQType === 'PILIHAN_GANDA' && (
              <div className="space-y-3 bg-gray-50 p-4 border-2 border-black/10">
                <label className="block font-bold text-sm mb-2">Opsi Jawaban (Centang yang benar)</label>
                {newQOptions.map((opt, i) => {
                  const optText = getOptionText(opt);
                  const optImage = getOptionImage(opt);
                  return (
                    <div key={i} className="space-y-2 border-2 border-gray-200 p-3 rounded bg-white hover:border-[#4F46E5] transition-all duration-200 hover:shadow-[2px_2px_0px_0px_#4F46E5]">
                      <div className="flex gap-2 items-center">
                        <input 
                          type="radio" 
                          name="correct-opt" 
                          className="w-4 h-4 accent-[#4F46E5] shrink-0"
                          checked={newQCorrect === i.toString()}
                          onChange={() => setNewQCorrect(i.toString())}
                        />
                        <Input 
                          value={optText} 
                          onChange={(e) => setOptionText(i, e.target.value)}
                          placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                          className="h-8 text-sm flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setCurrentOptionIndex(i);
                            setShowOptionMathModal(true);
                          }}
                          className="h-8 px-2 shrink-0"
                          title="Sisipkan rumus matematika"
                        >
                          <Sigma className="w-4 h-4" />
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) => { optionFileInputRefs.current[i] = el; }}
                          onChange={(e) => handleOptionImageUpload(e, i)}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => optionFileInputRefs.current[i]?.click()}
                          className="h-8 px-2 shrink-0"
                          title="Upload gambar opsi"
                          disabled={isUploading}
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        {optImage && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => removeOptionImage(i)}
                            className="h-8 w-8 p-0 shrink-0"
                            title="Hapus gambar"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        {newQOptions.length > 2 && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              const newOpts = newQOptions.filter((_, idx) => idx !== i);
                              setNewQOptions(newOpts);
                              // Adjust correct answer if needed
                              if (newQCorrect === i.toString()) {
                                setNewQCorrect('0'); // Reset to first option
                              } else if (parseInt(newQCorrect) > i) {
                                setNewQCorrect((parseInt(newQCorrect) - 1).toString());
                              }
                            }}
                            className="h-8 w-8 p-0 shrink-0"
                            title="Hapus opsi"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {optImage && (
                        <div className="ml-6 mt-2">
                          <img
                            src={optImage}
                            alt={`Gambar opsi ${String.fromCharCode(65 + i)}`}
                            className="max-w-full h-auto max-h-48 border-2 border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setNewQOptions([...newQOptions, ''])}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Opsi
                </Button>
                {newQOptions.length < 2 && (
                  <p className="text-xs text-red-600 font-bold">⚠️ Minimal 2 opsi!</p>
                )}
              </div>
            )}

            {/* FORM: PILIHAN GANDA KOMPLEKS */}
            {newQType === 'PILIHAN_GANDA_KOMPLEKS' && (
              <div className="space-y-3 bg-gray-50 p-4 border-2 border-black/10">
                <label className="block font-bold text-sm mb-2">Opsi Jawaban (Centang <strong>SEMUA</strong> yang benar - bisa lebih dari satu)</label>
                {newQOptions.map((opt, i) => {
                  const isCorrect = newQComplexCorrect.includes(i.toString());
                  const optText = getOptionText(opt);
                  const optImage = getOptionImage(opt);
                  return (
                    <div key={i} className="space-y-2 border-2 border-gray-200 p-3 rounded bg-white hover:border-[#4F46E5] transition-all duration-200 hover:shadow-[2px_2px_0px_0px_#4F46E5]">
                      <div className="flex gap-2 items-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-[#4F46E5] shrink-0"
                        checked={isCorrect}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Add to correct array
                            if (!newQComplexCorrect.includes(i.toString())) {
                              setNewQComplexCorrect([...newQComplexCorrect, i.toString()].sort());
                            }
                          } else {
                            // Remove from correct array
                            setNewQComplexCorrect(newQComplexCorrect.filter(idx => idx !== i.toString()));
                          }
                        }}
                      />
                      <Input 
                        value={typeof opt === 'string' ? opt : opt.text} 
                        onChange={(e) => setOptionText(i, e.target.value)}
                        placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCurrentOptionIndex(i);
                          setShowOptionMathModal(true);
                        }}
                        className="h-8 px-2 shrink-0"
                        title="Sisipkan rumus matematika"
                      >
                        <Sigma className="w-4 h-4" />
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => { optionFileInputRefs.current[i] = el; }}
                        onChange={(e) => handleOptionImageUpload(e, i)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => optionFileInputRefs.current[i]?.click()}
                        className="h-8 px-2 shrink-0"
                        title="Upload gambar opsi"
                        disabled={isUploading}
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      {typeof opt === 'object' && opt.imageUrl && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeOptionImage(i)}
                          className="h-8 w-8 p-0 shrink-0"
                          title="Hapus gambar"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {isCorrect && (
                        <Badge variant="success" className="text-xs shrink-0">Benar</Badge>
                      )}
                      {newQOptions.length > 2 && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const newOpts = newQOptions.filter((_, idx) => idx !== i);
                            setNewQOptions(newOpts);
                            // Adjust correct answers - remove this index and adjust higher indices
                            const updatedCorrect = newQComplexCorrect
                              .filter(idx => idx !== i.toString())
                              .map(idx => {
                                const numIdx = parseInt(idx);
                                return numIdx > i ? (numIdx - 1).toString() : idx;
                              });
                            setNewQComplexCorrect(updatedCorrect);
                          }}
                          className="h-8 w-8 p-0 shrink-0"
                          title="Hapus opsi"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      </div>
                      {optImage && (
                        <div className="ml-6 mt-2">
                          <img
                            src={optImage}
                            alt={`Gambar opsi ${String.fromCharCode(65 + i)}`}
                            className="max-w-full h-auto max-h-48 border-2 border-gray-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setNewQOptions([...newQOptions, ''])}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Opsi
                </Button>
                {newQOptions.length < 2 && (
                  <p className="text-xs text-red-600 font-bold mt-2">⚠️ Minimal 2 opsi!</p>
                )}
                {newQComplexCorrect.length === 0 && (
                  <p className="text-xs text-red-600 font-bold mt-2">⚠️ Pilih minimal 1 jawaban benar!</p>
                )}
                {newQComplexCorrect.length > 0 && (
                  <p className="text-xs text-green-600 font-bold mt-2">
                    ✅ {newQComplexCorrect.length} jawaban benar dipilih
                  </p>
                )}
              </div>
            )}

            {/* FORM: BENAR SALAH */}
            {newQType === 'BENAR_SALAH' && (
               <div className="space-y-2 bg-gray-50 p-4 border-2 border-black/10">
                  <label className="block font-bold text-sm">Kunci Jawaban</label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2 p-3 border-2 border-black cursor-pointer ${newQTrueFalse === 'true' ? 'bg-[#51CF66]' : 'bg-white'}`}>
                      <input 
                        type="radio" 
                        className="w-4 h-4 accent-black"
                        checked={newQTrueFalse === 'true'}
                        onChange={() => setNewQTrueFalse('true')}
                      />
                      <span className="font-black">BENAR</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 border-2 border-black cursor-pointer ${newQTrueFalse === 'false' ? 'bg-[#FF6B6B] text-white' : 'bg-white'}`}>
                      <input 
                        type="radio" 
                        className="w-4 h-4 accent-black"
                        checked={newQTrueFalse === 'false'}
                        onChange={() => setNewQTrueFalse('false')}
                      />
                      <span className="font-black">SALAH</span>
                    </label>
                  </div>
               </div>
            )}

            {/* FORM: BENAR SALAH TABEL */}
            {newQType === 'BENAR_SALAH_TABEL' && (
              <div className="space-y-2 bg-gray-50 p-4 border-2 border-black/10">
                <label className="block font-bold text-sm mb-2">Pernyataan (Pilih Benar/Salah untuk setiap pernyataan)</label>
                <div className="space-y-3">
                  {newStatements.map((statement, i) => (
                    <div key={i} className="flex gap-2 items-start p-3 bg-white border-2 border-black/20">
                      <span className="font-bold text-sm w-6 shrink-0 pt-2">{i + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          value={statement.text}
                          onChange={(e) => {
                            const updated = [...newStatements];
                            updated[i].text = e.target.value;
                            setNewStatements(updated);
                          }}
                          placeholder={`Pernyataan ${i + 1}...`}
                          className="min-h-[60px] text-sm"
                        />
                        <div className="flex gap-3">
                          <label className={`flex items-center gap-2 px-3 py-1.5 border-2 border-black cursor-pointer text-sm font-bold transition-all ${
                            statement.correctAnswer === 'true' 
                              ? 'bg-[#51CF66] text-black shadow-[2px_2px_0px_0px_#000]' 
                              : 'bg-white hover:bg-gray-50'
                          }`}>
                            <input
                              type="radio"
                              name={`statement-${i}`}
                              className="w-4 h-4 accent-black"
                              checked={statement.correctAnswer === 'true'}
                              onChange={() => {
                                const updated = [...newStatements];
                                updated[i].correctAnswer = 'true';
                                setNewStatements(updated);
                              }}
                            />
                            <span>✅ BENAR</span>
                          </label>
                          <label className={`flex items-center gap-2 px-3 py-1.5 border-2 border-black cursor-pointer text-sm font-bold transition-all ${
                            statement.correctAnswer === 'false' 
                              ? 'bg-[#FF6B6B] text-white shadow-[2px_2px_0px_0px_#000]' 
                              : 'bg-white hover:bg-gray-50'
                          }`}>
                            <input
                              type="radio"
                              name={`statement-${i}`}
                              className="w-4 h-4 accent-black"
                              checked={statement.correctAnswer === 'false'}
                              onChange={() => {
                                const updated = [...newStatements];
                                updated[i].correctAnswer = 'false';
                                setNewStatements(updated);
                              }}
                            />
                            <span>❌ SALAH</span>
                          </label>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          if (newStatements.length > 2) {
                            setNewStatements(newStatements.filter((_, idx) => idx !== i));
                          }
                        }}
                        disabled={newStatements.length <= 2}
                        title="Hapus Pernyataan"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setNewStatements([...newStatements, {text: '', correctAnswer: 'true'}])}
                  className="mt-2 w-full"
                >
                  <Plus className="w-4 h-4 mr-1" /> Tambah Pernyataan
                </Button>
                <p className="text-xs text-gray-500 font-medium mt-2">
                  💡 Siswa akan melihat tabel dengan kolom No, Pernyataan, dan pilihan Benar/Salah untuk setiap pernyataan.
                </p>
              </div>
            )}

            {/* FORM: ISIAN SINGKAT */}
            {newQType === 'ISIAN_SINGKAT' && (
              <div className="space-y-2 bg-gray-50 p-4 border-2 border-black/10">
                <label className="block font-bold text-sm">Kunci Jawaban (Singkat & Jelas)</label>
                <Input 
                  value={newQShortAnswerKey}
                  onChange={(e) => setNewQShortAnswerKey(e.target.value)}
                  placeholder="Contoh: Newton, Fotosintesis, 10 m/s..."
                />
                <p className="text-xs text-gray-500 font-medium">Sistem akan mencocokkan jawaban siswa (tidak case-sensitive).</p>
              </div>
            )}

            {/* FORM: MENJODOHKAN */}
            {newQType === 'MENJODOHKAN' && (
              <div className="space-y-2 bg-gray-50 p-4 border-2 border-black/10">
                <label className="block font-bold text-sm mb-2">Pasangan Jawaban (Kiri = Soal, Kanan = Jawaban)</label>
                {newMatchingPairs.map((pair, i) => (
                  <div key={i} className="flex gap-2 items-center mb-2">
                    <span className="font-bold text-xs w-4">{i+1}.</span>
                    <Input 
                      value={pair.left} 
                      onChange={(e) => updateMatchingPair(i, 'left', e.target.value)}
                      placeholder="Item Kiri (Premis)"
                      className="h-9 text-sm"
                    />
                    <span className="font-black">→</span>
                    <Input 
                      value={pair.right} 
                      onChange={(e) => updateMatchingPair(i, 'right', e.target.value)}
                      placeholder="Item Kanan (Jawaban)"
                      className="h-9 text-sm"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-9 w-9 shrink-0" 
                      onClick={() => removeMatchingPair(i)}
                      disabled={newMatchingPairs.length <= 2}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={addMatchingPair} className="mt-2 w-full">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Pasangan
                </Button>
              </div>
            )}

            {/* FORM: SEQUENCING */}
            {newQType === 'SEQUENCING' && (
              <div className="space-y-2 bg-gray-50 p-4 border-2 border-black/10">
                <label className="block font-bold text-sm mb-2">Item untuk Diurutkan (Urutan saat ini = Urutan Benar)</label>
                <div className="space-y-2">
                  {newSequenceItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="w-8 h-8 border-2 border-black bg-[#FFD43B] flex items-center justify-center font-black text-sm">
                        {i + 1}
                      </div>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...newSequenceItems];
                          updated[i] = e.target.value;
                          setNewSequenceItems(updated);
                        }}
                        placeholder={`Item ${i + 1}`}
                        className="h-9 text-sm"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          if (newSequenceItems.length > 2) {
                            setNewSequenceItems(newSequenceItems.filter((_, idx) => idx !== i));
                          }
                        }}
                        disabled={newSequenceItems.length <= 2}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setNewSequenceItems([...newSequenceItems, ''])} className="mt-2 w-full">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Item
                </Button>
                <p className="text-xs text-gray-500 font-medium mt-2">
                  💡 Urutan item saat ini akan menjadi urutan benar. Siswa akan mengurutkan ulang item-item ini.
                </p>
              </div>
            )}

            {/* FORM: CLASSIFICATION */}
            {newQType === 'CLASSIFICATION' && (
              <div className="space-y-4 bg-gray-50 p-4 border-2 border-black/10">
                <div>
                  <label className="block font-bold text-sm mb-2">Item untuk Dikelompokkan</label>
                  {newClassificationItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <span className="font-bold text-xs w-6">{i + 1}.</span>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...newClassificationItems];
                          updated[i] = e.target.value;
                          setNewClassificationItems(updated);
                        }}
                        placeholder={`Item ${i + 1}`}
                        className="h-9 text-sm"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          if (newClassificationItems.length > 2) {
                            setNewClassificationItems(newClassificationItems.filter((_, idx) => idx !== i));
                            const newMapping = { ...newClassificationMapping };
                            delete newMapping[i.toString()];
                            Object.keys(newMapping).forEach(key => {
                              const idx = parseInt(key);
                              if (idx > i) {
                                newMapping[(idx - 1).toString()] = newMapping[key];
                                delete newMapping[key];
                              }
                            });
                            setNewClassificationMapping(newMapping);
                          }
                        }}
                        disabled={newClassificationItems.length <= 2}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => setNewClassificationItems([...newClassificationItems, ''])} className="mt-2 w-full">
                    <Plus className="w-4 h-4 mr-1" /> Tambah Item
                  </Button>
                </div>

                <div>
                  <label className="block font-bold text-sm mb-2">Kategori</label>
                  {newCategories.map((cat, i) => (
                    <div key={i} className="flex gap-2 items-center mb-2">
                      <span className="font-bold text-xs w-6">{i + 1}.</span>
                      <Input
                        value={cat}
                        onChange={(e) => {
                          const updated = [...newCategories];
                          updated[i] = e.target.value;
                          setNewCategories(updated);
                        }}
                        placeholder={`Kategori ${i + 1}`}
                        className="h-9 text-sm"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          if (newCategories.length > 2) {
                            setNewCategories(newCategories.filter((_, idx) => idx !== i));
                            const newMapping = { ...newClassificationMapping };
                            Object.keys(newMapping).forEach(key => {
                              const catIdx = newMapping[key];
                              if (catIdx === i) delete newMapping[key];
                              else if (catIdx > i) newMapping[key] = catIdx - 1;
                            });
                            setNewClassificationMapping(newMapping);
                          }
                        }}
                        disabled={newCategories.length <= 2}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" size="sm" onClick={() => setNewCategories([...newCategories, ''])} className="mt-2 w-full">
                    <Plus className="w-4 h-4 mr-1" /> Tambah Kategori
                  </Button>
                </div>

                <div>
                  <label className="block font-bold text-sm mb-2">Mapping: Item → Kategori (Jawaban Benar)</label>
                  <div className="space-y-2">
                    {newClassificationItems.map((item, itemIdx) => (
                      item.trim() && (
                        <div key={itemIdx} className="flex gap-2 items-center p-2 bg-white border-2 border-black/20">
                          <span className="font-bold text-sm w-32">{item}</span>
                          <span className="text-gray-400">→</span>
                          <select
                            className="flex-1 border-2 border-black p-2 font-bold text-sm"
                            value={newClassificationMapping[itemIdx.toString()] ?? ''}
                            onChange={(e) => {
                              const newMapping = { ...newClassificationMapping };
                              if (e.target.value) {
                                newMapping[itemIdx.toString()] = parseInt(e.target.value);
                              } else {
                                delete newMapping[itemIdx.toString()];
                              }
                              setNewClassificationMapping(newMapping);
                            }}
                          >
                            <option value="">Pilih Kategori...</option>
                            {newCategories.map((cat, catIdx) => (
                              <option key={catIdx} value={catIdx}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FORM: URAIAN */}
            {newQType === 'URAIAN' && (
               <div className="bg-yellow-50 p-4 border-2 border-black/10">
                 <p className="text-sm font-bold">ℹ️ Soal Uraian memerlukan pemeriksaan manual oleh Guru. Nilai otomatis = 0.</p>
               </div>
            )}

            {/* Save to Bank Toggle */}
            <div className="bg-[#E0F2F1] p-4 border-2 border-[#4F46E5]">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToBank}
                  onChange={(e) => setSaveToBank(e.target.checked)}
                  className="w-5 h-5 accent-[#4F46E5] cursor-pointer mt-0.5"
                />
                <div className="flex-1">
                  <span className="font-black text-sm">Simpan ke Bank Soal</span>
                  {!editingQId && !editingBankQuestion && (
                    <p className="text-xs text-gray-700 font-medium mt-1 leading-relaxed">
                      {saveToBank ? (
                        <span className="text-green-700">
                          <strong>✓ Direkomendasikan:</strong>
                          {' '}
                          {(() => {
                            const reasons = [];
                            if (newQImage) reasons.push('ada gambar');
                            if (newQPassage && newQPassage.length > 50) reasons.push('ada wacana');
                            if (['MENJODOHKAN', 'BENAR_SALAH_TABEL', 'SEQUENCING', 'CLASSIFICATION'].includes(newQType)) reasons.push('soal kompleks');
                            if (newQType === 'PILIHAN_GANDA' && newQOptions.length >= 5) reasons.push('5+ opsi');
                            if (bankSubject && bankTags) reasons.push('metadata lengkap');
                            return reasons.length > 0 ? reasons.join(', ') : 'soal berkualitas';
                          })()}
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          Soal sederhana - Centang jika ingin menyimpan untuk digunakan kembali
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </label>
              {saveToBank && (
                <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                  {editingBankQuestion && (
                    <div className="mb-2 p-2 bg-yellow-100 border-2 border-yellow-400">
                      <p className="text-xs font-bold">⚠️ Mode Edit: Perubahan hanya akan mengupdate soal di bank, tidak menambah ke ujian.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block font-bold text-xs mb-1">Subject</label>
                      <Input
                        value={bankSubject}
                        onChange={(e) => setBankSubject(e.target.value)}
                        placeholder="Contoh: IPA"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs mb-1">Difficulty</label>
                      <select
                        value={bankDifficulty}
                        onChange={(e) => setBankDifficulty(e.target.value as 'Mudah' | 'Sedang' | 'Sulit')}
                        className="w-full border-2 border-black p-2 font-bold text-sm h-8"
                      >
                        <option value="Mudah">Mudah</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Sulit">Sulit</option>
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block font-bold text-xs mb-1">Tags (comma-separated)</label>
                      <div className="relative">
                        <Input
                          value={bankTags}
                          onChange={(e) => setBankTags(e.target.value)}
                          placeholder="Contoh: Getaran, Gelombang"
                          className="h-8 text-sm"
                          list="tag-suggestions"
                        />
                        <datalist id="tag-suggestions">
                          {allTags.map(tag => (
                            <option key={tag} value={tag} />
                          ))}
                        </datalist>
                      </div>
                      {allTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs text-gray-500 font-medium">Suggestions:</span>
                          {allTags.slice(0, 8).map(tag => {
                            const isIncluded = bankTags.toLowerCase().includes(tag.toLowerCase());
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const currentTags = bankTags.split(',').map(t => t.trim()).filter(t => t);
                                  if (isIncluded) {
                                    setBankTags(currentTags.filter(t => t.toLowerCase() !== tag.toLowerCase()).join(', '));
                                  } else {
                                    setBankTags([...currentTags, tag].join(', '));
                                  }
                                }}
                                className={`px-2 py-0.5 text-xs border border-black font-bold transition-all ${
                                  isIncluded 
                                    ? 'bg-[#4F46E5] text-white' 
                                    : 'bg-white hover:bg-gray-50'
                                }`}
                              >
                                {isIncluded ? '✓ ' : ''}{tag}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    💡 Soal akan tersimpan di bank soal dan bisa digunakan untuk ujian lain
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="ghost" 
                onClick={resetForm}
                disabled={isSavingQuestion}
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveQuestion}
                disabled={!newQText.trim() || isSavingQuestion}
              >
                {isSavingQuestion ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {saveToBank ? 'Menyimpan ke Bank...' : 'Menyimpan...'}
                  </>
                ) : (
                  editingQId ? 'Update Soal' : 'Tambah ke Daftar'
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Sticky Tabs */}
          <div className="sticky top-[88px] z-40 bg-white -mx-6 px-6 pb-2 mb-4">
            <div className="flex gap-2 border-b-2 border-black">
              <button
                onClick={() => { setViewMode('CREATE'); setIsAdding(true); }}
                className={`px-4 py-2 font-black border-b-4 transition-all ${
                  viewMode === 'CREATE' 
                    ? 'border-[#4F46E5] text-[#4F46E5]' 
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                <Plus className="w-4 h-4 inline mr-2" /> Tambah Soal Baru
              </button>
              <button
                onClick={() => { setViewMode('BANK'); refreshBankQuestions(); }}
                className={`px-4 py-2 font-black border-b-4 transition-all flex items-center gap-2 ${
                  viewMode === 'BANK' 
                    ? 'border-[#4F46E5] text-[#4F46E5]' 
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                <Database className="w-4 h-4" /> Bank Soal ({bankQuestions.length})
              </button>
            </div>
          </div>

          {/* Content based on view mode */}
          {viewMode === 'CREATE' ? (
            <Button variant="secondary" className="w-full py-4 border-dashed" onClick={() => setIsAdding(true)}>
              <Plus className="w-5 h-5 mr-2" /> Tambah Soal Baru
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Filter Section */}
              <Card className="p-4 border-2 border-black">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block font-bold text-sm mb-1 flex items-center gap-2">
                        <Search className="w-4 h-4" /> Search (Text, Tags, atau Subject)
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={bankSearchText}
                          onChange={(e) => setBankSearchText(e.target.value)}
                          placeholder="Cari soal, tags, atau subject..."
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="md:w-48">
                      <label className="block font-bold text-sm mb-1">Subject</label>
                      <select
                        value={bankFilterSubject}
                        onChange={(e) => setBankFilterSubject(e.target.value)}
                        className="w-full border-2 border-black p-2 font-bold"
                      >
                        <option value="">Semua Subject</option>
                        {[...new Set(bankQuestions.map(q => q.subject).filter(s => s))].sort().map(subj => (
                          <option key={subj} value={subj}>{subj}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:w-48">
                      <label className="block font-bold text-sm mb-1">Tipe Soal</label>
                      <select
                        value={bankFilterType}
                        onChange={(e) => setBankFilterType(e.target.value)}
                        className="w-full border-2 border-black p-2 font-bold"
                      >
                        <option value="">Semua Tipe</option>
                        {['PILIHAN_GANDA', 'PILIHAN_GANDA_KOMPLEKS', 'BENAR_SALAH', 'BENAR_SALAH_TABEL', 'MENJODOHKAN', 'SEQUENCING', 'CLASSIFICATION', 'ISIAN_SINGKAT', 'URAIAN'].map(type => (
                          <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:w-48">
                      <label className="block font-bold text-sm mb-1">Difficulty</label>
                      <select
                        value={bankFilterDifficulty}
                        onChange={(e) => setBankFilterDifficulty(e.target.value)}
                        className="w-full border-2 border-black p-2 font-bold"
                      >
                        <option value="">Semua Level</option>
                        <option value="Mudah">Mudah</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Sulit">Sulit</option>
                      </select>
                    </div>
                    <div className="md:w-48">
                      <label className="block font-bold text-sm mb-1">Kualitas</label>
                      <select
                        value={bankFilterQuality}
                        onChange={(e) => setBankFilterQuality(e.target.value)}
                        className="w-full border-2 border-black p-2 font-bold"
                      >
                        <option value="">Semua Kualitas</option>
                        <option value="Sangat Baik">Sangat Baik</option>
                        <option value="Baik">Baik</option>
                        <option value="Cukup">Cukup</option>
                        <option value="Perlu Review">Perlu Review</option>
                        <option value="Harus Dibuang">Harus Dibuang</option>
                      </select>
                    </div>
                  </div>
                  {/* Tags Filter */}
                  {allTags.length > 0 && (
                    <div>
                      <label className="block font-bold text-sm mb-2">Filter by Tags:</label>
                      <div className="flex flex-wrap gap-2">
                        {allTags.slice(0, 10).map(tag => {
                          const isSelected = bankFilterTag === tag;
                          return (
                            <button
                              key={tag}
                              onClick={() => setBankFilterTag(isSelected ? '' : tag)}
                              className={`px-3 py-1 border-2 border-black text-xs font-bold transition-all ${
                                isSelected 
                                  ? 'bg-[#4F46E5] text-white shadow-[2px_2px_0px_0px_#000]' 
                                  : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                        {allTags.length > 10 && (
                          <span className="px-3 py-1 text-xs text-gray-500 self-center">
                            +{allTags.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick Quality Filters */}
                  <div>
                    <label className="block font-bold text-sm mb-2">
                      Quick Filter by Quality: 
                      {bankFilterQuality && (
                        <span className="ml-2 text-xs text-[#4F46E5]">
                          (Active: {bankFilterQuality})
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={bankFilterQuality === 'Sangat Baik' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setBankFilterQuality(bankFilterQuality === 'Sangat Baik' ? '' : 'Sangat Baik')}
                        className="text-xs"
                      >
                        Sangat Baik ({bankQuestions.filter(q => q.qualityStatus === 'Sangat Baik').length})
                      </Button>
                      <Button
                        variant={bankFilterQuality === 'Baik' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setBankFilterQuality(bankFilterQuality === 'Baik' ? '' : 'Baik')}
                        className="text-xs"
                      >
                        Baik ({bankQuestions.filter(q => q.qualityStatus === 'Baik').length})
                      </Button>
                      <Button
                        variant={bankFilterQuality === 'Perlu Review' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setBankFilterQuality(bankFilterQuality === 'Perlu Review' ? '' : 'Perlu Review')}
                        className="text-xs"
                      >
                        Perlu Review ({bankQuestions.filter(q => q.qualityStatus === 'Perlu Review').length})
                      </Button>
                      <Button
                        variant={bankFilterQuality === 'Harus Dibuang' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setBankFilterQuality(bankFilterQuality === 'Harus Dibuang' ? '' : 'Harus Dibuang')}
                        className="text-xs"
                      >
                        Harus Dibuang ({bankQuestions.filter(q => q.qualityStatus === 'Harus Dibuang').length})
                      </Button>
                      <Button
                        variant={bankFilterQuality === 'Belum Dianalisis' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setBankFilterQuality(bankFilterQuality === 'Belum Dianalisis' ? '' : 'Belum Dianalisis')}
                        className="text-xs"
                      >
                        Belum Dianalisis ({bankQuestions.filter(q => !q.qualityStatus).length})
                      </Button>
                    </div>
                  </div>

                  {/* Advanced Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t-2 border-black/10">
                    <div>
                      <label className="block font-bold text-sm mb-2">Filter by Usage:</label>
                      <select
                        value={bankFilterUsage}
                        onChange={(e) => setBankFilterUsage(e.target.value)}
                        className="w-full border-2 border-black p-2 font-bold text-sm"
                      >
                        <option value="">Semua</option>
                        <option value="0">Belum Pernah (0x)</option>
                        <option value="1-3">Jarang (1-3x)</option>
                        <option value="4+">Sering (4+x)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block font-bold text-sm mb-2">Analyzed From:</label>
                      <Input
                        type="date"
                        value={bankFilterDateFrom}
                        onChange={(e) => setBankFilterDateFrom(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                    
                    <div>
                      <label className="block font-bold text-sm mb-2">Analyzed To:</label>
                      <Input
                        type="date"
                        value={bankFilterDateTo}
                        onChange={(e) => setBankFilterDateTo(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>

                  {(bankSearchText || bankFilterSubject || bankFilterType || bankFilterDifficulty || bankFilterQuality || bankFilterTag || bankFilterUsage || bankFilterDateFrom || bankFilterDateTo) && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBankSearchText('');
                          setBankFilterSubject('');
                          setBankFilterType('');
                          setBankFilterDifficulty('');
                          setBankFilterQuality('');
                          setBankFilterTag('');
                          setBankFilterUsage('');
                          setBankFilterDateFrom('');
                          setBankFilterDateTo('');
                        }}
                        className="text-xs"
                      >
                        <X className="w-3 h-3 mr-1" /> Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Filtered Questions List */}
              {(() => {
                const filtered = bankQuestions.filter(q => {
                  // Enhanced Search: search in text, tags, and subject
                  const searchLower = bankSearchText.toLowerCase();
                  const matchSearch = !bankSearchText || 
                    q.text.toLowerCase().includes(searchLower) ||
                    (q.tags && q.tags.toLowerCase().includes(searchLower)) ||
                    (q.subject && q.subject.toLowerCase().includes(searchLower));
                  
                  const matchSubject = !bankFilterSubject || q.subject === bankFilterSubject;
                  const matchType = !bankFilterType || q.type === bankFilterType;
                  const matchDifficulty = !bankFilterDifficulty || q.difficulty === bankFilterDifficulty;
                  
                  // Quality filter with special handling
                  let matchQuality = true;
                  if (bankFilterQuality) {
                    if (bankFilterQuality === 'Belum Dianalisis') {
                      matchQuality = !q.qualityStatus || q.qualityStatus === '';
                    } else {
                      matchQuality = q.qualityStatus === bankFilterQuality;
                    }
                  }
                  
                  // Tag filter: check if question has the selected tag
                  const matchTag = !bankFilterTag || (q.tags && q.tags.split(',').some(t => t.trim().toLowerCase() === bankFilterTag.toLowerCase()));
                  
                  // Usage filter
                  const usageCount = q.usageCount || 0;
                  let matchUsage = true;
                  if (bankFilterUsage === '0') matchUsage = usageCount === 0;
                  else if (bankFilterUsage === '1-3') matchUsage = usageCount >= 1 && usageCount <= 3;
                  else if (bankFilterUsage === '4+') matchUsage = usageCount >= 4;
                  
                  // Date filter
                  let matchDate = true;
                  if (bankFilterDateFrom || bankFilterDateTo) {
                    if (q.lastAnalyzed) {
                      const qDate = new Date(q.lastAnalyzed);
                      if (bankFilterDateFrom) {
                        const fromDate = new Date(bankFilterDateFrom);
                        matchDate = matchDate && qDate >= fromDate;
                      }
                      if (bankFilterDateTo) {
                        const toDate = new Date(bankFilterDateTo);
                        toDate.setHours(23, 59, 59, 999); // End of day
                        matchDate = matchDate && qDate <= toDate;
                      }
                    } else {
                      matchDate = false; // If no lastAnalyzed but date filter is active, exclude
                    }
                  }
                  
                  return matchSearch && matchSubject && matchType && matchDifficulty && matchQuality && matchTag && matchUsage && matchDate;
                });

                // Pagination logic
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedQuestions = filtered.slice(startIndex, endIndex);

                return (
                  <>
                    {filtered.length === 0 ? (
                      <Card className="p-8 text-center">
                        <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="font-bold text-gray-500">Tidak ada soal di bank soal</p>
                        <p className="text-sm text-gray-400 mt-2">Buat soal baru dan centang "Simpan ke Bank" untuk menambahkannya</p>
                      </Card>
                    ) : (
                      <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <p className="font-bold">
                              Ditemukan {filtered.length} soal
                              {filtered.length !== bankQuestions.length && (
                                <span className="text-gray-500 ml-1 text-sm">
                                  dari {bankQuestions.length} total
                                </span>
                              )}
                              {selectedBankQuestions.size > 0 && (
                                <span className="text-[#4F46E5] ml-2">
                                  ({selectedBankQuestions.size} dipilih)
                                </span>
                              )}
                            </p>
                            {filtered.length > 0 && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const allFilteredIds = new Set(filtered.map(q => q.id));
                                    setSelectedBankQuestions(allFilteredIds);
                                  }}
                                  className="text-xs"
                                  disabled={selectedBankQuestions.size === filtered.length}
                                >
                                  Select All ({filtered.length})
                                </Button>
                                {selectedBankQuestions.size > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedBankQuestions(new Set())}
                                    className="text-xs"
                                  >
                                    Clear Selection
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                          {selectedBankQuestions.size > 0 && (
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                onClick={() => {
                                  const newQuestions = addQuestionsFromBank(Array.from(selectedBankQuestions));
                                  setQuestions([...questions, ...newQuestions]);
                                  setHasUnsavedChanges(true);
                                  setSelectedBankQuestions(new Set());
                                  setAlertMessage({ title: 'Berhasil', message: `${newQuestions.length} soal berhasil ditambahkan ke ujian!`, variant: 'success' });
                                  setShowAlert(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" /> Tambah {selectedBankQuestions.size} Soal
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={handleBulkExport}
                                className="flex items-center gap-2"
                                title="Export selected questions as JSON"
                              >
                                <Download className="w-4 h-4" /> Export
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="flex items-center gap-2"
                              >
                                {isBulkDeleting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Menghapus...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4" /> Hapus {selectedBankQuestions.size}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {paginatedQuestions.map((bankQ) => (
                            <Card key={bankQ.id} className={`border-2 transition-all ${
                              selectedBankQuestions.has(bankQ.id) ? 'border-[#4F46E5] bg-[#4F46E5]/5' : 'border-black'
                            }`}>
                              {/* Header: Quality Status + Checkbox */}
                              <div className="flex items-center justify-between gap-2 px-4 py-2 border-b-2 border-black/10">
                                {bankQ.qualityStatus ? (
                                  <Badge className={`font-black uppercase tracking-wide ${
                                    bankQ.qualityStatus === 'Sangat Baik' ? 'bg-green-500 text-white' :
                                    bankQ.qualityStatus === 'Baik' ? 'bg-blue-500 text-white' :
                                    bankQ.qualityStatus === 'Cukup' ? 'bg-yellow-500 text-black' :
                                    bankQ.qualityStatus === 'Perlu Review' ? 'bg-orange-500 text-white' :
                                    bankQ.qualityStatus === 'Harus Dibuang' ? 'bg-red-500 text-white' :
                                    'bg-gray-500 text-white'
                                  }`}>
                                    {bankQ.qualityStatus}
                                  </Badge>
                                ) : (
                                  <Badge className="font-bold uppercase tracking-wide bg-gray-200 text-gray-600">
                                    Belum Dianalisis
                                  </Badge>
                                )}
                                <input
                                  type="checkbox"
                                  checked={selectedBankQuestions.has(bankQ.id)}
                                  onChange={() => {
                                    const newSelected = new Set(selectedBankQuestions);
                                    if (newSelected.has(bankQ.id)) {
                                      newSelected.delete(bankQ.id);
                                    } else {
                                      newSelected.add(bankQ.id);
                                    }
                                    setSelectedBankQuestions(newSelected);
                                  }}
                                  className="w-5 h-5 accent-[#4F46E5] cursor-pointer"
                                />
                              </div>

                              {/* Content Area */}
                              <div className="p-4 space-y-3">
                                {/* Meta Badges: Type, Subject, Difficulty */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="default" className="font-bold">{bankQ.type.replace(/_/g, ' ')}</Badge>
                                  {bankQ.subject && <Badge variant="outline">{bankQ.subject}</Badge>}
                                  {bankQ.difficulty && <Badge variant="outline">{bankQ.difficulty}</Badge>}
                                  {bankQ.discriminationIndex !== undefined && (
                                    <Badge variant="outline" className="font-black">
                                      D: {bankQ.discriminationIndex.toFixed(2)}
                                    </Badge>
                                  )}
                                </div>

                                {/* Question Text */}
                                <p className="font-bold text-base leading-tight line-clamp-2 min-h-[2.5rem]">
                                  <MathRenderer text={bankQ.text} />
                                </p>

                                {/* Tags */}
                                {bankQ.tags && bankQ.tags.trim() && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {bankQ.tags.split(',').filter(tag => tag.trim()).map((tag, idx) => {
                                      const trimmedTag = tag.trim();
                                      return (
                                        <span
                                          key={idx}
                                          onClick={() => setBankFilterTag(trimmedTag)}
                                          className="text-xs bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-sm cursor-pointer hover:bg-gray-200 hover:border-gray-400 transition-all font-medium"
                                        >
                                          {trimmedTag}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Usage & Stats Info */}
                                <div className="flex items-center gap-3 text-xs text-gray-600 font-bold flex-wrap pt-2 border-t border-gray-200">
                                  {bankQ.usageCount !== undefined && bankQ.usageCount > 0 ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowHistoryModal({ questionId: bankQ.id, questionText: bankQ.text })}
                                        className="text-xs px-2 py-1 h-auto font-bold hover:bg-gray-100"
                                      >
                                        <History className="w-3 h-3 mr-1" />
                                        {bankQ.usageCount}x digunakan
                                      </Button>
                                      {bankQ.lastUsedAt && (
                                        <span>• {new Date(bankQ.lastUsedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                      )}
                                      {bankQ.difficultyIndex !== undefined && (
                                        <span>• P: {(bankQ.difficultyIndex * 100).toFixed(0)}%</span>
                                      )}
                                      {bankQ.discriminationIndex !== undefined && (
                                        <span>• D: {bankQ.discriminationIndex.toFixed(2)}</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400 italic">Belum pernah digunakan</span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 px-4 pb-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowBankPreview(showBankPreview === bankQ.id ? null : bankQ.id)}
                                  className="flex-1"
                                >
                                  {showBankPreview === bankQ.id ? 'Tutup' : 'Preview'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingBankQuestion(bankQ);
                                    setViewMode('CREATE');
                                    setIsAdding(true);
                                    // Load question data to form (convert QuestionBankItem to Question)
                                    const questionForEdit: Question = {
                                      id: bankQ.id,
                                      text: bankQ.text,
                                      type: bankQ.type,
                                      imageUrl: bankQ.imageUrl,
                                      passage: bankQ.passage,
                                      options: bankQ.options,
                                      matchingPairs: bankQ.matchingPairs,
                                      statements: bankQ.statements,
                                      sequenceItems: bankQ.sequenceItems,
                                      correctSequence: bankQ.correctSequence,
                                      classificationItems: bankQ.classificationItems,
                                      categories: bankQ.categories,
                                      classificationMapping: bankQ.classificationMapping,
                                      correctKey: bankQ.correctKey
                                    };
                                    handleEditClick(questionForEdit);
                                    setSaveToBank(true);
                                    setBankSubject(bankQ.subject || '');
                                    setBankDifficulty((bankQ.difficulty as 'Mudah' | 'Sedang' | 'Sulit') || 'Sedang');
                                    setBankTags(bankQ.tags || '');
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setShowDeleteBankConfirm(bankQ.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              {showBankPreview === bankQ.id && (
                                <div className="mt-3 p-4 bg-white border-2 border-black text-sm space-y-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <p className="font-black text-base">Preview Lengkap Soal</p>
                                    <Button variant="ghost" size="icon" onClick={() => setShowBankPreview(null)} className="h-6 w-6">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  
                                  <div>
                                    <p className="font-bold mb-1">Pertanyaan:</p>
                                    <p className="text-sm break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                  <MathRenderer text={bankQ.text} />
                                </p>
                                  </div>

                                  {bankQ.passage && (
                                    <div className="bg-yellow-50 p-3 border-2 border-yellow-400">
                                      <p className="font-bold text-xs mb-1">📖 Wacana:</p>
                                      <div className="text-xs max-h-40 overflow-y-auto break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: bankQ.passage }} />
                                    </div>
                                  )}

                                  {bankQ.imageUrl && (
                                    <div>
                                      <p className="font-bold text-xs mb-1">🖼️ Gambar:</p>
                                      <img 
                                        src={bankQ.imageUrl} 
                                        alt="Preview" 
                                        className="max-w-full max-h-48 object-contain border-2 border-black"
                                      />
                                    </div>
                                  )}

                                  {/* Options Preview */}
                                  {bankQ.options && bankQ.options.length > 0 && (
                                    <div>
                                      <p className="font-bold text-xs mb-2">Opsi Jawaban:</p>
                                      <div className="space-y-1">
                                        {bankQ.options.map((opt, i) => {
                                          const isCorrect = bankQ.correctKey === i.toString() || 
                                                           (bankQ.type === 'PILIHAN_GANDA_KOMPLEKS' && bankQ.correctKey && 
                                                            JSON.parse(bankQ.correctKey || '[]').includes(i.toString()));
                                          return (
                                            <div key={i} className={`p-2 border-2 text-xs break-words ${isCorrect ? 'bg-[#C3FAE8] border-[#51CF66]' : 'bg-white border-gray-300'}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                              <span className="font-bold">{String.fromCharCode(65 + i)}.</span> <MathRenderer text={opt} />
                                              {isCorrect && <span className="ml-2 text-[#51CF66] font-black">✓ BENAR</span>}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Matching Pairs Preview */}
                                  {bankQ.matchingPairs && bankQ.matchingPairs.length > 0 && (
                                    <div>
                                      <p className="font-bold text-xs mb-2">Pasangan Menjodohkan:</p>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {bankQ.matchingPairs.map((pair, i) => (
                                          <div key={i} className="p-2 border-2 border-black bg-gray-50 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            <span className="font-bold"><MathRenderer text={pair.left} /></span> → <span><MathRenderer text={pair.right} /></span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Statements Preview (Benar/Salah Tabel) */}
                                  {bankQ.statements && bankQ.statements.length > 0 && (
                                    <div>
                                      <p className="font-bold text-xs mb-2">Pernyataan Benar/Salah:</p>
                                      <div className="space-y-1 text-xs">
                                        {bankQ.statements.map((stmt, i) => (
                                          <div key={i} className="p-2 border-2 border-black bg-white">
                                            <p className="mb-1 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{i + 1}. <MathRenderer text={stmt.text} /></p>
                                            <Badge variant={stmt.correctAnswer === 'true' ? 'success' : 'danger'} className="text-xs">
                                              {stmt.correctAnswer === 'true' ? '✅ BENAR' : '❌ SALAH'}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Drag & Drop Preview */}
                                  {bankQ.dragItems && bankQ.dragItems.length > 0 && (
                                    <div>
                                      <p className="font-bold text-xs mb-2">Drag & Drop:</p>
                                      <div className="text-xs space-y-1">
                                        <p><strong>Items:</strong> {bankQ.dragItems.join(', ')}</p>
                                        <p><strong>Drop Zones:</strong> {bankQ.dropZones?.join(', ')}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Sequencing Preview */}
                                  {bankQ.sequenceItems && bankQ.sequenceItems.length > 0 && (
                                    <div>
                                      <p className="font-bold text-xs mb-2">Sequencing (Urutan Benar):</p>
                                      <div className="space-y-1 text-xs">
                                        {bankQ.sequenceItems.map((item, i) => (
                                          <div key={i} className="p-2 border-2 border-black bg-white break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            {i + 1}. <MathRenderer text={item} />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Hotspot Preview */}
                                  {bankQ.hotspots && bankQ.hotspots.length > 0 && (
                                    <div>
                                      <p className="font-bold text-xs mb-2">Hotspot Areas:</p>
                                      <div className="text-xs space-y-1">
                                        {bankQ.hotspots.map((hotspot, i) => (
                                          <div key={i} className="p-2 border-2 border-black bg-white">
                                            {i + 1}. {hotspot.label || `Area ${i + 1}`} 
                                            {bankQ.correctHotspot === i && <span className="ml-2 text-[#51CF66] font-black">✓ BENAR</span>}
                                            <span className="text-gray-500 ml-2">({hotspot.x}%, {hotspot.y}%, {hotspot.width}%x{hotspot.height}%)</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Classification Preview */}
                                  {bankQ.classificationItems && bankQ.classificationItems.length > 0 && (
                                    <div>
                                      <p className="font-bold text-xs mb-2">Classification:</p>
                                      <div className="text-xs">
                                        <p className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}><strong>Items:</strong> {bankQ.classificationItems.map((item, i) => <MathRenderer key={i} text={item} />).reduce((prev, curr) => prev ? <>{prev}, {curr}</> : curr, null as any)}</p>
                                        <p className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}><strong>Categories:</strong> {bankQ.categories?.map((cat, i) => <MathRenderer key={i} text={cat} />).reduce((prev, curr) => prev ? <>{prev}, {curr}</> : curr, null as any)}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Short Answer Preview */}
                                  {bankQ.type === 'ISIAN_SINGKAT' && bankQ.correctKey && (
                                    <div className="bg-blue-50 p-2 border-2 border-blue-400">
                                      <p className="font-bold text-xs mb-1">Kunci Jawaban:</p>
                                      <p className="text-sm font-mono">{bankQ.correctKey}</p>
                                    </div>
                                  )}

                                  {/* Metadata */}
                                  <div className="pt-2 border-t-2 border-black/20 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                      {bankQ.subject && (
                                        <div>
                                          <strong>Subject:</strong> {bankQ.subject}
                                        </div>
                                      )}
                                      {bankQ.difficulty && (
                                        <div>
                                          <strong>Difficulty:</strong> {bankQ.difficulty}
                                        </div>
                                      )}
                                      {bankQ.tags && (
                                        <div className="col-span-2">
                                          <strong>Tags:</strong>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {bankQ.tags.split(',').map((tag, idx) => {
                                              const trimmedTag = tag.trim();
                                              if (!trimmedTag) return null;
                                              return (
                                                <span
                                                  key={idx}
                                                  className="text-xs bg-[#E0F2F1] border border-[#4F46E5] px-2 py-0.5 rounded font-bold"
                                                >
                                                  {trimmedTag}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                      {bankQ.usageCount !== undefined && (
                                        <div>
                                          <strong>Digunakan:</strong> {bankQ.usageCount}x
                                        </div>
                                      )}
                                      {bankQ.lastUsedAt && (
                                        <div>
                                          <strong>Terakhir:</strong> {new Date(bankQ.lastUsedAt).toLocaleDateString('id-ID')}
                                        </div>
                                      )}
                                      {bankQ.createdBy && (
                                        <div>
                                          <strong>Dibuat oleh:</strong> {bankQ.createdBy}
                                        </div>
                                      )}
                                      {bankQ.createdAt && (
                                        <div>
                                          <strong>Tanggal:</strong> {new Date(bankQ.createdAt).toLocaleDateString('id-ID')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                          <Card className="mt-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                              {/* Items per page selector */}
                              <div className="flex items-center gap-2">
                                <label className="font-bold text-sm">Tampilkan:</label>
                                <select
                                  value={itemsPerPage}
                                  onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1); // Reset to first page
                                  }}
                                  className="border-2 border-black px-3 py-1.5 font-bold text-sm"
                                >
                                  <option value={10}>10 soal</option>
                                  <option value={20}>20 soal</option>
                                  <option value={50}>50 soal</option>
                                  <option value={100}>100 soal</option>
                                </select>
                                <span className="text-sm text-gray-600">
                                  {startIndex + 1}-{Math.min(endIndex, filtered.length)} dari {filtered.length}
                                </span>
                              </div>

                              {/* Page navigation */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(1)}
                                  disabled={currentPage === 1}
                                  className="px-2"
                                  title="First page"
                                >
                                  <ChevronsLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                  disabled={currentPage === 1}
                                  className="px-2"
                                  title="Previous page"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                
                                {/* Page numbers */}
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const pages = [];
                                    const maxVisible = 5;
                                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                                    
                                    if (endPage - startPage < maxVisible - 1) {
                                      startPage = Math.max(1, endPage - maxVisible + 1);
                                    }
                                    
                                    if (startPage > 1) {
                                      pages.push(
                                        <Button
                                          key={1}
                                          variant={1 === currentPage ? 'primary' : 'outline'}
                                          size="sm"
                                          onClick={() => setCurrentPage(1)}
                                          className="w-10 px-2"
                                        >
                                          1
                                        </Button>
                                      );
                                      if (startPage > 2) {
                                        pages.push(<span key="dots1" className="px-2">...</span>);
                                      }
                                    }
                                    
                                    for (let i = startPage; i <= endPage; i++) {
                                      pages.push(
                                        <Button
                                          key={i}
                                          variant={i === currentPage ? 'primary' : 'outline'}
                                          size="sm"
                                          onClick={() => setCurrentPage(i)}
                                          className="w-10 px-2"
                                        >
                                          {i}
                                        </Button>
                                      );
                                    }
                                    
                                    if (endPage < totalPages) {
                                      if (endPage < totalPages - 1) {
                                        pages.push(<span key="dots2" className="px-2">...</span>);
                                      }
                                      pages.push(
                                        <Button
                                          key={totalPages}
                                          variant={totalPages === currentPage ? 'primary' : 'outline'}
                                          size="sm"
                                          onClick={() => setCurrentPage(totalPages)}
                                          className="w-10 px-2"
                                        >
                                          {totalPages}
                                        </Button>
                                      );
                                    }
                                    
                                    return pages;
                                  })()}
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                  disabled={currentPage === totalPages}
                                  className="px-2"
                                  title="Next page"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(totalPages)}
                                  disabled={currentPage === totalPages}
                                  className="px-2"
                                  title="Last page"
                                >
                                  <ChevronsRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirm(false);
            setQuestionToDelete(null);
          }
        }}
        onConfirm={confirmDeleteQuestion}
        title="Hapus Soal?"
        message="Yakin ingin menghapus soal ini?"
        variant="warning"
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeleting}
        keepOpenOnConfirm={true}
        loadingText="Menghapus Soal..."
        loadingSubtext="Mohon tunggu sebentar"
      />

      {/* Delete Bank Question Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteBankConfirm}
        onClose={() => {
          if (!isDeletingBankQuestion) {
            setShowDeleteBankConfirm(null);
          }
        }}
        onConfirm={async () => {
          if (!showDeleteBankConfirm) return;
          
          setIsDeletingBankQuestion(true);
          try {
            await deleteBankQuestion(showDeleteBankConfirm);
            setAlertMessage({ 
              title: 'Berhasil', 
              message: 'Soal berhasil dihapus dari bank soal!', 
              variant: 'success' 
            });
            setShowAlert(true);
            setShowDeleteBankConfirm(null);
          } catch (error: any) {
            setAlertMessage({ 
              title: 'Error', 
              message: 'Gagal menghapus soal dari bank: ' + (error.message || 'Unknown error'), 
              variant: 'error' 
            });
            setShowAlert(true);
          } finally {
            setIsDeletingBankQuestion(false);
          }
        }}
        title="Hapus Soal dari Bank?"
        message="Soal akan dihapus dari bank soal. Soal yang sudah digunakan di ujian tidak akan terpengaruh."
        variant="danger"
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeletingBankQuestion}
        keepOpenOnConfirm={true}
        loadingText="Menghapus dari Bank..."
        loadingSubtext="Mohon tunggu, soal sedang dihapus"
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => {
          if (!isBulkDeleting) {
            setShowBulkDeleteConfirm(false);
          }
        }}
        onConfirm={confirmBulkDelete}
        title={`Hapus ${selectedBankQuestions.size} Soal dari Bank?`}
        message={`Yakin ingin menghapus ${selectedBankQuestions.size} soal sekaligus dari bank soal? Tindakan ini tidak bisa dibatalkan. Soal yang sudah digunakan di ujian tidak akan terpengaruh.`}
        variant="danger"
        confirmText={`Ya, Hapus ${selectedBankQuestions.size} Soal`}
        cancelText="Batal"
        isLoading={isBulkDeleting}
        keepOpenOnConfirm={true}
        loadingText={`Menghapus ${selectedBankQuestions.size} Soal...`}
        loadingSubtext="Mohon tunggu, proses penghapusan sedang berlangsung"
      />

      <AlertDialog
        isOpen={showAlert}
        onClose={() => {
          setShowAlert(false);
          // Check if there's a pending back action
          if ((window as any).__confirmBack && alertMessage.title === 'Perubahan Belum Disimpan') {
            // Don't execute back, just clear
            delete (window as any).__confirmBack;
          }
        }}
        title={alertMessage.title}
        message={alertMessage.message}
        variant={alertMessage.variant}
        confirmText={alertMessage.title === 'Perubahan Belum Disimpan' ? 'Ya, Keluar' : 'OK'}
        onConfirm={alertMessage.title === 'Perubahan Belum Disimpan' && (window as any).__confirmBack ? () => {
          (window as any).__confirmBack();
          delete (window as any).__confirmBack;
        } : undefined}
      />

      {/* Question History Modal */}
      {showHistoryModal && (
        <QuestionHistoryModal
          questionId={showHistoryModal.questionId}
          questionText={showHistoryModal.questionText}
          onClose={() => setShowHistoryModal(null)}
        />
      )}

      {/* Option Math Input Modal */}
      <DialogOverlay isOpen={showOptionMathModal} onClose={() => setShowOptionMathModal(false)}>
        <div>
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
            <Sigma className="w-5 h-5" /> Sisipkan Rumus Matematika di Opsi
          </h3>
          <MathInput 
            onConfirm={handleInsertOptionMath}
            onCancel={() => setShowOptionMathModal(false)}
          />
        </div>
      </DialogOverlay>
    </div>
  );
};

