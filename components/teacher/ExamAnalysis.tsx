import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Card, Badge } from '../ui/brutalist';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, BarChart3, Download, Printer, FileText } from 'lucide-react';
import { Exam } from '../../types';

interface ExamAnalysisProps {
  exam: Exam;
  onBack: () => void;
}

export const ExamAnalysis: React.FC<ExamAnalysisProps> = ({ exam, onBack }) => {
  const { questionAnalysis, getQuestionAnalysis, attempts } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      await getQuestionAnalysis(exam.id);
      setLoading(false);
    };
    fetchAnalysis();
  }, [exam.id]);

  // Filter analysis for this exam
  const examAnalysis = questionAnalysis.filter(a => a.examId === exam.id);
  
  // Get exam attempts for this exam
  const examAttempts = attempts.filter(a => a.examId === exam.id);

  // Calculate summary stats
  const totalQuestions = examAnalysis.length;
  const sangat_baik = examAnalysis.filter(a => a.discriminationQuality === 'Sangat Baik').length;
  const baik = examAnalysis.filter(a => a.discriminationQuality === 'Baik').length;
  const cukup = examAnalysis.filter(a => a.discriminationQuality === 'Cukup').length;
  const jelek = examAnalysis.filter(a => a.discriminationQuality === 'Jelek').length;
  const sangat_jelek = examAnalysis.filter(a => a.discriminationQuality === 'Sangat Jelek').length;
  
  const goodQuestions = examAnalysis.filter(a => a.isGoodQuestion).length;
  const reviewNeeded = examAnalysis.filter(a => a.shouldBeReviewed).length;
  const shouldDelete = examAnalysis.filter(a => a.shouldBeDeleted).length;

  const avgDifficulty = totalQuestions > 0 
    ? (examAnalysis.reduce((sum, a) => sum + a.difficultyIndex, 0) / totalQuestions) 
    : 0;
  
  const avgDiscrimination = totalQuestions > 0
    ? (examAnalysis.reduce((sum, a) => sum + a.discriminationIndex, 0) / totalQuestions)
    : 0;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Sangat Baik': return 'bg-green-500 text-white';
      case 'Baik': return 'bg-blue-500 text-white';
      case 'Cukup': return 'bg-yellow-500 text-black';
      case 'Jelek': return 'bg-orange-500 text-white';
      case 'Sangat Jelek': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Mudah': return 'bg-green-100 text-green-800 border-green-300';
      case 'Sedang': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Sulit': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Export Handlers
  const handleExportJSON = () => {
    const exportData = {
      examTitle: exam.title,
      examId: exam.id,
      totalQuestions,
      totalStudents: examAttempts.length,
      summary: {
        goodQuestions,
        reviewNeeded,
        shouldDelete,
        avgDifficulty,
        avgDiscrimination
      },
      questions: examAnalysis.map(a => ({
        questionText: a.questionText,
        questionType: a.questionType,
        totalAttempts: a.totalAttempts,
        correctCount: a.correctCount,
        difficultyIndex: a.difficultyIndex,
        difficultyLevel: a.difficultyLevel,
        discriminationIndex: a.discriminationIndex,
        discriminationQuality: a.discriminationQuality,
        isGoodQuestion: a.isGoodQuestion,
        shouldBeReviewed: a.shouldBeReviewed,
        shouldBeDeleted: a.shouldBeDeleted,
        distractorAnalysis: a.distractorAnalysis
      })),
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis-${exam.title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['No', 'Soal', 'Tipe', 'Dijawab', 'Benar', 'Benar%', 'P Index', 'Level', 'D Index', 'Kualitas', 'Status'];
    const rows = examAnalysis.map((a, idx) => [
      idx + 1,
      `"${a.questionText.replace(/"/g, '""').substring(0, 100)}..."`,
      a.questionType,
      a.totalAttempts,
      a.correctCount,
      Math.round((a.correctCount / a.totalAttempts) * 100),
      (a.difficultyIndex * 100).toFixed(0) + '%',
      a.difficultyLevel,
      a.discriminationIndex.toFixed(2),
      a.discriminationQuality,
      a.shouldBeDeleted ? 'Harus Dibuang' : a.shouldBeReviewed ? 'Perlu Review' : 'Baik'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis-${exam.title.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <div>
            <h2 className="text-xl font-black">Analisis Soal</h2>
            <p className="text-sm opacity-60 font-bold">{exam.title}</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <div className="animate-pulse">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-bold">Memuat data analisis...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (examAnalysis.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <div>
            <h2 className="text-xl font-black">Analisis Soal</h2>
            <p className="text-sm opacity-60 font-bold">{exam.title}</p>
          </div>
        </div>
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h3 className="font-black text-lg mb-2">Belum Ada Data Analisis</h3>
          <p className="text-sm opacity-60 mb-4">
            Klik tombol "Analisis Soal" di dashboard untuk menganalisis kualitas soal ujian ini.
          </p>
          <Button variant="secondary" onClick={onBack}>
            Kembali ke Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft />
          </Button>
          <div>
            <h2 className="text-xl font-black">Analisis Kualitas Soal</h2>
            <p className="text-sm opacity-60 font-bold">
              {exam.title} • {examAttempts.length} Siswa • {totalQuestions} Soal
            </p>
          </div>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">JSON</span>
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">CSV</span>
          </Button>
          <Button 
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold opacity-60 uppercase">Soal Berkualitas</p>
              <p className="text-3xl font-black mt-1">{goodQuestions}</p>
              <p className="text-xs opacity-60 mt-1">
                {totalQuestions > 0 ? Math.round((goodQuestions / totalQuestions) * 100) : 0}% dari total
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 border-2 border-yellow-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold opacity-60 uppercase">Perlu Review</p>
              <p className="text-3xl font-black mt-1">{reviewNeeded}</p>
              <p className="text-xs opacity-60 mt-1">
                {totalQuestions > 0 ? Math.round((reviewNeeded / totalQuestions) * 100) : 0}% dari total
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4 border-2 border-red-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold opacity-60 uppercase">Harus Dibuang</p>
              <p className="text-3xl font-black mt-1">{shouldDelete}</p>
              <p className="text-xs opacity-60 mt-1">
                {totalQuestions > 0 ? Math.round((shouldDelete / totalQuestions) * 100) : 0}% dari total
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4 border-2 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold opacity-60 uppercase">Rata-rata Daya Pembeda</p>
              <p className="text-3xl font-black mt-1">{avgDiscrimination.toFixed(2)}</p>
              <p className="text-xs opacity-60 mt-1">
                Tingkat Kesukaran: {(avgDifficulty * 100).toFixed(0)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Quality Distribution */}
      <Card className="p-6">
        <h3 className="font-black text-lg mb-4">Distribusi Kualitas Soal</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-32 font-bold text-sm">Sangat Baik</div>
            <div className="flex-1 bg-gray-200 h-8 border-2 border-black relative overflow-hidden">
              <div 
                className="h-full bg-green-500 border-r-2 border-black transition-all duration-500"
                style={{ width: `${totalQuestions > 0 ? (sangat_baik / totalQuestions) * 100 : 0}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-black text-sm">
                {sangat_baik} soal ({totalQuestions > 0 ? Math.round((sangat_baik / totalQuestions) * 100) : 0}%)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-32 font-bold text-sm">Baik</div>
            <div className="flex-1 bg-gray-200 h-8 border-2 border-black relative overflow-hidden">
              <div 
                className="h-full bg-blue-500 border-r-2 border-black transition-all duration-500"
                style={{ width: `${totalQuestions > 0 ? (baik / totalQuestions) * 100 : 0}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-black text-sm">
                {baik} soal ({totalQuestions > 0 ? Math.round((baik / totalQuestions) * 100) : 0}%)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-32 font-bold text-sm">Cukup</div>
            <div className="flex-1 bg-gray-200 h-8 border-2 border-black relative overflow-hidden">
              <div 
                className="h-full bg-yellow-500 border-r-2 border-black transition-all duration-500"
                style={{ width: `${totalQuestions > 0 ? (cukup / totalQuestions) * 100 : 0}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-black text-sm">
                {cukup} soal ({totalQuestions > 0 ? Math.round((cukup / totalQuestions) * 100) : 0}%)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-32 font-bold text-sm">Jelek</div>
            <div className="flex-1 bg-gray-200 h-8 border-2 border-black relative overflow-hidden">
              <div 
                className="h-full bg-orange-500 border-r-2 border-black transition-all duration-500"
                style={{ width: `${totalQuestions > 0 ? (jelek / totalQuestions) * 100 : 0}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-black text-sm">
                {jelek} soal ({totalQuestions > 0 ? Math.round((jelek / totalQuestions) * 100) : 0}%)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-32 font-bold text-sm">Sangat Jelek</div>
            <div className="flex-1 bg-gray-200 h-8 border-2 border-black relative overflow-hidden">
              <div 
                className="h-full bg-red-500 border-r-2 border-black transition-all duration-500"
                style={{ width: `${totalQuestions > 0 ? (sangat_jelek / totalQuestions) * 100 : 0}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-black text-sm">
                {sangat_jelek} soal ({totalQuestions > 0 ? Math.round((sangat_jelek / totalQuestions) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Question Details */}
      <Card className="p-6">
        <h3 className="font-black text-lg mb-4">Detail Per Soal</h3>
        <div className="space-y-4">
          {examAnalysis.map((analysis, idx) => (
            <Card key={analysis.id} className={`p-4 border-2 ${
              analysis.shouldBeDeleted ? 'border-red-500 bg-red-50' :
              analysis.shouldBeReviewed ? 'border-yellow-500 bg-yellow-50' :
              'border-green-500 bg-green-50'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">
                      Soal #{idx + 1}
                    </Badge>
                    <Badge className={`${getDifficultyColor(analysis.difficultyLevel)} border-2 text-xs`}>
                      {analysis.difficultyLevel}
                    </Badge>
                    <Badge className={`${getQualityColor(analysis.discriminationQuality)} text-xs`}>
                      {analysis.discriminationQuality}
                    </Badge>
                  </div>
                  
                  <p className="font-medium text-sm mb-3 line-clamp-2">
                    {analysis.questionText}...
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="opacity-60 font-bold">Dijawab</p>
                      <p className="font-black">{analysis.totalAttempts} siswa</p>
                    </div>
                    <div>
                      <p className="opacity-60 font-bold">Benar</p>
                      <p className="font-black text-green-600">
                        {analysis.correctCount} ({Math.round((analysis.correctCount / analysis.totalAttempts) * 100)}%)
                      </p>
                    </div>
                    <div>
                      <p className="opacity-60 font-bold">Tingkat Kesukaran (P)</p>
                      <p className="font-black">{(analysis.difficultyIndex * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="opacity-60 font-bold">Daya Pembeda (D)</p>
                      <p className="font-black">{analysis.discriminationIndex.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Distraktor Analysis */}
                  {analysis.distractorAnalysis && analysis.distractorAnalysis.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-black/10">
                      <p className="font-bold text-xs mb-2 opacity-60">EFEKTIVITAS DISTRAKTOR:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {analysis.distractorAnalysis.map((dist, i) => (
                          <div 
                            key={i} 
                            className={`p-2 border-2 border-black text-xs ${
                              dist.effectiveness === 'Kunci Jawaban' ? 'bg-green-100' :
                              dist.effectiveness === 'Baik' ? 'bg-blue-100' :
                              dist.effectiveness === 'Kurang' ? 'bg-yellow-100' :
                              'bg-red-100'
                            }`}
                          >
                            <p className="font-black">Opsi {String.fromCharCode(65 + i)}</p>
                            <p className="font-bold">{dist.selectedCount} ({dist.selectedPercentage.toFixed(0)}%)</p>
                            <p className={`text-xs mt-1 ${
                              dist.effectiveness === 'Tidak Berfungsi' ? 'text-red-600' :
                              dist.effectiveness === 'Kurang' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {dist.effectiveness}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {(analysis.shouldBeDeleted || analysis.shouldBeReviewed) && (
                    <div className="mt-4 pt-4 border-t-2 border-black/10">
                      <p className="font-bold text-xs mb-2 text-red-600">⚠️ REKOMENDASI:</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        {analysis.shouldBeDeleted && (
                          <li className="text-red-600 font-bold">
                            Daya pembeda sangat rendah ({analysis.discriminationIndex.toFixed(2)}) - <strong>Buang dari bank soal</strong>
                          </li>
                        )}
                        {analysis.difficultyIndex > 0.80 && (
                          <li className="text-yellow-600">
                            Soal terlalu mudah ({(analysis.difficultyIndex * 100).toFixed(0)}%) - Tingkatkan kompleksitas
                          </li>
                        )}
                        {analysis.difficultyIndex < 0.20 && (
                          <li className="text-yellow-600">
                            Soal terlalu sulit ({(analysis.difficultyIndex * 100).toFixed(0)}%) - Sederhanakan atau berikan clue
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};
