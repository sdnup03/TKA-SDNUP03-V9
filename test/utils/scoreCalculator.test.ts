import { describe, it, expect } from 'vitest';
import { Question } from '../../types';

// Copy calculateScore function for testing
const calculateScore = (questions: Question[], answers: Record<string, string>): number => {
  if (!questions || questions.length === 0) return 0;

  let totalScore = 0;
  let maxPossibleScore = questions.length;

  questions.forEach(q => {
    const studentAnswer = answers[q.id];
    if (!studentAnswer) return;

    if (q.type === 'PILIHAN_GANDA') {
      if (studentAnswer === q.correctKey) totalScore += 1;
    } else if (q.type === 'BENAR_SALAH') {
      if (studentAnswer === q.correctKey) totalScore += 1;
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
    }
  });

  return Math.round((totalScore / maxPossibleScore) * 100);
};

describe('calculateScore', () => {
  it('should return 0 for empty questions', () => {
    expect(calculateScore([], {})).toBe(0);
  });

  it('should return 0 for null/undefined questions', () => {
    expect(calculateScore(null as any, {})).toBe(0);
    expect(calculateScore(undefined as any, {})).toBe(0);
  });

  it('should calculate score for PILIHAN_GANDA correctly', () => {
    const questions: Question[] = [
      {
        id: '1',
        text: 'What is 2+2?',
        type: 'PILIHAN_GANDA',
        options: { A: '3', B: '4', C: '5', D: '6' },
        correctKey: 'B',
      },
      {
        id: '2',
        text: 'What is 3+3?',
        type: 'PILIHAN_GANDA',
        options: { A: '5', B: '6', C: '7', D: '8' },
        correctKey: 'B',
      },
    ];

    // All correct
    expect(calculateScore(questions, { '1': 'B', '2': 'B' })).toBe(100);

    // Half correct
    expect(calculateScore(questions, { '1': 'B', '2': 'A' })).toBe(50);

    // All wrong
    expect(calculateScore(questions, { '1': 'A', '2': 'A' })).toBe(0);

    // One unanswered
    expect(calculateScore(questions, { '1': 'B' })).toBe(50);
  });

  it('should calculate score for BENAR_SALAH correctly', () => {
    const questions: Question[] = [
      {
        id: '1',
        text: 'The sky is blue',
        type: 'BENAR_SALAH',
        options: { BENAR: 'Benar', SALAH: 'Salah' },
        correctKey: 'BENAR',
      },
    ];

    expect(calculateScore(questions, { '1': 'BENAR' })).toBe(100);
    expect(calculateScore(questions, { '1': 'SALAH' })).toBe(0);
  });

  it('should calculate score for ISIAN_SINGKAT correctly (case insensitive)', () => {
    const questions: Question[] = [
      {
        id: '1',
        text: 'What is the capital of Indonesia?',
        type: 'ISIAN_SINGKAT',
        correctKey: 'Jakarta',
      },
    ];

    expect(calculateScore(questions, { '1': 'Jakarta' })).toBe(100);
    expect(calculateScore(questions, { '1': 'jakarta' })).toBe(100);
    expect(calculateScore(questions, { '1': 'JAKARTA' })).toBe(100);
    expect(calculateScore(questions, { '1': '  Jakarta  ' })).toBe(100);
    expect(calculateScore(questions, { '1': 'Bandung' })).toBe(0);
  });

  it('should calculate score for MENJODOHKAN correctly', () => {
    const questions: Question[] = [
      {
        id: '1',
        text: 'Match the pairs',
        type: 'MENJODOHKAN',
        matchingPairs: [
          { left: 'Apple', right: 'Red' },
          { left: 'Banana', right: 'Yellow' },
        ],
      },
    ];

    // All correct
    const allCorrect = JSON.stringify({ 0: 'Red', 1: 'Yellow' });
    expect(calculateScore(questions, { '1': allCorrect })).toBe(100);

    // Half correct
    const halfCorrect = JSON.stringify({ 0: 'Red', 1: 'Green' });
    expect(calculateScore(questions, { '1': halfCorrect })).toBe(50);

    // All wrong
    const allWrong = JSON.stringify({ 0: 'Blue', 1: 'Green' });
    expect(calculateScore(questions, { '1': allWrong })).toBe(0);
  });

  it('should handle mixed question types', () => {
    const questions: Question[] = [
      {
        id: '1',
        text: 'MCQ',
        type: 'PILIHAN_GANDA',
        options: { A: '1', B: '2' },
        correctKey: 'A',
      },
      {
        id: '2',
        text: 'True/False',
        type: 'BENAR_SALAH',
        options: { BENAR: 'Benar', SALAH: 'Salah' },
        correctKey: 'BENAR',
      },
      {
        id: '3',
        text: 'Short answer',
        type: 'ISIAN_SINGKAT',
        correctKey: 'answer',
      },
    ];

    // 2 out of 3 correct
    expect(calculateScore(questions, {
      '1': 'A',
      '2': 'BENAR',
      '3': 'wrong',
    })).toBe(67); // Rounded from 66.67
  });

  it('should round scores correctly', () => {
    const questions: Question[] = [
      { id: '1', text: 'Q1', type: 'PILIHAN_GANDA', options: { A: '1', B: '2' }, correctKey: 'A' },
      { id: '2', text: 'Q2', type: 'PILIHAN_GANDA', options: { A: '1', B: '2' }, correctKey: 'A' },
      { id: '3', text: 'Q3', type: 'PILIHAN_GANDA', options: { A: '1', B: '2' }, correctKey: 'A' },
    ];

    // 1 out of 3 = 33.33% -> rounded to 33
    expect(calculateScore(questions, { '1': 'A' })).toBe(33);
  });
});
