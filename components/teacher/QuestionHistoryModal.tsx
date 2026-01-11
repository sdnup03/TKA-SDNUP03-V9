import React, { useState, useEffect } from 'react';
import { Button, Card, Badge } from '../ui/brutalist';
import { X, TrendingUp, TrendingDown, Minus, History, Calendar, BarChart3 } from 'lucide-react';
import { QuestionAnalysis } from '../../types';
import { api } from '../../lib/api';
import { MathRenderer } from '../ui/MathRenderer';

interface QuestionHistoryModalProps {
  questionId: string;
  questionText: string;
  onClose: () => void;
}

export const QuestionHistoryModal: React.FC<QuestionHistoryModalProps> = ({ 
  questionId, 
  questionText,
  onClose 
}) => {
  const [history, setHistory] = useState<QuestionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getQuestionHistory(questionId);
        // Sort by date, most recent first
        const sorted = data.sort((a, b) => 
          new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
        );
        setHistory(sorted);
      } catch (error) {
        console.error('Error fetching question history:', error);
      }
      setLoading(false);
    };
    
    fetchHistory();
  }, [questionId]);

  // Calculate aggregate stats
  const totalUsage = history.length;
  const avgDifficulty = totalUsage > 0 
    ? history.reduce((sum, h) => sum + h.difficultyIndex, 0) / totalUsage 
    : 0;
  const avgDiscrimination = totalUsage > 0 
    ? history.reduce((sum, h) => sum + h.discriminationIndex, 0) / totalUsage 
    : 0;
  const goodCount = history.filter(h => h.isGoodQuestion).length;
  const reviewCount = history.filter(h => h.shouldBeReviewed).length;
  const deleteCount = history.filter(h => h.shouldBeDeleted).length;

  // Trend calculation (simple: compare first vs last 2 entries)
  const getTrend = (metric: 'difficulty' | 'discrimination') => {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(0, 2);
    const older = history.slice(-2);
    
    const recentAvg = recent.reduce((sum, h) => 
      sum + (metric === 'difficulty' ? h.difficultyIndex : h.discriminationIndex), 0
    ) / recent.length;
    
    const olderAvg = older.reduce((sum, h) => 
      sum + (metric === 'difficulty' ? h.difficultyIndex : h.discriminationIndex), 0
    ) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (Math.abs(diff) < 0.05) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  };

  const difficultyTrend = getTrend('difficulty');
  const discriminationTrend = getTrend('discrimination');

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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-black p-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-5 h-5" />
              <h3 className="font-black text-lg">Riwayat Penggunaan Soal</h3>
            </div>
            <p className="text-sm line-clamp-2 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}><MathRenderer text={questionText} /></p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-bold">Memuat riwayat...</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="font-bold text-gray-500">Belum Ada Riwayat Analisis</p>
            <p className="text-sm text-gray-400 mt-2">
              Soal ini belum pernah dianalisis di ujian manapun.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Aggregate Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 border-2 border-blue-500">
                <p className="text-xs font-bold opacity-60 uppercase">Total Digunakan</p>
                <p className="text-2xl font-black mt-1">{totalUsage}x</p>
                <p className="text-xs opacity-60">ujian</p>
              </Card>
              
              <Card className="p-3 border-2 border-green-500">
                <p className="text-xs font-bold opacity-60 uppercase">Rata² P Index</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-black">{(avgDifficulty * 100).toFixed(0)}%</p>
                  {difficultyTrend === 'improving' && <TrendingUp className="w-4 h-4 text-green-600" />}
                  {difficultyTrend === 'declining' && <TrendingDown className="w-4 h-4 text-red-600" />}
                  {difficultyTrend === 'stable' && <Minus className="w-4 h-4 text-gray-600" />}
                </div>
              </Card>
              
              <Card className="p-3 border-2 border-purple-500">
                <p className="text-xs font-bold opacity-60 uppercase">Rata² D Index</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-black">{avgDiscrimination.toFixed(2)}</p>
                  {discriminationTrend === 'improving' && <TrendingUp className="w-4 h-4 text-green-600" />}
                  {discriminationTrend === 'declining' && <TrendingDown className="w-4 h-4 text-red-600" />}
                  {discriminationTrend === 'stable' && <Minus className="w-4 h-4 text-gray-600" />}
                </div>
              </Card>
              
              <Card className="p-3 border-2 border-yellow-500">
                <p className="text-xs font-bold opacity-60 uppercase">Kualitas</p>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs font-bold text-green-600">Baik: {goodCount}</p>
                  <p className="text-xs font-bold text-yellow-600">Review: {reviewCount}</p>
                  <p className="text-xs font-bold text-red-600">Buang: {deleteCount}</p>
                </div>
              </Card>
            </div>

            {/* History List */}
            <div>
              <h4 className="font-black text-sm mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                DETAIL PER UJIAN ({totalUsage})
              </h4>
              <div className="space-y-3">
                {history.map((h, idx) => (
                  <Card key={h.id} className="p-4 border-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="text-xs">
                            {idx === 0 ? '🆕 Terbaru' : `#${idx + 1}`}
                          </Badge>
                          <Badge className={`${getQualityColor(h.discriminationQuality)} text-xs`}>
                            {h.discriminationQuality}
                          </Badge>
                          <span className="text-xs opacity-60 font-bold">
                            {formatDate(h.analyzedAt)}
                          </span>
                        </div>
                        
                        <p className="font-bold mb-2">{h.examTitle}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="opacity-60 font-bold">Dijawab</p>
                            <p className="font-black">{h.totalAttempts} siswa</p>
                          </div>
                          <div>
                            <p className="opacity-60 font-bold">Benar</p>
                            <p className="font-black text-green-600">
                              {h.correctCount} ({Math.round((h.correctCount / h.totalAttempts) * 100)}%)
                            </p>
                          </div>
                          <div>
                            <p className="opacity-60 font-bold">P Index</p>
                            <p className="font-black">{(h.difficultyIndex * 100).toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="opacity-60 font-bold">D Index</p>
                            <p className="font-black">{h.discriminationIndex.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
