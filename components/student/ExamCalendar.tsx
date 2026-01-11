import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, Badge, DialogOverlay, Button } from '../ui/brutalist';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, X } from 'lucide-react';

export const ExamCalendar: React.FC = () => {
  const { exams, currentUser } = useApp();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<{ day: number; dateStr: string } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  // Filter exams based on Student Class ID (same logic as Timetable)
  const studentExams = exams.filter(e => {
    if (currentUser?.role === 'SISWA' && currentUser.classId) {
      // Multi-class support: "VIII A, VIII B"
      const targetClasses = e.classGrade.split(',').map(c => c.trim().toLowerCase());
      return targetClasses.includes(currentUser.classId.toLowerCase());
    }
    return true; // Show all if no classId (e.g. Teacher view)
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Normalize date to YYYY-MM-DD format
  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Try to parse as Date and convert to YYYY-MM-DD
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // If parsing fails, return original string
    }
    return dateStr;
  };

  const getExamsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Use filtered studentExams and normalize dates for comparison
    return studentExams.filter(e => {
      const normalizedDate = normalizeDate(e.date);
      return normalizedDate === dateStr;
    });
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate({ day, dateStr });
  };

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

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50/50 border-r-2 border-b-2 border-black/10"></div>);
    }

      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayExams = getExamsForDay(day);
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

        days.push(
          <div 
            key={day} 
            onClick={() => handleDateClick(day)}
            className={`h-24 md:h-28 p-1 border-r-2 border-b-2 border-black relative transition-colors cursor-pointer hover:bg-gray-50 active:bg-gray-100 ${isToday ? 'bg-[#FFFCEB]' : 'bg-white'}`}
          >
            <span className={`absolute top-1 right-2 font-bold text-sm ${isToday ? 'bg-black text-white px-1.5 rounded-full' : ''}`}>
              {day}
            </span>
            
            <div className="mt-6 flex flex-col gap-1 overflow-y-auto max-h-[calc(100%-24px)]">
              {dayExams.map(ex => (
                <div key={ex.id} className="text-[9px] leading-tight font-bold bg-[#4F46E5] text-white p-1 shadow-[1px_1px_0px_0px_#000]" title={`${ex.title} - ${ex.startTime} ${ex.classGrade}`}>
                  <div className="truncate font-black mb-0.5">{ex.title}</div>
                  <div className="text-[8px] opacity-90">{formatTime(ex.startTime)} {ex.classGrade}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

    return days;
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <button onClick={handlePrevMonth} className="hover:bg-white/20 p-1 rounded"><ChevronLeft /></button>
        <h2 className="font-black text-xl uppercase tracking-widest">{monthNames[month]} {year}</h2>
        <button onClick={handleNextMonth} className="hover:bg-white/20 p-1 rounded"><ChevronRight /></button>
      </div>
      
      <div className="grid grid-cols-7 border-b-4 border-black bg-gray-200">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
          <div key={d} className="p-2 text-center font-black text-sm border-r-2 border-black last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-gray-100 border-b-2 border-black">
        {renderCalendarDays()}
      </div>
      
      <div className="p-3 text-xs font-bold text-center bg-white">
        *Klik tanggal untuk detail
      </div>

      {/* Detail Dialog */}
      <DialogOverlay 
        isOpen={selectedDate !== null} 
        onClose={() => setSelectedDate(null)}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black">
              {selectedDate && new Date(selectedDate.dateStr).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </h2>
            <button 
              onClick={() => setSelectedDate(null)}
              className="p-1 hover:bg-gray-100 rounded border-2 border-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedDate && getExamsForDay(selectedDate.day).length === 0 ? (
            <div className="text-center py-8">
              <p className="font-bold text-gray-500">Tidak ada ujian pada tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedDate && getExamsForDay(selectedDate.day).map((exam) => {
                const formattedDate = new Date(exam.date).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });
                const startTime = formatTime(exam.startTime);
                const endTime = formatTime(exam.endTime);
                const isToday = new Date().toISOString().split('T')[0] === exam.date;

                return (
                  <Card key={exam.id} className="relative overflow-hidden">
                    {/* Decorative strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${isToday ? 'bg-[#4F46E5]' : 'bg-gray-300'}`} />
                    
                    <div className="pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">
                            {exam.classGrade}
                          </span>
                          <h3 className="font-black text-lg leading-tight">{exam.title}</h3>
                        </div>
                        <Badge variant={exam.status === 'DIBUKA' ? 'success' : exam.status === 'DITUTUP' ? 'danger' : 'default'}>
                          {exam.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm font-bold mt-3">
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 border border-black rounded shadow-[2px_2px_0px_0px_#000]">
                          <CalendarDays className="w-4 h-4" /> 
                          {formattedDate}
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 border border-black rounded shadow-[2px_2px_0px_0px_#000]">
                          <Clock className="w-4 h-4" /> 
                          {startTime} - {endTime} WIB
                        </div>
                      </div>

                      {exam.description && (
                        <div className="mt-3 pt-3 border-t-2 border-black">
                          <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap">{exam.description}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t-2 border-black">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setSelectedDate(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogOverlay>
    </Card>
  );
};