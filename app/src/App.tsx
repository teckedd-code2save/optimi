import { HashRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { Home } from '@/pages/Home';
import { SmartExtract } from '@/pages/SmartExtract';
import { OpportunityDetail } from '@/pages/OpportunityDetail';
import { OpportunityFinder } from '@/pages/OpportunityFinder';
import { Calendar } from '@/pages/Calendar';
import { AIAssistant } from '@/pages/AIAssistant';
import { Settings } from '@/pages/Settings';

function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/extract" element={<SmartExtract />} />
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
          <Route path="/finder" element={<OpportunityFinder />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
          },
        }}
      />
    </HashRouter>
  );
}

export default App;
