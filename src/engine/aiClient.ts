import type { AiRequest, AiResponse, Level } from '../types';
import { DIFFICULTIES } from '../data/difficulty';

/**
 * 主线程侧的 AI 客户端：封装 Worker 通信，提供 Promise 风格的 requestMove。
 * 同时附带一段"自然思考延迟"，让对手的落子节奏更像真人。
 */
class AiClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<number, (res: AiResponse) => void>();

  constructor() {
    this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (e: MessageEvent<AiResponse>) => {
      const resolve = this.pending.get(e.data.id);
      if (resolve) {
        this.pending.delete(e.data.id);
        resolve(e.data);
      }
    };
  }

  async requestMove(fen: string, level: Level, gameSeed: number): Promise<AiResponse> {
    const id = ++this.seq;
    const req: AiRequest = { id, fen, level, gameSeed };
    const [minMs, maxMs] = DIFFICULTIES[level].thinkDelayMs;
    const delay = minMs + Math.random() * (maxMs - minMs);

    const movePromise = new Promise<AiResponse>((resolve) => {
      this.pending.set(id, resolve);
      this.worker.postMessage(req);
    });

    const [res] = await Promise.all([
      movePromise,
      new Promise((r) => setTimeout(r, delay)),
    ]);
    return res;
  }

  dispose() {
    this.worker.terminate();
    this.pending.clear();
  }
}

let singleton: AiClient | null = null;

export function getAiClient(): AiClient {
  if (!singleton) singleton = new AiClient();
  return singleton;
}
