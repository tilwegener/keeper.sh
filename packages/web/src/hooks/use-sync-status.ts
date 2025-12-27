import useSWRSubscription from "swr/subscription";
import { socketMessageSchema, syncStatusSchema, type SyncStatus } from "@keeper.sh/data-schemas";

const getSocketUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SOCKET_URL is not set");
  return url;
};

const fetchSocketToken = async (): Promise<string> => {
  const response = await fetch("/api/socket/token");
  if (!response.ok) throw new Error("Failed to fetch socket token");
  const { token } = await response.json();
  return token;
};

const createSocketUrl = (baseUrl: string, token: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
};

type SyncStatusRecord = Record<string, SyncStatus>;
type Next = (error?: Error | null, data?: SyncStatusRecord) => void;

export function useSyncStatus() {
  return useSWRSubscription(getSocketUrl(), (baseUrl: string, { next }: { next: Next }) => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let statuses: SyncStatusRecord = {};
    let isClosing = false;

    const connect = async () => {
      if (isClosing) return;

      try {
        const token = await fetchSocketToken();
        if (isClosing) return;

        socket = new WebSocket(createSocketUrl(baseUrl, token));

        socket.onmessage = (messageEvent) => {
          const message = JSON.parse(String(messageEvent.data));

          if (!socketMessageSchema.allows(message)) {
            next(new Error("Invalid socket message format"));
            return;
          }

          if (message.event === "ping") {
            socket?.send(JSON.stringify({ event: "pong" }));
            return;
          }

          if (message.event !== "sync:status") return;

          if (!syncStatusSchema.allows(message.data)) {
            next(new Error("Invalid sync status data"));
            return;
          }

          statuses = { ...statuses, [message.data.destinationId]: message.data };
          next(null, statuses);
        };

        socket.onclose = () => {
          if (isClosing) return;
          reconnectTimer = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          next(new Error("WebSocket error"));
        };
      } catch {
        if (isClosing) return;
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      isClosing = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  });
}
