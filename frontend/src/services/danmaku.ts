import { api } from '@/lib/api';
import type { Danmaku, DanmakuListResponse, CreateDanmakuRequest } from '@/types/reader';

const DANMAKU_API_BASE = '/api/v1/danmaku';

/**
 * 发送弹幕
 *
 * 需求24.1: 显示弹幕输入框并限制内容在100字以内
 * 需求24.2: 将弹幕绑定到对应 Anchor_ID 并存储到数据库
 */
export async function sendDanmaku(data: CreateDanmakuRequest): Promise<Danmaku> {
  const response = await api.post<Danmaku>(DANMAKU_API_BASE, data);
  return response.data;
}

/**
 * 获取段落弹幕列表
 *
 * 需求24.3: 使用 Danmaku 引擎在段落上方渲染滚动弹幕
 */
export async function getDanmakuByAnchorId(
  anchorId: string,
  limit = 100
): Promise<DanmakuListResponse> {
  const response = await api.get<DanmakuListResponse>(
    `${DANMAKU_API_BASE}/${encodeURIComponent(anchorId)}`,
    { params: { limit } }
  );
  return response.data;
}

/**
 * 批量获取多个段落的弹幕
 */
export async function getDanmakuByAnchorIds(
  anchorIds: string[],
  limit = 50
): Promise<Record<string, Danmaku[]>> {
  const response = await api.post<Record<string, Danmaku[]>>(`${DANMAKU_API_BASE}/batch`, {
    anchorIds,
    limit,
  });
  return response.data;
}

/**
 * 删除弹幕
 *
 * 需求24.8: WHEN 用户删除自己的弹幕 THEN System SHALL 标记弹幕为已删除并从渲染列表中移除
 */
export async function deleteDanmaku(danmakuId: string): Promise<void> {
  await api.delete(`${DANMAKU_API_BASE}/${danmakuId}`);
}
