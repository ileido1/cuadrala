import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './src/generated/prisma/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const owner = await prisma.user.findUnique({
    where: { email: 'owner@cuadrala.dev' },
    select: { id: true, email: true, name: true, passwordHash: true }
  });
  
  console.log('User from DB:', JSON.stringify(owner, null, 2));
  
  if (owner && owner.passwordHash) {
    console.log('Hash length:', owner.passwordHash.length);
    console.log('Hash starts with $2b:', owner.passwordHash.startsWith('$2b'));
    
    const bcrypt = await import('bcryptjs');
    const match = bcrypt.compareSync('password123', owner.passwordHash);
    console.log('bcrypt.compareSync result:', match);
  } else if (owner) {
    console.log('passwordHash is null or undefined');
  }
  
  await pool.end();
}
main().catch(console.error);
