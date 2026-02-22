'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { CardItem } from '@/types/plaza';
import { useAuthStore } from '@/store/auth';
import { plazaService } from '@/services/plaza';
import { usePlazaStore } from '@/store/plaza';
import { QuotePreview } from './QuotePreview';
import { cn } from '@/utils/cn';

interface CardProps {
  card: CardItem;
  onCommentClick?: (cardId: string) => void;
  onShareClick?: (cardId: string) => void;
  isHighlighted?: boolean;
}

export function Card({ card, onCommentClick, onShareClick, isHighlighted }: CardProps) {
  const { isAuthenticated } = useAuthStore();
  const { toggleLike } = usePlazaStore();
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHighlight, setShowHighlight] = useState(isHighlighted);
  const cardRef = useRef<HTMLElement>(null);

  // Scroll to highlighted card and animate
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Remove highlight after animation
      const timer = setTimeout(() => {
        setShowHighlight(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isHighlighted]);

  const handleLike = useCallback(async () => {
    if (!isAuthenticated || isLiking) return;

    setIsLiking(true);
    try {
      if (card.isLiked) {
        const result = await plazaService.unlikeCard(card.id);
        toggleLike(card.id, result.isLiked, result.likeCount);
      } else {
        const result = await plazaService.likeCard(card.id);
        toggleLike(card.id, result.isLiked, result.likeCount);
      }
    } catch (error) {
      console.error('点赞失败:', error);
    } finally {
      setIsLiking(false);
    }
  }, [card.id, card.isLiked, isAuthenticated, isLiking, toggleLike]);

  const handleComment = useCallback(() => {
    onCommentClick?.(card.id);
  }, [card.id, onCommentClick]);

  const handleShare = useCallback(() => {
    onShareClick?.(card.id);
  }, [card.id, onShareClick]);

  const formattedTime = formatDistanceToNow(new Date(card.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        boxShadow: showHighlight 
          ? ['0 0 0 0 rgba(99, 102, 241, 0)', '0 0 0 4px rgba(99, 102, 241, 0.3)', '0 0 0 0 rgba(99, 102, 241, 0)']
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        boxShadow: showHighlight ? { duration: 1.5, repeat: 2 } : { duration: 0.2 }
      }}
      className={cn(
        'bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border transition-shadow',
        showHighlight 
          ? 'border-indigo-300 ring-2 ring-indigo-200' 
          : 'border-gray-100/50 hover:shadow-md'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium overflow-hidden">
            {card.author.avatar ? (
              <img
                src={card.author.avatar}
                alt={card.author.displayName || card.author.username}
                className="w-full h-full object-cover"
              />
            ) : (
              (card.author.displayName || card.author.username).charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {card.author.displayName || card.author.username}
            </h3>
            <p className="text-sm text-gray-500">@{card.author.username} · {formattedTime}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
          {card.content}
        </p>
      </div>

      {/* Quote Preview */}
      {card.quote && (
        <QuotePreview quote={card.quote} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={handleLike}
          disabled={!isAuthenticated || isLiking}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all',
            card.isLiked
              ? 'text-pink-500 bg-pink-50 hover:bg-pink-100'
              : 'text-gray-500 hover:text-pink-500 hover:bg-pink-50',
            (!isAuthenticated || isLiking) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <motion.div
            animate={card.isLiked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={cn('w-5 h-5', card.isLiked && 'fill-current')}
            />
          </motion.div>
          <span className="text-sm font-medium">{card.likeCount}</span>
        </button>

        <button
          onClick={handleComment}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{card.commentCount}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-gray-500 hover:text-green-500 hover:bg-green-50 transition-all"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">{card.shareCount}</span>
        </button>
      </div>
    </motion.article>
  );
}
