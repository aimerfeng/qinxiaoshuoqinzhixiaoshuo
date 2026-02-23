import { registerAs } from '@nestjs/config';

/**
 * 敏感词过滤配置
 *
 * 需求20: 私信系统
 * - 20.1.5 敏感词过滤
 *
 * 环境变量:
 * - SENSITIVE_WORD_ENABLED: 是否启用敏感词过滤 (默认: true)
 * - SENSITIVE_WORD_MODE: 过滤模式 (replace | block, 默认: replace)
 * - SENSITIVE_WORD_REPLACEMENT_CHAR: 替换字符 (默认: *)
 */
export default registerAs('sensitiveWord', () => ({
  /** 是否启用敏感词过滤 */
  enabled: process.env.SENSITIVE_WORD_ENABLED !== 'false',

  /**
   * 过滤模式
   * - replace: 将敏感词替换为星号
   * - block: 如果包含敏感词则阻止发送
   */
  mode: process.env.SENSITIVE_WORD_MODE || 'replace',

  /** 替换字符 */
  replacementChar: process.env.SENSITIVE_WORD_REPLACEMENT_CHAR || '*',
}));
