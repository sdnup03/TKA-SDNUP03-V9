
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, Badge } from '../ui/brutalist';
import { CalendarDays, Clock } from 'lucide-react';

export const Timetable: React.FC = () => {
  const { exams, currentUser } = useApp();

  // Filter based on Student Class ID
  const studentExams = exams.filter(e => {
    if (currentUser?.role === 'SISWA' && currentUser.classId) {
        // Multi-class support: "VIII A, VIII B"
        const targetClasses = e.classGrade.split(',').map(c => c.trim().toLowerCase());
        return targetClasses.includes(currentUser.classId.toLowerCase());
    }
    return true; // Show all if no classId (e.g. Teacher view)
  });

  // Simple sort by date
  const sortedExams = [...studentExams].sort((a, b) => 
    new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
  );

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    // Handle ISO strings from Google Sheets (e.g. 1899-12-30T08:00:00.000Z)
    if (timeStr.includes('T') || timeStr.includes('Z')) {
      try {
        const date = new Date(timeStr);
        // Convert to local time string HH:mm
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
      } catch (e) {
        return timeStr.slice(0, 5);
      }
    }
    // Assume string is already HH:mm:ss or HH:mm
    return timeStr.slice(0, 5);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
        <h2 className="text-base sm:text-xl font-black truncate">Jadwal Ujian {currentUser?.classId ? `Kelas ${currentUser.classId}` : ''}</h2>
      </div>

      {sortedExams.length === 0 ? (
        <Card className="text-center py-8 opacity-70">
          <p>Belum ada jadwal ujian.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedExams.map((exam) => {
            const isToday = new Date().toISOString().split('T')[0] === exam.date;
            // Format: Senin, 20 Oktober 2024
            const formattedDate = new Date(exam.date).toLocaleDateString('id-ID', {
               weekday: 'short', 
               day: 'numeric', 
               month: 'short', 
               year: 'numeric'
            });

            const startTime = formatTime(exam.startTime);
            const endTime = formatTime(exam.endTime);

            return (
              <Card key={exam.id} className="relative overflow-hidden group">
                 {/* Decorative strip */}
                 <div className={`absolute left-0 top-0 bottom-0 w-2 ${isToday ? 'bg-[#4F46E5]' : 'bg-gray-300'}`} />
                 
                 <div className="pl-3 sm:pl-4">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1 truncate">
                           {exam.classGrade}
                        </span>
                        <h3 className="font-black text-sm sm:text-lg leading-tight truncate">{exam.title}</h3>
                      </div>
                      <Badge variant={exam.status === 'DIBUKA' ? 'success' : exam.status === 'DITUTUP' ? 'danger' : 'default'} className="flex-shrink-0 text-[10px] sm:text-xs">
                        {exam.status}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold mt-2 sm:mt-3">
                      <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 border border-black rounded shadow-[2px_2px_0px_0px_#000]">
                         <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /> 
                         <span className="truncate">{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-1.5 border border-black rounded shadow-[2px_2px_0px_0px_#000]">
                         <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" /> 
                         <span className="whitespace-nowrap">{startTime}-{endTime}</span>
                      </div>
                    </div>
                 </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
