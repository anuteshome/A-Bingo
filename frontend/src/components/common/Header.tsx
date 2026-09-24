import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatternModal } from '../game/PatternModal';
import { Sparkles, Wallet as WalletIcon, Volume2, VolumeX, Eye, Globe, ShieldCheck, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab?: string;
  onLogoutAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onLogoutAdmin }) => {
  const { balance, isAdmin } = useAuth();
  const [lang, setLang] = useState<'am' | 'en'>('am');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPatternModal, setShowPatternModal] = useState(false);

  // When logged into Admin view, render clean Abay H Bingo Admin row
  if (activeTab === 'admin' && isAdmin) {
    return (
      <header className="app-header" style={{ padding: '14px 16px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(59, 130, 246, 0.4)' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '1.25rem', color: '#60A5FA', letterSpacing: '0.5px' }}>
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span>Abay H Bingo Admin</span>
          </div>
          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #EF4444',
                borderRadius: '8px',
                padding: '6px 12px',
                color: '#F87171',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          )}
        </div>
      </header>
    );
  }

  // Standard User Header
  return (
    <>
      <header className="app-header" style={{ flexDirection: 'column', gap: '8px', padding: '10px 14px' }}>
        {/* Top Title & Wallet Bar */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span>Abay H Bingo</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="wallet-badge" title="Wallet Balance">
              <WalletIcon className="w-4 h-4 text-yellow-400" />
              <span>{balance.toFixed(2)} ETB</span>
            </div>
          </div>
        </div>

        {/* Control Toolbar */}
        <div style={{ display: 'flex', width: '100%', gap: '6px', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(30,41,59,0.8)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as 'am' | 'en')}
              style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <option value="am" style={{ background: '#0F172A', color: '#FFF' }}>አማርኛ</option>
              <option value="en" style={{ background: '#0F172A', color: '#FFF' }}>English</option>
            </select>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: 'rgba(30,41,59,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 8px',
              color: soundEnabled ? '#10B981' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Game Type Pattern Preview Button */}
          <button
            onClick={() => setShowPatternModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(121,40,202,0.4) 0%, rgba(0,242,254,0.3) 100%)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>የጨዋታ አይነት</span>
          </button>

        </div>
      </header>

      {showPatternModal && (
        <PatternModal 
          gameTypeName="ካፒታል T + 1 መስመር"
          patterns={[]}
          onClose={() => setShowPatternModal(false)}
        />
      )}
    </>
  );
};
