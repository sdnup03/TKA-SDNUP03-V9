
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/brutalist';
import { GraduationCap, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentUser, logout, activeExamId, appConfig } = useApp();

  // Hide header in exam mode to minimize distractions
  if (activeExamId && currentUser?.role === 'SISWA') return null;


  return (
    <header className="bg-white border-b-4 border-black py-2 sticky top-0 z-40 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="bg-[#FF6B6B] p-1 sm:p-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] flex-shrink-0 hover:scale-110 transition-transform duration-200">
            <GraduationCap className="text-white w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tighter uppercase italic leading-none truncate text-[#4F46E5]">
              {appConfig.appName}
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-gray-600 leading-none mt-0.5 truncate">{appConfig.schoolName}</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
             <div className="text-right hidden sm:block">
               <div className="font-black uppercase text-xs truncate max-w-[120px] md:max-w-none">{currentUser.name}</div>
               <div className="text-[10px] font-bold bg-black text-white inline-block px-1.5 rounded">{currentUser.role}</div>
             </div>
             
             <Button 
                size="sm" 
                variant="outline"
                onClick={logout}
                className="flex items-center gap-1 sm:gap-2 border-red-500 text-red-600 hover:bg-red-50 hover:scale-105 transition-all duration-200 h-7 sm:h-8 px-2 sm:px-3 text-xs"
             >
               <LogOut className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Keluar</span>
             </Button>
          </div>
        )}
      </div>
    </header>
  );
};
