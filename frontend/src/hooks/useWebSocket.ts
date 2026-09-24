import { useEffect, useRef, useState, useCallback } from 'react';

export interface DrawnNumberEvent {
  letter: string;
  number: number;
  drawn_sequence: number;
  drawn_at: string;
}

export interface CardReservedEvent {
  card_number: number;
  status: string;
}

export interface RoundStatusChangedEvent {
  status: string;
}

export interface WaitingPlayersEvent {
  real_players_count: number;
  min_players_required: number;
  message?: string;
}

export interface BingoWinnerEvent {
  winner_user_id: string;
  winner_username: string;
  winner_first_name: string;
  winning_card_number: number;
  prize_amount: number;
  pattern_completed: string;
}

export const useWebSocket = (roundId: string | null, token: string | null) => {
  const [connected, setConnected] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState<DrawnNumberEvent[]>([]);
  const [latestDrawn, setLatestDrawn] = useState<DrawnNumberEvent | null>(null);
  const [roundStatus, setRoundStatus] = useState<string>('WAITING');
  const [winnerEvent, setWinnerEvent] = useState<BingoWinnerEvent | null>(null);
  const [reservedCards, setReservedCards] = useState<number[]>([]);
  const [waitingPlayers, setWaitingPlayers] = useState<WaitingPlayersEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roundId || !token) return;

    let wsUrl = '';
    if (import.meta.env.VITE_WS_URL) {
      wsUrl = `${import.meta.env.VITE_WS_URL}/ws/rounds/${roundId}?token=${token}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:8000';
      wsUrl = `${protocol}//${host}/ws/rounds/${roundId}?token=${token}`;
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, data } = payload;

        if (eventName === 'NUMBER_DRAWN') {
          setDrawnNumbers((prev) => [...prev, data]);
          setLatestDrawn(data);
        } else if (eventName === 'CARD_RESERVED') {
          setReservedCards((prev) => [...prev, data.card_number]);
        } else if (eventName === 'ROUND_STATUS_CHANGED') {
          setRoundStatus(data.status);
        } else if (eventName === 'WAITING_FOR_PLAYERS') {
          setWaitingPlayers(data);
          setRoundStatus('WAITING');
        } else if (eventName === 'BINGO_WINNER') {
          setWinnerEvent(data);
          setRoundStatus('FINISHED');
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    // Keepalive ping interval
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [roundId, token]);

  const resetState = useCallback(() => {
    setDrawnNumbers([]);
    setLatestDrawn(null);
    setWinnerEvent(null);
    setReservedCards([]);
  }, []);

  return {
    connected,
    drawnNumbers,
    latestDrawn,
    roundStatus,
    winnerEvent,
    reservedCards,
    waitingPlayers,
    resetState
  };
};
