export interface SseStreamOptions {
  /** Интервал отправки снимков, мс */
  snapshotInterval: number;
  /** Функция, возвращающая данные для снимка */
  getSnapshot: () => unknown;
  /** Диапазон [min, max] мс для «побочных» событий. Если не указан — спавна нет. */
  spawnInterval?: [number, number];
  /** Что делать при «побочном» событии */
  onSpawn?: () => void;
  /** Время жизни стрима, мс */
  lifetime: number;
}

/**
 * Создаёт SSE-стрим с кадрами `event: critical-predictions`.
 * Первый снимок — сразу, далее — каждые `snapshotInterval`.
 * Закрытие — через `lifetime`.
 */
export function createSseStream(options: SseStreamOptions): ReadableStream {
  const encoder = new TextEncoder();

  let closed = false;
  let snapshotTimer: ReturnType<typeof setInterval> | null = null;
  let spawnTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (snapshotTimer) clearInterval(snapshotTimer);
    if (spawnTimer) clearTimeout(spawnTimer);
    if (closeTimer) clearTimeout(closeTimer);
    snapshotTimer = null;
    spawnTimer = null;
    closeTimer = null;
  };

  return new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: critical-predictions\n`));
          controller.enqueue(encoder.encode(`retry: 5000\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      // 1. Первый снимок сразу
      send(options.getSnapshot());

      // 2. Периодические снимки
      snapshotTimer = setInterval(() => {
        send(options.getSnapshot());
      }, options.snapshotInterval);

      // 3. «Побочные» события через случайный интервал
      if (options.spawnInterval && options.onSpawn) {
        const [min, max] = options.spawnInterval;
        const scheduleSpawn = () => {
          if (closed) return;
          const delay = min + Math.random() * (max - min);
          spawnTimer = setTimeout(() => {
            if (closed) return;
            options.onSpawn!();
            scheduleSpawn();
          }, delay);
        };
        scheduleSpawn();
      }

      // 4. Закрытие через lifetime
      closeTimer = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // уже закрыт
        }
      }, options.lifetime);
    },

    cancel() {
      cleanup();
    },
  });
}
