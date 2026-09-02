import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const API_BASE = 'http://localhost:3000';

// Mirrors backend/lib/socketHub.js's EVENTS — kept namespaced so a future,
// unrelated event category (e.g. handheld-device events) can be added
// without touching this list.
export const SOCKET_EVENTS = {
  BATCH_CHANGED: 'batch:changed',
  BATCH_UPLOAD_UPDATED: 'batch:uploadUpdated',
  BATCH_MERGE_UPDATED: 'batch:mergeUpdated',
  HANDHELD_UPDATED: 'handheld:updated',
  HANDHELD_DEVICES_UPDATED: 'handheld:devicesUpdated',
};

// Shared by ListCreate.jsx (which owns the connection) and HandheldManager.jsx
// (which just registers its own listeners on it) so there is exactly one
// socket connection for the whole TBOS + Handheld subtree, not one per tab.
export function useActiveBatch() {
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [hasLoadedActiveBatch, setHasLoadedActiveBatch] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Created once per component instance via the lazy-ref idiom (safe under
  // StrictMode's double-invoke) with autoConnect:false, so the object exists
  // synchronously on first render — before any child's effect runs — while
  // the actual network connection is opened/closed strictly on this hook's
  // own mount/unmount.
  const socketRef = useRef(null);
  if (socketRef.current === null) {
    socketRef.current = io(API_BASE, { autoConnect: false });
  }
  const socket = socketRef.current;

  const fetchCurrentBatch = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/part-list/current-batch`);
      if (res.ok) {
        const data = await res.json();
        setActiveBatchId(data.batchId);
      }
    } catch (err) {
      console.error('Failed to fetch current batch', err);
    } finally {
      setHasLoadedActiveBatch(true);
    }
  }, []);

  useEffect(() => {
    fetchCurrentBatch();
  }, [fetchCurrentBatch]);

  useEffect(() => {
    socket.connect();

    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);
    const handleBatchChanged = (payload) => setActiveBatchId(payload.batchId);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(SOCKET_EVENTS.BATCH_CHANGED, handleBatchChanged);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(SOCKET_EVENTS.BATCH_CHANGED, handleBatchChanged);
      socket.disconnect();
    };
  }, [socket]);

  // Safe to call any time, including from a child's effect that fires before
  // this hook's own connect effect — the socket object always exists.
  const subscribeToEvent = useCallback((eventName, handler) => {
    socket.on(eventName, handler);
    return () => socket.off(eventName, handler);
  }, [socket]);

  const startNewBatch = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/part-list/start-new-batch`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start a new batch');
    const data = await res.json();
    setActiveBatchId(data.batchId);
    return data.batchId;
  }, []);

  return { activeBatchId, hasLoadedActiveBatch, isSocketConnected, subscribeToEvent, startNewBatch, fetchCurrentBatch };
}