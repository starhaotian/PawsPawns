/// <reference lib="webworker" />
import type { AiRequest, AiResponse } from '../types';
import { chooseMove } from './search';

/**
 * AI Web Worker：接收局面与难度，返回一步棋。
 * 放在 Worker 中运行，保证深搜时主线程 UI 不卡顿。
 */
self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, fen, level, gameSeed } = e.data;
  const result = chooseMove(fen, level, gameSeed);
  if (!result) return; // 无合法走法（对局已结束），交由主线程处理
  const response: AiResponse = {
    id,
    from: result.from as AiResponse['from'],
    to: result.to as AiResponse['to'],
    promotion: result.promotion as AiResponse['promotion'],
  };
  (self as unknown as Worker).postMessage(response);
};
