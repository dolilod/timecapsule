import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetwork(pollMs: number = 5000) {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const connected = Boolean(state.isConnected);
        const reachable = state.isInternetReachable ?? connected;
        if (mounted) setIsOnline(connected && reachable);
      } catch (e) {
        // If unable to determine, assume online to avoid unnecessary blocking UI
        if (mounted) setIsOnline(true);
      }
    };

    // Initial check and start polling
    check();
    timer = setInterval(check, pollMs);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer as any);
    };
  }, [pollMs]);

  return { isOnline };
}
