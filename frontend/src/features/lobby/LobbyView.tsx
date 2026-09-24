import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Play, ShoppingBag, Trophy, Users } from 'lucide-react';

interface RoundItem {
  id: string;
  game_type_name: string;
  card_price: number;
  prize_pool: number;
  status: string;
  cards_sold: number;
  start_time: string;
}

interface LobbyViewProps {
  onSelectRound: (roundId: string) => void;
  onGoToCards: (roundId: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onSelectRound, onGoToCards }) => {
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRounds = async () => {
    try {
      const data = await apiService.getUpcomingRounds();
      setRounds(data);
    } catch (err) {
      console.error("Failed loading rounds", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRounds();
    const interval = setInterval(loadRounds, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F59E0B' }}>
          ⚡ GoodBingo Game Rooms
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
          Pick up to 2 active 5x5 cards per round!
        </p>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
          Loading live rooms...
        </div>
      ) : rounds.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
          No active rooms currently. System is initializing the next round!
        </div>
      ) : (
        rounds.map((r) => (
          <div key={r.id} className="glass-card gold-border animate-pop" style={{ marginBottom: '16px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{
                background: r.status === 'PLAYING' ? '#DCFCE7' : '#EFF6FF',
                color: r.status === 'PLAYING' ? '#166534' : '#1E40AF',
                border: `1px solid ${r.status === 'PLAYING' ? '#86EFAC' : '#BFDBFE'}`,
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                ● {r.status} {r.status === 'WAITING' ? '(Card Buying Open)' : '(30s Live Room)'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.88rem', color: '#F59E0B', fontWeight: 900 }}>
                <Trophy className="w-4 h-4" />
                <span>Prize: {r.prize_pool.toFixed(2)} ETB</span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1E293B', marginBottom: '8px' }}>
              {r.game_type_name}
            </h3>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#64748B', fontWeight: 600, marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShoppingBag className="w-4 h-4" />
                <span>Stake: {r.card_price.toFixed(2)} ETB</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users className="w-4 h-4" />
                <span>Cards Sold: {r.cards_sold}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {r.status === 'WAITING' && (
                <button 
                  className="btn-primary btn-gold" 
                  style={{ flex: 1, padding: '10px', fontSize: '0.9rem' }}
                  onClick={() => onGoToCards(r.id)}
                >
                  Pick Cards
                </button>
              )}

              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: '#2563EB' }}
                onClick={() => onSelectRound(r.id)}
              >
                <Play className="w-4 h-4 inline mr-1" />
                Enter Room
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
