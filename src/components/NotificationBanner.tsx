import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Zap, X } from 'lucide-react';
import { NotificationBannerItem } from '../types';

interface NotificationBannerProps {
  notifications: NotificationBannerItem[];
  onDismiss: (id: string) => void;
  disabled?: boolean;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications,
  onDismiss,
  disabled
}) => {
  if (disabled || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0 select-none">
      {notifications.slice(0, 4).map((notif) => {
        const isSuccess = notif.status === 'Completed';
        const isFail = notif.status === 'Failed' || notif.status === 'Cancelled';
        const isDownloading = notif.status === 'Downloading';

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-[slideIn_0.3s_ease-out] ${
              isSuccess
                ? 'bg-zinc-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
                : isFail
                ? 'bg-zinc-900/95 border-rose-500/40 text-rose-100 shadow-rose-950/40'
                : 'bg-zinc-900/95 border-cyan-500/40 text-cyan-100 shadow-cyan-950/40'
            }`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isFail && <XCircle className="w-5 h-5 text-rose-400" />}
              {isDownloading && <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />}
            </div>

            {/* Thumbnail if any */}
            {notif.thumbnail && (
              <img
                src={notif.thumbnail}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 bg-zinc-800"
                referrerPolicy="no-referrer"
              />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold font-sans truncate leading-tight mb-1">{notif.title}</p>
              <p className="text-[11px] text-zinc-300 font-mono leading-normal line-clamp-2">{notif.message}</p>
            </div>

            {/* Close */}
            <button
              onClick={() => onDismiss(notif.id)}
              className="text-zinc-500 hover:text-white p-1 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
