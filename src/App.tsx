import React, { useEffect, useState, useCallback } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { SearchDashboard } from './components/SearchDashboard';
import { DownloadQueue } from './components/DownloadQueue';
import { SettingsPage } from './components/SettingsPage';
import { AccountsManager } from './components/AccountsManager';
import { LogViewer } from './components/LogViewer';
import { NotificationBanner } from './components/NotificationBanner';
import { OTSConfig, DownloadQueueItem, AccountItem, LogEntry, NotificationBannerItem, SearchResultItem } from './types';
import {
  fetchOTSConfig,
  fetchDownloadQueue,
  fetchAccounts,
  fetchServerLogs,
  searchMedia,
  enqueueDownload,
  clearQueueItems,
  triggerRetryFailed,
  performQueueAction,
  updateOTSConfigValue,
  saveOTSConfig,
  resetOTSConfig,
  addAccountService,
  removeAccountUUID,
  connectWebSocket
} from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [config, setConfig] = useState<OTSConfig | null>(null);
  const [queue, setQueue] = useState<DownloadQueueItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationBannerItem[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Initial load
  const loadData = useCallback(async () => {
    const [cfg, qData, accData, logData] = await Promise.all([
      fetchOTSConfig(),
      fetchDownloadQueue(),
      fetchAccounts(),
      fetchServerLogs()
    ]);
    if (cfg) setConfig(cfg._Config__config);
    if (qData) setQueue(qData);
    if (accData) setAccounts(accData);
    if (logData) setLogs(logData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket real-time subscription
  useEffect(() => {
    const unsubscribe = connectWebSocket(
      (data) => {
        if (data.type === 'QUEUE_UPDATE' && Array.isArray(data.queue)) {
          setQueue(data.queue);
        } else if (data.type === 'STATUS_CHANGE' && data.item) {
          const item: DownloadQueueItem = data.item;
          setQueue(prev => {
            const idx = prev.findIndex(i => i.local_id === item.local_id);
            if (idx === -1) return [item, ...prev];
            const updated = [...prev];
            updated[idx] = item;
            return updated;
          });

          if (data.notification) {
            const newNotif: NotificationBannerItem = {
              id: 'notif_' + Math.random().toString(36).substring(2, 9),
              title: item.name,
              message: data.notification,
              status: item.item_status as any,
              thumbnail: item.thumbnail,
              timestamp: new Date()
            };
            setNotifications(prev => [newNotif, ...prev]);
          }
        } else if (data.type === 'LOG' && data.line) {
          setLogs(prev => [data.line, ...prev.slice(0, 499)]);
        } else if (data.type === 'HANDSHAKE' && Array.isArray(data.queue)) {
          setQueue(data.queue);
        }
      },
      (connected) => {
        setWsConnected(connected);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDownloadItem = async (item: SearchResultItem) => {
    const res = await enqueueDownload(item);
    if (res.success) {
      // Re-fetch queue or rely on WS
      const q = await fetchDownloadQueue();
      setQueue(q);
    }
  };

  const handleClearCompleted = async () => {
    await clearQueueItems('Completed');
    const q = await fetchDownloadQueue();
    setQueue(q);
  };

  const handleRetryFailed = async () => {
    await triggerRetryFailed();
    const q = await fetchDownloadQueue();
    setQueue(q);
  };

  const handleQueueAction = async (local_id: string, action: 'cancel' | 'delete' | 'retry') => {
    await performQueueAction(local_id, action);
    const q = await fetchDownloadQueue();
    setQueue(q);
  };

  const handleUpdateConfigValue = async (key: string, value: any): Promise<boolean> => {
    const ok = await updateOTSConfigValue(key, value);
    if (ok) {
      setConfig(prev => prev ? { ...prev, [key]: value } : null);
    }
    return ok;
  };

  const handleSaveConfig = async (): Promise<boolean> => {
    return await saveOTSConfig();
  };

  const handleResetConfig = async () => {
    const fresh = await resetOTSConfig();
    if (fresh) setConfig(fresh);
  };

  const handleAddAccount = async (service: string, creds: { username?: string; token?: string }) => {
    const acc = await addAccountService(service, creds);
    if (acc) {
      const fresh = await fetchAccounts();
      setAccounts(fresh);
    }
    return acc;
  };

  const handleRemoveAccount = async (uuid: string) => {
    const ok = await removeAccountUUID(uuid);
    if (ok) {
      setAccounts(prev => prev.filter(a => a.uuid !== uuid));
    }
    return ok;
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleRefreshLogs = async () => {
    const fresh = await fetchServerLogs();
    setLogs(fresh);
  };

  const activeDownloadsCount = queue.filter(i => i.item_status === 'Downloading').length;

  return (
    <div className="min-h-screen bg-[#121214] text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">

      {/* Top sticky navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        queueCount={queue.filter(i => i.item_status === 'Waiting' || i.item_status === 'Downloading').length}
        activeDownloads={activeDownloadsCount}
        accountCount={accounts.length}
        wsConnected={wsConnected}
        version={config?.version || 'v2.0.0alpha1'}
        totalDownloadedItems={config?.total_downloaded_items || queue.filter(i => i.item_status === 'Completed').length}
        totalDownloadedData={config?.total_downloaded_data || 348291048}
      />

      {/* Main Tab Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <SearchDashboard
            onSearch={searchMedia}
            onDownload={handleDownloadItem}
            config={config}
          />
        )}

        {activeTab === 'queue' && (
          <DownloadQueue
            queue={queue}
            onClearCompleted={handleClearCompleted}
            onRetryFailed={handleRetryFailed}
            onAction={handleQueueAction}
            config={config}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            config={config}
            onUpdateValue={handleUpdateConfigValue}
            onSave={handleSaveConfig}
            onReset={handleResetConfig}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsManager
            accounts={accounts.length > 0 ? accounts : config?.accounts || []}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
          />
        )}

        {activeTab === 'logs' && (
          <LogViewer
            logs={logs}
            onRefresh={handleRefreshLogs}
            onClear={handleClearLogs}
          />
        )}
      </main>

      {/* Real-time floating notification banners */}
      <NotificationBanner
        notifications={notifications}
        onDismiss={handleDismissNotification}
        disabled={config?.disable_download_popups}
      />

    </div>
  );
}

