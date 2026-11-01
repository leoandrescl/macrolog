type LocalChangeListener = () => void;

const listeners = new Set<LocalChangeListener>();
let suppressionDepth = 0;

export function notifyLocalDataChange(): void {
  if (suppressionDepth > 0) return;
  for (const listener of listeners) listener();
}

export function onLocalDataChange(listener: LocalChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Evita que los cambios de una restauración remota se vuelvan a subir
 * como si fueran ediciones locales.
 */
export async function withoutLocalChangeNotifications<T>(
  operation: () => Promise<T>,
): Promise<T> {
  suppressionDepth += 1;
  try {
    return await operation();
  } finally {
    suppressionDepth = Math.max(0, suppressionDepth - 1);
  }
}
