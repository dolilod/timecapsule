import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type ToastType = 'success' | 'error' | 'info';
type ToastOptions = { type?: ToastType; durationMs?: number };

type ToastItem = { id: number; message: string; type: ToastType; durationMs: number };

const ToastContext = createContext<{ show: (message: string, opts?: ToastOptions) => void; success: (msg: string) => void; error: (msg: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, typography, componentRadius, spacing } = useTheme();
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const show = useCallback((message: string, opts?: ToastOptions) => {
    const id = idRef.current++;
    setQueue((q) => [
      ...q,
      {
        id,
        message,
        type: opts?.type ?? 'info',
        durationMs: opts?.durationMs ?? 2500,
      },
    ]);
  }, []);

  const success = useCallback((msg: string) => show(msg, { type: 'success' }), [show]);
  const error = useCallback((msg: string) => show(msg, { type: 'error' }), [show]);

  const ctx = useMemo(() => ({ show, success, error }), [show, success, error]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View pointerEvents="none" style={styles.overlay}>
        {queue.map((item) => (
          <ToastBubble
            key={item.id}
            item={item}
            onDone={() => setQueue((q) => q.filter((t) => t.id !== item.id))}
            colors={colors}
            typography={typography}
            componentRadius={componentRadius}
            spacing={spacing}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastBubble({
  item,
  onDone,
  colors,
  typography,
  componentRadius,
  spacing,
}: {
  item: ToastItem;
  onDone: () => void;
  colors: any;
  typography: any;
  componentRadius: any;
  spacing: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, item.durationMs);
    return () => clearTimeout(timer);
  }, [opacity, item.durationMs, onDone]);

  const palette = {
    info: { bg: colors.card.backgroundAlt, fg: colors.text.primary },
    success: { bg: colors.status.successBg, fg: colors.status.success },
    error: { bg: colors.status.errorBg, fg: colors.status.error },
  }[item.type];

  return (
    <Animated.View style={[styles.toast, { opacity, backgroundColor: palette.bg, borderRadius: componentRadius.card, paddingVertical: spacing[2], paddingHorizontal: spacing[3] }]}>
      <Text style={[typography.styles.button, { color: palette.fg }]}>{item.message}</Text>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    minWidth: 200,
    maxWidth: 600,
    marginTop: 8,
  },
});

