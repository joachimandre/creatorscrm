import { useEffect, useState } from 'react';
import { initDB } from './db/index.js';
import { useStore } from './store.js';
import MenuBar from './components/MenuBar';
import Dock from './components/Dock';
import CommandPalette from './components/CommandPalette';
import Dashboard from './components/views/Dashboard';
import RevenueMaster from './components/views/RevenueMaster';
import Team from './components/views/Team';
import Tasks from './components/views/Tasks';
import BrainDumpSpace from './components/views/BrainDumpSpace';
import Reports from './components/views/Reports';
import QuickActionFAB from './components/QuickActionFAB';
import Payroll from './components/views/Payroll';
import Creators from './components/views/Creators';
import Chatters from './components/views/Chatters';
import Analytics from './components/views/Analytics';
import Requests from './components/views/Requests';
import TimesheetView from './components/views/Timesheet';
import LoginView from './components/views/LoginView';
import PendingApprovalView from './components/views/PendingApprovalView';
import UserManagementView from './components/views/UserManagementView';

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const currentView  = useStore(state => state.currentView);
  const loadAllData  = useStore(state => state.loadAllData);
  const initAuth     = useStore(state => state.initAuth);
  const authUser     = useStore(state => state.authUser);
  const userProfile  = useStore(state => state.userProfile);
  const profileError = useStore(state => state.profileError);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initAuth();      // restore existing session
        await initDB();        // load shared CRM data from Supabase
        await loadAllData();   // hydrate Zustand
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setDbInitialized(true);
      }
    };
    initializeApp();
  }, [loadAllData, initAuth]);

  // ── Loading spinner ──────────────────────────────────────────────────────────
  if (!dbInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="text-center">
          <div
            className="mx-auto mb-lg"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: '#00d9ff',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p className="text-text-secondary text-sm">Initializing CRM…</p>
        </div>
      </div>
    );
  }

  // ── Auth guard ───────────────────────────────────────────────────────────────
  if (!authUser) return <LoginView />;
  // A blocked profile read (e.g. an RLS policy error) must NOT masquerade as a
  // pending account — show the real error so it's diagnosable instead of a dead end.
  if (!userProfile?.approved) return <PendingApprovalView blocked={profileError} />;

  // ── Full app ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-10 focus:left-4 focus:z-[300] focus:px-md focus:py-sm focus:rounded-xl focus:bg-accent-cyan focus:text-bg-primary focus:font-semibold focus:text-sm"
      >
        Skip to content
      </a>

      <MenuBar />

      <main id="main-content" className="flex-1 overflow-hidden relative">
        <div key={currentView} className="h-full overflow-auto animate-view-enter">
          {currentView === 'dashboard'      && <Dashboard />}
          {currentView === 'revenue-master' && <RevenueMaster />}
          {currentView === 'tasks'          && <Tasks />}
          {currentView === 'team'           && <Team />}
          {currentView === 'brain-dump'     && <BrainDumpSpace />}
          {currentView === 'reports'        && <Reports />}
          {currentView === 'payroll'        && <Payroll />}
          {currentView === 'creators'       && <Creators />}
          {currentView === 'chatters'       && <Chatters />}
          {currentView === 'analytics'      && <Analytics />}
          {currentView === 'requests'       && <Requests />}
          {currentView === 'users'          && <UserManagementView />}
          {currentView === 'timesheet'      && <TimesheetView />}
        </div>
      </main>

      <Dock />
      <CommandPalette />
      <QuickActionFAB />
    </div>
  );
}

export default App;
