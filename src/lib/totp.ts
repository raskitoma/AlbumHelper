import crypto from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Helper to decode Base32 into Buffer
function base32Decode(base32: string): Buffer {
  const clean = base32.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_CHARS.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error("Invalid base32 character: " + clean[i]);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// Helper to encode Buffer to Base32
function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Generates a random Base32 TOTP secret key
 */
export function generateSecret(length = 16): string {
  // Generate random bytes and encode to base32
  const randomBytes = crypto.randomBytes(Math.ceil((length * 5) / 8));
  return base32Encode(randomBytes).substring(0, length);
}

/**
 * Generates a TOTP code for a secret and a specific time counter
 */
export function generateTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  
  // Write counter as 64-bit integer
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = temp & 0xff;
    temp = temp >> 8;
  }

  // HMAC-SHA1
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = code % 1_000_000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifies a TOTP token against a secret
 * Supports custom window (default 1 = checks current, previous, and next step)
 */
export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  if (!token || token.length !== 6) return false;
  
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  
  for (let i = -window; i <= window; i++) {
    const generated = generateTOTP(secret, currentStep + i);
    if (generated === token) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generates a otpauth:// URL for QR code creation
 */
export function getOTPAuthURL(email: string, secret: string, issuer = "Figuritas"): string {
  const cleanEmail = encodeURIComponent(email);
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}
