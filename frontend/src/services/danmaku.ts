import { apiRequest } from '@/lib/api';
import type { Danmaku, DanmakuListResponse, CreateDanmakuRequest } from '@/types/reader';

const DANMAKU_API_BASE = '/api/v1/danmaku';

export async function sendDanmaku(data: CreateDanmakuRequest): Promise<Danmaku> {
  return apiRequest<Danmaku>('post', DANMAKU_API_BASE, data);
}

export async function getDanmakuByAnchorId(
  anchorId: string,
  limit = 100
): Promise<DanmakuListResponse> {
  return apiRequest<DanmakuListResponse>(
    'get',
    `${DANMAKU_API_BASE}/${encodeURIComponent(anchorId)}`,
    { limit }
  );
}

export async function getDanmakuByAnchorIds(
  anchorIds: string[],
  limit = 50
): Promise<Record<string, Danmaku[]>> {
  return apiRequest<Record<string, Danmaku[]>>('post', `${DANMAKU_API_BASE}/batch`, {
    anchorIds,
    limit,
  });
}

export async function deleteDanmaku(danmakuId: string): Promise<void> {
  return apiRequest<void>('delete', `${DANMAKU_API_BASE}/${danmakuId}`);
}
