import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/telegram';
import { Search, Lock, ShoppingCart, ArrowLeft, Plus } from 'lucide-react';

interface CardItem {
  card_id: string;
  card_number: number;
  status: string;
  grid_matrix: number[][];
}

interface CardPickerProps {
  roundId: string;
  onCardPurchased: (card: CardItem) => void;
  onBack: () => void;
}

export const CardPickerView: React.FC<CardPickerProps> = ({ roundId, onCardPurchased, onBack }) => {
  const { token, balance, refreshBalance } = useAuth();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // 2-Card Slot Selection Dock
  const [slot1, setSlot1] = useState<CardItem | null>(null);
  const [slot2, setSlot2] = useState<CardItem | null>(null);
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);

  const [purchasing, setPurchasing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCards = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const searchNum = search.trim() ? parseInt(search.trim()) : undefined;
      const data = await apiService.getRoundCards(roundId, page, 40, searchNum);
      setCards(data.cards);
      
      // Default populate Slot 1 if empty
      if (data.cards.length > 0 && !slot1) {
        const available = data.cards.find((c: CardItem) => c.status !== 'LOCKED') || data.cards[0];
        setSlot1(available);
      }
    } catch (err) {
      console.error("Failed to load cards", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [roundId, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCards();
  };

  const handleSelectCard = (card: CardItem) => {
    if (card.status === 'LOCKED') return;
    triggerHaptic('impact');
    if (activeSlot === 1) {
      setSlot1(card);
    } else {
      setSlot2(card);
    }
  };

  const handleBuySlot = async (slotCard: CardItem) => {
    if (!token) return;
    setPurchasing(true);
    setErrorMsg(null);
    try {
      await apiService.buyCard(token, roundId, slotCard.card_number);
      triggerHaptic('success');
      await refreshBalance();
      onCardPurchased({
        ...slotCard,
        status: 'MY_CARD'
      });
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || "Failed to purchase card");
    } finally {
      setPurchasing(false);
    }
  };

  const balanceVal = (balance || 0).toFixed(2);

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* 1. Header Bar matching GoodBingo Specification */}
      <div style={{
        background: '#1E293B',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        fontSize: '0.82rem',
        fontWeight: 700
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}>
          <span>ROOM VIP</span> 💰💰
        </div>
        <div>SOLD 682</div>
        <div>TIME 28s</div>
        <div style={{ color: '#10B981' }}>{balanceVal} ETB</div>
      </div>

      {/* 2. Stake & Game Info Banner */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#334155'
      }}>
        <div><strong style={{ color: '#2563EB' }}>STAKE:</strong> 50 ETB</div>
        <div><strong style={{ color: '#2563EB' }}>የጨዋታ አይነት:</strong> ሙሉ ዝግ</div>
        <div><strong style={{ color: '#2563EB' }}>TIME:</strong> 10 ሰዓት</div>
      </div>

      {/* Navigation Back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft className="w-4 h-4" /> Lobby
        </button>

        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F59E0B' }}>
          Select Card (#1 to #5000)
        </span>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            type="number"
            placeholder="Search Card #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-md)',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '0.88rem'
            }}
          />
          <Search style={{ position: 'absolute', left: '10px', top: '9px', width: '16px', height: '16px', color: '#94A3B8' }} />
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '8px 14px', width: 'auto', fontSize: '0.85rem' }}>
          Search
        </button>
      </form>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', color: '#991B1B', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', marginBottom: '12px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 3. Scrollable 8-Column Grid (Cards 1..5000) */}
      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>Loading 5,000 cards...</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '6px',
          marginBottom: '16px',
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '4px',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #E2E8F0'
        }}>
          {cards.map((c) => {
            const isLocked = c.status === 'LOCKED';
            const isSelectedInSlot1 = slot1?.card_number === c.card_number;
            const isSelectedInSlot2 = slot2?.card_number === c.card_number;
            const isSelected = isSelectedInSlot1 || isSelectedInSlot2;

            return (
              <button
                key={c.card_id}
                onClick={() => handleSelectCard(c)}
                disabled={isLocked}
                style={{
                  aspectRatio: '1',
                  borderRadius: '6px',
                  background: isLocked ? '#F1F5F9' : (isSelected ? '#EFF6FF' : '#FFFFFF'),
                  border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1',
                  color: isLocked ? '#94A3B8' : (isSelected ? '#2563EB' : '#1E293B'),
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.45 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {isLocked ? (
                  <>
                    <span>{c.card_number}</span>
                    <Lock style={{ position: 'absolute', top: '1px', right: '1px', width: '8px', height: '8px', color: '#EF4444' }} />
                  </>
                ) : (
                  c.card_number
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. 2-Card Slot Selection Dock */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>
          🎴 2-Card Slot Selection Dock
        </div>

        <div className="slot-dock">
          {/* SLOT 1 */}
          <div 
            className={`slot-card ${slot1 ? 'filled' : ''}`}
            onClick={() => setActiveSlot(1)}
            style={{
              borderColor: activeSlot === 1 ? '#2563EB' : '#CBD5E1',
              boxShadow: activeSlot === 1 ? '0 0 8px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
              SLOT 1 {activeSlot === 1 ? '🟢 ACTIVE' : ''}
            </div>
            {slot1 ? (
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#2563EB' }}>
                  Card #{slot1.card_number}
                </div>
                <button
                  className="btn-primary"
                  disabled={purchasing}
                  onClick={(e) => { e.stopPropagation(); handleBuySlot(slot1); }}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', marginTop: '6px', background: '#2563EB' }}
                >
                  <ShoppingCart className="w-3.5 h-3.5 inline mr-1" /> Buy (50 ETB)
                </button>
              </div>
            ) : (
              <div style={{ color: '#94A3B8', fontSize: '0.78rem' }}>
                <Plus className="w-4 h-4 inline mr-1" /> + SLOT 1 EMPTY
              </div>
            )}
          </div>

          {/* SLOT 2 */}
          <div 
            className={`slot-card ${slot2 ? 'filled' : ''}`}
            onClick={() => setActiveSlot(2)}
            style={{
              borderColor: activeSlot === 2 ? '#2563EB' : '#CBD5E1',
              boxShadow: activeSlot === 2 ? '0 0 8px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
              SLOT 2 {activeSlot === 2 ? '🟢 ACTIVE' : ''}
            </div>
            {slot2 ? (
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#2563EB' }}>
                  Card #{slot2.card_number}
                </div>
                <button
                  className="btn-primary"
                  disabled={purchasing}
                  onClick={(e) => { e.stopPropagation(); handleBuySlot(slot2); }}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', marginTop: '6px', background: '#2563EB' }}
                >
                  <ShoppingCart className="w-3.5 h-3.5 inline mr-1" /> Buy (50 ETB)
                </button>
              </div>
            ) : (
              <div style={{ color: '#94A3B8', fontSize: '0.78rem' }}>
                <Plus className="w-4 h-4 inline mr-1" /> + SLOT 2 EMPTY
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Card Grid Preview */}
      {(slot1 || slot2) && (
        <div className="glass-card gold-border animate-pop" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F59E0B', marginBottom: '4px' }}>
            Previewing Card #{(activeSlot === 1 ? slot1 : slot2)?.card_number} Matrix
          </div>

          <div className="bingo-grid-container" style={{ transform: 'scale(0.85)', margin: '-10px 0' }}>
            <div className="bingo-headers">
              <div className="letter-header letter-b">B</div>
              <div className="letter-header letter-i">I</div>
              <div className="letter-header letter-n">N</div>
              <div className="letter-header letter-g">G</div>
              <div className="letter-header letter-o">O</div>
            </div>
            <div className="bingo-matrix">
              {(activeSlot === 1 ? slot1 : slot2)?.grid_matrix.flatMap((row, r) => 
                row.map((val, c) => (
                  <div 
                    key={`${r}-${c}`} 
                    className={`bingo-cell ${r === 2 && c === 2 ? 'free-space' : ''}`}
                  >
                    {r === 2 && c === 2 ? '★' : val}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
