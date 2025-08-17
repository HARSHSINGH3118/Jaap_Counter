import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { getAllEvents, clearQueue, requeue, getSinceTs, setSinceTs, queueCount } from "../lib/db";

export function useSync() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [qCount, setQCount] = useState(0);
  const debRef = useRef(null);

  const refreshCount = useCallback(async () => setQCount(await queueCount()), []);

  const trySync = useCallback(async () => {
    const since = await getSinceTs();
    const events = await getAllEvents();
    if (events.length === 0 && !since) return;

    setSyncing(true);
    try {
      const { data } = await api.post("/counters/sync", { events, sinceTs: since || null });
      await clearQueue();
      if (data.serverSinceTs) await setSinceTs(data.serverSinceTs);
      setOffline(false);
    } catch (e) {
      setOffline(true);
      if (events.length) await requeue(events);
    } finally {
      await refreshCount();
      setSyncing(false);
    }
  }, [refreshCount]);

  // Debounced scheduler to avoid rapid flicker on quick taps
  const scheduleSync = useCallback(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { trySync(); }, 250);
  }, [trySync]);

  useEffect(() => {
    const onOnline = () => { setOffline(false); scheduleSync(); };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    refreshCount();
    scheduleSync();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [scheduleSync, refreshCount]);

  return { offline, syncing, queueCount: qCount, trySync, scheduleSync };
}
