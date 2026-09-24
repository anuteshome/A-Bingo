import React from 'react';
import { Home, Grid, PlayCircle, Wallet, ShieldCheck } from 'lucide-react';

interface NavigationProps {
  activeTab: 'lobby' | 'cards' | 'game' | 'wallet' | 'admin';
  setActiveTab: (tab: 'lobby' | 'cards' | 'game' | 'wallet' | 'admin') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'lobby' ? 'active' : ''}`}
        onClick={() => setActiveTab('lobby')}
      >
        <Home />
        <span>Lobby</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'cards' ? 'active' : ''}`}
        onClick={() => setActiveTab('cards')}
      >
        <Grid />
        <span>Card Store</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'game' ? 'active' : ''}`}
        onClick={() => setActiveTab('game')}
      >
        <PlayCircle />
        <span>Live Game</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'wallet' ? 'active' : ''}`}
        onClick={() => setActiveTab('wallet')}
      >
        <Wallet />
        <span>Wallet</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
        onClick={() => setActiveTab('admin')}
      >
        <ShieldCheck />
        <span>Admin</span>
      </button>
    </nav>
  );
};
