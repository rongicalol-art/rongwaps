import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { connectGame, getGameConfiguration, type GameAction, type GameConnection, type GameSnapshot } from '../../services/wordBombService';

export function useWordBomb() {
  const [params, setParams] = useSearchParams();
  const [baseUrl, setBaseUrl] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<GameSnapshot | null>(null);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'closed'>('closed');
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const connection = useRef<GameConnection | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const disconnect = useCallback(() => { generation.current++; connection.current?.close(); }, []);
  useEffect(() => {
    mounted.current = true;
    void getGameConfiguration().then(url => { if (mounted.current) setBaseUrl(url); })
      .catch(problem => { if (mounted.current) { setBaseUrl(null); setError(problem instanceof Error ? problem.message : 'Multiplayer unavailable.'); } });
    return () => { mounted.current = false; disconnect(); };
  }, [disconnect]);
  useEffect(() => {
    if (state?.phase !== 'race') return;
    const timer = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(timer);
  }, [state?.phase]);

  const join = useCallback(async (name: string, lesson: number, code?: string) => {
    if (!baseUrl) return;
    const attempt = ++generation.current;
    connection.current?.close(); setError(''); setStatus('connecting');
    try {
      const handle = await connectGame({ baseUrl, code, name, lesson,
        onStatus: value => { if (mounted.current && attempt === generation.current) setStatus(value); },
        onError: message => { if (mounted.current && attempt === generation.current) setError(message); },
        onState: (snapshot, id) => {
          if (!mounted.current || attempt !== generation.current) return;
          setState(snapshot); setUserId(id); setOffset(snapshot.serverTime - Date.now()); setClock(Date.now());
          setParams({ room: snapshot.code }, { replace: true });
        },
      });
      if (!mounted.current || attempt !== generation.current) handle.close(); else connection.current = handle;
    } catch (problem) {
      if (mounted.current && attempt === generation.current) { setStatus('closed'); setError(problem instanceof Error ? problem.message : 'Could not connect.'); }
    }
  }, [baseUrl, setParams]);

  const send = useCallback((action: GameAction) => {
    try { connection.current?.send(action); setError(''); }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Connection unavailable.'); }
  }, []);
  const leave = useCallback(() => {
    if (status === 'connected') send({ type: 'leave' });
    generation.current++; connection.current?.close(); connection.current = null;
    setState(null); setStatus('closed'); setParams({}, { replace: true }); setError('');
  }, [send, setParams, status]);
  return { baseUrl, state, userId, status, error, join, send, leave, now: clock + offset, roomCode: params.get('room') ?? '' };
}
