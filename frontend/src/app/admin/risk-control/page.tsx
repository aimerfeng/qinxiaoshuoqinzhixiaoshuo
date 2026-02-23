'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 风控中心首页 - 重定向到告警列表
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 */
export default function RiskControlPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/risk-control/alerts');
  }, [router]);

  return null;
}
