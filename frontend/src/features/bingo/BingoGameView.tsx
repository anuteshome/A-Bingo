import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { apiService } from '../../services/api';
import { triggerHaptic } from '../../utils/telegram';
import { Star, XCircle, RefreshCw } from 'lucide-react';
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

const DEFAULT_CARD_MATRIX = [
  [7, 20, 44, 56, 61],
  [15, 26, 36, 55, 62],
  [5, 17, 0, 54, 69],
  [8, 25, 34, 52, 65],
  [3, 18, 31, 57, 66]
];

export const BingoGameView: React.FC<BingoGameViewProps> = ({ roundId, purchasedCard, onBack }) => {
  const { token, refreshBalance } = useAuth();
  const { drawnNumbers, latestDrawn, roundStatus, winnerEvent } = useWebSocket(roundId, token);

  const [markedCells, setMarkedCells] = useState<Set<string>>(new Set(['2-2']));
  const [claiming, setClaiming] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [disqualifiedReason, setDisqualifiedReason] = useState<string>('');
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Active matrix & card number (fallback to screenshot card #39 if null)
  const activeMatrix = purchasedCard?.grid_matrix || DEFAULT_CARD_MATRIX;
  const cardNum = purchasedCard?.card_number || 39;

  // Set of numbers drawn so far
  const drawnSet = new Set(drawnNumbers.map(d => d.number));

  // Auto-mark drawn numbers on card
  useEffect(() => {
    const newMarked = new Set(markedCells);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = activeMatrix[r][c];
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
    if (!token) return;
    setClaiming(true);
    setDisqualified(false);
    try {
      const cardIdToClaim = purchasedCard?.card_id || 'demo-card-39';
      await apiService.claimBingo(token, roundId, cardIdToClaim);
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

  // Derive recent 3 callouts
  const recentCallouts = drawnNumbers.slice(-3).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: '#EBF1F7', overflow: 'hidden' }}>
      
      {/* 1. Header Bar (DERASH 3360 ETB | BALLS 0/75 | PLAYERS 420 | Callout Ball) */}
      <div style={{
        background: '#131C2E',
        color: '#FFFFFF',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        height: '52px',
        boxSizing: 'border-box',
        zIndex: 20
      }}>
        {/* DERASH */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#8A99AD', letterSpacing: '0.5px' }}>DERASH</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10B981', lineHeight: '1.1' }}>3360</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10B981' }}>ETB</span>
          </div>
        </div>

        {/* BALLS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#8A99AD', letterSpacing: '0.5px' }}>BALLS</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFFFFF', lineHeight: '1.1' }}>
            {drawnNumbers.length}<span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>/75</span>
          </div>
        </div>

        {/* PLAYERS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '60px' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#8A99AD', letterSpacing: '0.5px' }}>PLAYERS</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#F59E0B', lineHeight: '1.1' }}>420</span>
        </div>

        {/* Top-Right Callout Ball Badge */}
        <div style={{
          position: 'absolute',
          right: '12px',
          top: '4px',
          width: '74px',
          height: '74px',
          borderRadius: '50%',
          background: '#EBF1F7',
          border: '3px dashed #CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          zIndex: 30
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1.8rem',
            color: '#2563EB'
          }}>
            {latestDrawn ? latestDrawn.number : 1}
          </div>
        </div>
      </div>

      {/* 2. Main Play Body */}
      <div style={{ display: 'flex', flex: 1, width: '100%', height: 'calc(100vh - 52px)', background: '#EBF1F7', overflow: 'hidden' }}>
        
        {/* Left Column: Master Board 5x15 */}
        <div style={{
          width: '125px',
          display: 'flex',
          flexDirection: 'column',
          background: '#EBF1F7',
          borderRight: '1px solid #D1D5DB',
          height: '100%'
        }}>
          {/* Header B I N G O */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '2px',
            padding: '3px 3px 2px 3px',
            background: '#EBF1F7'
          }}>
            <div style={{ background: '#2563EB', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', borderRadius: '3px', padding: '2px 0' }}>B</div>
            <div style={{ background: '#EF4444', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', borderRadius: '3px', padding: '2px 0' }}>I</div>
            <div style={{ background: '#F59E0B', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', borderRadius: '3px', padding: '2px 0' }}>N</div>
            <div style={{ background: '#10B981', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', borderRadius: '3px', padding: '2px 0' }}>G</div>
            <div style={{ background: '#8B5CF6', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '0.8rem', textAlign: 'center', borderRadius: '3px', padding: '2px 0' }}>O</div>
          </div>

          {/* 15 Rows Grid */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateRows: 'repeat(15, 1fr)',
            gap: '2px',
            padding: '1px 3px 3px 3px'
          }}>
            {Array.from({ length: 15 }).map((_, rowIdx) => (
              <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px' }}>
                {[
                  rowIdx + 1,        // B
                  rowIdx + 16,       // I
                  rowIdx + 31,       // N
                  rowIdx + 46,       // G
                  rowIdx + 61        // O
                ].map((num) => {
                  const isDrawn = drawnSet.has(num);
                  const isLatest = latestDrawn?.number === num;

                  let bg = '#FFFFFF';
                  let textColor = '#0F172A';
                  if (isLatest) {
                    bg = '#10B981';
                    textColor = '#FFFFFF';
                  } else if (isDrawn) {
                    bg = '#F59E0B';
                    textColor = '#FFFFFF';
                  }

                  return (
                    <div
                      key={num}
                      style={{
                        background: bg,
                        color: textColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        borderRadius: '3px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Left Footer */}
          <div style={{
            background: '#131C2E',
            color: '#FFFFFF',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2px',
            borderTop: '1px solid #1E293B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.62rem' }}>
              <span style={{ color: '#64748B', fontWeight: 800 }}>ROOM</span>
              <span 
                onClick={() => window.location.reload()} 
                style={{ color: '#94A3B8', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
              >
                <RefreshCw className="w-3 h-3 inline" /> REFRESH
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
              VIP 💰 💰
            </div>
          </div>
        </div>

        {/* Right Area: Player Card & Recent Indicator */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 10px',
          gap: '20px',
          overflowY: 'auto'
        }}>
          {/* Top Indicator Pill */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '999px',
            padding: '6px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #E2E8F0'
          }}>
            {[0, 1, 2].map((idx) => {
              const call = recentCallouts[idx];
              return (
                <div
                  key={idx}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: call ? '#10B981' : '#F1F5F9',
                    color: call ? '#FFFFFF' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 800
                  }}
                >
                  {call ? call.number : ''}
                </div>
              );
            })}
          </div>

          {/* 5x5 Player Card Container */}
          <div style={{
            width: '100%',
            maxWidth: '310px',
            background: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header row B I N G O */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              padding: '12px 12px 6px 12px'
            }}>
              <div style={{ background: '#2563EB', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>B</div>
              <div style={{ background: '#EF4444', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>I</div>
              <div style={{ background: '#F59E0B', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
              <div style={{ background: '#10B981', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>G</div>
              <div style={{ background: '#8B5CF6', color: '#FFF', fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>O</div>
            </div>

            {/* 5x5 Grid Cells */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '8px',
              padding: '6px 12px 14px 12px'
            }}>
              {activeMatrix.flatMap((row, r) =>
                row.map((val, c) => {
                  const isFree = r === 2 && c === 2;
                  const isMarked = markedCells.has(`${r}-${c}`);

                  if (isFree) {
                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => toggleCell(r, c)}
                        style={{
                          background: '#10B981',
                          height: '46px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Star style={{ fill: '#2563EB', color: '#2563EB', width: 22, height: 22 }} />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => toggleCell(r, c)}
                      style={{
                        background: isMarked ? '#10B981' : '#F1F5F9',
                        color: isMarked ? '#FFFFFF' : '#0F172A',
                        height: '46px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {val}
                    </div>
                  );
                })
              )}
            </div>

            {/* BINGO! Action Button */}
            <button
              disabled={claiming}
              onClick={handleBingoClaim}
              style={{
                width: '100%',
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '16px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: claiming ? 'not-allowed' : 'pointer',
                borderBottomLeftRadius: '24px',
                borderBottomRightRadius: '24px'
              }}
            >
              <span style={{
                fontStyle: 'italic',
                fontWeight: 900,
                fontSize: '1.85rem',
                letterSpacing: '1px',
                color: '#FFFFFF',
                textShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}>
                BINGO!
              </span>

              <span style={{
                position: 'absolute',
                right: '14px',
                bottom: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#93C5FD'
              }}>
                #{cardNum}
              </span>
            </button>
          </div>
        </div>

      </div>

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
