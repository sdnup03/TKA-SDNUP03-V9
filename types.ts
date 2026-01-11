
export type Role = 'GURU' | 'SISWA';

export interface User {
  username: string;
  name: string;
  role: Role;
  classId?: string; // Optional, specific for Students (e.g., "VIII A")
}

export type QuestionType = 'PILIHAN_GANDA' | 'PILIHAN_GANDA_KOMPLEKS' | 'ISIAN_SINGKAT' | 'URAIAN' | 'BENAR_SALAH' | 'MENJODOHKAN' | 'BENAR_SALAH_TABEL' | 'SEQUENCING' | 'CLASSIFICATION';

// Option with optional image
export interface QuestionOption {
  text: string;
  imageUrl?: string; // URL gambar dari Google Drive untuk opsi ini
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string; // URL gambar dari Google Drive
  type: QuestionType;
  passage?: string; // Teks bacaan/wacana/stimulus panjang
  options?: (string | QuestionOption)[]; // For multiple choice - support both string (backward compatible) and QuestionOption
  matchingPairs?: { left: string; right: string; leftImageUrl?: string; rightImageUrl?: string }[]; // For Matching: Left side prompt, Right side answer with optional images
  statements?: { text: string; correctAnswer: 'true' | 'false'; imageUrl?: string }[]; // For BENAR_SALAH_TABEL: Array of statements with correct answers and optional images
  // For SEQUENCING: items to order and correct sequence
  sequenceItems?: (string | { text: string; imageUrl?: string })[]; // Items to be ordered - support both string and object
  correctSequence?: number[]; // Array of indices representing correct order
  // For CLASSIFICATION: items to categorize
  classificationItems?: (string | { text: string; imageUrl?: string })[]; // Items to be classified - support both string and object
  categories?: string[]; // Category names
  classificationMapping?: Record<string, number>; // itemIndex -> categoryIndex (correct answer)
  correctKey?: string; // For auto-grading (index, text, or "true"/"false", or JSON string for complex types)
}

export type ExamStatus = 'DRAFT' | 'DIBUKA' | 'DITUTUP';

export interface Exam {
  id: string;
  title: string;
  subject?: string; // NEW: Mata pelajaran (contoh: "IPA", "Matematika", dll)
  classGrade: string; // e.g., "VIII B"
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  token: string;
  status: ExamStatus;
  questions: Question[];
  areResultsPublished?: boolean; // New field to control result visibility
  randomizeQuestions?: boolean; // New: Acak urutan soal
  randomizeOptions?: boolean;   // New: Acak urutan opsi jawaban (PG)
}

export type NoiseLevel = 'TENANG' | 'WARNING' | 'BERISIK';

export interface StudentAttempt {
  examId: string;
  examTitle?: string; // NEW: Judul ujian untuk rekap yang lebih jelas
  studentName: string;
  answers: Record<string, string>; // questionId -> answer (For matching, value is JSON string)
  isSubmitted: boolean;
  score?: number;
  submittedAt?: string;
  violationCount?: number; // NEW: Track cheating attempts
}

// NEW: For Real-time monitoring
export interface StudentProgress {
  examId: string;
  studentName: string;
  answeredCount: number;
  totalQuestions: number;
  lastActive: string; // ISO String
  status: 'WORKING' | 'SUBMITTED' | 'IDLE';
  violationCount?: number; // NEW: Live tracking of violations
}

export interface AppState {
  currentUser: User | null;
  exams: Exam[];
  activeExamId: string | null;
  attempts: StudentAttempt[];
  noiseLevel: NoiseLevel;
  liveProgress: StudentProgress[];
}

/**
 * Question Bank Item - Soal yang tersimpan di bank soal
 * Extends Question dengan metadata tambahan
 */
export interface QuestionBankItem extends Question {
  subject?: string; // Mata pelajaran
  difficulty?: 'Mudah' | 'Sedang' | 'Sulit'; // Tingkat kesulitan
  tags?: string; // Tags (comma-separated)
  createdAt?: string; // ISO timestamp
  createdBy?: string; // Username guru yang membuat
  usageCount?: number; // Berapa kali soal ini digunakan
  lastUsedAt?: string; // ISO timestamp terakhir digunakan
  // Item Analysis Metrics
  difficultyIndex?: number; // 0-1 (P value)
  discriminationIndex?: number; // -1 to 1 (D value)
  qualityStatus?: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Review' | 'Harus Dibuang';
  lastAnalyzed?: string; // ISO timestamp
}

/**
 * Question Analysis Result - Hasil analisis per soal per ujian
 */
export interface QuestionAnalysis {
  id: string; // Unique ID untuk record ini
  questionId: string; // ID soal yang dianalisis
  examId: string; // ID ujian
  examTitle: string;
  questionText: string; // Snapshot text soal
  questionType: QuestionType;
  
  // Basic Stats
  totalAttempts: number; // Jumlah siswa yang mengerjakan
  correctCount: number; // Jumlah yang benar
  incorrectCount: number; // Jumlah yang salah
  
  // Item Analysis Metrics
  difficultyIndex: number; // P = correctCount / totalAttempts (0-1)
  difficultyLevel: 'Mudah' | 'Sedang' | 'Sulit';
  
  discriminationIndex: number; // D value (-1 to 1)
  discriminationQuality: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Jelek' | 'Sangat Jelek';
  
  // Overall Quality
  isGoodQuestion: boolean; // Auto flag: D >= 0.30 && P 0.30-0.70
  shouldBeReviewed: boolean; // D < 0.30 atau P < 0.20 atau P > 0.80
  shouldBeDeleted: boolean; // D < 0.20 atau D negative
  
  // Distraktor Analysis (untuk Pilihan Ganda)
  distractorAnalysis?: {
    optionIndex: number;
    optionText: string;
    selectedCount: number;
    selectedPercentage: number;
    selectedByTopGroup: number;
    selectedByBottomGroup: number;
    effectiveness: 'Baik' | 'Kurang' | 'Tidak Berfungsi';
  }[];
  
  analyzedAt: string; // ISO timestamp
}

/**
 * Exam Analysis Summary - Ringkasan analisis per ujian
 */
export interface ExamAnalysisSummary {
  examId: string;
  examTitle: string;
  totalQuestions: number;
  totalStudents: number;
  averageDifficulty: number;
  averageDiscrimination: number;
  
  qualityDistribution: {
    sangat_baik: number;
    baik: number;
    cukup: number;
    perlu_review: number;
    harus_dibuang: number;
  };
  
  analyzedAt: string;
}
