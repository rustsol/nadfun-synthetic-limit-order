'use client';

import { useState, useEffect } from 'react';

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';

export interface AgentEvent {
  type: string;
  orderId?: string;
  [key: string]: any;
}

export function useAgentEvents(walletAddress: string | undefined) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;

    const eventSource = new EventSource(
      `${AGENT_URL}/events?wallet=${walletAddress}`
    );

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as AgentEvent;
        setEvents(prev => [data, ...prev].slice(0, 50));
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [walletAddress]);

  return { events, connected };
}
