'use client';

import { motion } from 'motion/react';
import {
  BookOpen,
  MessageSquare,
  Quote,
  CheckCircle,
  Circle,
  Trophy,
} from 'lucide-react';
import type { ActivityType, ActivityRules } from '@/types/activity';

/**
 * 活动任务列表组件
 *
 * 需求26: 限时活动前端
 * 任务26.2.4: 活动任务列表组件
 *
 * 显示活动任务及完成状态
 */

interface Task {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  current?: number;
  target?: number;
}

interface ActivityTaskListProps {
  activityType: ActivityType;
  rules: ActivityRules | null;
  progress: Record<string, unknown> | null;
  className?: string;
}

function getTasksForActivity(
  activityType: ActivityType,
  rules: ActivityRules | null,
  progress: Record<string, unknown> | null
): Task[] {
  const tasks: Task[] = [];

  switch (activityType) {
    case 'READING_CHALLENGE': {
      const readChapters = (progress?.readChapters as number) || 0;
      const targetChapters = rules?.targetChapterCount || 0;
      tasks.push({
        id: 'read-chapters',
        title: '阅读章节',
        description: `阅读指定作品的 ${targetChapters} 个章节`,
        icon: <BookOpen className="w-5 h-5" />,
        completed: readChapters >= targetChapters,
        current: readChapters,
        target: targetChapters,
      });
      break;
    }
    case 'WRITING_CONTEST': {
      const commentCount = (progress?.commentCount as number) || 0;
      const totalLength = (progress?.totalCommentLength as number) || 0;
      const minLength = rules?.minCommentLength || 0;
      tasks.push({
        id: 'write-comment',
        title: '发布评论',
        description: `发布至少 ${minLength} 字的评论`,
        icon: <MessageSquare className="w-5 h-5" />,
        completed: totalLength >= minLength,
        current: totalLength,
        target: minLength,
      });
      if (commentCount > 0) {
        tasks.push({
          id: 'comment-count',
          title: '评论数量',
          description: '已发布的评论数量',
          icon: <MessageSquare className="w-5 h-5" />,
          completed: true,
          current: commentCount,
        });
      }
      break;
    }
    case 'COMMUNITY_EVENT': {
      const quotedParagraphs = (progress?.quotedParagraphs as string[]) || [];
      tasks.push({
        id: 'quote-paragraph',
        title: '引用段落',
        description: '引用指定段落到广场',
        icon: <Quote className="w-5 h-5" />,
        completed: quotedParagraphs.length > 0,
        current: quotedParagraphs.length,
        target: 1,
      });
      break;
    }
    case 'SPECIAL_EVENT': {
      tasks.push({
        id: 'special-task',
        title: '完成活动任务',
        description: '按照活动规则完成指定任务',
        icon: <Trophy className="w-5 h-5" />,
        completed: false,
      });
      break;
    }
  }

  return tasks;
}

export function ActivityTaskList({
  activityType,
  rules,
  progress,
  className = '',
}: ActivityTaskListProps) {
  const tasks = getTasksForActivity(activityType, rules, progress);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        活动任务
      </h3>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              p-3 rounded-xl border transition-colors
              ${
                task.completed
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  p-2 rounded-lg
                  ${
                    task.completed
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                {task.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-medium ${
                      task.completed
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{task.description}</p>
                {task.target !== undefined && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">进度</span>
                      <span
                        className={
                          task.completed
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-gray-600 dark:text-gray-300'
                        }
                      >
                        {task.current} / {task.target}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(((task.current || 0) / task.target) * 100, 100)}%`,
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          task.completed
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default ActivityTaskList;
