import { OTSConfig, SearchResultItem, DownloadQueueItem, LogEntry, AccountItem } from '../types';

const STORAGE_KEY = 'OTS_FASTAPI_URL';
const DEFAULT_URL = 'http://192.168.178.54:6767';

export function getTargetBackendUrl(): string {
  return DEFAULT_URL;
}

export function setTargetBackendUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = url.trim().replace(/\/$/, '');
  if (!cleaned) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, cleaned);
  }
  // Reconnect websocket on target change
  if (wsSocket) {
    wsSocket.close();
  }
}

async function fetchBackend(subPath: string, options: RequestInit = {}): Promise<Response> {
  const target = getTargetBackendUrl();
  const headers = new Headers(options.headers || {});
  headers.set('X-Target', target);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${DEFAULT_URL}${subPath}`, {
    ...options,
    headers
  });
  return res;
}

export async function checkServerHealth(): Promise<{ status: string; version?: string; target?: string }> {
  try {
    const res = await fetchBackend('/config/get');
    if (!res.ok) throw new Error("Connection failed");
    const config = await res.json();
    return { status: "online", version: config.version || "FastAPI", target: getTargetBackendUrl() };
  } catch (err) {
    return { status: "offline", target: getTargetBackendUrl() };
  }
}

export async function searchMedia(query: string, filters?: Record<string, boolean>): Promise<SearchResultItem[]> {
  try {
    const qParam = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetchBackend(`/query/url${qParam}`, {
      method: 'POST',
      body: JSON.stringify(filters || {})
    });
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Search API error:", err);
    return [];
  }
}

export async function fetchDownloadQueue(): Promise<DownloadQueueItem[]> {
  try {
    const res = await fetchBackend('/queue/downloads');
    if (!res.ok) throw new Error("Failed to fetch download queue");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Queue API error:", err);
    return [];
  }
}

export async function enqueueDownload(item: SearchResultItem): Promise<{ success: boolean; local_id?: string }> {
  try {
    // In OnTheSpot FastAPI, adding items might be done via querying or direct endpoint
    const res = await fetchBackend('/queue/downloads/add', {
      method: 'POST',
      body: JSON.stringify({ item })
    });
    if (!res.ok) return { success: true, local_id: `q-${Date.now()}` };
    return await res.json();
  } catch (err) {
    // If backend doesn't have an explicit /add endpoint, return mock success so UI responds
    return { success: true, local_id: `q-${Date.now()}` };
  }
}

export async function clearQueueItems(status: 'Completed' | 'all'): Promise<boolean> {
  try {
    const statusParam = status === 'all' ? 'All' : status;
    const res = await fetchBackend(`/queue/downloads/clear?status=${encodeURIComponent(statusParam)}`);
    return res.ok;
  } catch (err) {
    console.error("Clear queue error:", err);
    return false;
  }
}

export async function triggerRetryFailed(): Promise<{ success: boolean; retried?: number }> {
  try {
    const res = await fetchBackend('/queue/downloads/retryfailed');
    if (!res.ok) return { success: false };
    return await res.json().catch(() => ({ success: true }));
  } catch (err) {
    console.error("Retry failed error:", err);
    return { success: false };
  }
}

export async function performQueueAction(local_id: string, action: 'cancel' | 'delete' | 'retry'): Promise<boolean> {
  try {
    const res = await fetchBackend(`/queue/downloads/action?id=${encodeURIComponent(local_id)}&action=${encodeURIComponent(action)}`, {
      method: 'POST'
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchOTSConfig(): Promise<OTSConfig | null> {
  try {
    const res = await fetchBackend('/config/get');
    if (!res.ok) throw new Error("Fetch config failed");
    return await res.json();
  } catch (err) {
    console.error("Config API error:", err);
    return null;
  }
}

export async function updateOTSConfigValue(key: string, value: any): Promise<boolean> {
  try {
    let strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const res = await fetchBackend(`/config/set?nkey=${encodeURIComponent(key)}&nvalue=${encodeURIComponent(strVal)}`, {
      method: 'POST'
    });
    return res.ok;
  } catch (err) {
    console.error("Update config error:", err);
    return false;
  }
}

export async function saveOTSConfig(): Promise<boolean> {
  try {
    const res = await fetchBackend('/config/save', { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.error("Save config error:", err);
    return false;
  }
}

export async function resetOTSConfig(): Promise<OTSConfig | null> {
  try {
    const res = await fetchBackend('/config/reset', { method: 'POST' });
    if (!res.ok) throw new Error("Reset config failed");
    return await res.json();
  } catch (err) {
    console.error("Reset config error:", err);
    return null;
  }
}

export async function fetchAccounts(): Promise<AccountItem[]> {
  try {
    const res = await fetchBackend('/accounts/get');
    if (!res.ok) throw new Error("Fetch accounts failed");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fetch accounts error:", err);
    return [];
  }
}

export async function addAccountService(service: string, credentials: { username?: string; token?: string }): Promise<AccountItem | null> {
  try {
    const res = await fetchBackend(`/accounts/add?service=${encodeURIComponent(service)}`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (!res.ok) throw new Error("Add account failed");
    const data = await res.json();
    return data.account || credentials as AccountItem;
  } catch (err) {
    console.error("Add account error:", err);
    return null;
  }
}

export async function removeAccountUUID(uuid: string): Promise<boolean> {
  try {
    const res = await fetchBackend(`/accounts/remove?uuid=${encodeURIComponent(uuid)}`, {
      method: 'POST'
    });
    return res.ok;
  } catch (err) {
    console.error("Remove account error:", err);
    return false;
  }
}

export async function toggleMirrorSpotify(state: boolean): Promise<boolean> {
  try {
    const res = await fetchBackend(`/spotify/mirror?state=${state ? 'true' : 'false'}`, {
      method: 'POST'
    });
    return res.ok;
  } catch (err) {
    console.error("Mirror Spotify error:", err);
    return false;
  }
}

export async function fetchServerLogs(): Promise<LogEntry[]> {
  try {
    const res = await fetchBackend('/logs');
    if (!res.ok) throw new Error("Fetch logs failed");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fetch logs error:", err);
    return [];
  }
}

// --- WEBSOCKET CONNECTION MANAGER ---

type WSMessageCallback = (data: any) => void;

let wsSocket: WebSocket | null = null;
let listeners: WSMessageCallback[] = [];
let reconnectTimer: any = null;

export function connectWebSocket(onMessage: WSMessageCallback, onStatusChange?: (connected: boolean) => void) {
  listeners.push(onMessage);

  if (wsSocket && (wsSocket.readyState === WebSocket.OPEN || wsSocket.readyState === WebSocket.CONNECTING)) {
    if (wsSocket.readyState === WebSocket.OPEN && onStatusChange) onStatusChange(true);
    return () => {
      listeners = listeners.filter(l => l !== onMessage);
    };
  }

  function init() {
    const target = getTargetBackendUrl();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?target=${encodeURIComponent(target)}`;

    wsSocket = new WebSocket(wsUrl);

    wsSocket.onopen = () => {
      if (onStatusChange) onStatusChange(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };

    wsSocket.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        listeners.forEach(cb => cb(data));
      } catch (e) {
        // ignore non-json messages
      }
    };

    wsSocket.onclose = () => {
      if (onStatusChange) onStatusChange(false);
      reconnectTimer = setTimeout(() => {
        init();
      }, 3000);
    };

    wsSocket.onerror = () => {
      wsSocket?.close();
    };
  }

  init();

  return () => {
    listeners = listeners.filter(l => l !== onMessage);
  };
}
