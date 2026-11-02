type LocalChangeListener = () => void;

const accountListeners = new Set<LocalChangeListener>();
const foodListeners = new Set<LocalChangeListener>();
let suppressionDepth = 0;

/** Cambios privados de la cuenta: perfiles, bloques y registros. */
export function notifyLocalDataChange(): void {
  if (suppressionDepth > 0) return;
  for (const listener of accountListeners) listener();
}

export function onLocalDataChange(listener: LocalChangeListener): () => void {
  accountListeners.add(listener);
  return () => {
    accountListeners.delete(listener);
  };
}

/** Cambios de la biblioteca global de alimentos. */
export function notifyFoodsChange(): void {
  if (suppressionDepth > 0) return;
  for (const listener of foodListeners) listener();
}

export function onFoodsChange(listener: LocalChangeListener): () => void {
  foodListeners.add(listener);
  return () => {
    foodListeners.delete(listener);
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
