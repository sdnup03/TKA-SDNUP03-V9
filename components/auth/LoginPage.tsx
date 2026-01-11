
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card } from '../ui/brutalist';
import { GraduationCap, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading, appConfig } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!username || !password) {
      setError('Isi dulu username sama passwordnya.');
      return;
    }
    
    // Only reset retry state on initial attempt (not on retry)
    if (!isRetrying) {
      setError('');
      setRetryCount(0);
    }
    
    try {
      await login(username, password);
      // Reset retry count on success
      setRetryCount(0);
      setIsRetrying(false);
      setError('');
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal login. Cek lagi username atau password.';
      const isServerBusy = errorMsg.toLowerCase().includes('server') || 
                          errorMsg.toLowerCase().includes('sibuk') ||
                          errorMsg.toLowerCase().includes('busy');
      
      if (isServerBusy && retryCount < 3) {
        // Show retry message
        const newRetryCount = retryCount + 1;
        setIsRetrying(true);
        setRetryCount(newRetryCount);
        setError(`${errorMsg} (Mencoba lagi ${newRetryCount}/3...)`);
        
        // Auto retry after delay with exponential backoff + jitter
        const baseDelay = 1000 + (newRetryCount * 1000); // 2s, 3s, 4s
        const jitter = Math.random() * 1000; // 0-1s random to prevent thundering herd
        const delay = baseDelay + jitter;
        
        setTimeout(() => {
          handleLogin(undefined); // Retry without event
        }, delay);
      } else {
        setError(errorMsg);
        setIsRetrying(false);
        setRetryCount(0);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7] p-4">
      <Card className="w-full max-w-md bg-white shadow-[8px_8px_0px_0px_#000] border-2 border-black animate-in fade-in zoom-in duration-500 hover:shadow-[12px_12px_0px_0px_#000] transition-all">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#FF6B6B] p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] mb-4 transform hover:scale-105 transition-transform duration-200">
            <GraduationCap className="text-white w-12 h-12 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic text-[#4F46E5]">
            {appConfig.appName}
          </h1>
          <p className="text-gray-600 font-bold mt-2 text-sm">Login dulu biar bisa akses ruang ujian</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block font-bold mb-2 text-sm text-gray-700">Username</label>
            <Input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Ketik username kamu..." 
              autoFocus
              className="transition-all focus:scale-[1.01] focus:shadow-[3px_3px_0px_0px_#000]"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-bold mb-2 text-sm text-gray-700">Password</label>
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password jangan sampe salah..." 
              className="transition-all focus:scale-[1.01] focus:shadow-[3px_3px_0px_0px_#000]"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-500 text-red-700 p-3 font-bold text-sm flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 rounded-sm shadow-[2px_2px_0px_0px_rgba(239,68,68,0.3)]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> 
              <span className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full py-3 text-lg mt-6 flex justify-center items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150 shadow-[6px_6px_0px_0px_#000] hover:shadow-[8px_8px_0px_0px_#000]"
            disabled={isLoading || isRetrying}
          >
            {isLoading || isRetrying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> 
                <span>{isRetrying ? `Mencoba lagi... (${retryCount}/3)` : 'Sabar...'}</span>
              </>
            ) : (
               <>
                 <LogIn className="w-5 h-5" /> Gas Masuk
               </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-4 border-t-2 border-gray-100 text-center text-xs text-gray-400 font-bold">
          <p>&copy; 2025 {appConfig.appName.toUpperCase()} • {appConfig.schoolName.toUpperCase()}</p>
        </div>
      </Card>
    </div>
  );
};
