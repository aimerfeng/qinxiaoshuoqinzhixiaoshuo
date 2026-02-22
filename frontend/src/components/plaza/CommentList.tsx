'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, ChevronDown, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Comment } from '@/types/plaza';
import { useAuthStore } from '@/store/auth';
import { plazaService } from '@/services/plaza';
import { cn } from '@/utils/cn';

interface CommentListProps {
  cardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentList({ cardId, isOpen, onClose }: CommentListProps) {
  const { isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [hotComments, setHotComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载评论
  const loadComments = useCallback(async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await plazaService.getComments(cardId, cursor);
      if (cursor) {
        setComments((prev) => [...prev, ...response.comments]);
      } else {
        setComments(response.comments);
        setHotComments(response.hotComments);
      }
      setNextCursor(response.nextCursor);
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [cardId]);

  // 初始加载
  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, loadComments]);

  // 提交评论
  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting || !isAuthenticated) return;

    setIsSubmitting(true);
    try {
      const comment = await plazaService.createComment(cardId, {
        content: newComment.trim(),
        parentCommentId: replyTo?.id,
      });
      
      if (replyTo) {
        // 添加到回复列表
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: [...(c.replies || []), comment], replyCount: (c.replyCount || 0) + 1 }
              : c,
          ),
        );
      } else {
        // 添加到评论列表顶部
        setComments((prev) => [{ ...comment, replies: [], replyCount: 0 }, ...prev]);
      }
      
      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('发送评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 点赞评论
  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!isAuthenticated) return;

    try {
      const result = isLiked
        ? await plazaService.unlikeComment(commentId)
        : await plazaService.likeComment(commentId);

      // 更新评论状态
      const updateComment = (c: Comment): Comment =>
        c.id === commentId
          ? { ...c, isLiked: result.isLiked, likeCount: result.likeCount }
          : { ...c, replies: c.replies?.map(updateComment) };

      setComments((prev) => prev.map(updateComment));
      setHotComments((prev) => prev.map(updateComment));
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">评论</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Hot Comments */}
              {hotComments.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">热门评论</h4>
                  {hotComments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onLike={handleLikeComment}
                      onReply={setReplyTo}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                </div>
              )}

              {/* All Comments */}
              <div>
                {comments.length > 0 ? (
                  <>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">全部评论</h4>
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        onLike={handleLikeComment}
                        onReply={setReplyTo}
                        isAuthenticated={isAuthenticated}
                        showReplies
                      />
                    ))}
                    
                    {/* Load More */}
                    {nextCursor && (
                      <button
                        onClick={() => loadComments(nextCursor)}
                        disabled={isLoadingMore}
                        className="w-full py-3 text-sm text-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-2"
                      >
                        {isLoadingMore ? (
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            加载更多
                          </>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    暂无评论，来发表第一条评论吧
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 px-4 py-3">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">
                回复 @{replyTo.author.displayName || replyTo.author.username}
              </span>
              <button
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={isAuthenticated ? '写下你的评论...' : '登录后发表评论'}
              disabled={!isAuthenticated || isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || !isAuthenticated || isSubmitting}
              className="p-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 单个评论组件
interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: string, isLiked: boolean) => void;
  onReply: (comment: Comment) => void;
  isAuthenticated: boolean;
  showReplies?: boolean;
}

function CommentItem({ comment, onLike, onReply, isAuthenticated, showReplies }: CommentItemProps) {
  const [showAllReplies, setShowAllReplies] = useState(false);

  const formattedTime = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  const displayedReplies = showAllReplies
    ? comment.replies
    : comment.replies?.slice(0, 2);

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 overflow-hidden">
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt={comment.author.displayName || comment.author.username}
              className="w-full h-full object-cover"
            />
          ) : (
            (comment.author.displayName || comment.author.username).charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Author & Time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {comment.author.displayName || comment.author.username}
            </span>
            {comment.replyTo && (
              <>
                <span className="text-gray-400 text-xs">回复</span>
                <span className="text-indigo-500 text-sm">
                  @{comment.replyTo.displayName || comment.replyTo.username}
                </span>
              </>
            )}
            <span className="text-xs text-gray-400">{formattedTime}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(comment.id, comment.isLiked)}
              disabled={!isAuthenticated}
              className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                comment.isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500',
              )}
            >
              <Heart className={cn('w-4 h-4', comment.isLiked && 'fill-current')} />
              <span>{comment.likeCount}</span>
            </button>
            
            <button
              onClick={() => onReply(comment)}
              disabled={!isAuthenticated}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>回复</span>
            </button>
          </div>

          {/* Replies */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pl-3 border-l-2 border-gray-100">
              {displayedReplies?.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onLike={onLike}
                  onReply={onReply}
                  isAuthenticated={isAuthenticated}
                />
              ))}
              
              {comment.replyCount && comment.replyCount > 2 && !showAllReplies && (
                <button
                  onClick={() => setShowAllReplies(true)}
                  className="text-xs text-indigo-500 hover:text-indigo-600 mt-2"
                >
                  查看全部 {comment.replyCount} 条回复
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
