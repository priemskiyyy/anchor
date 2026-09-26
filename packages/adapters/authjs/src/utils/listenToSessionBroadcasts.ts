import { SESSION_BROADCAST_KEY } from "src/utils/constants/authjs";

// next-auth broadcasts through localStorage, whose storage event reaches only the application's other tabs.
export const listenToSessionBroadcasts = (listener: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = ({ key }: StorageEvent) => {
    if (key !== SESSION_BROADCAST_KEY) {
      return;
    }

    listener();
  };

  window.addEventListener("storage", handleStorage);

  return () => window.removeEventListener("storage", handleStorage);
};
