import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { apiService } from '../../services/api';
import { triggerHaptic } from '../../utils/telegram';
import { Flame, ArrowLeft, Hourglass, XCircle } from 'lucide-react';
import { WinnerModal } from '../../components/game/WinnerModal';

interface BingoGameViewProps {
  roundId: string;
  purchasedCard: {
    card_id: string;
    card_number: number;
    grid_matrix: number[][];
  } | null;
  onBack: () => void;
}

export const BingoGameView: React.FC<BingoGameViewProps> = ({ roundId, purchasedCard, onBack }) => {
  const { token, refreshBalance } = useAuth();
  const { connected, drawnNumbers, latestDrawn, roundStatus, winnerEvent } = useWebSocket(roundId, token);

  const [markedCells, setMarkedCells] = useState<Set<string>>(new Set(['2-2']));
  const [claiming, setClaiming] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [disqualifiedReason, setDisqualifiedReason] = useState<string>('');
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Set of numbers drawn so far
  const drawnSet = new Set(drawnNumbers.map(d => d.number));

  // Auto-mark drawn numbers on card
  useEffect(() => {
    if (!purchasedCard) return;
    const newMarked = new Set(markedCells);

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = purchasedCard.grid_matrix[r][c];
        if (r === 2 && c === 2) {
          newMarked.add('2-2');
        } else if (val !== 0 && drawnSet.has(val)) {
          newMarked.add(`${r}-${c}`);
        }
      }
    }
    setMarkedCells(newMarked);
  }, [drawnNumbers, purchasedCard]);

  // Show winner modal & confetti on winner event
  useEffect(() => {
    if (winnerEvent) {
      triggerHaptic('success');
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 }
      });
      refreshBalance();
      setShowWinnerModal(true);
    }
  }, [winnerEvent]);

  const toggleCell = (r: number, c: number) => {
    triggerHaptic('impact');
    const key = `${r}-${c}`;
    const newSet = new Set(markedCells);
    if (newSet.has(key) && !(r === 2 && c === 2)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setMarkedCells(newSet);
  };

  const handleBingoClaim = async () => {
    if (!token || !purchasedCard) return;
    setClaiming(true);
    setDisqualified(false);
    try {
      await apiService.claimBingo(token, roundId, purchasedCard.card_id);
      triggerHaptic('success');
      confetti({
        particleCount: 220,
        spread: 100,
        origin: { y: 0.5 }
      });
      await refreshBalance();
      setShowWinnerModal(true);
    } catch (err: any) {
      triggerHaptic('error');
      setDisqualifiedReason(err.message || 'Card does not satisfy active winning pattern');
      setDisqualified(true);
      setTimeout(() => setDisqualified(false), 3500);
    } finally {
      setClaiming(false);
    }
  };

  // Auto start game loop if round status is WAITING
  useEffect(() => {
    if (!token || !roundId) return;
    if (roundStatus === 'WAITING' || !roundStatus) {
      apiService.startRoundGameLoop(token, roundId).catch((err) => {
        console.error("Auto start game loop error", err);
      });
    }
  }, [roundId, token, roundStatus]);

  // Derive recent 3 callouts for header list
  const recentCallouts = drawnNumbers.slice(-3).reverse();

  // DERASH / Prize Pool display calculation
  const derashVal = 3448; // GoodBingo baseline

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* 1. Header Navigation Bar */}
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

        <span style={{
          fontSize: '0.72rem',
          padding: '4px 10px',
          borderRadius: '999px',
          background: connected ? '#DCFCE7' : '#FEE2E2',
          color: connected ? '#166534' : '#991B1B',
          fontWeight: 800
        }}>
          {connected ? '● LIVE' : '○ CONNECTING...'}
        </span>
      </div>

      {/* 2. Top Stats Banner Bar (DERASH 3448 ETB | BALLS 10/75 | PLAYERS 431 | ( G-50 )) */}
      <div style={{
        background: '#1E293B',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: '0.82rem',
        fontWeight: 800
      }}>
        <div style={{ color: '#F59E0B' }}>DERASH {derashVal} ETB</div>
        <div>BALLS {drawnNumbers.length}/75</div>
        <div>PLAYERS 431</div>
        {latestDrawn ? (
          <div style={{
            background: '#F59E0B',
            color: '#FFFFFF',
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '0.78rem'
          }}>
            ( {latestDrawn.letter}-{latestDrawn.number} )
          </div>
        ) : (
          <div style={{ color: '#94A3B8' }}>( -- )</div>
        )}
      </div>

      {/* 3. Spectator Mode Check: If no purchased card and round in progress */}
      {!purchasedCard ? (
        <div className="glass-card" style={{
          textAlign: 'center',
          padding: '36px 20px',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid #E2E8F0'
        }}>
          <Hourglass style={{
            width: '64px',
            height: '64px',
            color: '#F59E0B',
            margin: '0 auto 16px auto',
            animation: 'spin 4s infinite linear'
          }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1E293B', marginBottom: '8px' }}>
            SPECTATOR MODE
          </h3>
          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748B', lineHeight: '1.4', marginBottom: '20px' }}>
            GAME IN PROGRESS - PLEASE WAIT FOR THE NEXT BUYING ROUND TO JOIN.
          </p>
          <button className="btn-primary" onClick={onBack}>
            Return to Room Selection
          </button>
        </div>
      ) : (
        /* 4. Live Play View: Master Board (Left) & Card Grid (Right) */
        <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: '10px', alignItems: 'start' }}>
          
          {/* Vertical 5x15 Master Board (Left) */}
          <div className="master-board-vertical">
            <div style={{ fontSize: '0.68rem', fontWeight: 900, textAlign: 'center', color: '#1E293B', marginBottom: '2px' }}>
              BOARD
            </div>

            {[
              { letter: 'B', range: [1, 15] },
              { letter: 'I', range: [16, 30] },
              { letter: 'N', range: [31, 45] },
              { letter: 'G', range: [46, 60] },
              { letter: 'O', range: [61, 75] },
            ].map(({ letter, range }) => (
              <div key={letter} style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                <div style={{
                  background: letter === 'B' ? '#3B82F6' : (letter === 'I' ? '#EF4444' : (letter === 'N' ? '#F59E0B' : (letter === 'G' ? '#10B981' : '#8B5CF6'))),
                  color: '#FFF',
                  fontWeight: 900,
                  fontSize: '0.65rem',
                  borderRadius: '3px',
                  textAlign: 'center',
                  padding: '1px 0'
                }}>
                  {letter}
                </div>

                {Array.from({ length: 15 }, (_, idx) => range[0] + idx).map((num) => {
                  const isDrawn = drawnSet.has(num);
                  const isLatest = latestDrawn?.number === num;

                  return (
                    <div
                      key={num}
                      className={`master-board-cell ${isLatest ? 'latest' : (isDrawn ? 'called' : '')}`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Player Card & Controls (Right) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Recent Callouts Header Bar */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 'var(--radius-md)',
              padding: '8px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B' }}>Calls:</span>
              {recentCallouts.length > 0 ? (
                recentCallouts.map((call, idx) => (
                  <span 
                    key={idx}
                    style={{
                      background: idx === 0 ? '#10B981' : '#F1F5F9',
                      color: idx === 0 ? '#FFFFFF' : '#1E293B',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 800
                    }}
                  >
                    [{call.letter}{call.number}]
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Waiting for first draw...</span>
              )}
            </div>

            {/* 5x5 Bingo Grid Card */}
            <div className="glass-card gold-border" style={{ padding: '12px', margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#F59E0B' }}>
                  Card #{purchasedCard.card_number}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Pattern: Full House / Line
                </span>
              </div>

              <div className="bingo-grid-container">
                <div className="bingo-headers">
                  <div className="letter-header letter-b">B</div>
                  <div className="letter-header letter-i">I</div>
                  <div className="letter-header letter-n">N</div>
                  <div className="letter-header letter-g">G</div>
                  <div className="letter-header letter-o">O</div>
                </div>

                <div className="bingo-matrix">
                  {purchasedCard.grid_matrix.flatMap((row, r) => 
                    row.map((val, c) => {
                      const isFree = r === 2 && c === 2;
                      const isMarked = markedCells.has(`${r}-${c}`);

                      return (
                        <div
                          key={`${r}-${c}`}
                          className={`bingo-cell ${isMarked ? 'marked' : ''} ${isFree ? 'free-space' : ''}`}
                          onClick={() => toggleCell(r, c)}
                        >
                          {isFree ? '★' : val}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Blue BINGO! Claim Button with Card Badge */}
              <button 
                className="btn-primary"
                style={{ 
                  marginTop: '12px',
                  fontSize: '1.25rem',
                  padding: '12px',
                  background: '#2563EB',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)'
                }}
                disabled={claiming || roundStatus !== 'PLAYING'}
                onClick={handleBingoClaim}
              >
                <Flame className="w-5 h-5 inline mr-1" />
                {claiming ? 'VERIFYING...' : `BINGO! #${purchasedCard.card_number}`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Disqualification Penalty Overlay */}
      {disqualified && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 400,
          padding: '20px'
        }}>
          <div className="glass-card animate-pop" style={{ textAlign: 'center', maxWidth: '320px', width: '100%', padding: '20px', border: '2px solid #EF4444', background: '#FFFFFF' }}>
            <XCircle style={{ width: '64px', height: '64px', color: '#EF4444', margin: '0 auto 12px auto' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EF4444', marginBottom: '6px' }}>
              BINGO! DISQUALIFIED
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#7F1D1D', marginBottom: '14px' }}>
              {disqualifiedReason}
            </p>
            <button 
              className="btn-primary"
              style={{ background: '#DC2626' }}
              onClick={() => setDisqualified(false)}
            >
              Resume Game
            </button>
          </div>
        </div>
      )}

      {/* Winner Modal */}
      {showWinnerModal && winnerEvent && (
        <WinnerModal 
          winnerEvent={winnerEvent}
          onClose={() => {
            setShowWinnerModal(false);
            onBack();
          }}
        />
      )}
    </div>
  );
};
