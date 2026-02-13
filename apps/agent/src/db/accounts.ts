import { prisma } from '@nadfun/db';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ENCRYPTION_KEY = process.env.AGENT_ENCRYPTION_KEY || 'nadfun-limit-order-default-key-32b';

// Warn at module load if using a weak/default encryption key
const WEAK_KEYS = ['nadfun-limit-order-default-key-32b', 'nadfun-limit-order-change-me-32b'];
if (WEAK_KEYS.includes(ENCRYPTION_KEY)) {
  console.warn('WARNING: Using a weak AGENT_ENCRYPTION_KEY. Set a strong random key in .env for production!');
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, 32);
}

// New format: salt(32 hex):iv(32 hex):encrypted — random salt per key
function encryptPrivateKey(privateKey: string): string {
  const salt = randomBytes(16);
  const key = deriveKey(ENCRYPTION_KEY, salt);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;
}

// Backward compatible: 2-part = legacy (static salt), 3-part = new (per-key salt)
function decryptPrivateKey(encryptedData: string): string {
  const parts = encryptedData.split(':');
  let salt: Buffer;
  let ivHex: string;
  let encrypted: string;

  if (parts.length === 3) {
    // New format: salt:iv:encrypted
    salt = Buffer.from(parts[0], 'hex');
    ivHex = parts[1];
    encrypted = parts[2];
  } else {
    // Legacy format: iv:encrypted (static salt)
    salt = Buffer.from('nadfun-salt');
    ivHex = parts[0];
    encrypted = parts[1];
  }

  const key = deriveKey(ENCRYPTION_KEY, salt);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function createAccount(walletAddress: string) {
  const existing = await prisma.userAccount.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (existing) {
    return {
      walletAddress: existing.walletAddress,
      agentAddress: existing.agentAddress,
      autoExecute: existing.autoExecute,
      createdAt: existing.createdAt,
    };
  }

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const encryptedKey = encryptPrivateKey(privateKey);

  const user = await prisma.userAccount.create({
    data: {
      walletAddress: walletAddress.toLowerCase(),
      agentAddress: account.address.toLowerCase(),
      agentKeyEnc: encryptedKey,
      autoExecute: true,
    },
  });

  return {
    walletAddress: user.walletAddress,
    agentAddress: user.agentAddress,
    autoExecute: user.autoExecute,
    createdAt: user.createdAt,
  };
}

export async function getAccount(walletAddress: string) {
  const user = await prisma.userAccount.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (!user) return null;

  return {
    walletAddress: user.walletAddress,
    agentAddress: user.agentAddress,
    autoExecute: user.autoExecute,
    createdAt: user.createdAt,
  };
}

export async function getAgentPrivateKey(walletAddress: string): Promise<string | null> {
  const user = await prisma.userAccount.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (!user) return null;
  return decryptPrivateKey(user.agentKeyEnc);
}

export async function getAgentAccount(walletAddress: string) {
  const privateKey = await getAgentPrivateKey(walletAddress);
  if (!privateKey) return null;
  return privateKeyToAccount(privateKey as `0x${string}`);
}

export async function getAllAgentAccounts() {
  const users = await prisma.userAccount.findMany({
    where: { autoExecute: true },
  });
  return users.map(u => ({
    walletAddress: u.walletAddress,
    agentAddress: u.agentAddress,
  }));
}

export async function exportPrivateKey(walletAddress: string): Promise<string | null> {
  return getAgentPrivateKey(walletAddress);
}
