import React, { useState, useEffect } from 'react';
import { Card } from '../ui/brutalist';
import { Clock as ClockIcon } from 'lucide-react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  return (
    <Card className="flex items-center justify-between py-2 px-3 sm:px-4 bg-[#FFD43B] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-200">
      <div className="flex items-center gap-1.5 sm:gap-2 font-black text-lg sm:text-xl">
        <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-black rounded-full p-0.5 bg-white flex-shrink-0 animate-pulse" />
        <span className="tabular-nums">{formattedTime}</span>
      </div>
      <div className="text-xs font-bold border-l-2 border-black pl-2 ml-2 bg-white px-1.5 py-0.5">
        WIB
      </div>
    </Card>
  );
};
