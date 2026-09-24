import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Navigation } from './components/common/Navigation';
import { LobbyView } from './features/lobby/LobbyView';
import { CardPickerView } from './features/card_picker/CardPickerView';
import { BingoGameView } from './features/bingo/BingoGameView';
import { WalletView } from './features/wallet/WalletView';
import { AdminView } from './features/admin/AdminView';
import { initTelegramWebApp } from './utils/telegram';

const MainApp: React.FC = () => {
  const { loading, isAdmin, adminLogout } = useAuth();
  const [activeTab, setActiveTab] = useState<'lobby' | 'cards' | 'game' | 'wallet' | 'admin'>('lobby');
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [purchasedCard, setPurchasedCard] = useState<any>(null);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  const handleAdminLogout = () => {
    adminLogout();
    setActiveTab('lobby');
  };

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="callout-ball" style={{ background: 'var(--primary-gold)', width: '60px', height: '60px', fontSize: '1.8rem', animation: 'pulseGlow 1s infinite alternate' }}>
          ⭐
        </div>
        <div style={{ marginTop: '16px', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--primary-gold)' }}>
          A BINGO LOADING...
        </div>
      </div>
    );
  }

  const isLoggedIntoAdmin = activeTab === 'admin' && isAdmin;

  return (
    <div className="app-container">
      <Header activeTab={activeTab} onLogoutAdmin={handleAdminLogout} />

      <main style={{ flex: 1 }}>
        {activeTab === 'lobby' && (
          <LobbyView 
            onSelectRound={(roundId) => {
              setSelectedRoundId(roundId);
              setActiveTab('game');
            }}
            onGoToCards={(roundId) => {
              setSelectedRoundId(roundId);
              setActiveTab('cards');
            }}
          />
        )}

        {activeTab === 'cards' && selectedRoundId && (
          <CardPickerView 
            roundId={selectedRoundId}
            onCardPurchased={(card) => {
              setPurchasedCard(card);
              setActiveTab('game');
            }}
            onBack={() => setActiveTab('lobby')}
          />
        )}

        {activeTab === 'game' && (
          <BingoGameView 
            roundId={selectedRoundId || 'live-round'}
            purchasedCard={purchasedCard}
            onBack={() => setActiveTab('lobby')}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletView />
        )}

        {activeTab === 'admin' && (
          <AdminView />
        )}
      </main>

      {!isLoggedIntoAdmin && (
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
