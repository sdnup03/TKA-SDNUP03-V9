import React, { useState, useEffect } from 'react';
import { Card, Button } from '../ui/brutalist';
import { X, Download, Smartphone, Share2, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/i.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Check if dismissed from localStorage
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Auto-minimize after 5 seconds if not interacted
    const timer = setTimeout(() => {
      setIsMinimized(true);
    }, 5000);
    setAutoHideTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };

    // Listen for beforeinstallprompt event (Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
    if (autoHideTimer) clearTimeout(autoHideTimer);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    if (autoHideTimer) clearTimeout(autoHideTimer);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  const handleShowIOSInstructions = () => {
    setShowIOSInstructions(true);
  };

  // Don't show if installed or dismissed
  if (isInstalled || isDismissed) return null;

  // Android Install Prompt - Compact & Non-intrusive
  if (isAndroid && deferredPrompt) {
    if (isMinimized) {
      return (
        <div className="fixed bottom-20 sm:bottom-24 right-2 sm:right-4 z-[35] animate-in fade-in">
          <button
            onClick={handleExpand}
            className="bg-[#4F46E5] text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] p-2 hover:bg-[#4338CA] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-sm"
            title="Install Aplikasi"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      );
    }

    return (
      <div className="fixed bottom-20 sm:bottom-24 right-2 sm:right-4 z-[35] w-64 sm:w-72 animate-in slide-in-from-bottom-2 fade-in max-h-[200px] overflow-hidden">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-[#4F46E5] text-white p-2.5 sm:p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 bg-white p-1 border-2 border-black">
              <Download className="w-4 h-4 text-[#4F46E5]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-xs sm:text-sm mb-0.5">Install Aplikasi</h3>
              <p className="font-bold text-[10px] sm:text-xs mb-2 opacity-90 leading-tight">
                Akses lebih cepat & offline
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="primary"
                  onClick={handleInstall}
                  className="flex-1 bg-white text-[#4F46E5] hover:bg-gray-100 flex items-center justify-center gap-1 text-[10px] sm:text-xs py-1 h-7"
                >
                  <Download className="w-3 h-3" />
                  Install
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMinimize}
                  className="border-white text-white hover:bg-white/20 px-1.5 h-7"
                  title="Minimize"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // iOS Install Instructions - Compact & Non-intrusive
  if (isIOS && !showIOSInstructions) {
    if (isMinimized) {
      return (
        <div className="fixed bottom-20 sm:bottom-24 right-2 sm:right-4 z-[35] animate-in fade-in">
          <button
            onClick={handleExpand}
            className="bg-[#51CF66] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] p-2 hover:bg-[#40C057] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-sm"
            title="Install Aplikasi"
          >
            <Smartphone className="w-5 h-5" />
          </button>
        </div>
      );
    }

    return (
      <div className="fixed bottom-20 sm:bottom-24 right-2 sm:right-4 z-[35] w-64 sm:w-72 animate-in slide-in-from-bottom-2 fade-in max-h-[200px] overflow-hidden">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-[#51CF66] text-black p-2.5 sm:p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 bg-white p-1 border-2 border-black">
              <Smartphone className="w-4 h-4 text-[#51CF66]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-xs sm:text-sm mb-0.5">Install Aplikasi</h3>
              <p className="font-bold text-[10px] sm:text-xs mb-2 leading-tight">
                Akses lebih cepat!
              </p>
              <Button
                variant="primary"
                onClick={handleShowIOSInstructions}
                className="w-full bg-black text-white hover:bg-gray-800 flex items-center justify-center gap-1 mb-1.5 text-[10px] sm:text-xs py-1 h-7"
              >
                <Share2 className="w-3 h-3" />
                Cara Install
              </Button>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  onClick={handleMinimize}
                  className="flex-1 border-black text-black hover:bg-black/10 text-[10px] sm:text-xs py-1 h-7"
                >
                  Minimize
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="border-black text-black hover:bg-black/10 px-1.5 h-7"
                  title="Tutup"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // iOS Detailed Instructions - Compact
  if (isIOS && showIOSInstructions) {
    return (
      <div className="fixed bottom-20 sm:bottom-24 right-2 sm:right-4 z-[35] w-64 sm:w-72 animate-in slide-in-from-bottom-2 fade-in max-h-[250px] overflow-y-auto">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-[#51CF66] text-black p-2.5 sm:p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 bg-white p-1 border-2 border-black">
              <Share2 className="w-4 h-4 text-[#51CF66]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <h3 className="font-black text-xs sm:text-sm">Cara Install iOS</h3>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="border-black text-black hover:bg-black/10 p-1 h-6"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <ol className="text-[10px] sm:text-xs font-bold space-y-1 mb-2 list-decimal list-inside leading-tight">
                <li>Tap <strong>Share</strong> <Share2 className="w-2.5 h-2.5 inline" /> di browser</li>
                <li>Pilih <strong>"Add to Home Screen"</strong> <Plus className="w-2.5 h-2.5 inline" /></li>
                <li>Tap <strong>"Add"</strong></li>
              </ol>
              <Button
                variant="outline"
                onClick={() => setShowIOSInstructions(false)}
                className="w-full border-black text-black hover:bg-black/10 text-[10px] sm:text-xs py-1 h-7"
              >
                Kembali
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

