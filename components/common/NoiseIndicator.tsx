
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/brutalist';
import { Volume2, VolumeX, AlertTriangle } from 'lucide-react';

export const NoiseIndicator: React.FC = () => {
  const { noiseLevel } = useApp();

  let styles = "";
  let icon = <Volume2 />;
  let text = "";

  switch (noiseLevel) {
    case 'TENANG':
      styles = "bg-[#51CF66] text-black";
      icon = <Volume2 className="w-5 h-5" />;
      text = "Aman Terkendali";
      break;
    case 'WARNING':
      styles = "bg-[#FFD43B] text-black";
      icon = <AlertTriangle className="w-5 h-5" />;
      text = "Mulai Rame Nih";
      break;
    case 'BERISIK':
      styles = "bg-[#FF6B6B] text-white";
      icon = <VolumeX className="w-5 h-5" />;
      text = "Berisik Banget";
      break;
  }

  return (
    <Card className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-4 transition-all duration-500 hover:shadow-[6px_6px_0px_0px_#000] ${styles}`}>
      <div className="bg-black/10 p-0.5 sm:p-1 rounded border-2 border-black/20 flex-shrink-0 animate-pulse">
        {icon}
      </div>
      <span className="font-black uppercase tracking-wide text-xs sm:text-sm truncate">{text}</span>
    </Card>
  );
};
