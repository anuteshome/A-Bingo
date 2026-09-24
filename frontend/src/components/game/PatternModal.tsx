import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PatternItem {
  name: string;
  coords: number[][];
}

interface PatternModalProps {
  gameTypeName: string;
  patterns: PatternItem[];
  onClose: () => void;
}

// Fallback default patterns if none provided
const DEFAULT_PATTERNS: PatternItem[] = [
  {
    name: "Capital T + Bottom Line",
    coords: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,2],[3,2],[4,2],[4,0],[4,1],[4,3],[4,4]]
  },
  {
    name: "Capital T + Middle Line",
    coords: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,2],[3,2],[4,2],[2,0],[2,1],[2,3],[2,4]]
  },
  {
    name: "Capital T + Left Column",
    coords: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,2],[3,2],[4,2],[1,0],[2,0],[3,0],[4,0]]
  },
  {
    name: "Capital T + Main Diagonal",
    coords: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2],[2,2],[3,2],[4,2],[1,1],[3,3],[4,4]]
  }
];

export const PatternModal: React.FC<PatternModalProps> = ({ gameTypeName, patterns = DEFAULT_PATTERNS, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activePatternList = patterns.length > 0 ? patterns : DEFAULT_PATTERNS;
  const currentPattern = activePatternList[currentIndex];
  const targetSet = new Set(currentPattern.coords.map(c => `${c[0]}-${c[1]}`));

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activePatternList.length);
  };

  const handleBack = () => {
    setCurrentIndex((prev) => (prev - 1 + activePatternList.length) % activePatternList.length);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '16px'
    }}>
      <div className="glass-card gold-border animate-pop" style={{ maxWidth: '380px', width: '100%', padding: '20px', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-gold)' }}>
              የጨዋታ አይነት: {gameTypeName || 'ካፒታል T + 1 መስመር'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
              Pattern {currentIndex + 1} of {activePatternList.length}
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5x5 Pattern Matrix */}
        <div className="bingo-grid-container" style={{ margin: '16px 0' }}>
          <div className="bingo-headers">
            <div className="letter-header letter-b">B</div>
            <div className="letter-header letter-i">I</div>
            <div className="letter-header letter-n">N</div>
            <div className="letter-header letter-g">G</div>
            <div className="letter-header letter-o">O</div>
          </div>

          <div className="bingo-matrix">
            {Array.from({ length: 5 }).flatMap((_, r) => 
              Array.from({ length: 5 }).map((_, c) => {
                const isFree = r === 2 && c === 2;
                const isTarget = targetSet.has(`${r}-${c}`);

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`bingo-cell ${isTarget ? 'marked' : ''} ${isFree ? 'free-space' : ''}`}
                    style={{
                      background: isFree 
                        ? 'linear-gradient(135deg, #FFD700 0%, #D97706 100%)' 
                        : (isTarget ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(15, 23, 42, 0.9)'),
                      border: `1px solid ${isTarget ? '#34D399' : 'rgba(255, 255, 255, 0.08)'}`,
                      color: isFree ? '#000' : '#FFF',
                      fontSize: '1.2rem',
                      fontWeight: 900
                    }}
                  >
                    {isFree ? '★' : (isTarget ? 'X' : '')}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 600 }}>
          {currentPattern.name}
        </div>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button 
            className="btn-primary"
            style={{ flex: 1, padding: '10px', background: 'rgba(30, 41, 59, 0.9)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={handleBack}
          >
            <ChevronLeft className="w-4 h-4 inline mr-1" /> Back
          </button>

          <button 
            className="btn-primary btn-cyan"
            style={{ flex: 1, padding: '10px' }}
            onClick={handleNext}
          >
            Next <ChevronRight className="w-4 h-4 inline ml-1" />
          </button>
        </div>

      </div>
    </div>
  );
};
