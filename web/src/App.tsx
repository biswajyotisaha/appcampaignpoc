import { useState } from 'react';
import Sidebar from './Sidebar';
import HomePage from './HomePage';
import CampaignsPage from './CampaignsPage';
import SettingsPage from './SettingsPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'campaigns' | 'settings'>('home');

  return (
    <div className="flex min-h-screen">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1 bg-[#f5f6fa] p-8">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'campaigns' && <CampaignsPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
