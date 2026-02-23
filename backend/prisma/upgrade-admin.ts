import { PrismaClient, MemberLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = '1070614448@qq.com';
  const newPassword = 'LiHaoRan//2002';
  
  console.log(`🔧 正在升级用户 ${email} 为超级管理员...`);
  
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    console.log(`❌ 未找到邮箱为 ${email} 的用户`);
    return;
  }
  
  // 重置密码
  const passwordHash = await bcrypt.hash(newPassword, 12);
  
  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      isAdmin: true,
      memberLevel: MemberLevel.HONORARY,
      contributionScore: 999999,
      isEmailVerified: true,
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
      displayName: user.displayName || '超级管理员',
    },
  });
  
  // 确保用户有钱包
  await prisma.wallet.upsert({
    where: { userId: updatedUser.id },
    update: { balance: 99999 },
    create: {
      userId: updatedUser.id,
      balance: 99999,
      totalReceived: 99999,
    },
  });
  
  console.log(`✅ 用户升级成功！`);
  console.log(`   用户名: ${updatedUser.username}`);
  console.log(`   邮箱: ${updatedUser.email}`);
  console.log(`   密码已重置为: ${newPassword}`);
  console.log(`   管理员: ${updatedUser.isAdmin}`);
  console.log(`   会员等级: ${updatedUser.memberLevel}`);
  console.log(`   贡献分: ${updatedUser.contributionScore}`);
  console.log(`   账户已解锁`);
}

main()
  .catch((e) => {
    console.error('❌ 升级失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
