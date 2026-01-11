
import { Exam, Question } from './types';

export const MOCK_QUESTIONS_IPA: Question[] = [
  {
    id: 'q1',
    text: 'Bagian terkecil dari suatu unsur yang masih memiliki sifat unsur tersebut disebut...',
    type: 'PILIHAN_GANDA',
    options: ['Molekul', 'Atom', 'Partikel', 'Senyawa'],
    correctKey: '1' // Index 1: Atom
  },
  {
    id: 'q2',
    text: 'Jelaskan perbedaan antara getaran dan gelombang!',
    type: 'URAIAN',
  },
  {
    id: 'q3',
    text: 'Bunyi tidak dapat merambat di ruang hampa karena bunyi merupakan gelombang...',
    type: 'ISIAN_SINGKAT',
    correctKey: 'mekanik'
  },
  {
    id: 'q4',
    text: 'Frekuensi bunyi yang dapat didengar oleh manusia (audiosonik) berkisar antara...',
    type: 'PILIHAN_GANDA',
    options: ['< 20 Hz', '20 Hz - 20.000 Hz', '> 20.000 Hz', '20 kHz - 40 kHz'],
    correctKey: '1'
  },
  {
    id: 'q5',
    text: 'Gaya gesek selalu berlawanan arah dengan arah gerak benda.',
    type: 'BENAR_SALAH',
    correctKey: 'true'
  },
  {
    id: 'q6',
    text: 'Pasangkan besaran pokok berikut dengan satuan Sistem Internasional (SI) yang tepat!',
    type: 'MENJODOHKAN',
    matchingPairs: [
      { left: 'Panjang', right: 'Meter' },
      { left: 'Massa', right: 'Kilogram' },
      { left: 'Waktu', right: 'Sekon' },
      { left: 'Suhu', right: 'Kelvin' }
    ]
  },
  {
    id: 'q7',
    text: 'Berdasarkan wacana di samping, organisme manakah yang bertindak sebagai Produsen Utama?',
    type: 'PILIHAN_GANDA',
    passage: `Ekosistem Sawah\n\nDi sebuah sawah, terdapat berbagai makhluk hidup yang saling berinteraksi. Padi tumbuh subur dengan bantuan sinar matahari dan air irigasi. Belalang memakan daun padi yang hijau. Katak bersembunyi di balik batang padi menunggu belalang lewat untuk dimangsa. Ular sawah sesekali muncul mencari katak. Di langit, burung elang mengawasi gerak-gerik ular dari kejauhan.\n\nInteraksi ini membentuk rantai makanan yang menjaga keseimbangan ekosistem. Jika salah satu populasi hilang, akan berdampak pada populasi lainnya.`,
    options: ['Belalang', 'Padi', 'Katak', 'Elang'],
    correctKey: '1'
  },
  {
    id: 'q8',
    text: 'Tentukan pernyataan berikut BENAR atau SALAH dengan memberikan tanda centang pada kolom yang sesuai!',
    type: 'BENAR_SALAH_TABEL',
    statements: [
      { text: 'Getaran adalah gerakan bolak-balik suatu benda melalui titik kesetimbangan.', correctAnswer: 'true' },
      { text: 'Gelombang memerlukan medium untuk merambat.', correctAnswer: 'false' },
      { text: 'Frekuensi adalah banyaknya getaran dalam satu detik.', correctAnswer: 'true' },
      { text: 'Amplitudo adalah jarak terjauh dari titik kesetimbangan.', correctAnswer: 'true' },
      { text: 'Gelombang elektromagnetik dapat merambat di ruang hampa.', correctAnswer: 'true' }
    ],
    correctKey: JSON.stringify(['true', 'false', 'true', 'true', 'true'])
  }
];

export const MOCK_EXAMS: Exam[] = [
  {
    id: 'ex-1',
    title: 'Ulangan Harian: Getaran & Gelombang',
    classGrade: 'VIII B',
    date: new Date().toISOString().split('T')[0], // Hari ini
    startTime: '08:00',
    endTime: '09:30',
    durationMinutes: 40,
    token: 'IPA8B',
    status: 'DIBUKA',
    questions: MOCK_QUESTIONS_IPA,
    areResultsPublished: false
  },
  {
    id: 'ex-2',
    title: 'Ujian Tengah Semester (IPA)',
    classGrade: 'VIII A',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Besok
    startTime: '10:00',
    endTime: '12:00',
    durationMinutes: 90,
    token: 'UTSIPA',
    status: 'DRAFT',
    questions: [],
    areResultsPublished: false
  }
];
