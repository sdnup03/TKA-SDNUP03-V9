import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Card, Badge, DialogOverlay, Textarea, Toast, AlertDialog } from '../ui/brutalist';
import { 
  Timer, CheckCircle, ChevronLeft, ChevronRight, Save, BookOpen, 
  Flag, AlertTriangle, ShieldAlert, Maximize, Menu, X, ZoomIn, 
  Type, ArrowUp, ArrowDown, LayoutGrid, Check 
} from 'lucide-react';
import { Question } from '../../types';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { MathRenderer } from '../ui/MathRenderer';

// Wrapper for shuffled data handling
interface ShuffledOption {
  originalIndex: number;
  text: string;
  imageUrl?: string;
}

interface ProcessedQuestion extends Question {
  _shuffledOptions?: ShuffledOption[];
}

const MAX_VIOLATIONS = 3;
const MATCHING_COLORS = ['#E0F2F1', '#FFF3E0', '#F3E5F5', '#E3F2FD', '#FBE9E7'];

export const ExamRoom: React.FC = () => {
  const { activeExamId, exams, exitExam, submitExam, noiseLevel, updateStudentProgress, isLoading } = useApp();
  const exam = exams.find(e => e.id === activeExamId);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set()); 
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isQuestionTransitioning, setIsQuestionTransitioning] = useState(false);
  const [questionImagesLoaded, setQuestionImagesLoaded] = useState<Set<string>>(new Set());

  // --- UI STATE ---
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isPassageOpen, setIsPassageOpen] = useState(false); // Mobile Passage Toggle
  const [fontSize, setFontSize] = useState<'text-sm' | 'text-base' | 'text-lg'>('text-base');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' });
  
  // Matching Game State
  const [activeMatchLeft, setActiveMatchLeft] = useState<number | null>(null);

  // Sequencing State
  const [sequenceAnswers, setSequenceAnswers] = useState<number[]>([]); // Array of item indices in order
  const [draggedItem, setDraggedItem] = useState<number | null>(null); // For drag & drop (SEQUENCING & CLASSIFICATION)

  // Classification State
  const [classificationAnswers, setClassificationAnswers] = useState<Record<number, number>>({}); // itemIndex -> categoryIndex

  // --- ANTI CHEAT STATES ---
  const [isExamLocked, setIsExamLocked] = useState(true);
  const [violationCount, setViolationCount] = useState(0);
  const [isBlurred, setIsBlurred] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMsg, setViolationMsg] = useState('');

  // REF FOR TYPING STATUS (To Prevent False Positive Anti-Cheat on Mobile)
  const isTypingRef = useRef(false);
  
  // Detect iOS device
  const isIOS = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);
  
  // Track keyboard visibility for iOS
  const keyboardVisibleRef = useRef(false);
  const keyboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track touch patterns for iOS (screenshot detection)
  const touchTrackingRef = useRef({ touchStartTime: 0, touchCount: 0 });

  // MEMOIZED SHUFFLING LOGIC
  const processedQuestions: ProcessedQuestion[] = useMemo(() => {
    if (!exam) return [];
    
    // Validate questions array
    if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
      console.error('Exam questions tidak valid:', exam.questions);
      return [];
    }
    
    try {
      let qs: ProcessedQuestion[] = [...exam.questions];
      if (exam.randomizeQuestions) {
          qs = qs.sort(() => Math.random() - 0.5);
      }
      if (exam.randomizeOptions) {
          qs = qs.map(q => {
              if ((q.type === 'PILIHAN_GANDA' || q.type === 'PILIHAN_GANDA_KOMPLEKS') && q.options && Array.isArray(q.options)) {
                  const optionsWithIndices = q.options.map((opt, idx) => {
                      const text = typeof opt === 'string' ? (opt || '') : (opt?.text || '');
                      const imageUrl = typeof opt === 'string' ? undefined : (opt?.imageUrl);
                      return {
                          originalIndex: idx,
                          text: text,
                          imageUrl: imageUrl
                      };
                  });
                  const shuffledOpts = optionsWithIndices.sort(() => Math.random() - 0.5);
                  return { ...q, _shuffledOptions: shuffledOpts };
              }
              return q;
          });
      }
      return qs;
    } catch (error) {
      console.error('Error processing questions:', error);
      return [];
    }
  }, [exam]);

  // Derived Data - Must be declared before any hooks that use it
  const currentQuestion = processedQuestions[currentQuestionIndex];

  const toggleMarkForReview = useCallback(() => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    setMarkedForReview(prev => {
        const newSet = new Set(prev);
        if (newSet.has(qId)) newSet.delete(qId);
        else newSet.add(qId);
        return newSet;
    });
  }, [currentQuestion]);

  // Handle question change with smooth transition
  const handleQuestionChange = useCallback((newIndex: number) => {
    if (newIndex === currentQuestionIndex) return;
    
    setIsQuestionTransitioning(true);
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Change question after short delay for transition effect
    setTimeout(() => {
      setCurrentQuestionIndex(newIndex);
      setIsQuestionTransitioning(false);
    }, 150);
  }, [currentQuestionIndex]);

  // --- ANTI CHEAT LOGIC ---
  const handleViolation = useCallback((reason: string) => {
      if (!hasStarted) return;
      
      // Additional iOS check: ignore if keyboard is visible (might be false positive)
      if (isIOS && keyboardVisibleRef.current) {
        // Delay violation check to see if keyboard hides
        setTimeout(() => {
          if (!keyboardVisibleRef.current && hasStarted) {
            setViolationCount(prev => {
              const newCount = prev + 1;
              setViolationMsg(reason);
              setShowViolationModal(true);
              if (newCount > MAX_VIOLATIONS) {
                  setAlertMessage({ 
                    title: 'DISKUALIFIKASI', 
                    message: 'KAMU DI-DISKUALIFIKASI KARENA TERLALU BANYAK PELANGGARAN! JAWABAN DIKIRIM PAKSA.' 
                  });
                  setShowAlert(true);
                  submitExam(exam!.id, answers, newCount);
              } else {
                 const filledCount = Object.keys(answers).length;
                 const total = exam!.questions?.length || 0;
                 updateStudentProgress(exam!.id, filledCount, total, newCount);
              }
              return newCount;
            });
          }
        }, 500);
        return;
      }
      
      setViolationCount(prev => {
          const newCount = prev + 1;
          setViolationMsg(reason);
          setShowViolationModal(true);
          if (newCount > MAX_VIOLATIONS) {
              setAlertMessage({ 
                title: 'DISKUALIFIKASI', 
                message: 'KAMU DI-DISKUALIFIKASI KARENA TERLALU BANYAK PELANGGARAN! JAWABAN DIKIRIM PAKSA.' 
              });
              setShowAlert(true);
              submitExam(exam!.id, answers, newCount);
          } else {
             const filledCount = Object.keys(answers).length;
             const total = exam!.questions?.length || 0;
             updateStudentProgress(exam!.id, filledCount, total, newCount);
          }
          return newCount;
      });
  }, [hasStarted, exam, answers, submitExam, updateStudentProgress, isIOS]);

  // 1. TRACK TYPING FOCUS GLOBAL (Enhanced for iOS)
  useEffect(() => {
    const handleFocusIn = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        isTypingRef.current = true;
        if (isIOS) {
          keyboardVisibleRef.current = true;
          // Clear any pending keyboard hide timeout
          if (keyboardTimeoutRef.current) {
            clearTimeout(keyboardTimeoutRef.current);
            keyboardTimeoutRef.current = null;
          }
        }
      }
    };
    const handleFocusOut = () => {
        // Longer delay for iOS to handle keyboard animations
        const delay = isIOS ? 500 : 100;
        setTimeout(() => {
            const active = document.activeElement;
            if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
                isTypingRef.current = false;
                if (isIOS) {
                  // Additional delay for iOS keyboard to fully hide
                  keyboardTimeoutRef.current = setTimeout(() => {
                    keyboardVisibleRef.current = false;
                  }, 300);
                }
            }
        }, delay);
    };
    
    // iOS-specific: Track visual viewport changes (keyboard show/hide)
    const handleViewportResize = () => {
      if (isIOS && window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        // If viewport is significantly smaller, keyboard is likely visible
        keyboardVisibleRef.current = viewportHeight < windowHeight * 0.75;
      }
    };
    
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (isIOS && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }
    
    return () => {
        document.removeEventListener('focusin', handleFocusIn);
        document.removeEventListener('focusout', handleFocusOut);
        if (isIOS && window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleViewportResize);
        }
        if (keyboardTimeoutRef.current) {
          clearTimeout(keyboardTimeoutRef.current);
        }
    };
  }, [isIOS]);

  // 2. ANTI CHEAT EVENT LISTENERS (iOS-Optimized)
  useEffect(() => {
    if (!hasStarted) return;
    history.pushState(null, '', location.href);
    const onPopState = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', onPopState);

    // Visibility change detection (enhanced for iOS)
    const onVisibilityChange = () => {
        // iOS Safari sometimes triggers visibilitychange during keyboard interactions
        if (isIOS && (isTypingRef.current || keyboardVisibleRef.current)) {
          // Delay check to see if it's a real tab switch
          setTimeout(() => {
            if (!document.hidden && !isTypingRef.current && !keyboardVisibleRef.current) {
              // False positive, ignore
              return;
            }
            if (document.hidden) {
              handleViolation("Terdeteksi pindah tab atau minimize browser!");
            }
          }, 200);
        } else {
          if (document.hidden) {
            handleViolation("Terdeteksi pindah tab atau minimize browser!");
          }
        }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Window blur/focus (iOS-optimized)
    const onBlur = () => {
        // IGNORE BLUR IF TYPING OR KEYBOARD VISIBLE (iOS keyboard triggers blur)
        if (isTypingRef.current || (isIOS && keyboardVisibleRef.current)) return;
        
        // For iOS, add additional delay to distinguish keyboard from real blur
        if (isIOS) {
          setTimeout(() => {
            if (!isTypingRef.current && !keyboardVisibleRef.current) {
              setIsBlurred(true);
            }
          }, 300);
        } else {
          setIsBlurred(true);
        }
    };
    
    const onFocus = () => {
      // Clear blur state
      setIsBlurred(false);
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    // Context menu prevention
    const onContextMenu = (e: MouseEvent) => { 
      e.preventDefault(); 
      return false; 
    };
    document.addEventListener("contextmenu", onContextMenu);

    // Fullscreen change (DISABLED for iOS - not supported)
    const onFullscreenChange = () => {
        if (isIOS) return; // iOS doesn't support fullscreen API properly
        
        if (!document.fullscreenElement) {
             // IGNORE FULLSCREEN EXIT IF TYPING (Mobile Keyboard forces exit on some browsers)
             if (isTypingRef.current) return;
             handleViolation("Keluar dari mode layar penuh!");
        }
    };
    if (!isIOS) {
      document.addEventListener("fullscreenchange", onFullscreenChange);
    }

    // iOS-specific: Detect app switching (pagehide/pageshow)
    const onPageHide = () => {
      if (isIOS && hasStarted) {
        handleViolation("Terdeteksi switch aplikasi atau minimize!");
      }
    };
    const onPageShow = () => {
      if (isIOS) {
        setIsBlurred(false);
      }
    };
    if (isIOS) {
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("pageshow", onPageShow);
    }

    // iOS-specific: Detect potential screenshot attempts
    // Note: iOS doesn't allow direct screenshot detection, but we can track suspicious patterns
    const handleTouchStart = (e: TouchEvent) => {
      if (isIOS && hasStarted) {
        const now = Date.now();
        const tracking = touchTrackingRef.current;
        
        // Reset counter if more than 1 second has passed
        if (now - tracking.touchStartTime > 1000) {
          tracking.touchCount = 0;
          tracking.touchStartTime = now;
        }
        
        tracking.touchCount++;
        
        // If multiple touches detected rapidly, might be screenshot gesture
        if (tracking.touchCount >= 3 && now - tracking.touchStartTime < 500) {
          // Log but don't immediately violate (could be false positive from multi-touch gestures)
          console.warn('Suspicious touch pattern detected');
        }
      }
    };
    if (isIOS) {
      document.addEventListener("touchstart", handleTouchStart, { passive: true });
    }

    return () => {
        window.removeEventListener('popstate', onPopState);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("contextmenu", onContextMenu);
        if (!isIOS) {
          document.removeEventListener("fullscreenchange", onFullscreenChange);
        }
        if (isIOS) {
          window.removeEventListener("pagehide", onPageHide);
          window.removeEventListener("pageshow", onPageShow);
          document.removeEventListener("touchstart", handleTouchStart);
        }
    };
  }, [hasStarted, answers, isIOS, handleViolation]);

  const startExam = async () => {
    // iOS doesn't support fullscreen API properly, skip for iOS
    if (!isIOS) {
      try { 
        await document.documentElement.requestFullscreen(); 
      } catch (e) { 
        console.warn("FS denied", e); 
      }
    }
    setIsExamLocked(false);
    setHasStarted(true);
    setTimeLeft(exam!.durationMinutes * 60);
  };

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0 && hasStarted) return;
    const interval = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, hasStarted]);

  // Auto-submit (with ref to prevent multiple submissions)
  const hasAutoSubmittedRef = useRef(false);
  useEffect(() => {
    if (hasStarted && timeLeft === 0 && exam && !hasAutoSubmittedRef.current) {
       hasAutoSubmittedRef.current = true;
       const timeout = setTimeout(() => {
         setAlertMessage({ 
           title: 'Waktu Habis', 
           message: 'Waktu Habis! Jawaban otomatis dikirim.' 
         });
         setShowAlert(true);
         submitExam(exam.id, answers, violationCount);
       }, 500);
       return () => clearTimeout(timeout);
    }
    // Reset flag when exam changes or timeLeft > 0
    if (timeLeft > 0 || !hasStarted) {
      hasAutoSubmittedRef.current = false;
    }
  }, [timeLeft, hasStarted, exam, answers, submitExam, violationCount]);

  // Sync Progress
  useEffect(() => {
    if (exam && hasStarted) {
        const filledCount = Object.keys(answers).length;
        const total = exam.questions.length;
        updateStudentProgress(exam.id, filledCount, total, violationCount);
    }
  }, [answers, exam, hasStarted, updateStudentProgress, violationCount]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!hasStarted || !exam) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textareas
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const newIndex = Math.max(0, currentQuestionIndex - 1);
        handleQuestionChange(newIndex);
      } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const newIndex = Math.min(processedQuestions.length - 1, currentQuestionIndex + 1);
        handleQuestionChange(newIndex);
      }
      
      // Number keys 1-9 for quick navigation (if questions < 10)
      if (processedQuestions.length <= 9 && e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key);
        if (num <= processedQuestions.length) {
          e.preventDefault();
          handleQuestionChange(num - 1);
        }
      }

      // Space to toggle mark for review
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleMarkForReview();
      }

      // Escape to close modals/nav
      if (e.key === 'Escape') {
        if (isNavOpen) {
          setIsNavOpen(false);
        }
        if (showConfirmSubmit) {
          setShowConfirmSubmit(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, exam, currentQuestionIndex, processedQuestions.length, isNavOpen, showConfirmSubmit, toggleMarkForReview, handleQuestionChange]);

  // Initialize answers for complex question types
  useEffect(() => {
    if (!currentQuestion) return;
    
    const savedAnswer = answers[currentQuestion.id];
    
    if (currentQuestion.type === 'SEQUENCING' && savedAnswer) {
      try {
        const parsed = JSON.parse(savedAnswer);
        setSequenceAnswers(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setSequenceAnswers([]);
      }
    } else if (currentQuestion.type === 'CLASSIFICATION' && savedAnswer) {
      try {
        const parsed = JSON.parse(savedAnswer);
        setClassificationAnswers(typeof parsed === 'object' ? parsed : {});
      } catch (e) {
        setClassificationAnswers({});
      }
    }
  }, [currentQuestion?.id, answers]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleAnswerChange = (val: string) => {
    if (!exam || !currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
    triggerToast("Jawaban Tersimpan");
  };

  // Handler untuk pilihan ganda kompleks (multiple select)
  const handleMultipleSelectChange = (indexVal: string) => {
    if (!exam || !currentQuestion) return;
    const qId = currentQuestion.id;
    
    // Parse current answer (JSON array)
    let currentSelections: string[] = [];
    try {
      const currentAnswer = answers[qId];
      if (currentAnswer) {
        currentSelections = JSON.parse(currentAnswer);
      }
    } catch (e) {
      currentSelections = [];
    }
    
    // Toggle selection
    const index = currentSelections.indexOf(indexVal);
    if (index > -1) {
      // Remove if already selected
      currentSelections.splice(index, 1);
    } else {
      // Add if not selected
      currentSelections.push(indexVal);
    }
    
    // Sort to maintain consistency
    currentSelections.sort();
    
    // Update answer
    setAnswers(prev => ({ ...prev, [qId]: JSON.stringify(currentSelections) }));
    triggerToast("Jawaban Tersimpan");
  };

  const handleMatchingTap = (type: 'left' | 'right', indexOrVal: number | string) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    let currentMatch: Record<string, string> = {};
    try { currentMatch = JSON.parse(answers[qId] || '{}'); } catch(e) {}

    if (type === 'left') {
        setActiveMatchLeft(indexOrVal as number);
    } else {
        if (activeMatchLeft !== null) {
            currentMatch[activeMatchLeft] = indexOrVal as string;
            setAnswers(prev => ({ ...prev, [qId]: JSON.stringify(currentMatch) }));
            setActiveMatchLeft(null);
            triggerToast("Pasangan Terhubung!");
        } else {
            // Shake or warn user to select left first?
        }
    }
  };

  const handleUnmatch = (leftIndex: number) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    let currentMatch: Record<string, string> = {};
    try { currentMatch = JSON.parse(answers[qId] || '{}'); } catch(e) {}
    
    if (currentMatch[leftIndex]) {
        delete currentMatch[leftIndex];
        setAnswers(prev => ({ ...prev, [qId]: JSON.stringify(currentMatch) }));
        triggerToast("Pasangan Dilepas");
    }
  };

  // Sequencing Handlers
  const handleSequenceDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleSequenceDrop = (targetIndex: number) => {
    if (!currentQuestion) return;
    if (draggedItem === null) return;
    const items = currentQuestion.sequenceItems || [];
    let newSequence = [...sequenceAnswers];
    
    if (newSequence.length === 0) {
      newSequence = items.map((_, i) => i);
    }
    
    const draggedValue = newSequence[draggedItem];
    newSequence.splice(draggedItem, 1);
    newSequence.splice(targetIndex, 0, draggedValue);
    
    setSequenceAnswers(newSequence);
    handleAnswerChange(JSON.stringify(newSequence));
    setDraggedItem(null);
    triggerToast("Urutan Diubah");
  };

  // Classification Handlers
  const handleClassificationDragStart = (itemIndex: number) => {
    setDraggedItem(itemIndex);
  };

  const handleClassificationDrop = (categoryIndex: number) => {
    if (!currentQuestion) return;
    if (draggedItem === null) return;
    const newAnswers = { ...classificationAnswers, [draggedItem]: categoryIndex };
    setClassificationAnswers(newAnswers);
    handleAnswerChange(JSON.stringify(newAnswers));
    setDraggedItem(null);
    triggerToast("Item Dikategorikan");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Preload images for next/previous questions
  useEffect(() => {
    if (!exam || processedQuestions.length === 0) return;
    
    const preloadImages = (index: number) => {
      const question = processedQuestions[index];
      if (!question) return;
      
      // Preload question image
      if (question.imageUrl && !questionImagesLoaded.has(question.imageUrl)) {
        const img = new Image();
        img.onload = () => {
          setQuestionImagesLoaded(prev => new Set(prev).add(question.imageUrl!));
        };
        img.src = question.imageUrl;
      }
      
      // Preload option images
      if (question.options) {
        question.options.forEach(opt => {
          const imageUrl = typeof opt === 'string' ? undefined : opt?.imageUrl;
          if (imageUrl && !questionImagesLoaded.has(imageUrl)) {
            const img = new Image();
            img.onload = () => {
              setQuestionImagesLoaded(prev => new Set(prev).add(imageUrl));
            };
            img.src = imageUrl;
          }
        });
      }
    };
    
    // Preload current, next, and previous questions
    preloadImages(currentQuestionIndex);
    if (currentQuestionIndex > 0) preloadImages(currentQuestionIndex - 1);
    if (currentQuestionIndex < processedQuestions.length - 1) preloadImages(currentQuestionIndex + 1);
  }, [currentQuestionIndex, processedQuestions, exam, questionImagesLoaded]);

  const changeFontSize = () => {
      setFontSize(prev => prev === 'text-sm' ? 'text-base' : prev === 'text-base' ? 'text-lg' : 'text-sm');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Shuffle Matching Options Memoized
  const shuffledRightOptions = useMemo(() => {
    // Safe access with optional chaining
    const question = processedQuestions[currentQuestionIndex];
    if (question?.type === 'MENJODOHKAN' && question?.matchingPairs) {
        return [...question.matchingPairs.map(p => p.right)].sort(() => Math.random() - 0.5);
    }
    return [];
  }, [processedQuestions, currentQuestionIndex]);

  // Derived values
  const isLastQuestion = currentQuestionIndex === processedQuestions.length - 1;
  const timeCritical = timeLeft < 300; 
  const hasPassage = !!currentQuestion?.passage;

  // Confirmation Stats
  const answeredCount = Object.keys(answers).length;
  const markedCount = markedForReview.size;
  const totalQuestions = processedQuestions.length;
  const emptyCount = totalQuestions - answeredCount;

  // Border Color based on Status (Safe Exam Visual)
  const safeBorderColor = violationCount > 0 ? 'border-red-500' : 'border-black';

  // Loading state jika exam belum ter-load
  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7]">
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_#000]">
          <div className="text-center">
            <div className="inline-block animate-spin mb-4">
              <BookOpen className="w-12 h-12 text-[#4F46E5]" />
            </div>
            <p className="font-black text-xl mb-2">Memuat Ujian...</p>
            <p className="font-bold text-sm text-gray-600 mb-4">Mohon tunggu sebentar</p>
            <Button variant="outline" onClick={exitExam}>Batal</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Error state jika exam tidak punya soal
  if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7]">
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_#000] max-w-md">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-[#FF6B6B] mb-4" />
            <h2 className="font-black text-xl mb-2">Ujian Belum Siap</h2>
            <p className="font-bold text-sm text-gray-600 mb-4">
              Ujian ini belum memiliki soal. Silakan hubungi guru.
            </p>
            <Button variant="primary" onClick={exitExam}>Kembali</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Error state jika processedQuestions kosong
  if (processedQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7]">
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_#000] max-w-md">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-[#FF6B6B] mb-4" />
            <h2 className="font-black text-xl mb-2">Error Memuat Soal</h2>
            <p className="font-bold text-sm text-gray-600 mb-4">
              Terjadi kesalahan saat memproses soal. Silakan coba lagi.
            </p>
            <Button variant="primary" onClick={exitExam}>Kembali</Button>
          </div>
        </Card>
      </div>
    );
  }

  // --- RENDER LOCK SCREEN ---
  if (isExamLocked) {
      return (
          <div className="fixed inset-0 z-50 bg-[#4F46E5] flex items-center justify-center p-4">
              <Card className="max-w-md w-full text-center space-y-6 animate-in zoom-in">
                  <ShieldAlert className="w-16 h-16 mx-auto text-black" />
                  <div>
                      <h1 className="text-2xl font-black uppercase mb-2">Mode Ujian Aman</h1>
                      <p className="text-sm font-medium opacity-80 mb-4">Sistem anti-curang aktif. HP kamu dipantau.</p>
                      <ul className="text-left text-sm font-bold bg-gray-100 p-4 border-2 border-black space-y-2 mb-4">
                          <li>🚫 Pindah Tab / Minimize Browser</li>
                          <li>🚫 Split Screen / Floating Apps</li>
                          <li>🚫 Keluar Mode Fullscreen</li>
                      </ul>
                      <Badge variant="danger" className="text-sm">Maksimal 3x Pelanggaran = AUTO KICK</Badge>
                  </div>
                  <Button variant="secondary" size="lg" className="w-full py-4 text-lg" onClick={startExam}>
                      <Maximize className="w-5 h-5 mr-2" /> MASUK FULLSCREEN & MULAI
                  </Button>
              </Card>
          </div>
      );
  }

  // Validate current question
  if (!currentQuestion || currentQuestionIndex >= processedQuestions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7]">
        <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_#000] max-w-md">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-[#FF6B6B] mb-4" />
            <h2 className="font-black text-xl mb-2">Soal Tidak Ditemukan</h2>
            <p className="font-bold text-sm text-gray-600 mb-4">
              Soal yang diminta tidak tersedia.
            </p>
            <Button variant="primary" onClick={() => setCurrentQuestionIndex(0)}>Kembali ke Soal Pertama</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 sm:pb-24 lg:pb-28 bg-[#FDFDF7] border-x-4 ${safeBorderColor} ${isBlurred ? 'blur-sm select-none pointer-events-none' : ''}`}>
      
      {/* --- GLOBAL OVERLAYS --- */}
      {isBlurred && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 text-white p-6 text-center">
              <div className="animate-pulse">
                  <h1 className="text-4xl font-black mb-4">DILARANG MEMBUKA APLIKASI LAIN!</h1>
                  <p className="text-xl font-bold">Kembali ke ujian sekarang atau kena penalti.</p>
              </div>
          </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
          <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightboxImage(null)}>
              <img 
                src={lightboxImage} 
                alt="Lightbox"
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute top-4 right-4 text-white font-bold text-sm bg-black px-3 py-1 border border-white">
                 Klik bebas untuk tutup
              </div>
          </div>
      )}

      {/* Toast */}
      <Toast message={toastMsg} isVisible={showToast} />

      {/* Violation Modal - Higher z-index than footer */}
      <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${showViolationModal ? 'visible' : 'hidden'}`} onClick={() => setShowViolationModal(false)}>
        <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
          <Card className="p-6">
            <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-2" />
                <h3 className="text-2xl font-black text-red-600 mb-1">PELANGGARAN!</h3>
                <p className="font-bold text-lg mb-4">{violationMsg}</p>
                <div className="bg-black text-white p-3 font-mono text-xl font-bold mb-4">
                   NYAWA TERSISA: {Math.max(0, MAX_VIOLATIONS - violationCount)} / {MAX_VIOLATIONS}
                </div>
                <Button variant="destructive" className="w-full" onClick={() => setShowViolationModal(false)}>SAYA PAHAM & LANJUT</Button>
            </div>
          </Card>
        </div>
      </div>

      {/* --- HEADER --- */}
      <div className={`sticky top-0 z-40 border-b-2 border-black transition-colors shadow-md ${timeCritical ? 'bg-[#FF6B6B] text-white' : 'bg-[#FDFDF7] text-black'}`}>
        <div className="w-full px-2 sm:px-4 lg:px-8 xl:px-12 py-2 sm:py-3 flex justify-between items-center gap-2">
        <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" className="border-2 border-black h-8 w-8 sm:h-10 sm:w-10" onClick={() => setIsNavOpen(true)}>
                 <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
             </Button>
             <div className="hidden md:block">
                <h1 className="font-black text-base lg:text-lg truncate max-w-[150px] lg:max-w-[200px]">{exam.title}</h1>
             </div>
             <div className="md:hidden font-black text-base sm:text-xl">
                 No. {currentQuestionIndex + 1}
             </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
            {/* Font Resizer */}
            <Button variant="ghost" size="icon" onClick={changeFontSize} className="hidden sm:flex border-black" title="Ubah Ukuran Font">
                <Type className="w-5 h-5" />
            </Button>

            {/* Passage Toggle (Mobile) */}
            {hasPassage && (
                <Button 
                    variant={isPassageOpen ? 'primary' : 'outline'} 
                    size="sm" 
                    className="lg:hidden flex items-center gap-0.5 sm:gap-1 border-black text-xs px-2 h-8"
                    onClick={() => setIsPassageOpen(!isPassageOpen)}
                >
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Bacaan</span>
                </Button>
            )}

            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 border-2 border-black font-black text-sm sm:text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] ${timeCritical ? 'bg-white text-[#FF6B6B]' : 'bg-[#FFD43B] text-black'}`}>
                <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{formatTime(timeLeft)}</span>
            </div>
        </div>
        </div>
      </div>

      {/* --- DRAWER NAVIGATION (SLIDE OVER) --- */}
      <div className={`fixed inset-0 z-[55] transition-all duration-300 ${isNavOpen ? 'visible' : 'invisible'}`}>
          <div className={`absolute inset-0 bg-black/50 transition-opacity ${isNavOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsNavOpen(false)} />
          <div className={`absolute top-0 bottom-0 left-0 w-80 bg-white border-r-4 border-black transform transition-transform duration-300 flex flex-col ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="p-4 border-b-2 border-black flex justify-between items-center bg-yellow-400">
                  <h2 className="font-black text-xl uppercase">Daftar Soal</h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsNavOpen(false)}><X className="w-6 h-6" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-5 gap-2">
                      {processedQuestions.map((q, idx) => {
                          const isAnswered = answers[q.id] !== undefined;
                          const isMarked = markedForReview.has(q.id);
                          const isCurrent = idx === currentQuestionIndex;
                          let btnClass = 'bg-white hover:bg-gray-100 hover:scale-110'; 
                          if (isCurrent) {
                            btnClass = 'bg-[#4F46E5] text-white ring-2 ring-[#4F46E5] ring-offset-1 scale-110 shadow-[2px_2px_0px_0px_#000]';
                          } else if (isMarked) {
                            btnClass = 'bg-[#FFD43B] text-black hover:bg-[#fcc419] hover:scale-110 shadow-[2px_2px_0px_0px_#000]';
                          } else if (isAnswered) {
                            btnClass = 'bg-[#51CF66] text-black hover:bg-[#40c057] hover:scale-110 shadow-[2px_2px_0px_0px_#000]';
                          }

                          return (
                              <button
                                key={q.id}
                                onClick={() => { handleQuestionChange(idx); setIsNavOpen(false); }}
                                className={`aspect-square border-2 border-black font-bold flex items-center justify-center text-sm transition-all duration-200 active:scale-95 relative ${btnClass}`}
                                title={`Soal ${idx + 1}${isAnswered ? ' (Sudah dijawab)' : ''}${isMarked ? ' (Ditandai)' : ''}`}
                              >
                                {idx + 1}
                                {isMarked && !isCurrent && (
                                  <Flag className="w-2 h-2 absolute top-0.5 right-0.5 fill-yellow-600" />
                                )}
                              </button>
                          );
                      })}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-8 space-y-2 text-xs font-bold uppercase opacity-80">
                      <div className="flex items-center gap-2"><div className="w-4 h-4 border border-black bg-black"></div> Sedang Dikerjakan</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 border border-black bg-[#51CF66]"></div> Sudah Dijawab</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 border border-black bg-[#FFD43B]"></div> Ragu-ragu</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 border border-black bg-white"></div> Belum Dijawab</div>
                  </div>
              </div>
          </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className={`w-full px-2 sm:px-4 lg:px-8 xl:px-12 py-4 sm:py-6 ${hasPassage ? 'lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] lg:gap-4 xl:gap-10 lg:items-start' : 'lg:px-16 xl:px-32'}`}>
        
        {/* PASSAGE COLUMN (Desktop: Sticky Left, Mobile: Bottom Sheet) */}
        {hasPassage && (
            <div className={`
                ${isPassageOpen ? 'fixed inset-x-0 z-[45] h-[55vh] rounded-t-2xl shadow-[0px_-4px_20px_rgba(0,0,0,0.2)] lg:static lg:h-auto lg:rounded-none lg:shadow-none lg:inset-auto' : 'hidden lg:block'}
                bg-[#FFFCEB] border-t-2 sm:border-t-4 border-black lg:border-4 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-200px)] lg:min-h-[400px] transition-transform duration-300 animate-in slide-in-from-bottom lg:shadow-[4px_4px_0px_0px_#000]
                w-full lg:w-auto
            `} style={isPassageOpen ? { bottom: '80px', paddingBottom: 'env(safe-area-inset-bottom)' } : {}}>
                <div className="p-2 sm:p-4 h-full flex flex-col min-w-0">
                    <div className="flex justify-between items-center mb-1 sm:mb-2 border-b-2 border-black/10 pb-1 sm:pb-2 flex-shrink-0">
                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                            <h3 className="font-black text-sm sm:text-lg truncate">WACANA</h3>
                        </div>
                        <Button variant="ghost" size="sm" className="lg:hidden h-7 w-7 p-0 flex-shrink-0" onClick={() => setIsPassageOpen(false)}><X className="w-4 h-4" /></Button>
                    </div>
                    <div className={`flex-1 overflow-y-auto overflow-x-hidden text-xs sm:text-sm font-medium leading-relaxed break-words [&>ul]:list-disc [&>ul]:pl-4 sm:[&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-4 sm:[&>ol]:pl-5 min-w-0`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <div className="max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            <MathRenderer text={currentQuestion.passage!} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* QUESTION AREA */}
        <Card className={`min-h-[300px] sm:min-h-[400px] flex flex-col justify-between relative shadow-[4px_4px_0px_0px_#000] lg:shadow-[8px_8px_0px_0px_#000] w-full p-3 sm:p-4 hover:shadow-[6px_6px_0px_0px_#000] lg:hover:shadow-[10px_10px_0px_0px_#000] transition-all duration-200 ${
          isQuestionTransitioning ? 'opacity-50 pointer-events-none' : 'animate-in fade-in duration-300'
        }`}>
             {/* Ragu-ragu Toggle */}
             <div className="absolute top-0 right-0 z-10 p-1 sm:p-2">
                 <label className={`flex items-center gap-1 sm:gap-2 cursor-pointer border-2 border-black px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-[2px_2px_0px_0px_#000] active:translate-y-1 active:shadow-none transition-all duration-200 hover:scale-105 ${
                   markedForReview.has(currentQuestion.id) 
                     ? 'bg-[#FFD43B] hover:bg-[#fcc419]' 
                     : 'bg-white hover:bg-yellow-50'
                 }`}>
                    <input 
                        type="checkbox" 
                        checked={markedForReview.has(currentQuestion.id)} 
                        onChange={toggleMarkForReview}
                        className="hidden"
                    />
                    <Flag className={`w-3 h-3 sm:w-4 sm:h-4 transition-all duration-200 ${markedForReview.has(currentQuestion.id) ? 'fill-black text-black scale-110' : 'text-gray-400'}`} />
                    <span className="text-[10px] sm:text-xs font-bold uppercase select-none hidden xs:inline">Ragu</span>
                 </label>
              </div>

              <div>
                {isQuestionTransitioning ? (
                  // Loading skeleton saat transition
                  <div className="mb-3 sm:mb-4 pr-12 sm:pr-20 flex items-center gap-2 animate-pulse">
                    <div className="h-6 w-24 bg-gray-200 border-2 border-gray-300 rounded-sm"></div>
                    <div className="h-6 w-20 bg-gray-200 border-2 border-gray-300 rounded-sm"></div>
                  </div>
                ) : (
                  <div className="mb-3 sm:mb-4 pr-12 sm:pr-20 flex items-center gap-2 animate-in fade-in slide-in-from-left duration-300">
                    <Badge variant="default" className="text-xs sm:text-sm">Soal No. {currentQuestionIndex + 1}</Badge>
                    {markedForReview.has(currentQuestion.id) && (
                      <Badge variant="warning" className="text-xs sm:text-sm animate-in fade-in zoom-in duration-300">
                        <Flag className="w-3 h-3 fill-black" /> Ditandai
                      </Badge>
                    )}
                  </div>
                )}

                {currentQuestion.imageUrl && (
                    <div className="mb-4 sm:mb-6 group relative cursor-zoom-in inline-block animate-in fade-in duration-300" onClick={() => setLightboxImage(currentQuestion.imageUrl!)}>
                        <img 
                            src={currentQuestion.imageUrl} 
                            alt="Visual Soal" 
                            className="max-h-[180px] sm:max-h-[250px] w-auto border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)]"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white p-1.5 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 border border-white/30 pointer-events-none">
                            <ZoomIn className="w-4 h-4" />
                            <span className="text-xs font-bold">Klik untuk zoom</span>
                        </div>
                    </div>
                )}
                
                {isQuestionTransitioning ? (
                  // Loading skeleton untuk question text
                  <div className="mb-4 sm:mb-6 space-y-2 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                ) : (
                  <div className={`${fontSize} font-bold mb-4 sm:mb-6 leading-relaxed whitespace-pre-line break-words animate-in fade-in duration-300`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    <MathRenderer text={currentQuestion.text} />
                  </div>
                )}

                {/* --- ANSWER INPUTS --- */}
                {isQuestionTransitioning ? (
                  // Loading skeleton untuk answer options
                  <div className="space-y-3 sm:space-y-4 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-16 bg-gray-100 border-2 border-gray-300 rounded-sm"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
                  
                  {/* TYPE: PILIHAN GANDA */}
                  {currentQuestion.type === 'PILIHAN_GANDA' && (
                    <div className="grid gap-2 sm:gap-3">
                      {(currentQuestion._shuffledOptions || currentQuestion.options || []).map((item, idx) => {
                        const isShuffled = !!currentQuestion._shuffledOptions;
                        const text = isShuffled ? ((item as ShuffledOption).text || '') : (typeof item === 'string' ? (item || '') : (item?.text || ''));
                        const imageUrl = isShuffled ? ((item as ShuffledOption).imageUrl) : (typeof item === 'string' ? undefined : (item?.imageUrl));
                        const originalIndexVal = isShuffled ? (item as ShuffledOption).originalIndex.toString() : idx.toString();
                        const isSelected = answers[currentQuestion.id] === originalIndexVal;

                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleAnswerChange(originalIndexVal)}
                                className={`
                                    flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 border-2 border-black cursor-pointer transition-all duration-200 active:scale-[0.98] hover:scale-[1.01]
                                    ${isSelected ? 'bg-[#C3FAE8] shadow-[2px_2px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] ring-2 ring-[#51CF66] ring-offset-2' : 'bg-white hover:bg-gray-50 hover:shadow-[3px_3px_0px_0px_#000]'}
                                `}
                            >
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 mt-0.5 border-2 border-black rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-black text-white' : 'bg-white'}`}>
                                    {isSelected && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className={`${fontSize} font-medium leading-snug min-w-0 break-words`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        <span className="font-bold mr-1 sm:mr-2">{String.fromCharCode(65 + idx)}.</span><MathRenderer text={text} />
                                    </span>
                                    {imageUrl && (
                                        <div className="mt-2 group relative cursor-zoom-in inline-block" onClick={(e) => { e.stopPropagation(); setLightboxImage(imageUrl); }}>
                                            <img
                                                src={imageUrl}
                                                alt={`Gambar opsi ${String.fromCharCode(65 + idx)}`}
                                                className="max-w-full h-auto max-h-48 border-2 border-gray-300 rounded transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/80 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 border border-white/30 pointer-events-none text-xs">
                                                <ZoomIn className="w-3 h-3" />
                                                <span className="font-bold">Zoom</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TYPE: PILIHAN GANDA KOMPLEKS (Multiple Select) */}
                  {currentQuestion.type === 'PILIHAN_GANDA_KOMPLEKS' && (
                    <div className="space-y-2">
                      <div className="mb-2 sm:mb-3 p-1.5 sm:p-2 bg-yellow-50 border-2 border-yellow-400 text-[10px] sm:text-xs font-bold">
                        Pilih <strong>SEMUA</strong> jawaban yang benar
                      </div>
                      <div className="grid gap-2 sm:gap-3">
                        {(currentQuestion._shuffledOptions || currentQuestion.options || []).map((item, idx) => {
                          const isShuffled = !!currentQuestion._shuffledOptions;
                          const text = isShuffled ? (item as ShuffledOption).text : (typeof item === 'string' ? item : item.text);
                          const imageUrl = isShuffled ? (item as ShuffledOption).imageUrl : (typeof item === 'string' ? undefined : item.imageUrl);
                          const originalIndexVal = isShuffled ? (item as ShuffledOption).originalIndex.toString() : idx.toString();
                          
                          // Parse current selections (JSON array)
                          let currentSelections: string[] = [];
                          try {
                            const currentAnswer = answers[currentQuestion.id];
                            if (currentAnswer) {
                              currentSelections = JSON.parse(currentAnswer);
                            }
                          } catch (e) {
                            currentSelections = [];
                          }
                          const isSelected = currentSelections.includes(originalIndexVal);

                          return (
                              <div 
                                  key={idx} 
                                  onClick={() => handleMultipleSelectChange(originalIndexVal)}
                                  className={`
                                      flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 border-2 border-black cursor-pointer transition-all active:scale-[0.98]
                                      ${isSelected ? 'bg-[#C3FAE8] shadow-[2px_2px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000]' : 'bg-white hover:bg-gray-50'}
                                  `}
                              >
                                  <div className={`w-5 h-5 sm:w-6 sm:h-6 mt-0.5 border-2 border-black flex items-center justify-center shrink-0 transition-all duration-200 ${isSelected ? 'bg-black text-white scale-110' : 'bg-white'}`}>
                                      {isSelected && <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 animate-in zoom-in duration-200" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <span className={`${fontSize} font-medium leading-snug min-w-0 break-words`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                          <span className="font-bold mr-1 sm:mr-2">{String.fromCharCode(65 + idx)}.</span><MathRenderer text={text} />
                                      </span>
                                      {imageUrl && (
                                          <div className="mt-2 group relative cursor-zoom-in inline-block animate-in fade-in duration-300" onClick={(e) => { e.stopPropagation(); setLightboxImage(imageUrl); }}>
                                              <img
                                                  src={imageUrl}
                                                  alt={`Gambar opsi ${String.fromCharCode(65 + idx)}`}
                                                  className="max-w-full h-auto max-h-48 border-2 border-gray-300 rounded transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                                              />
                                              <div className="absolute bottom-2 right-2 bg-black/80 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 border border-white/30 pointer-events-none text-xs">
                                                  <ZoomIn className="w-3 h-3" />
                                                  <span className="font-bold">Zoom</span>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                        })}
                      </div>
                      {(() => {
                        let currentSelections: string[] = [];
                        try {
                          const currentAnswer = answers[currentQuestion.id];
                          if (currentAnswer) {
                            currentSelections = JSON.parse(currentAnswer);
                          }
                        } catch (e) {}
                        return currentSelections.length > 0 && (
                          <div className="mt-3 text-xs font-bold text-gray-600">
                            Dipilih: {currentSelections.length} jawaban
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TYPE: BENAR SALAH */}
                  {currentQuestion.type === 'BENAR_SALAH' && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                      <button 
                        onClick={() => handleAnswerChange('true')}
                        className={`flex-1 p-4 sm:p-6 border-2 border-black font-black text-lg sm:text-xl transition-all duration-200 shadow-[2px_2px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-2 sm:gap-3 hover:scale-[1.02] ${
                          answers[currentQuestion.id] === 'true' ? 'bg-[#51CF66] text-black ring-2 ring-[#51CF66] ring-offset-2 shadow-[4px_4px_0px_0px_#000]' : 'bg-white hover:bg-green-50 hover:shadow-[3px_3px_0px_0px_#000]'
                        }`}
                      >
                        <Check className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
                        BENAR
                      </button>
                      <button 
                        onClick={() => handleAnswerChange('false')}
                        className={`flex-1 p-4 sm:p-6 border-2 border-black font-black text-lg sm:text-xl transition-all duration-200 shadow-[2px_2px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-2 sm:gap-3 hover:scale-[1.02] ${
                          answers[currentQuestion.id] === 'false' ? 'bg-[#FF6B6B] text-white ring-2 ring-[#FF6B6B] ring-offset-2 shadow-[4px_4px_0px_0px_#000]' : 'bg-white hover:bg-red-50 hover:shadow-[3px_3px_0px_0px_#000]'
                        }`}
                      >
                        <X className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
                        SALAH
                      </button>
                    </div>
                  )}

                  {/* TYPE: BENAR SALAH TABEL */}
                  {currentQuestion.type === 'BENAR_SALAH_TABEL' && currentQuestion.statements && (
                    <div className="bg-gray-50 p-2 sm:p-4 border-2 border-black/10 overflow-x-auto -mx-2 sm:mx-0">
                      <p className="text-xs sm:text-sm font-bold opacity-60 mb-2 sm:mb-4 text-center">Pilih Benar/Salah untuk setiap pernyataan</p>
                      
                      {/* Parse current answer (JSON array of 'true'/'false') */}
                      {(() => {
                        let currentAnswers: string[] = [];
                        try {
                          const answerStr = answers[currentQuestion.id];
                          if (answerStr) {
                            currentAnswers = JSON.parse(answerStr);
                          }
                        } catch (e) {
                          currentAnswers = [];
                        }
                        
                        // Ensure array length matches statements
                        while (currentAnswers.length < currentQuestion.statements.length) {
                          currentAnswers.push('');
                        }

                        const handleStatementChange = (index: number, value: 'true' | 'false') => {
                          const updated = [...currentAnswers];
                          updated[index] = value;
                          handleAnswerChange(JSON.stringify(updated));
                        };

                        return (
                          <div className="border-2 border-black bg-white">
                            {/* Table Header */}
                            <div className="grid grid-cols-[32px_1fr_90px] sm:grid-cols-[50px_1fr_auto] md:grid-cols-[60px_1fr_280px] border-b-2 sm:border-b-4 border-black bg-gray-100">
                              <div className="p-1.5 sm:p-3 font-black text-[10px] sm:text-sm border-r-2 border-black text-center">No</div>
                              <div className="p-1.5 sm:p-3 font-black text-[10px] sm:text-sm border-r-2 border-black">Pernyataan</div>
                              <div className="p-1.5 sm:p-3 font-black text-[10px] sm:text-sm text-center">Jawaban</div>
                            </div>
                            
                            {/* Table Rows */}
                            {currentQuestion.statements.map((statement, idx) => {
                              const currentAnswer = currentAnswers[idx] || '';
                              return (
                                <div 
                                  key={idx} 
                                  className={`grid grid-cols-[32px_1fr_90px] sm:grid-cols-[50px_1fr_auto] md:grid-cols-[60px_1fr_280px] border-b-2 border-black/20 ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  }`}
                                >
                                  {/* No Column */}
                                  <div className="p-1.5 sm:p-3 font-bold text-xs sm:text-sm border-r-2 border-black/20 flex items-center justify-center">
                                    {idx + 1}
                                  </div>
                                  
                                  {/* Statement Column */}
                                  <div className="p-1.5 sm:p-3 border-r-2 border-black/20 flex items-center">
                                    <span className="text-xs sm:text-sm font-medium leading-relaxed break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                      <MathRenderer text={statement.text} />
                                    </span>
                                  </div>
                                  
                                  {/* Answer Column */}
                                  <div className="p-1 sm:p-2 flex flex-col gap-1 sm:gap-2 items-stretch justify-center">
                                    <button
                                      onClick={() => handleStatementChange(idx, 'true')}
                                      className={`px-1.5 sm:px-3 py-1 sm:py-2 border-2 border-black font-bold text-[10px] sm:text-xs md:text-sm transition-all duration-200 shadow-[1px_1px_0px_0px_#000] sm:shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap hover:scale-[1.05] ${
                                        currentAnswer === 'true' 
                                          ? 'bg-[#51CF66] text-black ring-1 ring-[#51CF66] ring-offset-1' 
                                          : 'bg-white hover:bg-green-50 hover:shadow-[2px_2px_0px_0px_#000]'
                                      }`}
                                    >
                                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                                      <span className="hidden xs:inline">BENAR</span><span className="xs:hidden">B</span>
                                    </button>
                                    <button
                                      onClick={() => handleStatementChange(idx, 'false')}
                                      className={`px-1.5 sm:px-3 py-1 sm:py-2 border-2 border-black font-bold text-[10px] sm:text-xs md:text-sm transition-all duration-200 shadow-[1px_1px_0px_0px_#000] sm:shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap hover:scale-[1.05] ${
                                        currentAnswer === 'false' 
                                          ? 'bg-[#FF6B6B] text-white ring-1 ring-[#FF6B6B] ring-offset-1' 
                                          : 'bg-white hover:bg-red-50 hover:shadow-[2px_2px_0px_0px_#000]'
                                      }`}
                                    >
                                      <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                                      <span className="hidden xs:inline">SALAH</span><span className="xs:hidden">S</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TYPE: MENJODOHKAN (TAP MATCHING) */}
                  {currentQuestion.type === 'MENJODOHKAN' && currentQuestion.matchingPairs && (
                    <div className="bg-gray-50 p-2 sm:p-4 border-2 border-black/10">
                      <p className="text-[10px] sm:text-sm font-bold opacity-60 mb-2 sm:mb-4 text-center">Tap Kiri lalu Tap Pasangan di Kanan</p>
                      
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-8">
                          {/* Left Column */}
                          <div className="space-y-2 sm:space-y-3">
                              {currentQuestion.matchingPairs.map((pair, idx) => {
                                  const isActive = activeMatchLeft === idx;
                                  let currentMatch: Record<string, string> = {};
                                  try { currentMatch = JSON.parse(answers[currentQuestion.id] || '{}'); } catch(e) {}
                                  const isMatched = currentMatch[idx] !== undefined;
                                  const color = isMatched ? MATCHING_COLORS[idx % MATCHING_COLORS.length] : 'white';

                                  return (
                                      <div 
                                        key={`left-${idx}`}
                                        onClick={() => handleMatchingTap('left', idx)}
                                        className={`
                                            p-2 sm:p-3 border-2 border-black font-bold text-xs sm:text-sm cursor-pointer transition-all duration-200 min-h-[48px] sm:min-h-[60px] flex items-center shadow-[1px_1px_0px_0px_#000] sm:shadow-[2px_2px_0px_0px_#000] hover:scale-[1.02] active:scale-[0.98]
                                            ${isActive ? 'ring-2 ring-black ring-offset-2 bg-yellow-200 scale-105' : ''}
                                        `}
                                        style={{ backgroundColor: isActive ? '#fef08a' : color, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                      >
                                          <MathRenderer text={pair.left} />
                                      </div>
                                  );
                              })}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-2 sm:space-y-3">
                              {shuffledRightOptions.map((opt, rIdx) => {
                                  let currentMatch: Record<string, string> = {};
                                  try { currentMatch = JSON.parse(answers[currentQuestion.id] || '{}'); } catch(e) {}
                                  
                                  // Find which left index is matched to this right value
                                  const matchedLeftIndexStr = Object.keys(currentMatch).find(key => currentMatch[key] === opt);
                                  const isMatched = matchedLeftIndexStr !== undefined;
                                  const matchedLeftIndex = isMatched ? parseInt(matchedLeftIndexStr!) : -1;
                                  const color = isMatched ? MATCHING_COLORS[matchedLeftIndex % MATCHING_COLORS.length] : 'white';

                                  return (
                                      <div 
                                        key={`right-${rIdx}`}
                                        onClick={() => handleMatchingTap('right', opt)}
                                        className={`
                                            p-2 sm:p-3 border-2 border-black text-xs sm:text-sm cursor-pointer transition-all duration-200 min-h-[48px] sm:min-h-[60px] flex items-center justify-between shadow-[1px_1px_0px_0px_#000] sm:shadow-[2px_2px_0px_0px_#000] hover:scale-[1.02] active:scale-[0.98]
                                        `}
                                        style={{ backgroundColor: color, wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                      >
                                          <span className="font-medium min-w-0 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}><MathRenderer text={opt} /></span>
                                          {isMatched && (
                                              <button onClick={(e) => { e.stopPropagation(); handleUnmatch(matchedLeftIndex); }} className="ml-1 sm:ml-2 flex-shrink-0">
                                                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                                              </button>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                    </div>
                  )}

                  {/* TYPE: SEQUENCING */}
                  {currentQuestion.type === 'SEQUENCING' && currentQuestion.sequenceItems && (
                    <div className="bg-gray-50 p-2 sm:p-4 border-2 border-black/10">
                      <p className="text-[10px] sm:text-sm font-bold opacity-60 mb-2 sm:mb-4 text-center">Seret item ke posisi yang benar</p>
                      
                      <div className="space-y-2">
                        {(sequenceAnswers.length > 0 ? sequenceAnswers : (currentQuestion.sequenceItems || []).map((_, i) => i)).map((itemIdx, orderIdx) => (
                          <div
                            key={orderIdx}
                            draggable
                            onDragStart={() => handleSequenceDragStart(orderIdx)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleSequenceDrop(orderIdx)}
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 border-black bg-white cursor-move hover:bg-gray-50 hover:scale-[1.01] transition-all duration-200 shadow-[1px_1px_0px_0px_#000] sm:shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                          >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-black bg-[#FFD43B] flex items-center justify-center font-black text-sm sm:text-lg shrink-0">
                              {orderIdx + 1}
                            </div>
                            <span className="text-xs sm:text-sm font-medium flex-1 min-w-0 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              <MathRenderer text={(() => {
                                const item = currentQuestion.sequenceItems?.[itemIdx];
                                return typeof item === 'string' ? (item || '') : (item?.text || '');
                              })()} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TYPE: CLASSIFICATION */}
                  {currentQuestion.type === 'CLASSIFICATION' && currentQuestion.classificationItems && currentQuestion.categories && (
                    <div className="bg-gray-50 p-2 sm:p-4 border-2 border-black/10">
                      <p className="text-[10px] sm:text-sm font-bold opacity-60 mb-2 sm:mb-4 text-center">Seret item ke kategori yang sesuai</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                        {currentQuestion.categories.map((category, catIdx) => (
                          <div
                            key={catIdx}
                            onDragOver={handleDragOver}
                            onDrop={() => handleClassificationDrop(catIdx)}
                            className="min-h-[100px] sm:min-h-[150px] p-2 sm:p-4 border-2 border-dashed border-black bg-white"
                          >
                            <div className="font-black text-sm sm:text-lg mb-2 sm:mb-3 border-b-2 border-black pb-1 sm:pb-2 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              <MathRenderer text={category} />
                            </div>
                            <div className="space-y-1 sm:space-y-2">
                              {Object.entries(classificationAnswers)
                                .filter(([_, catIndex]) => catIndex === catIdx)
                                .map(([itemIdx]) => (
                                  <div
                                    key={itemIdx}
                                    className="p-1.5 sm:p-2 bg-[#C3FAE8] border-2 border-black font-bold text-xs sm:text-sm break-words hover:bg-[#B2F5E8] transition-colors duration-200"
                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                  >
                                    <MathRenderer text={(() => {
                                      const item = currentQuestion.classificationItems?.[parseInt(itemIdx)];
                                      return typeof item === 'string' ? (item || '') : (item?.text || '');
                                    })()} />
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {currentQuestion.classificationItems.map((item, itemIdx) => {
                          const isPlaced = classificationAnswers[itemIdx] !== undefined;
                          const itemText = typeof item === 'string' ? (item || '') : (item?.text || '');
                          return (
                            <div
                              key={itemIdx}
                              draggable={!isPlaced}
                              onDragStart={() => handleClassificationDragStart(itemIdx)}
                              className={`p-2 sm:p-3 border-2 border-black font-bold text-xs sm:text-sm text-center cursor-move transition-all duration-200 break-words ${
                                isPlaced
                                  ? 'bg-gray-300 opacity-50 cursor-not-allowed'
                                  : 'bg-[#FFD43B] hover:bg-[#FFE066] hover:scale-105 shadow-[1px_1px_0px_0px_#000] sm:shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5'
                              }`}
                              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                            >
                              <MathRenderer text={itemText} />
                              {isPlaced && <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-gray-500">✓</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TYPE: ISIAN SINGKAT */}
                  {currentQuestion.type === 'ISIAN_SINGKAT' && (
                    <div className="bg-white p-1 sm:p-2">
                        <input 
                        type="text" 
                        className="w-full text-base sm:text-xl font-bold border-b-2 sm:border-b-4 border-black bg-transparent px-1 sm:px-2 py-2 focus:outline-none focus:border-[#4F46E5] placeholder:italic placeholder:text-sm"
                        placeholder="Ketik jawaban singkat..."
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        />
                    </div>
                  )}

                  {/* TYPE: URAIAN */}
                  {currentQuestion.type === 'URAIAN' && (
                    <Textarea 
                      rows={6}
                      placeholder="Jelaskan jawabanmu secara detail..."
                      className="text-sm sm:text-lg leading-relaxed"
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                    />
                  )}
                </div>
                )}
              </div>
        </Card>
      </div>

       {/* --- FOOTER ACTION BAR --- */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-50 shadow-[0px_-4px_10px_rgba(0,0,0,0.1)]">
        <div className="w-full px-2 sm:px-4 lg:px-8 xl:px-12 py-2 sm:py-4 flex justify-between items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2 opacity-50 select-none text-xs">
              <Save className="w-3 h-3 sm:w-4 sm:h-4" /> Auto-Saved
          </Button>

          <div className="flex gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
             <Button 
               variant="outline" 
               onClick={() => handleQuestionChange(Math.max(0, currentQuestionIndex - 1))} 
               disabled={currentQuestionIndex === 0 || isQuestionTransitioning} 
               className="flex-1 md:flex-none text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10 hover:bg-gray-100 transition-colors"
               title="Soal Sebelumnya"
             >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-0.5 sm:mr-1" /> <span className="hidden xs:inline">Prev</span>
             </Button>
             
             {isLastQuestion ? (
                 <Button 
                   variant="primary" 
                   className="flex-1 md:flex-none px-3 sm:px-6 text-xs sm:text-sm h-9 sm:h-10 shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:scale-[1.02] transition-all duration-200" 
                   onClick={() => setShowConfirmSubmit(true)}
                   disabled={isQuestionTransitioning}
                 >
                    <span className="hidden xs:inline">Selesai</span><span className="xs:hidden">Done</span> <CheckCircle className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                 </Button>
             ) : (
                 <Button 
                   variant="secondary" 
                   className="flex-1 md:flex-none px-3 sm:px-6 text-xs sm:text-sm h-9 sm:h-10 shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:scale-[1.02] transition-all duration-200" 
                   onClick={() => handleQuestionChange(Math.min(processedQuestions.length - 1, currentQuestionIndex + 1))}
                   disabled={isQuestionTransitioning}
                 >
                    Next <ChevronRight className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                 </Button>
             )}
          </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- (Higher z-index than footer) */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmSubmit(false)}>
          <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <Card className="p-6">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" /> Konfirmasi Selesai
        </h3>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#E0F2F1] p-2 border-2 border-black text-center">
                <span className="block text-2xl font-black">{answeredCount}/{totalQuestions}</span>
                <span className="text-xs font-bold uppercase opacity-60">Terjawab</span>
            </div>
            <div className={`p-2 border-2 border-black text-center ${markedCount > 0 ? 'bg-[#FFD43B]' : 'bg-gray-100'}`}>
                <span className="block text-2xl font-black">{markedCount}</span>
                <span className="text-xs font-bold uppercase opacity-60">Ragu-ragu</span>
            </div>
            {emptyCount > 0 && (
                <div className="col-span-2 bg-[#FF6B6B] text-white p-2 border-2 border-black text-center animate-pulse">
                    <span className="block text-xl font-black flex items-center justify-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> {emptyCount} KOSONG
                    </span>
                    <span className="text-xs font-bold uppercase">Wajib diisi semua? Cek guru.</span>
                </div>
            )}
        </div>

        <p className="mb-6 font-medium text-gray-600">
            {emptyCount > 0 
                ? "Masih ada soal yang kosong nih. Yakin mau nyerah?" 
                : "Udah yakin banget sama jawabannya? Ga mau cek lagi?"}
        </p>

        <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)} disabled={isLoading}>Cek Lagi</Button>
            <Button 
              variant="primary" 
              onClick={() => submitExam(exam.id, answers, violationCount)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Ya, Kirim!'
              )}
            </Button>
        </div>
            </Card>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        variant={alertMessage.title === 'DISKUALIFIKASI' ? 'error' : 'warning'}
      />
    </div>
  );
};