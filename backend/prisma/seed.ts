import { PrismaClient, Gender, WorkStatus, ChapterStatus, PageMode, ContentType, AchievementCategory, AchievementTier, AchievementRewardType, MemberLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import 'dotenv/config';

// 初始化 Prisma Client with pg adapter
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 生成内容哈希
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// 生成锚点ID
function generateAnchorId(workId: string, chapterId: string, paragraphIndex: number): string {
  return `${workId}:${chapterId}:${paragraphIndex}`;
}

async function main() {
  console.log('🌱 开始播种数据...');

  // ==================== 创建测试用户 ====================
  console.log('👤 创建测试用户...');
  
  const passwordHash = await bcrypt.hash('Test123456!', 12);
  const superAdminPasswordHash = await bcrypt.hash('lihaoran//2002', 12);
  
  const usersData = [
    {
      email: 'author1@test.com',
      username: 'sakura_writer',
      displayName: '樱花作家',
      bio: '热爱轻小说创作，擅长校园恋爱题材',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sakura',
    },
    {
      email: 'author2@test.com',
      username: 'dragon_master',
      displayName: '龙之主宰',
      bio: '异世界冒险小说专业户，笔下角色超过100个',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dragon',
    },
    {
      email: 'reader1@test.com',
      username: 'bookworm_chan',
      displayName: '书虫酱',
      bio: '每天阅读10万字的重度读者',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bookworm',
    },
    {
      email: 'reader2@test.com',
      username: 'night_owl',
      displayName: '夜猫子',
      bio: '深夜阅读爱好者，专注追更各类轻小说',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owl',
    },
    {
      email: 'admin@test.com',
      username: 'admin_anima',
      displayName: '管理员',
      bio: 'Project Anima 平台管理员',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
    {
      email: '1070614448@qq.com',
      username: 'super_admin',
      displayName: '超级管理员',
      bio: 'Project Anima 超级管理员 - 全权限',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin',
    },
  ];

  const users: any[] = [];
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        displayName: userData.displayName,
        bio: userData.bio,
        avatar: userData.avatar,
      },
      create: {
        ...userData,
        passwordHash: userData.email === '1070614448@qq.com' ? superAdminPasswordHash : passwordHash,
        isEmailVerified: true,
        isActive: true,
        isAdmin: userData.email === '1070614448@qq.com' || userData.email === 'admin@test.com',
        memberLevel: userData.email === '1070614448@qq.com' ? MemberLevel.HONORARY : MemberLevel.REGULAR,
        contributionScore: userData.email === '1070614448@qq.com' ? 999999 : 0,
      },
    });
    users.push(user);
    console.log(`  ✓ 用户 ${user.username} 创建/更新成功`);
  }

  // ==================== 创建用户资料 ====================
  console.log('📝 创建用户资料...');
  
  const profilesData = [
    { userId: users[0].id, location: '东京', gender: Gender.FEMALE, website: 'https://sakura-writer.blog' },
    { userId: users[1].id, location: '上海', gender: Gender.MALE, website: 'https://dragon-master.com' },
    { userId: users[2].id, location: '北京', gender: Gender.FEMALE },
    { userId: users[3].id, location: '广州', gender: Gender.PREFER_NOT_TO_SAY },
    { userId: users[4].id, location: '深圳', gender: Gender.OTHER },
  ];

  for (const profileData of profilesData) {
    await prisma.userProfile.upsert({
      where: { userId: profileData.userId },
      update: profileData,
      create: profileData,
    });
  }
  console.log('  ✓ 用户资料创建完成');

  // ==================== 创建标签 ====================
  console.log('🏷️ 创建标签...');
  
  const tagsData = [
    { name: '校园', slug: 'school', description: '校园生活相关作品' },
    { name: '恋爱', slug: 'romance', description: '恋爱题材作品' },
    { name: '异世界', slug: 'isekai', description: '异世界穿越冒险' },
    { name: '奇幻', slug: 'fantasy', description: '奇幻魔法世界' },
    { name: '日常', slug: 'slice-of-life', description: '日常生活题材' },
    { name: '冒险', slug: 'adventure', description: '冒险探索故事' },
    { name: '搞笑', slug: 'comedy', description: '轻松搞笑作品' },
    { name: '治愈', slug: 'healing', description: '治愈系温馨故事' },
  ];

  const tags: any[] = [];
  for (const tagData of tagsData) {
    const tag = await prisma.tag.upsert({
      where: { slug: tagData.slug },
      update: { description: tagData.description },
      create: tagData,
    });
    tags.push(tag);
  }
  console.log(`  ✓ ${tags.length} 个标签创建完成`);


  // ==================== 创建作品 ====================
  console.log('📚 创建作品...');

  const worksData = [
    {
      authorId: users[0].id,
      title: '樱花树下的约定',
      description: '在樱花盛开的季节，两个青梅竹马重逢了。这是一个关于青春、友情与爱情的温馨故事。当年的约定，是否还能实现？',
      coverImage: 'https://picsum.photos/seed/sakura/400/600',
      status: WorkStatus.PUBLISHED,
      contentType: ContentType.NOVEL,
      tagSlugs: ['school', 'romance', 'slice-of-life'],
    },
    {
      authorId: users[1].id,
      title: '异世界勇者的日常',
      description: '被召唤到异世界的普通高中生，本以为要开始波澜壮阔的冒险，没想到却过上了种田养鸡的悠闲生活。这是一个非典型勇者的搞笑日常。',
      coverImage: 'https://picsum.photos/seed/isekai/400/600',
      status: WorkStatus.PUBLISHED,
      contentType: ContentType.NOVEL,
      tagSlugs: ['isekai', 'fantasy', 'comedy'],
    },
    {
      authorId: users[0].id,
      title: '咖啡店的魔法师',
      description: '一家隐藏在小巷深处的咖啡店，店主是一位会使用魔法的神秘少女。每一杯咖啡都蕴含着治愈人心的力量。',
      coverImage: 'https://picsum.photos/seed/coffee/400/600',
      status: WorkStatus.DRAFT,
      contentType: ContentType.NOVEL,
      tagSlugs: ['fantasy', 'healing', 'slice-of-life'],
    },
  ];

  const works: any[] = [];
  for (const workData of worksData) {
    const { tagSlugs, ...workInfo } = workData;
    
    // 查找或创建作品
    let work = await prisma.work.findFirst({
      where: {
        authorId: workInfo.authorId,
        title: workInfo.title,
      },
    });

    if (!work) {
      work = await prisma.work.create({
        data: {
          ...workInfo,
          publishedAt: workInfo.status === WorkStatus.PUBLISHED ? new Date() : null,
        },
      });
    } else {
      work = await prisma.work.update({
        where: { id: work.id },
        data: {
          description: workInfo.description,
          coverImage: workInfo.coverImage,
          status: workInfo.status,
        },
      });
    }

    // 关联标签
    for (const slug of tagSlugs) {
      const tag = tags.find(t => t.slug === slug);
      if (tag) {
        await prisma.workTag.upsert({
          where: {
            workId_tagId: { workId: work.id, tagId: tag.id },
          },
          update: {},
          create: { workId: work.id, tagId: tag.id },
        });
        
        // 更新标签使用计数
        await prisma.tag.update({
          where: { id: tag.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    works.push(work);
    console.log(`  ✓ 作品《${work.title}》创建/更新成功`);
  }

  // ==================== 创建章节和段落 ====================
  console.log('📖 创建章节和段落...');

  const chaptersData = [
    // 《樱花树下的约定》的章节
    {
      workId: works[0].id,
      authorId: users[0].id,
      title: '第一章 重逢',
      orderIndex: 1,
      status: ChapterStatus.PUBLISHED,
      paragraphs: [
        '四月的风带着樱花的香气，轻轻拂过校园的每一个角落。',
        '「好久不见了，小樱。」',
        '听到这个熟悉的声音，我的心跳漏了一拍。转过身，看到的是那张让我魂牵梦萦了三年的脸。',
        '「阿树……你回来了？」',
        '他微微一笑，那笑容和记忆中一模一样，温暖而明亮。',
        '「嗯，我回来了。这次，不会再离开了。」',
        '樱花瓣随风飘落，落在他的肩头，也落在我的心上。三年前的约定，终于要实现了吗？',
      ],
    },
    {
      workId: works[0].id,
      authorId: users[0].id,
      title: '第二章 回忆',
      orderIndex: 2,
      status: ChapterStatus.PUBLISHED,
      paragraphs: [
        '三年前的那个春天，同样是樱花盛开的季节。',
        '「小樱，我要去东京了。」',
        '阿树的话像一盆冷水，浇灭了我心中刚刚燃起的希望。',
        '「为什么……为什么要走？」',
        '「父亲的工作调动，没办法。但是……」他握住我的手，「等我，三年后我一定会回来。」',
        '「那时候，我有很重要的话要对你说。」',
        '我不知道那句话是什么，但我选择了相信。相信他会回来，相信我们的约定。',
      ],
    },
    // 《异世界勇者的日常》的章节
    {
      workId: works[1].id,
      authorId: users[1].id,
      title: '序章 被召唤了',
      orderIndex: 1,
      status: ChapterStatus.PUBLISHED,
      paragraphs: [
        '「勇者大人，请拯救我们的世界吧！」',
        '我看着眼前跪了一地的人，脑子里只有一个想法：这是什么情况？',
        '一分钟前，我还在便利店买泡面。现在，我站在一个金碧辉煌的大殿里，被一群穿着中世纪服装的人围着。',
        '「那个……我只是个普通高中生啊？」',
        '「正因为如此！」一个戴着王冠的老头激动地说，「只有来自异世界的勇者，才能打败魔王！」',
        '魔王？打败？我连打架都没打过好吗！',
        '「不好意思，我觉得你们可能找错人了……」',
      ],
    },
    {
      workId: works[1].id,
      authorId: users[1].id,
      title: '第一章 这不是我想象中的异世界',
      orderIndex: 2,
      status: ChapterStatus.PUBLISHED,
      paragraphs: [
        '经过一番折腾，我终于搞清楚了状况。',
        '简单来说：我被召唤到了异世界，要打败魔王，然后才能回家。',
        '听起来很热血对吧？但问题是——',
        '「勇者大人，这是您的领地。」',
        '我看着眼前的一片荒地，沉默了。',
        '「就……就这？」',
        '「是的！这是王国赐予勇者大人的封地！虽然有点荒凉，但只要勇者大人努力开垦……」',
        '我深吸一口气。好的，我懂了。这不是什么热血冒险故事，这是种田文。',
      ],
    },
  ];

  for (const chapterData of chaptersData) {
    const { paragraphs, ...chapterInfo } = chapterData;
    
    // 查找或创建章节
    let chapter = await prisma.chapter.findFirst({
      where: {
        workId: chapterInfo.workId,
        orderIndex: chapterInfo.orderIndex,
      },
    });

    const content = paragraphs.join('\n\n');
    const wordCount = content.replace(/\s/g, '').length;

    if (!chapter) {
      chapter = await prisma.chapter.create({
        data: {
          ...chapterInfo,
          content,
          wordCount,
          publishedAt: chapterInfo.status === ChapterStatus.PUBLISHED ? new Date() : null,
        },
      });
    } else {
      chapter = await prisma.chapter.update({
        where: { id: chapter.id },
        data: {
          title: chapterInfo.title,
          content,
          wordCount,
          status: chapterInfo.status,
        },
      });
    }

    // 创建段落
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraphContent = paragraphs[i];
      const anchorId = generateAnchorId(chapterInfo.workId, chapter.id, i);
      const contentHash = generateContentHash(paragraphContent);

      await prisma.paragraph.upsert({
        where: { anchorId },
        update: {
          content: paragraphContent,
          contentHash,
        },
        create: {
          chapterId: chapter.id,
          anchorId,
          content: paragraphContent,
          contentHash,
          orderIndex: i,
        },
      });
    }

    // 更新作品字数统计
    await prisma.work.update({
      where: { id: chapterInfo.workId },
      data: {
        wordCount: { increment: wordCount },
      },
    });

    console.log(`  ✓ 章节《${chapter.title}》及 ${paragraphs.length} 个段落创建完成`);
  }


  // ==================== 创建卡片和引用 ====================
  console.log('🃏 创建卡片和引用...');

  // 获取一些段落用于引用
  const paragraphsForQuote = await prisma.paragraph.findMany({
    take: 5,
    include: { chapter: { include: { work: true } } },
  });

  const cardsData = [
    {
      authorId: users[2].id,
      content: '刚读完《樱花树下的约定》第一章，这段描写太美了！樱花瓣落在肩头的画面感太强了，仿佛自己也置身于那个春天。',
      quoteParagraphIndex: 0,
    },
    {
      authorId: users[3].id,
      content: '哈哈哈哈《异世界勇者的日常》太搞笑了！勇者变成农民这个设定绝了，期待后续发展！',
      quoteParagraphIndex: 2,
    },
    {
      authorId: users[2].id,
      content: '今天的阅读打卡～读了三个小时，感觉整个人都被治愈了。推荐大家也来试试沉浸式阅读！',
      quoteParagraphIndex: null,
    },
    {
      authorId: users[0].id,
      content: '新章节已经在构思中了，感谢大家的支持！下周应该能更新～',
      quoteParagraphIndex: null,
    },
  ];

  for (const cardData of cardsData) {
    const { quoteParagraphIndex, ...cardInfo } = cardData;
    
    const card = await prisma.card.create({
      data: cardInfo,
    });

    // 如果有引用段落
    if (quoteParagraphIndex !== null && paragraphsForQuote[quoteParagraphIndex]) {
      const paragraph = paragraphsForQuote[quoteParagraphIndex];
      await prisma.quote.create({
        data: {
          cardId: card.id,
          paragraphId: paragraph.id,
          originalContent: paragraph.content,
        },
      });

      // 更新段落引用计数
      await prisma.paragraph.update({
        where: { id: paragraph.id },
        data: { quoteCount: { increment: 1 } },
      });

      // 更新作品引用计数
      await prisma.work.update({
        where: { id: paragraph.chapter.workId },
        data: { quoteCount: { increment: 1 } },
      });

      // 更新卡片引用计数
      await prisma.card.update({
        where: { id: card.id },
        data: { quoteCount: { increment: 1 } },
      });
    }

    console.log(`  ✓ 卡片创建成功`);
  }

  // ==================== 创建阅读进度 ====================
  console.log('📊 创建阅读进度...');

  const chapters = await prisma.chapter.findMany({
    where: { status: ChapterStatus.PUBLISHED },
    take: 4,
  });

  const readingProgressData = [
    { userId: users[2].id, chapterId: chapters[0]?.id, paragraphIndex: 5, readPercentage: 80 },
    { userId: users[2].id, chapterId: chapters[1]?.id, paragraphIndex: 3, readPercentage: 50 },
    { userId: users[3].id, chapterId: chapters[2]?.id, paragraphIndex: 6, readPercentage: 100 },
    { userId: users[3].id, chapterId: chapters[3]?.id, paragraphIndex: 4, readPercentage: 60 },
  ];

  for (const progressData of readingProgressData) {
    if (!progressData.chapterId) continue;
    
    await prisma.readingProgress.upsert({
      where: {
        userId_chapterId: {
          userId: progressData.userId,
          chapterId: progressData.chapterId,
        },
      },
      update: {
        paragraphIndex: progressData.paragraphIndex,
        readPercentage: progressData.readPercentage,
        lastReadAt: new Date(),
      },
      create: progressData,
    });
  }
  console.log('  ✓ 阅读进度创建完成');

  // ==================== 创建阅读设置 ====================
  console.log('⚙️ 创建阅读设置...');

  const readingSettingsData = [
    {
      userId: users[2].id,
      fontSize: 18,
      lineHeight: 2.0,
      fontFamily: 'serif',
      backgroundColor: '#FFFEF0',
      textColor: '#333333',
      pageMode: PageMode.SCROLL,
      nightMode: false,
    },
    {
      userId: users[3].id,
      fontSize: 16,
      lineHeight: 1.8,
      fontFamily: 'system',
      backgroundColor: '#1a1a2e',
      textColor: '#e0e0e0',
      pageMode: PageMode.PAGINATED,
      nightMode: true,
    },
  ];

  for (const settingsData of readingSettingsData) {
    await prisma.readingSettings.upsert({
      where: { userId: settingsData.userId },
      update: settingsData,
      create: settingsData,
    });
  }
  console.log('  ✓ 阅读设置创建完成');

  // ==================== 创建一些互动数据 ====================
  console.log('💬 创建互动数据...');

  // 获取所有卡片
  const cards = await prisma.card.findMany({ take: 4 });

  // 创建点赞
  for (const card of cards) {
    // 随机几个用户点赞
    const likers = users.slice(0, Math.floor(Math.random() * 3) + 1);
    for (const liker of likers) {
      if (liker.id !== card.authorId) {
        await prisma.like.upsert({
          where: {
            userId_targetType_targetId: {
              userId: liker.id,
              targetType: 'CARD',
              targetId: card.id,
            },
          },
          update: {},
          create: {
            userId: liker.id,
            cardId: card.id,
            targetType: 'CARD',
            targetId: card.id,
          },
        });
      }
    }

    // 更新点赞计数
    const likeCount = await prisma.like.count({
      where: { cardId: card.id },
    });
    await prisma.card.update({
      where: { id: card.id },
      data: { likeCount },
    });
  }
  console.log('  ✓ 点赞数据创建完成');

  // 创建评论
  const commentsData = [
    { cardId: cards[0]?.id, authorId: users[3].id, content: '同感！这段描写真的很有画面感' },
    { cardId: cards[0]?.id, authorId: users[1].id, content: '感谢支持！后续会更精彩的' },
    { cardId: cards[1]?.id, authorId: users[2].id, content: '哈哈哈我也觉得超搞笑' },
  ];

  for (const commentData of commentsData) {
    if (!commentData.cardId) continue;
    
    await prisma.comment.create({
      data: commentData,
    });

    // 更新评论计数
    await prisma.card.update({
      where: { id: commentData.cardId },
      data: { commentCount: { increment: 1 } },
    });
  }
  console.log('  ✓ 评论数据创建完成');

  // ==================== 更新作品统计 ====================
  console.log('📈 更新作品统计...');

  for (const work of works) {
    // 模拟一些阅读量
    const viewCount = Math.floor(Math.random() * 1000) + 100;
    const likeCount = Math.floor(Math.random() * 50) + 10;
    
    await prisma.work.update({
      where: { id: work.id },
      data: { viewCount, likeCount },
    });
  }
  console.log('  ✓ 作品统计更新完成');

  // ==================== 创建阅读量成就 ====================
  console.log('🏆 创建阅读量成就...');

  /**
   * 阅读量成就（初窥门径→阅尽天下）
   * 需求24.3.1: 阅读量成就实现
   * 
   * 成就等级和奖励：
   * - 初窥门径 (BRONZE): 阅读10章节 - 10零芥子
   * - 小有所成 (SILVER): 阅读50章节 - 30零芥子
   * - 渐入佳境 (GOLD): 阅读200章节 - 80零芥子
   * - 博览群书 (PLATINUM): 阅读500章节 - 200零芥子
   * - 学富五车 (DIAMOND): 阅读1000章节 - 500零芥子
   * - 阅尽天下 (LEGENDARY): 阅读5000章节 - 2000零芥子
   */
  const readingCountAchievements = [
    {
      name: 'reading_count_beginner',
      displayName: '初窥门径',
      description: '累计阅读10个章节，开启阅读之旅',
      category: AchievementCategory.READING,
      tier: AchievementTier.BRONZE,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 10 },
      sortOrder: 100,
    },
    {
      name: 'reading_count_novice',
      displayName: '小有所成',
      description: '累计阅读50个章节，阅读习惯初步养成',
      category: AchievementCategory.READING,
      tier: AchievementTier.SILVER,
      targetValue: 50,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 30 },
      sortOrder: 101,
    },
    {
      name: 'reading_count_intermediate',
      displayName: '渐入佳境',
      description: '累计阅读200个章节，阅读已成为生活的一部分',
      category: AchievementCategory.READING,
      tier: AchievementTier.GOLD,
      targetValue: 200,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 80 },
      sortOrder: 102,
    },
    {
      name: 'reading_count_advanced',
      displayName: '博览群书',
      description: '累计阅读500个章节，知识的海洋任你遨游',
      category: AchievementCategory.READING,
      tier: AchievementTier.PLATINUM,
      targetValue: 500,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 200 },
      sortOrder: 103,
    },
    {
      name: 'reading_count_expert',
      displayName: '学富五车',
      description: '累计阅读1000个章节，真正的阅读达人',
      category: AchievementCategory.READING,
      tier: AchievementTier.DIAMOND,
      targetValue: 1000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 500 },
      sortOrder: 104,
    },
    {
      name: 'reading_count_master',
      displayName: '阅尽天下',
      description: '累计阅读5000个章节，传说中的阅读大师',
      category: AchievementCategory.READING,
      tier: AchievementTier.LEGENDARY,
      targetValue: 5000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 2000 },
      sortOrder: 105,
    },
  ];

  for (const achievementData of readingCountAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 阅读量成就创建完成');

  // ==================== 创建阅读时长成就 ====================
  console.log('⏱️ 创建阅读时长成就...');

  /**
   * 阅读时长成就（小试牛刀→时光旅人）
   * 需求24.3.2: 阅读时长成就实现
   * 
   * 成就等级和奖励（以分钟为单位追踪进度）：
   * - 小试牛刀 (BRONZE): 累计阅读1小时(60分钟) - 10零芥子
   * - 初露锋芒 (SILVER): 累计阅读10小时(600分钟) - 30零芥子
   * - 渐入佳境 (GOLD): 累计阅读50小时(3000分钟) - 80零芥子
   * - 废寝忘食 (PLATINUM): 累计阅读200小时(12000分钟) - 200零芥子
   * - 书虫本虫 (DIAMOND): 累计阅读500小时(30000分钟) - 500零芥子
   * - 时光旅人 (LEGENDARY): 累计阅读1000小时(60000分钟) - 2000零芥子
   */
  const readingTimeAchievements = [
    {
      name: 'reading_time_novice',
      displayName: '小试牛刀',
      description: '累计阅读1小时，阅读之旅正式开始',
      category: AchievementCategory.READING,
      tier: AchievementTier.BRONZE,
      targetValue: 60, // 60分钟 = 1小时
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 10 },
      sortOrder: 110,
    },
    {
      name: 'reading_time_beginner',
      displayName: '初露锋芒',
      description: '累计阅读10小时，阅读习惯逐渐养成',
      category: AchievementCategory.READING,
      tier: AchievementTier.SILVER,
      targetValue: 600, // 600分钟 = 10小时
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 30 },
      sortOrder: 111,
    },
    {
      name: 'reading_time_intermediate',
      displayName: '渐入佳境',
      description: '累计阅读50小时，书籍已成为生活的一部分',
      category: AchievementCategory.READING,
      tier: AchievementTier.GOLD,
      targetValue: 3000, // 3000分钟 = 50小时
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 80 },
      sortOrder: 112,
    },
    {
      name: 'reading_time_advanced',
      displayName: '废寝忘食',
      description: '累计阅读200小时，沉浸在文字的海洋中',
      category: AchievementCategory.READING,
      tier: AchievementTier.PLATINUM,
      targetValue: 12000, // 12000分钟 = 200小时
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 200 },
      sortOrder: 113,
    },
    {
      name: 'reading_time_expert',
      displayName: '书虫本虫',
      description: '累计阅读500小时，真正的阅读狂热者',
      category: AchievementCategory.READING,
      tier: AchievementTier.DIAMOND,
      targetValue: 30000, // 30000分钟 = 500小时
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 500 },
      sortOrder: 114,
    },
    {
      name: 'reading_time_master',
      displayName: '时光旅人',
      description: '累计阅读1000小时，穿越无数故事的时光旅人',
      category: AchievementCategory.READING,
      tier: AchievementTier.LEGENDARY,
      targetValue: 60000, // 60000分钟 = 1000小时
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 2000 },
      sortOrder: 115,
    },
  ];

  for (const achievementData of readingTimeAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 阅读时长成就创建完成');

  // ==================== 创建连续阅读成就 ====================
  console.log('📅 创建连续阅读成就...');

  /**
   * 连续阅读成就（三日不辍→年度书友）
   * 需求24.3.3: 连续阅读成就实现
   * 
   * 成就等级和奖励：
   * - 三日不辍 (BRONZE): 连续阅读3天 - 15零芥子
   * - 周周有书 (SILVER): 连续阅读7天 - 40零芥子
   * - 月读达人 (GOLD): 连续阅读30天 - 100零芥子
   * - 季度书友 (PLATINUM): 连续阅读90天 - 300零芥子
   * - 半年坚持 (DIAMOND): 连续阅读180天 - 800零芥子
   * - 年度书友 (LEGENDARY): 连续阅读365天 - 3000零芥子
   */
  const readingStreakAchievements = [
    {
      name: 'streak_3days',
      displayName: '三日不辍',
      description: '连续阅读3天，坚持就是胜利的开始',
      category: AchievementCategory.READING,
      tier: AchievementTier.BRONZE,
      targetValue: 3,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 15 },
      sortOrder: 120,
    },
    {
      name: 'streak_7days',
      displayName: '周周有书',
      description: '连续阅读7天，一周的阅读习惯已养成',
      category: AchievementCategory.READING,
      tier: AchievementTier.SILVER,
      targetValue: 7,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 40 },
      sortOrder: 121,
    },
    {
      name: 'streak_30days',
      displayName: '月读达人',
      description: '连续阅读30天，阅读已成为日常习惯',
      category: AchievementCategory.READING,
      tier: AchievementTier.GOLD,
      targetValue: 30,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 100 },
      sortOrder: 122,
    },
    {
      name: 'streak_90days',
      displayName: '季度书友',
      description: '连续阅读90天，三个月的坚持令人敬佩',
      category: AchievementCategory.READING,
      tier: AchievementTier.PLATINUM,
      targetValue: 90,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 300 },
      sortOrder: 123,
    },
    {
      name: 'streak_180days',
      displayName: '半年坚持',
      description: '连续阅读180天，半年如一日的阅读者',
      category: AchievementCategory.READING,
      tier: AchievementTier.DIAMOND,
      targetValue: 180,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 800 },
      sortOrder: 124,
    },
    {
      name: 'streak_365days',
      displayName: '年度书友',
      description: '连续阅读365天，传说中的年度阅读达人',
      category: AchievementCategory.READING,
      tier: AchievementTier.LEGENDARY,
      targetValue: 365,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 3000 },
      sortOrder: 125,
    },
  ];

  for (const achievementData of readingStreakAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 连续阅读成就创建完成');

  // ==================== 创建完本成就 ====================
  console.log('📚 创建完本成就...');

  /**
   * 完本成就（初尝完结→完本狂魔）
   * 需求24.3.4: 完本成就实现
   * 
   * 成就等级和奖励（完本数量 - 完整阅读作品的数量）：
   * - 初尝完结 (BRONZE): 完成1部作品 - 20零芥子
   * - 小有成就 (SILVER): 完成5部作品 - 50零芥子
   * - 阅读达人 (GOLD): 完成20部作品 - 120零芥子
   * - 完本专家 (PLATINUM): 完成50部作品 - 300零芥子
   * - 书海遨游 (DIAMOND): 完成100部作品 - 700零芥子
   * - 完本狂魔 (LEGENDARY): 完成300部作品 - 2500零芥子
   */
  const completedWorksAchievements = [
    {
      name: 'completion_first',
      displayName: '初尝完结',
      description: '完整阅读1部作品，体验完结的满足感',
      category: AchievementCategory.READING,
      tier: AchievementTier.BRONZE,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 20 },
      sortOrder: 130,
    },
    {
      name: 'completion_novice',
      displayName: '小有成就',
      description: '完整阅读5部作品，阅读习惯逐渐养成',
      category: AchievementCategory.READING,
      tier: AchievementTier.SILVER,
      targetValue: 5,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      sortOrder: 131,
    },
    {
      name: 'completion_intermediate',
      displayName: '阅读达人',
      description: '完整阅读20部作品，真正的阅读爱好者',
      category: AchievementCategory.READING,
      tier: AchievementTier.GOLD,
      targetValue: 20,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 120 },
      sortOrder: 132,
    },
    {
      name: 'completion_expert',
      displayName: '完本专家',
      description: '完整阅读50部作品，阅读已成为生活的一部分',
      category: AchievementCategory.READING,
      tier: AchievementTier.PLATINUM,
      targetValue: 50,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 300 },
      sortOrder: 133,
    },
    {
      name: 'completion_master',
      displayName: '书海遨游',
      description: '完整阅读100部作品，在书海中自由遨游',
      category: AchievementCategory.READING,
      tier: AchievementTier.DIAMOND,
      targetValue: 100,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 700 },
      sortOrder: 134,
    },
    {
      name: 'completion_legend',
      displayName: '完本狂魔',
      description: '完整阅读300部作品，传说中的完本狂魔',
      category: AchievementCategory.READING,
      tier: AchievementTier.LEGENDARY,
      targetValue: 300,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 2500 },
      sortOrder: 135,
    },
  ];

  for (const achievementData of completedWorksAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 完本成就创建完成');

  // ==================== 创建类型探索成就 ====================
  console.log('🎭 创建类型探索成就...');

  /**
   * 类型探索成就（类型新手→全类型通）
   * 需求24.3.5: 类型探索成就实现
   * 
   * 成就等级和奖励（追踪用户阅读过的不同类型/标签数量）：
   * - 类型新手 (BRONZE): 阅读1种类型 - 10零芥子
   * - 类型探索者 (SILVER): 阅读3种类型 - 30零芥子
   * - 类型爱好者 (GOLD): 阅读5种类型 - 80零芥子
   * - 类型达人 (PLATINUM): 阅读8种类型 - 200零芥子
   * - 全类型通 (LEGENDARY): 阅读所有可用类型 - 1000零芥子
   */
  const genreExplorationAchievements = [
    {
      name: 'genre_novice',
      displayName: '类型新手',
      description: '阅读1种类型的作品，开启类型探索之旅',
      category: AchievementCategory.READING,
      tier: AchievementTier.BRONZE,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 10 },
      sortOrder: 140,
    },
    {
      name: 'genre_explorer',
      displayName: '类型探索者',
      description: '阅读3种不同类型的作品，探索更多精彩',
      category: AchievementCategory.READING,
      tier: AchievementTier.SILVER,
      targetValue: 3,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 30 },
      sortOrder: 141,
    },
    {
      name: 'genre_enthusiast',
      displayName: '类型爱好者',
      description: '阅读5种不同类型的作品，涉猎广泛',
      category: AchievementCategory.READING,
      tier: AchievementTier.GOLD,
      targetValue: 5,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 80 },
      sortOrder: 142,
    },
    {
      name: 'genre_expert',
      displayName: '类型达人',
      description: '阅读8种不同类型的作品，博览群书',
      category: AchievementCategory.READING,
      tier: AchievementTier.PLATINUM,
      targetValue: 8,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 200 },
      sortOrder: 143,
    },
    {
      name: 'genre_master',
      displayName: '全类型通',
      description: '阅读所有可用类型的作品，真正的阅读大师',
      category: AchievementCategory.READING,
      tier: AchievementTier.LEGENDARY,
      targetValue: 10, // 假设平台有10种主要类型，可根据实际情况调整
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 1000 },
      sortOrder: 144,
    },
  ];

  for (const achievementData of genreExplorationAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 类型探索成就创建完成');

  // ==================== 创建发布作品成就 ====================
  console.log('✍️ 创建发布作品成就...');

  /**
   * 发布作品成就（新人作者→高产作家）
   * 需求24.4.1: 发布作品成就实现
   * 
   * 成就等级和奖励（追踪用户发布的作品数量）：
   * - 新人作者 (BRONZE): 发布1部作品 - 20零芥子
   * - 初露锋芒 (SILVER): 发布3部作品 - 50零芥子
   * - 创作达人 (GOLD): 发布5部作品 - 100零芥子
   * - 多产作家 (PLATINUM): 发布10部作品 - 250零芥子
   * - 高产作家 (DIAMOND): 发布20部作品 - 600零芥子
   */
  const workPublishAchievements = [
    {
      name: 'work_publish_first',
      displayName: '新人作者',
      description: '发布首部作品，开启创作之旅',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.BRONZE,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 20 },
      sortOrder: 200,
    },
    {
      name: 'work_publish_rising',
      displayName: '初露锋芒',
      description: '发布3部作品，创作热情初显',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.SILVER,
      targetValue: 3,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      sortOrder: 201,
    },
    {
      name: 'work_publish_expert',
      displayName: '创作达人',
      description: '发布5部作品，创作能力得到认可',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.GOLD,
      targetValue: 5,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 100 },
      sortOrder: 202,
    },
    {
      name: 'work_publish_prolific',
      displayName: '多产作家',
      description: '发布10部作品，创作源源不断',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.PLATINUM,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 250 },
      sortOrder: 203,
    },
    {
      name: 'work_publish_master',
      displayName: '高产作家',
      description: '发布20部作品，真正的创作大师',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.DIAMOND,
      targetValue: 20,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 600 },
      sortOrder: 204,
    },
  ];

  for (const achievementData of workPublishAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 发布作品成就创建完成');

  // ==================== 创建字数成就 ====================
  console.log('📝 创建字数成就...');

  /**
   * 字数成就（万字新秀→千万传奇）
   * 需求24.4.2: 字数成就实现
   * 
   * 成就等级和奖励（追踪用户累计创作的字数）：
   * - 万字新秀 (BRONZE): 累计创作10,000字 - 30零芥子
   * - 十万字作者 (SILVER): 累计创作100,000字 - 100零芥子
   * - 百万字大神 (GOLD): 累计创作1,000,000字 - 300零芥子
   * - 五百万传说 (PLATINUM): 累计创作5,000,000字 - 800零芥子
   * - 千万传奇 (LEGENDARY): 累计创作10,000,000字 - 2000零芥子
   */
  const wordCountAchievements = [
    {
      name: 'words_10k',
      displayName: '万字新秀',
      description: '累计创作10,000字，创作之路正式开启',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.BRONZE,
      targetValue: 10000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 30 },
      sortOrder: 210,
    },
    {
      name: 'words_100k',
      displayName: '十万字作者',
      description: '累计创作100,000字，创作热情持续燃烧',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.SILVER,
      targetValue: 100000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 100 },
      sortOrder: 211,
    },
    {
      name: 'words_1m',
      displayName: '百万字大神',
      description: '累计创作1,000,000字，真正的创作大神',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.GOLD,
      targetValue: 1000000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 300 },
      sortOrder: 212,
    },
    {
      name: 'words_5m',
      displayName: '五百万传说',
      description: '累计创作5,000,000字，传说级别的创作者',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.PLATINUM,
      targetValue: 5000000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 800 },
      sortOrder: 213,
    },
    {
      name: 'words_10m',
      displayName: '千万传奇',
      description: '累计创作10,000,000字，千万字传奇作家',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.LEGENDARY,
      targetValue: 10000000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 2000 },
      sortOrder: 214,
    },
  ];

  for (const achievementData of wordCountAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 字数成就创建完成');

  // ==================== 创建被阅读成就 ====================
  console.log('👁️ 创建被阅读成就...');

  /**
   * 被阅读成就（初露锋芒→百万人气）
   * 需求24.4.3: 被阅读成就实现
   * 
   * 成就等级和奖励（追踪用户作品累计被阅读的次数）：
   * - 初露锋芒 (BRONZE): 作品累计被阅读100次 - 20零芥子
   * - 小有名气 (SILVER): 作品累计被阅读1,000次 - 50零芥子
   * - 人气作者 (GOLD): 作品累计被阅读10,000次 - 150零芥子
   * - 大神作者 (PLATINUM): 作品累计被阅读100,000次 - 500零芥子
   * - 百万人气 (LEGENDARY): 作品累计被阅读1,000,000次 - 2000零芥子
   */
  const workViewsAchievements = [
    {
      name: 'views_100',
      displayName: '初露锋芒',
      description: '作品累计被阅读100次，开始被读者发现',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.BRONZE,
      targetValue: 100,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 20 },
      sortOrder: 220,
    },
    {
      name: 'views_1k',
      displayName: '小有名气',
      description: '作品累计被阅读1,000次，人气逐渐上升',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.SILVER,
      targetValue: 1000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      sortOrder: 221,
    },
    {
      name: 'views_10k',
      displayName: '人气作者',
      description: '作品累计被阅读10,000次，成为人气作者',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.GOLD,
      targetValue: 10000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 150 },
      sortOrder: 222,
    },
    {
      name: 'views_100k',
      displayName: '大神作者',
      description: '作品累计被阅读100,000次，真正的大神作者',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.PLATINUM,
      targetValue: 100000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 500 },
      sortOrder: 223,
    },
    {
      name: 'views_1m',
      displayName: '百万人气',
      description: '作品累计被阅读1,000,000次，百万人气传奇作者',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.LEGENDARY,
      targetValue: 1000000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 2000 },
      sortOrder: 224,
    },
  ];

  for (const achievementData of workViewsAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 被阅读成就创建完成');

  // ==================== 创建被引用成就 ====================
  console.log('💬 创建被引用成就...');

  /**
   * 被引用成就（金句初现→名言制造机）
   * 需求24.4.4: 被引用成就实现
   * 
   * 成就等级和奖励（追踪用户内容被引用的次数）：
   * - 金句初现 (BRONZE): 内容被引用1次 - 15零芥子
   * - 妙语连珠 (SILVER): 内容被引用10次 - 40零芥子
   * - 引用达人 (GOLD): 内容被引用50次 - 120零芥子
   * - 金句大师 (PLATINUM): 内容被引用200次 - 350零芥子
   * - 名言制造机 (LEGENDARY): 内容被引用1000次 - 1500零芥子
   */
  const beingQuotedAchievements = [
    {
      name: 'quote_first',
      displayName: '金句初现',
      description: '内容首次被引用，你的文字开始被传播',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.BRONZE,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 15 },
      sortOrder: 230,
    },
    {
      name: 'quote_10',
      displayName: '妙语连珠',
      description: '内容被引用10次，你的金句开始流传',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.SILVER,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 40 },
      sortOrder: 231,
    },
    {
      name: 'quote_50',
      displayName: '引用达人',
      description: '内容被引用50次，你的文字深入人心',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.GOLD,
      targetValue: 50,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 120 },
      sortOrder: 232,
    },
    {
      name: 'quote_200',
      displayName: '金句大师',
      description: '内容被引用200次，你是真正的金句大师',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.PLATINUM,
      targetValue: 200,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 350 },
      sortOrder: 233,
    },
    {
      name: 'quote_1000',
      displayName: '名言制造机',
      description: '内容被引用1000次，你的名言传遍整个社区',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.LEGENDARY,
      targetValue: 1000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 1500 },
      sortOrder: 234,
    },
  ];

  for (const achievementData of beingQuotedAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 被引用成就创建完成');

  // ==================== 创建连续更新成就 ====================
  console.log('📅 创建连续更新成就...');

  /**
   * 连续更新成就（日更新手→年更传奇）
   * 需求24.4.5: 连续更新成就实现
   * 
   * 成就等级和奖励（追踪用户连续发布章节的天数）：
   * - 日更新手 (BRONZE): 连续更新3天 - 20零芥子
   * - 周更达人 (SILVER): 连续更新7天 - 50零芥子
   * - 月更大神 (GOLD): 连续更新30天 - 150零芥子
   * - 季更传说 (PLATINUM): 连续更新90天 - 500零芥子
   * - 年更传奇 (LEGENDARY): 连续更新365天 - 3000零芥子
   */
  const consecutiveUpdateAchievements = [
    {
      name: 'update_3days',
      displayName: '日更新手',
      description: '连续更新3天，坚持创作的第一步',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.BRONZE,
      targetValue: 3,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 20 },
      sortOrder: 240,
    },
    {
      name: 'update_7days',
      displayName: '周更达人',
      description: '连续更新7天，一周的坚持令人敬佩',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.SILVER,
      targetValue: 7,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      sortOrder: 241,
    },
    {
      name: 'update_30days',
      displayName: '月更大神',
      description: '连续更新30天，创作已成为日常习惯',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.GOLD,
      targetValue: 30,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 150 },
      sortOrder: 242,
    },
    {
      name: 'update_90days',
      displayName: '季更传说',
      description: '连续更新90天，三个月的坚持成就传说',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.PLATINUM,
      targetValue: 90,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 500 },
      sortOrder: 243,
    },
    {
      name: 'update_365days',
      displayName: '年更传奇',
      description: '连续更新365天，一年如一日的创作传奇',
      category: AchievementCategory.CREATION,
      tier: AchievementTier.LEGENDARY,
      targetValue: 365,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 3000 },
      sortOrder: 244,
    },
  ];

  for (const achievementData of consecutiveUpdateAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 连续更新成就创建完成');

  // ==================== 创建粉丝成就 ====================
  console.log('👥 创建粉丝成就...');

  /**
   * 粉丝成就（初有粉丝→顶流达人）
   * 需求24.5.1: 粉丝成就实现
   * 
   * 成就等级和奖励（追踪用户获得的粉丝数量）：
   * - 初有粉丝 (BRONZE): 获得1个粉丝 - 10零芥子
   * - 小有人气 (SILVER): 获得10个粉丝 - 30零芥子
   * - 人气新星 (GOLD): 获得100个粉丝 - 100零芥子
   * - 万人迷 (PLATINUM): 获得1,000个粉丝 - 300零芥子
   * - 顶流达人 (LEGENDARY): 获得10,000个粉丝 - 1500零芥子
   */
  const followerAchievements = [
    {
      name: 'follower_first',
      displayName: '初有粉丝',
      description: '获得首个粉丝，你的魅力开始被发现',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.BRONZE,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 10 },
      sortOrder: 300,
    },
    {
      name: 'follower_10',
      displayName: '小有人气',
      description: '获得10个粉丝，人气逐渐上升',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.SILVER,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 30 },
      sortOrder: 301,
    },
    {
      name: 'follower_100',
      displayName: '人气新星',
      description: '获得100个粉丝，成为社区的人气新星',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.GOLD,
      targetValue: 100,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 100 },
      sortOrder: 302,
    },
    {
      name: 'follower_1k',
      displayName: '万人迷',
      description: '获得1,000个粉丝，你已成为社区的万人迷',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.PLATINUM,
      targetValue: 1000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 300 },
      sortOrder: 303,
    },
    {
      name: 'follower_10k',
      displayName: '顶流达人',
      description: '获得10,000个粉丝，你是社区的顶流达人',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.LEGENDARY,
      targetValue: 10000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 1500 },
      sortOrder: 304,
    },
  ];

  for (const achievementData of followerAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 粉丝成就创建完成');

  // ==================== 创建互动成就 ====================
  console.log('💬 创建互动成就...');

  /**
   * 互动成就（话唠新手→互动之王）
   * 需求24.5.2: 互动成就实现
   * 
   * 成就等级和奖励（追踪用户发布的评论数量）：
   * - 话唠新手 (BRONZE): 发布10条评论 - 15零芥子
   * - 评论达人 (SILVER): 发布50条评论 - 40零芥子
   * - 互动高手 (GOLD): 发布200条评论 - 120零芥子
   * - 社区活跃者 (PLATINUM): 发布500条评论 - 350零芥子
   * - 互动之王 (LEGENDARY): 发布1,000条评论 - 1500零芥子
   */
  const interactionAchievements = [
    {
      name: 'comment_10',
      displayName: '话唠新手',
      description: '发布10条评论，开始参与社区互动',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.BRONZE,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 15 },
      sortOrder: 310,
    },
    {
      name: 'comment_50',
      displayName: '评论达人',
      description: '发布50条评论，你的声音开始被听到',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.SILVER,
      targetValue: 50,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 40 },
      sortOrder: 311,
    },
    {
      name: 'comment_200',
      displayName: '互动高手',
      description: '发布200条评论，社区互动的活跃分子',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.GOLD,
      targetValue: 200,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 120 },
      sortOrder: 312,
    },
    {
      name: 'comment_500',
      displayName: '社区活跃者',
      description: '发布500条评论，社区不可或缺的活跃者',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.PLATINUM,
      targetValue: 500,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 350 },
      sortOrder: 313,
    },
    {
      name: 'comment_1k',
      displayName: '互动之王',
      description: '发布1,000条评论，你是社区的互动之王',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.LEGENDARY,
      targetValue: 1000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 1500 },
      sortOrder: 314,
    },
  ];

  for (const achievementData of interactionAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 互动成就创建完成');

  // ==================== 创建点赞成就（给予） ====================
  console.log('👍 创建点赞成就（给予）...');

  /**
   * 点赞成就 - 给予（点赞新手→点赞大师）
   * 需求24.5.3: 点赞成就实现（给予）
   * 
   * 成就等级和奖励（追踪用户给予的点赞数量）：
   * - 点赞新手 (BRONZE): 给予10个点赞 - 10零芥子
   * - 点赞达人 (SILVER): 给予100个点赞 - 30零芥子
   * - 点赞狂魔 (GOLD): 给予500个点赞 - 80零芥子
   * - 点赞大师 (PLATINUM): 给予1,000个点赞 - 200零芥子
   */
  const likeGivenAchievements = [
    {
      name: 'like_giver_10',
      displayName: '点赞新手',
      description: '给予10个点赞，开始传递正能量',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.BRONZE,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 10 },
      sortOrder: 320,
    },
    {
      name: 'like_giver_100',
      displayName: '点赞达人',
      description: '给予100个点赞，你是社区的正能量传播者',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.SILVER,
      targetValue: 100,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 30 },
      sortOrder: 321,
    },
    {
      name: 'like_giver_500',
      displayName: '点赞狂魔',
      description: '给予500个点赞，你的鼓励温暖了无数人',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.GOLD,
      targetValue: 500,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 80 },
      sortOrder: 322,
    },
    {
      name: 'like_giver_1k',
      displayName: '点赞大师',
      description: '给予1,000个点赞，社区最慷慨的点赞大师',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.PLATINUM,
      targetValue: 1000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 200 },
      sortOrder: 323,
    },
  ];

  for (const achievementData of likeGivenAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 点赞成就（给予）创建完成');

  // ==================== 创建点赞成就（获得） ====================
  console.log('❤️ 创建点赞成就（获得）...');

  /**
   * 点赞成就 - 获得（初获好评→万赞达人）
   * 需求24.5.3: 点赞成就实现（获得）
   * 
   * 成就等级和奖励（追踪用户获得的点赞数量）：
   * - 初获好评 (BRONZE): 获得10个点赞 - 15零芥子
   * - 人气内容 (SILVER): 获得100个点赞 - 50零芥子
   * - 爆款制造者 (GOLD): 获得1,000个点赞 - 200零芥子
   * - 万赞达人 (LEGENDARY): 获得10,000个点赞 - 1000零芥子
   */
  const likeReceivedAchievements = [
    {
      name: 'like_receiver_10',
      displayName: '初获好评',
      description: '获得10个点赞，你的内容开始被认可',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.BRONZE,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 15 },
      sortOrder: 330,
    },
    {
      name: 'like_receiver_100',
      displayName: '人气内容',
      description: '获得100个点赞，你的内容深受欢迎',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.SILVER,
      targetValue: 100,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      sortOrder: 331,
    },
    {
      name: 'like_receiver_1k',
      displayName: '爆款制造者',
      description: '获得1,000个点赞，你是爆款内容的制造者',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.GOLD,
      targetValue: 1000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 200 },
      sortOrder: 332,
    },
    {
      name: 'like_receiver_10k',
      displayName: '万赞达人',
      description: '获得10,000个点赞，你是社区的万赞达人',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.LEGENDARY,
      targetValue: 10000,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 1000 },
      sortOrder: 333,
    },
  ];

  for (const achievementData of likeReceivedAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 点赞成就（获得）创建完成');

  // ==================== 创建打赏成就（给予） ====================
  console.log('💰 创建打赏成就（给予）...');

  /**
   * 打赏成就 - 给予（首次打赏→金主爸爸）
   * 需求24.5.4: 打赏成就实现（给予）
   * 
   * 成就等级和奖励（追踪用户给予的打赏次数）：
   * - 首次打赏 (BRONZE): 给予1次打赏 - 15零芥子
   * - 打赏达人 (SILVER): 给予10次打赏 - 50零芥子
   * - 慷慨金主 (GOLD): 给予50次打赏 - 150零芥子
   * - 金主爸爸 (PLATINUM): 给予100次打赏 - 400零芥子
   */
  const tipGivenAchievements = [
    {
      name: 'tip_giver_first',
      displayName: '首次打赏',
      description: '首次打赏他人，开始传递你的支持',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.BRONZE,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 15 },
      sortOrder: 340,
    },
    {
      name: 'tip_giver_10',
      displayName: '打赏达人',
      description: '给予10次打赏，你是社区的热心支持者',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.SILVER,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      sortOrder: 341,
    },
    {
      name: 'tip_giver_50',
      displayName: '慷慨金主',
      description: '给予50次打赏，你的慷慨温暖了无数创作者',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.GOLD,
      targetValue: 50,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 150 },
      sortOrder: 342,
    },
    {
      name: 'tip_giver_100',
      displayName: '金主爸爸',
      description: '给予100次打赏，社区最慷慨的金主爸爸',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.PLATINUM,
      targetValue: 100,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 400 },
      sortOrder: 343,
    },
  ];

  for (const achievementData of tipGivenAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 打赏成就（给予）创建完成');

  // ==================== 创建打赏成就（获得） ====================
  console.log('🎁 创建打赏成就（获得）...');

  /**
   * 打赏成就 - 获得（首次收益→收益达人）
   * 需求24.5.4: 打赏成就实现（获得）
   * 
   * 成就等级和奖励（追踪用户获得的打赏次数）：
   * - 首次收益 (BRONZE): 获得1次打赏 - 20零芥子
   * - 小有收益 (SILVER): 获得10次打赏 - 60零芥子
   * - 人气创作者 (GOLD): 获得50次打赏 - 180零芥子
   * - 收益达人 (PLATINUM): 获得100次打赏 - 500零芥子
   */
  const tipReceivedAchievements = [
    {
      name: 'tip_receiver_first',
      displayName: '首次收益',
      description: '首次收到打赏，你的创作开始被认可',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.BRONZE,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 20 },
      sortOrder: 350,
    },
    {
      name: 'tip_receiver_10',
      displayName: '小有收益',
      description: '收到10次打赏，你的内容深受读者喜爱',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.SILVER,
      targetValue: 10,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 60 },
      sortOrder: 351,
    },
    {
      name: 'tip_receiver_50',
      displayName: '人气创作者',
      description: '收到50次打赏，你是社区的人气创作者',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.GOLD,
      targetValue: 50,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 180 },
      sortOrder: 352,
    },
    {
      name: 'tip_receiver_100',
      displayName: '收益达人',
      description: '收到100次打赏，你是社区的收益达人',
      category: AchievementCategory.SOCIAL,
      tier: AchievementTier.PLATINUM,
      targetValue: 100,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 500 },
      sortOrder: 353,
    },
  ];

  for (const achievementData of tipReceivedAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 打赏成就（获得）创建完成');

  // ==================== 创建时间相关特殊成就 ====================
  console.log('⏰ 创建时间相关特殊成就...');

  /**
   * 时间相关特殊成就
   * 需求24.6.1: 时间相关成就实现
   * 
   * 包含三类成就：
   * 1. 元老用户成就 - 基于账户年龄
   * 2. 深夜书虫成就 - 在深夜时段（00:00-05:00）阅读
   * 3. 早起鸟儿成就 - 在早晨时段（05:00-07:00）阅读
   */

  // 元老用户成就（基于账户年龄）
  const veteranUserAchievements = [
    {
      name: 'veteran_1day',
      displayName: '新人报到',
      description: '注册账户满1天，欢迎加入Project Anima大家庭',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.BRONZE,
      targetValue: 1, // 1天
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 10 },
      sortOrder: 500,
    },
    {
      name: 'veteran_30days',
      displayName: '月度会员',
      description: '注册账户满30天，你已是社区的老朋友了',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.SILVER,
      targetValue: 30, // 30天
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      sortOrder: 501,
    },
    {
      name: 'veteran_90days',
      displayName: '季度元老',
      description: '注册账户满90天，三个月的陪伴令人感动',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.GOLD,
      targetValue: 90, // 90天
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 150 },
      sortOrder: 502,
    },
    {
      name: 'veteran_365days',
      displayName: '年度元老',
      description: '注册账户满365天，你是社区的元老级用户',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.LEGENDARY,
      targetValue: 365, // 365天
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 500 },
      sortOrder: 503,
    },
  ];

  for (const achievementData of veteranUserAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 元老用户成就创建完成');

  // 深夜书虫成就（在深夜时段00:00-05:00阅读）
  const nightOwlAchievements = [
    {
      name: 'night_owl',
      displayName: '深夜书虫',
      description: '在深夜时段（00:00-05:00）阅读10个章节，夜深人静正是读书时',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.GOLD,
      targetValue: 10, // 深夜阅读10个章节
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 100 },
      sortOrder: 510,
    },
  ];

  for (const achievementData of nightOwlAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 深夜书虫成就创建完成');

  // 早起鸟儿成就（在早晨时段05:00-07:00阅读）
  const earlyBirdAchievements = [
    {
      name: 'early_bird',
      displayName: '早起鸟儿',
      description: '在早晨时段（05:00-07:00）阅读10个章节，一日之计在于晨',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.GOLD,
      targetValue: 10, // 早晨阅读10个章节
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 100 },
      sortOrder: 520,
    },
  ];

  for (const achievementData of earlyBirdAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 早起鸟儿成就创建完成');

  // ==================== 创建隐藏成就 ====================
  console.log('🔒 创建隐藏成就...');

  /**
   * 隐藏成就（彩蛋猎人/全勤王/第一批用户）
   * 需求24.6.2: 隐藏成就实现
   * 
   * 隐藏成就特点：
   * - isHidden: true - 未解锁时显示为 "???" 占位符
   * - 只有解锁后才能看到成就名称和描述
   * - 属于 SPECIAL 类别
   * 
   * 成就类型：
   * 1. 彩蛋猎人系列 - 发现隐藏彩蛋
   * 2. 全勤王系列 - 连续登录打卡
   * 3. 第一批用户系列 - 早期用户特权
   */

  // 彩蛋猎人成就（发现隐藏彩蛋）
  const easterEggAchievements = [
    {
      name: 'easter_egg_hunter',
      displayName: '彩蛋猎人',
      description: '发现1个隐藏彩蛋，你有一双发现秘密的眼睛',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.GOLD,
      targetValue: 1,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 50 },
      isHidden: true,
      sortOrder: 600,
    },
    {
      name: 'easter_egg_collector',
      displayName: '彩蛋收藏家',
      description: '发现5个隐藏彩蛋，你是真正的彩蛋收藏家',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.LEGENDARY,
      targetValue: 5,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 200 },
      isHidden: true,
      sortOrder: 601,
    },
  ];

  for (const achievementData of easterEggAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        isHidden: achievementData.isHidden,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 隐藏成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 彩蛋猎人成就创建完成');

  // 全勤王成就（连续登录打卡）
  const perfectAttendanceAchievements = [
    {
      name: 'weekly_perfect_attendance',
      displayName: '周全勤',
      description: '连续登录7天，一周不落的坚持令人敬佩',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.SILVER,
      targetValue: 7,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 30 },
      isHidden: true,
      sortOrder: 610,
    },
    {
      name: 'monthly_perfect_attendance',
      displayName: '月全勤',
      description: '连续登录30天，一个月的坚持成就全勤王',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.LEGENDARY,
      targetValue: 30,
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 150 },
      isHidden: true,
      sortOrder: 611,
    },
  ];

  for (const achievementData of perfectAttendanceAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        isHidden: achievementData.isHidden,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 隐藏成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 全勤王成就创建完成');

  // 第一批用户成就（早期用户特权）
  const earlyAdopterAchievements = [
    {
      name: 'genesis_user',
      displayName: '创世用户',
      description: '成为平台前100名注册用户，你是Project Anima的创世见证者',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.LEGENDARY,
      targetValue: 1, // 只需满足条件即可，进度为1表示已达成
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 500 },
      isHidden: true,
      sortOrder: 620,
    },
    {
      name: 'pioneer_user',
      displayName: '先驱者',
      description: '成为平台前1000名注册用户，你是Project Anima的先驱者',
      category: AchievementCategory.SPECIAL,
      tier: AchievementTier.DIAMOND,
      targetValue: 1, // 只需满足条件即可，进度为1表示已达成
      rewardType: AchievementRewardType.TOKENS,
      rewardValue: { amount: 200 },
      isHidden: true,
      sortOrder: 621,
    },
  ];

  for (const achievementData of earlyAdopterAchievements) {
    await prisma.achievement.upsert({
      where: { name: achievementData.name },
      update: {
        displayName: achievementData.displayName,
        description: achievementData.description,
        targetValue: achievementData.targetValue,
        rewardValue: achievementData.rewardValue,
        isHidden: achievementData.isHidden,
        sortOrder: achievementData.sortOrder,
      },
      create: achievementData,
    });
    console.log(`  ✓ 隐藏成就「${achievementData.displayName}」创建/更新成功`);
  }
  console.log('  ✓ 第一批用户成就创建完成');

  console.log('\n✅ 种子数据播种完成！');
  console.log('\n📋 测试账户信息：');
  console.log('  邮箱: author1@test.com / author2@test.com / reader1@test.com / reader2@test.com / admin@test.com');
  console.log('  密码: Test123456!');

  console.log('\n👑 超级管理员账户：');
  console.log('  邮箱: 1070614448@qq.com');
  console.log('  密码: lihaoran//2002');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
