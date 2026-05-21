import { useEffect, useState } from 'react';
import { initDB } from './db/index.js';
import { useStore } from './store.js';
import Sidebar from './components/Sidebar';
import Dashboard from './components/views/Dashboard';
import RevenueMaster from './components/views/RevenueMaster';
import DailyIncomeInput from './components/views/DailyIncomeInput';
import BrainDumpSpace from './components/views/BrainDumpSpace';
import QuickCaptureButton from './components/QuickCaptureButton';

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const currentView = useStore(state => state.currentView);
  const loadAllData = useStore(state => state.loadAllData);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDB();
        await loadAllData();
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [loadAllData]);

  if (!dbInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Initializing CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-0 text-text-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'revenue-master' && <RevenueMaster />}
        {currentView === 'daily-income' && <DailyIncomeInput />}
        {currentView === 'brain-dump' && <BrainDumpSpace />}
      </main>
      <QuickCaptureButton />
    </div>
  );
}

export default App;
