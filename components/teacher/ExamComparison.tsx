import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Card, Badge } from '../ui/brutalist';
import { ArrowLeft, TrendingUp, Trophy, AlertTriangle } from 'lucide-react';
import { Exam } from '../../types';

interface ExamComparisonProps {
  examIds: string[];
  onBack: () => void;
}

export const ExamComparison: React.FC<ExamComparisonProps> = ({ examIds, onBack }) => {
  const { exams, questionAnalysis, attempts } = useApp();
  const [loading, setLoading] = useState(true);

  const selectedExams = exams.filter(e => examIds.includes(e.id));

  useEffect(() => {
    // Simulate loading
    setLoading(false);
  }, []);

  // Calculate metrics for each exam
  const getExamMetrics = (examId: string) => {
    const examAnalysisData = questionAnalysis.filter(a => a.examId === examId);
    const examAttempts = attempts.filter(a => a.examId === examId);
    
    const totalQuestions = examAnalysisData.length;
    const goodQuestions = examAnalysisData.filter(a => a.isGoodQuestion).length;
    const reviewNeeded = examAnalysisData.filter(a => a.shouldBeReviewed).length;
    const shouldDelete = examAnalysisData.filter(a => a.shouldBeDeleted).length;
    
    const avgDifficulty = totalQuestions > 0
      ? examAnalysisData.reduce((sum, a) => sum + a.difficultyIndex, 0) / totalQuestions
      : 0;
    
    const avgDiscrimination = totalQuestions > 0
      ? examAnalysisData.reduce((sum, a) => sum + a.discriminationIndex, 0) / totalQuestions
      : 0;
    
    const avgScore = examAttempts.length > 0
      ? examAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / examAttempts.length
      : 0;
    
    return {
      totalQuestions,
      goodQuestions,
      reviewNeeded,
      shouldDelete,
      avgDifficulty,
      avgDiscrimination,
      totalStudents: examAttempts.length,
      avgScore
    };
  };

  const metricsData = selectedExams.map(exam => ({
    exam,
    metrics: getExamMetrics(exam.id)
  }));

  // Find best exam for each metric
  const bestDiscrimination = metricsData.reduce((best, current) => 
    current.metrics.avgDiscrimination > best.metrics.avgDiscrimination ? current : best
  , metricsData[0]);

  const bestQuality = metricsData.reduce((best, current) => 
    (current.metrics.goodQuestions / current.metrics.totalQuestions) > 
    (best.metrics.goodQuestions / best.metrics.totalQuestions) ? current : best
  , metricsData[0]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <h2 className="text-xl font-black">Perbandingan Ujian</h2>
        </div>
        <Card className="p-8 text-center">
          <p className="font-bold">Memuat data perbandingan...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div>
          <h2 className="text-xl font-black">Perbandingan Ujian</h2>
          <p className="text-sm opacity-60 font-bold">
            Membandingkan {selectedExams.length} ujian
          </p>
        </div>
      </div>

      {/* Best Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-2 border-green-500">
          <div className="flex items-start gap-3">
            <Trophy className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold opacity-60 uppercase mb-1">Daya Pembeda Terbaik</p>
              <p className="font-black text-lg">{bestDiscrimination.exam.title}</p>
              <p className="text-sm font-bold text-green-600 mt-1">
                D Index: {bestDiscrimination.metrics.avgDiscrimination.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-blue-500">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold opacity-60 uppercase mb-1">Kualitas Soal Terbaik</p>
              <p className="font-black text-lg">{bestQuality.exam.title}</p>
              <p className="text-sm font-bold text-blue-600 mt-1">
                {bestQuality.metrics.goodQuestions} dari {bestQuality.metrics.totalQuestions} soal baik 
                ({Math.round((bestQuality.metrics.goodQuestions / bestQuality.metrics.totalQuestions) * 100)}%)
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="p-0 border-2 border-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-3 text-left font-black text-sm">Metrik</th>
                {selectedExams.map(exam => (
                  <th key={exam.id} className="p-3 text-center font-black text-sm">
                    {exam.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black">
              {/* Total Questions */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Total Soal</td>
                {metricsData.map(({ exam, metrics }) => (
                  <td key={exam.id} className="p-3 text-center font-bold">
                    {metrics.totalQuestions}
                  </td>
                ))}
              </tr>

              {/* Total Students */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Total Siswa</td>
                {metricsData.map(({ exam, metrics }) => (
                  <td key={exam.id} className="p-3 text-center font-bold">
                    {metrics.totalStudents}
                  </td>
                ))}
              </tr>

              {/* Avg Score */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Rata² Nilai</td>
                {metricsData.map(({ exam, metrics }) => {
                  const isHighest = metrics.avgScore === Math.max(...metricsData.map(d => d.metrics.avgScore));
                  return (
                    <td key={exam.id} className={`p-3 text-center font-bold ${isHighest ? 'bg-green-50 text-green-700' : ''}`}>
                      {metrics.avgScore.toFixed(1)}
                      {isHighest && <Trophy className="w-4 h-4 inline ml-1" />}
                    </td>
                  );
                })}
              </tr>

              {/* Avg P Index */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Rata² P Index</td>
                {metricsData.map(({ exam, metrics }) => (
                  <td key={exam.id} className="p-3 text-center font-bold">
                    {(metrics.avgDifficulty * 100).toFixed(0)}%
                  </td>
                ))}
              </tr>

              {/* Avg D Index */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Rata² D Index</td>
                {metricsData.map(({ exam, metrics }) => {
                  const isHighest = metrics.avgDiscrimination === Math.max(...metricsData.map(d => d.metrics.avgDiscrimination));
                  return (
                    <td key={exam.id} className={`p-3 text-center font-bold ${isHighest ? 'bg-green-50 text-green-700' : ''}`}>
                      {metrics.avgDiscrimination.toFixed(2)}
                      {isHighest && <Trophy className="w-4 h-4 inline ml-1" />}
                    </td>
                  );
                })}
              </tr>

              {/* Good Questions */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Soal Berkualitas</td>
                {metricsData.map(({ exam, metrics }) => {
                  const percentage = metrics.totalQuestions > 0 ? (metrics.goodQuestions / metrics.totalQuestions) * 100 : 0;
                  const isHighest = percentage === Math.max(...metricsData.map(d => 
                    d.metrics.totalQuestions > 0 ? (d.metrics.goodQuestions / d.metrics.totalQuestions) * 100 : 0
                  ));
                  return (
                    <td key={exam.id} className={`p-3 text-center font-bold ${isHighest ? 'bg-green-50 text-green-700' : ''}`}>
                      {metrics.goodQuestions} ({percentage.toFixed(0)}%)
                      {isHighest && <Trophy className="w-4 h-4 inline ml-1" />}
                    </td>
                  );
                })}
              </tr>

              {/* Review Needed */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Perlu Review</td>
                {metricsData.map(({ exam, metrics }) => (
                  <td key={exam.id} className="p-3 text-center font-bold text-yellow-600">
                    {metrics.reviewNeeded}
                  </td>
                ))}
              </tr>

              {/* Should Delete */}
              <tr className="hover:bg-gray-50">
                <td className="p-3 font-bold">Harus Dibuang</td>
                {metricsData.map(({ exam, metrics }) => (
                  <td key={exam.id} className="p-3 text-center font-bold text-red-600">
                    {metrics.shouldDelete}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-4 border-2 border-yellow-500">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-black mb-2">Insights & Rekomendasi:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {bestDiscrimination.metrics.avgDiscrimination > 0.35 && (
                <li className="font-bold">
                  <span className="text-green-600">{bestDiscrimination.exam.title}</span> memiliki daya pembeda terbaik - gunakan sebagai referensi!
                </li>
              )}
              {metricsData.some(d => d.metrics.shouldDelete > d.metrics.totalQuestions * 0.2) && (
                <li className="font-bold text-red-600">
                  Ada ujian dengan &gt;20% soal perlu dibuang - review mendalam diperlukan.
                </li>
              )}
              {metricsData.every(d => d.metrics.avgDiscrimination > 0.25) && (
                <li className="font-bold text-green-600">
                  Semua ujian memiliki daya pembeda cukup baik - pertahankan kualitas ini!
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
