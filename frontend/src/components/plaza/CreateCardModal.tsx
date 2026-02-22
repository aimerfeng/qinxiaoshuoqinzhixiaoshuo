'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Hash, Smile } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { usePlazaStore } from '@/store/plaza';
import { plazaService } from '@/services/plaza';
import { toast } from '@/components/ui';
import { cn } from '@/utils/cn';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteAnchorId?: string;
  quoteContent?: string;
}

const MAX_CONTENT_LENGTH = 2000;

export function CreateCardModal({
  isOpen,
  onClose,
  quoteAnchorId,
  quoteContent,
}: CreateCardModalProps) {
  const { user } = useAuthStore();
  const { addCard } = usePlazaStore();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const card = await plazaService.createCard({
        content: content.trim(),
        quoteAnchorId,
      });
      
      addCard(card);
      setContent('');
      toast.success('发布成功！');
      onClose();
    } catch (err: any) {
      setError(err.message || '发布失败，请稍后重试');
      toast.error(err.message || '发布失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, quoteAnchorId, isSubmitting, addCard, onClose]);

  const handleClose = useCallback(() => {
    if (content.trim() && !window.confirm('确定要放弃编辑吗？')) {
      return;
    }
    setContent('');
    setError(null);
    onClose();
  }, [content, onClose]);

  const remainingChars = MAX_CONTENT_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isOverLimit || isSubmitting}
                className={cn(
                  'px-4 py-1.5 rounded-full font-medium text-sm transition-all',
                  content.trim() && !isOverLimit && !isSubmitting
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                )}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '发布'
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.displayName || user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user?.displayName || user?.username || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user?.displayName || user?.username}
                  </p>
                  <p className="text-sm text-gray-500">@{user?.username}</p>
                </div>
              </div>

              {/* Quote Preview */}
              {quoteContent && (
                <div className="mb-4 p-3 bg-indigo-50 rounded-xl border-l-4 border-indigo-400">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    "{quoteContent}"
                  </p>
                </div>
              )}

              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="分享你的想法..."
                className="w-full h-40 resize-none text-gray-800 placeholder-gray-400 focus:outline-none text-lg leading-relaxed"
                autoFocus
              />

              {/* Error Message */}
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-indigo-500">
                  <Image className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-indigo-500">
                  <Hash className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-indigo-500">
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              <div
                className={cn(
                  'text-sm font-medium',
                  isOverLimit ? 'text-red-500' : remainingChars < 100 ? 'text-amber-500' : 'text-gray-400',
                )}
              >
                {remainingChars}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
