import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "figuritas_session";
const SESSION_EXPIRY = "7d"; // 7 days
const HASH_ITERATIONS = 10000;
const HASH_KEYLEN = 64;
const HASH_DIGEST = "sha512";

// 1. Password Hashing utilizing native Node.js crypto (PBKDF2)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST)
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST)
    .toString("hex");
  return hash === originalHash;
}

// 2. Dynamic JWT Secret Key stored in SQLite SystemConfig
export async function getJwtSecret(): Promise<Uint8Array> {
  let config = await prisma.systemConfig.findUnique({
    where: { key: "JWT_SECRET" }
  });

  if (!config) {
    // Generate a secure random 32-byte key
    const secret = crypto.randomBytes(32).toString("hex");
    config = await prisma.systemConfig.create({
      data: {
        key: "JWT_SECRET",
        value: secret,
        isEncrypted: false
      }
    });
  }

  return new TextEncoder().encode(config.value);
}

// 3. Session signing & verification helpers
export async function createSessionToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  const secret = await getJwtSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"]
    });
    return payload as { userId: string; email: string; role: string };
  } catch (error) {
    return null;
  }
}

// 4. Session management in Server side cookies (supports Next.js Async Headers)
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// 5. Get current authenticated user details + active family group ID
export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        memberships: {
          take: 1, // Get first group membership
          include: {
            familyGroup: true
          }
        }
      }
    });

    if (!user) return null;

    const groupMembership = user.memberships[0] || null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarType: user.avatarType,
      avatarUrl: user.avatarUrl,
      familyGroupId: groupMembership ? groupMembership.familyGroupId : null,
      familyGroupName: groupMembership ? groupMembership.familyGroup.name : null,
      familyGroupRole: groupMembership ? groupMembership.role : null
    };
  } catch (error) {
    return null;
  }
}

// 6. Trusted Device management for bypassing 2FA (valid for 30 days)
export async function createTrustedDeviceCookie(userId: string) {
  const secret = await getJwtSecret();
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(`figuritas_trusted_device_${userId}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
}

export async function hasValidTrustedDeviceCookie(userId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(`figuritas_trusted_device_${userId}`)?.value;
    if (!token) return false;

    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"]
    });
    return payload.userId === userId;
  } catch (error) {
    return false;
  }
}
