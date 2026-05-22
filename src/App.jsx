import { useEffect, useState } from 'react';
import { initDB } from './db/index.js';
import { useStore } from './store.js';
import Sidebar from './components/Sidebar';
import Dashboard from './components/views/Dashboard';
import RevenueMaster from './components/views/RevenueMaster';
import Team from './components/views/Team';
import Tasks from './components/views/Tasks';
import BrainDumpSpace from './components/views/BrainDumpSpace';
import Reports from './components/views/Reports';
import QuickCaptureButton from './components/QuickCaptureButton';
import QuickRevenueButton from './components/QuickRevenueButton';
import Payroll from './components/views/Payroll';
import Creators from './components/views/Creators';
import Chatters from './components/views/Chatters';
import Analytics from './components/views/Analytics';

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
    <div className="flex h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary text-text-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'revenue-master' && <RevenueMaster />}
        {currentView === 'tasks' && <Tasks />}
        {currentView === 'team' && <Team />}
        {currentView === 'brain-dump' && <BrainDumpSpace />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'payroll' && <Payroll />}
        {currentView === 'creators' && <Creators />}
        {currentView === 'chatters' && <Chatters />}
        {currentView === 'analytics' && <Analytics />}
      </main>
      <QuickCaptureButton />
      <QuickRevenueButton />
    </div>
  );
}

export default App;
