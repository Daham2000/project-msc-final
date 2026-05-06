import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { API_BASE_URL } from "../api/client";
import type { Announcement, UserRole } from "../types/api";

interface UseAnnouncementNotificationsOptions {
  enabled: boolean;
  token: string | null;
  role: UserRole | null;
  initialSinceId: string | null;
  onAnnouncement: (announcement: Announcement) => void;
}

export function useAnnouncementNotifications({
  enabled,
  token,
  role,
  initialSinceId,
  onAnnouncement,
}: UseAnnouncementNotificationsOptions) {
  const latestSeenIdRef = useRef<string | null>(initialSinceId);

  useEffect(() => {
    latestSeenIdRef.current = initialSinceId;
  }, [initialSinceId]);

  useEffect(() => {
    if (!enabled || !token || role !== "citizen" || initialSinceId === null) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) {
        return;
      }

      const streamUrl = new URL(`${API_BASE_URL}/announcements/stream`);
      streamUrl.searchParams.set("token", token);

      if (latestSeenIdRef.current) {
        streamUrl.searchParams.set("since_id", latestSeenIdRef.current);
      }

      eventSource = new EventSource(streamUrl.toString());

      eventSource.addEventListener("connected", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as { since_id?: string | null };
        if (payload.since_id) {
          latestSeenIdRef.current = payload.since_id;
        }
      });

      eventSource.addEventListener("announcement", (event) => {
        const announcement = JSON.parse((event as MessageEvent<string>).data) as Announcement;
        latestSeenIdRef.current = announcement.id;
        onAnnouncement(announcement);
        playNotificationSound();
        toast.success(`New notice: ${announcement.title}`, {
          duration: 5000,
          position: "top-right",
        });
      });

      eventSource.onerror = () => {
        eventSource?.close();
        if (!isClosed) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      isClosed = true;
      eventSource?.close();
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [enabled, initialSinceId, onAnnouncement, role, token]);
}

function playNotificationSound() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.2);

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);

  oscillator.onended = () => {
    void context.close();
  };
}
