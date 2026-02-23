// Mock data for homepage display

export interface MockBook {
  id: string;
  title: string;
  description: string;
  coverEmoji: string;
  coverGradient: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  category: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  chapterCount: number;
  wordCount: number;
  status: 'published' | 'completed' | 'hiatus';
  contentType: '轻小说' | '漫画';
}

export interface MockCreator {
  id: string;
  name: string;
  avatar?: string;
  worksCount: number;
  followersCount: number;
}

export interface MockRankingItem {
  id: string;
  title: string;
  author: string;
  heat: number;
}

export const mockBooks: MockBook[] = [
  {
    id: '1',
    title: '星辰之海的旅人',
    description: '在星际航行的时代，一位失忆的少女在废弃空间站醒来，手中握着一把能打开任意维度之门的钥匙。',
    coverEmoji: '🌌',
    coverGradient: 'from-indigo-500 to-purple-600',
    author: { id: 'a1', name: '星河漫步' },
    category: 'scifi',
    tags: ['星际', '冒险', '少女'],
    viewCount: 284300,
    likeCount: 18200,
    chapterCount: 156,
    wordCount: 520000,
    status: 'published',
    contentType: '轻小说',
  },
  {
    id: '2',
    title: '转生成为魔王的我却想当咸鱼',
    description: '穿越到异世界成为了魔王，但我只想躺平摸鱼。勇者别来烦我，我真的只想安静地看书。',
    coverEmoji: '😈',
    coverGradient: 'from-red-500 to-orange-500',
    author: { id: 'a2', name: '咸鱼翻身' },
    category: 'isekai',
    tags: ['异世界', '搞笑', '日常'],
    viewCount: 456700,
    likeCount: 32100,
    chapterCount: 203,
    wordCount: 680000,
    status: 'published',
    contentType: '轻小说',
  },
  {
    id: '3',
    title: '末日后的图书馆',
    description: '文明崩塌后，最后一座图书馆成为了人类知识的方舟。馆长少女守护着这里，直到一位旅人推开了门。',
    coverEmoji: '📚',
    coverGradient: 'from-emerald-500 to-teal-600',
    author: { id: 'a3', name: '废墟诗人' },
    category: 'scifi',
    tags: ['末日', '治愈', '文学'],
    viewCount: 198500,
    likeCount: 15600,
    chapterCount: 89,
    wordCount: 310000,
    status: 'published',
    contentType: '轻小说',
  },
  {
    id: '4',
    title: '少女与机械之心',
    description: '在蒸汽朋克的世界里，天才少女机械师与一台拥有感情的自动人偶，踏上了寻找"心"的旅途。',
    coverEmoji: '⚙️',
    coverGradient: 'from-amber-500 to-yellow-500',
    author: { id: 'a4', name: '�的轮转手' },
    category: 'fantasy',
    tags: ['蒸汽朋克', '冒险', '机械'],
    viewCount: 167800,
    likeCount: 12400,
    chapterCount: 67,
    wordCount: 230000,
    status: 'published',
    contentType: '漫画',
  },
  {
    id: '5',
    title: '我在学园都市当最强',
    description: '超能力学园都市的Level 0少年，意外觉醒了能够「否定一切异能」的右手。从此，他的日常不再平凡。',
    coverEmoji: '⚡',
    coverGradient: 'from-blue-500 to-cyan-500',
    author: { id: 'a5', name: '电磁炮爱好者' },
    category: 'action',
    tags: ['超能力', '学园', '热血'],
    viewCount: 523100,
    likeCount: 41200,
    chapterCount: 312,
    wordCount: 1050000,
    status: 'published',
    contentType: '轻小说',
  },
  {
    id: '6',
    title: '京都妖怪茶话会',
    description: '大学生偶然闯入京都深巷的妖怪茶馆，成为了唯一的人类常客。每晚，妖怪们都会讲述自己的故事。',
    coverEmoji: '🍵',
    coverGradient: 'from-pink-500 to-rose-500',
    author: { id: 'a6', name: '百鬼夜行' },
    category: 'slice-of-life',
    tags: ['妖怪', '日常', '治愈'],
    viewCount: 145200,
    likeCount: 11800,
    chapterCount: 48,
    wordCount: 160000,
    status: 'published',
    contentType: '轻小说',
  },
  {
    id: '7',
    title: '虚拟偶像的恋爱攻略',
    description: '当AI虚拟偶像突然有了自我意识，她决定从屏幕里走出来，体验真正的恋爱。',
    coverEmoji: '🎤',
    coverGradient: 'from-violet-500 to-fuchsia-500',
    author: { id: 'a7', name: '数字梦境' },
    category: 'romance',
    tags: ['AI', '恋爱', '偶像'],
    viewCount: 312400,
    likeCount: 25600,
    chapterCount: 95,
    wordCount: 320000,
    status: 'published',
    contentType: '漫画',
  },
  {
    id: '8',
    title: '深渊料理人',
    description: '在地下城最深层开了一家餐厅的厨师，用魔物素材做出令冒险者们流泪的美食。',
    coverEmoji: '🍳',
    coverGradient: 'from-orange-500 to-red-500',
    author: { id: 'a8', name: '美食猎人' },
    category: 'fantasy',
    tags: ['美食', '地下城', '治愈'],
    viewCount: 234500,
    likeCount: 19800,
    chapterCount: 128,
    wordCount: 420000,
    status: 'completed',
    contentType: '轻小说',
  },
  {
    id: '9',
    title: '时间回溯的侦探少女',
    description: '拥有回溯时间能力的少女侦探，在每一次循环中逐渐接近真相，却也越来越接近危险。',
    coverEmoji: '🔍',
    coverGradient: 'from-slate-600 to-gray-800',
    author: { id: 'a9', name: '推理之匙' },
    category: 'mystery',
    tags: ['推理', '时间', '悬疑'],
    viewCount: 189700,
    likeCount: 14300,
    chapterCount: 72,
    wordCount: 250000,
    status: 'published',
    contentType: '轻小说',
  },
  {
    id: '10',
    title: '龙与勇者的退休生活',
    description: '打败魔王后，勇者和曾经的宿敌——龙族公主，在乡下开了一家温泉旅馆。',
    coverEmoji: '🐉',
    coverGradient: 'from-green-500 to-emerald-600',
    author: { id: 'a10', name: '田园物语' },
    category: 'comedy',
    tags: ['搞笑', '日常', '奇幻'],
    viewCount: 278900,
    likeCount: 22100,
    chapterCount: 145,
    wordCount: 480000,
    status: 'published',
    contentType: '轻小说',
  },
  {
    id: '11',
    title: '赛博花嫁',
    description: '2099年的新东京，一位义体改造师爱上了自己最完美的作品——一位拥有人类灵魂的机械少女。',
    coverEmoji: '🌸',
    coverGradient: 'from-cyan-500 to-blue-600',
    author: { id: 'a11', name: '霓虹灯下' },
    category: 'scifi',
    tags: ['赛博朋克', '恋爱', 'SF'],
    viewCount: 201300,
    likeCount: 16700,
    chapterCount: 83,
    wordCount: 290000,
    status: 'published',
    contentType: '漫画',
  },
  {
    id: '12',
    title: '异世界游戏设计师',
    description: '游戏策划穿越到了自己设计的游戏世界，发现NPC们正在密谋推翻"创世神"的暴政。',
    coverEmoji: '🎮',
    coverGradient: 'from-purple-500 to-indigo-600',
    author: { id: 'a12', name: '代码诗人' },
    category: 'game',
    tags: ['游戏', '异世界', '策略'],
    viewCount: 345600,
    likeCount: 28900,
    chapterCount: 178,
    wordCount: 590000,
    status: 'published',
    contentType: '轻小说',
  },
];

export const mockHotTags = [
  { name: '异世界', count: 12453 },
  { name: '恋爱', count: 9876 },
  { name: '热血', count: 8234 },
  { name: '治愈', count: 7651 },
  { name: '搞笑', count: 6543 },
  { name: '悬疑', count: 5432 },
  { name: '赛博朋克', count: 4321 },
  { name: '日常', count: 3987 },
  { name: '超能力', count: 3654 },
  { name: '美食', count: 3210 },
];

export const mockCreators: MockCreator[] = [
  { id: 'a5', name: '电磁炮爱好者', worksCount: 8, followersCount: 45200 },
  { id: 'a2', name: '咸鱼翻身', worksCount: 5, followersCount: 38700 },
  { id: 'a12', name: '代码诗人', worksCount: 12, followersCount: 32100 },
  { id: 'a1', name: '星河漫步', worksCount: 3, followersCount: 28400 },
  { id: 'a7', name: '数字梦境', worksCount: 6, followersCount: 25600 },
];

export const mockRankings: MockRankingItem[] = [
  { id: '5', title: '我在学园都市当最强', author: '电磁炮爱好者', heat: 98 },
  { id: '2', title: '转生成为魔王的我却想当咸鱼', author: '咸鱼翻身', heat: 95 },
  { id: '12', title: '异世界游戏设计师', author: '代码诗人', heat: 89 },
  { id: '7', title: '虚拟偶像的恋爱攻略', author: '数字梦境', heat: 85 },
  { id: '1', title: '星辰之海的旅人', author: '星河漫步', heat: 82 },
  { id: '10', title: '龙与勇者的退休生活', author: '田园物语', heat: 78 },
  { id: '8', title: '深渊料理人', author: '美食猎人', heat: 75 },
];
