
import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/layout/Header';
import { LoginPage } from './components/auth/LoginPage';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { GraduationCap } from 'lucide-react';
import { Card, Button } from './components/ui/brutalist';

// Lazy load heavy components for code splitting
// Note: ExamRoom tidak di-lazy load karena critical path dan harus instant saat masuk ujian
import { StudentDashboard } from './components/student/StudentDashboard';
import { ExamRoom } from './components/student/ExamRoom';
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FDFDF7]">
    <Card className="p-8 border-4 border-black shadow-[8px_8px_0px_0px_#000]">
      <div className="text-center">
        <div className="inline-block animate-spin mb-4">
          <GraduationCap className="w-12 h-12 text-[#4F46E5]" />
        </div>
        <p className="font-black text-xl mb-2">Memuat...</p>
        <p className="font-bold text-sm text-gray-600">Mohon tunggu sebentar</p>
      </div>
    </Card>
  </div>
);

const AppContent: React.FC = () => {
  const { currentUser, activeExamId, appConfig } = useApp();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#FDFDF7] text-[#111] font-sans selection:bg-[#FFD43B] selection:text-black">
      <Header />
      
      <main className={`container mx-auto p-4 md:p-6 ${activeExamId ? 'max-w-4xl' : 'max-w-5xl'}`}>
        {currentUser.role === 'SISWA' && (
          activeExamId ? <ExamRoom /> : <StudentDashboard />
        )}

        {currentUser.role === 'GURU' && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <TeacherDashboard />
            </Suspense>
          </ErrorBoundary>
        )}
      </main>

      {/* Footer */}
      {!activeExamId && (
        <footer className="py-8 text-center border-t-2 border-black mt-12 bg-white">
          <div className="flex justify-center items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5" />
            <span className="font-black">{appConfig.appName.toUpperCase()}</span>
          </div>
          <p className="text-sm font-medium opacity-60">© 2025 {appConfig.schoolName}.</p>
        </footer>
      )}

      {/* PWA Install Prompt - Hide saat ujian aktif */}
      {!activeExamId && <InstallPrompt />}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
