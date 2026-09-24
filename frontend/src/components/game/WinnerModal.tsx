import React, { useState } from 'react';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';

interface WinnerModalProps {
  winnerEvent: {
    winner_user_id: string;
    winner_username: string;
    winner_first_name: string;
    winning_card_number: number;
    prize_amount: number;
    pattern_completed: string;
    winners_count?: number;
    total_prize_pool?: number;
    winning_cards?: Array<{
      card_number: number;
      username: string;
      grid_matrix: number[][];
      matched_coords: Array<[number, number]>;
    }>;
  };
  onClose: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({ winnerEvent, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  const totalWinners = winnerEvent.winners_count || 1;
  const totalPrize = winnerEvent.total_prize_pool || (winnerEvent.prize_amount * totalWinners);

  const dummySampleMatrix = [
    [7, 20, 44, 56, 61],
    [15, 26, 36, 55, 62],
    [5, 17, 0, 54, 69],
    [12, 22, 40, 51, 65],
    [9, 29, 41, 58, 70]
  ];

  const cardsList = winnerEvent.winning_cards && winnerEvent.winning_cards.length > 0 
    ? winnerEvent.winning_cards 
    : [{
        card_number: winnerEvent.winning_card_number,
        username: winnerEvent.winner_first_name || winnerEvent.winner_username || 'Player',
        grid_matrix: dummySampleMatrix,
        matched_coords: [[0,0], [0,1], [0,2], [0,3], [0,4]]
      }];

  const currentCard = cardsList[currentIdx] || cardsList[0];

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev > 0 ? prev - 1 : cardsList.length - 1));
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev < cardsList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 400,
      padding: '16px'
    }}>
      <div className="glass-card gold-border animate-pop" style={{
        background: '#FFFFFF',
        color: '#0F172A',
        maxWidth: '360px',
        width: '100%',
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}>
        {/* Winner Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <Trophy style={{ width: '32px', height: '32px', color: '#F59E0B' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#F59E0B' }}>
            {totalWinners} {totalWinners === 1 ? 'አሸናፊ' : 'አሸናፊዎች'} ({winnerEvent.prize_amount.toFixed(0)} ETB)
          </h2>
        </div>

        {/* Total Prize Pool Banner */}
        <div style={{
          background: '#1E293B',
          color: '#F59E0B',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 800,
          marginBottom: '14px',
          letterSpacing: '0.5px'
        }}>
          TOTAL PRIZE POOL {totalPrize.toFixed(0)} ETB
        </div>

        {/* Winning Card Display */}
        <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563EB', marginBottom: '6px' }}>
            Winning Card #{currentCard.card_number} ({currentCard.username})
          </div>

          {/* 5x5 Matrix Preview */}
          <div className="bingo-grid-container" style={{ transform: 'scale(0.82)', margin: '-10px 0' }}>
            <div className="bingo-headers">
              <div className="letter-header letter-b">B</div>
              <div className="letter-header letter-i">I</div>
              <div className="letter-header letter-n">N</div>
              <div className="letter-header letter-g">G</div>
              <div className="letter-header letter-o">O</div>
            </div>
            <div className="bingo-matrix">
              {currentCard.grid_matrix.flatMap((row, r) => 
                row.map((val, c) => {
                  const isFree = r === 2 && c === 2;
                  const isMatched = currentCard.matched_coords.some(([mr, mc]) => mr === r && mc === c);

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`bingo-cell ${isFree ? 'free-space' : ''} ${isMatched ? 'winning-pattern' : ''}`}
                      style={{
                        background: isMatched ? '#10B981' : (isFree ? '#F59E0B' : '#F1F5F9'),
                        color: (isMatched || isFree) ? '#FFFFFF' : '#0F172A',
                        borderColor: isMatched ? '#059669' : '#CBD5E1'
                      }}
                    >
                      {isFree ? '★' : val}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Multi-Winner Carousel Controls */}
        {cardsList.length > 1 && (
          <div className="carousel-nav" style={{ marginBottom: '14px' }}>
            <button className="carousel-btn" onClick={handlePrev}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="carousel-dots">
              {cardsList.map((_, i) => (
                <div key={i} className={`dot ${i === currentIdx ? 'active' : ''}`} />
              ))}
            </div>
            <button className="carousel-btn" onClick={handleNext}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Countdown Progress Fill Bar */}
        <div style={{
          background: '#E2E8F0',
          borderRadius: 'var(--radius-full)',
          height: '24px',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: '100%',
            background: 'linear-gradient(90deg, #2563EB 0%, #10B981 100%)',
            borderRadius: 'var(--radius-full)'
          }} />
          <span style={{ position: 'relative', zIndex: 2, color: '#FFFFFF', fontSize: '0.78rem', fontWeight: 800 }}>
            NEXT ROUND: 10S
          </span>
        </div>

        <button className="btn-primary" onClick={onClose}>
          Return to Lobby
        </button>
      </div>
    </div>
  );
};
