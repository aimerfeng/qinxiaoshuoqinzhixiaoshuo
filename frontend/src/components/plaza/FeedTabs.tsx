'use client';

import { motion } from 'framer-motion';
import { Sparkles, Users, TrendingUp } from 'lucide-react';
import type { FeedType } from '@/types/plaza';
import { cn } from '@/utils/cn';

interface FeedTabsProps {
  activeTab: FeedType;
  onTabChange: (tab: FeedType) => void;
}

const tabs: { id: FeedType; label: string; icon: React.ReactNode }[] = [
  { id: 'recommend', label: '推荐', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'following', label: '关注', icon: <Users className="w-4 h-4" /> },
  { id: 'trending', label: '热门', icon: <TrendingUp className="w-4 h-4" /> },
];

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100/80 backdrop-blur-sm rounded-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'text-white'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            />
          )}
          <span className="relative z-10">{tab.icon}</span>
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
