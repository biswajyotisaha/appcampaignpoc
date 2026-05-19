import { useState } from 'react';
import Sidebar from './Sidebar';
import HomePage from './HomePage';
import CampaignsPage from './CampaignsPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'campaigns'>('home');

  return (
    <div className="flex min-h-screen">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1 bg-gray-50 p-8">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'campaigns' && <CampaignsPage />}
      </main>
    </div>
  );
}
