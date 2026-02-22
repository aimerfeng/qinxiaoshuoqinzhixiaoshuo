import { PrismaClient, Gender, WorkStatus, ChapterStatus, PageMode, ContentType } from '@prisma/client';
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
        passwordHash,
        isEmailVerified: true,
        isActive: true,
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

  console.log('\n✅ 种子数据播种完成！');
  console.log('\n📋 测试账户信息：');
  console.log('  邮箱: author1@test.com / author2@test.com / reader1@test.com / reader2@test.com / admin@test.com');
  console.log('  密码: Test123456!');
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
