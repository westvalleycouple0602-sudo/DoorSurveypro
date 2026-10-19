import crypto from "crypto";

/**
 * Generate a cryptographically secure API key
 * Format: sk_live_[random 32-char base58 string]
 * 
 * @returns Object containing the plain API key and its hash
 */
export function generateApiKey(): { apiKey: string; keyHash: string; keyPrefix: string } {
  // Generate 32 bytes of random data
  const randomBytes = crypto.randomBytes(32);
  
  // Convert to base58 (no confusing characters like 0, O, I, l)
  const base58 = randomBytes.toString("base64")
    .replace(/\+/g, "")
    .replace(/\//g, "")
    .replace(/=/g, "")
    .substring(0, 32);
  
  // Format: sk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
  const apiKey = `sk_live_${base58}`;
  
  // Create SHA-256 hash for storage
  const keyHash = hashApiKey(apiKey);
  
  // Extract prefix for identification (first 8 chars)
  const keyPrefix = apiKey.substring(0, 8);
  
  return { apiKey, keyHash, keyPrefix };
}

/**
 * Hash an API key using SHA-256
 * 
 * @param apiKey - The plain text API key
 * @returns SHA-256 hash of the API key
 */
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");
}

/**
 * Verify an API key against its hash
 * 
 * @param apiKey - The plain text API key to verify
 * @param keyHash - The stored hash to verify against
 * @returns true if the key is valid
 */
export function verifyApiKey(apiKey: string, keyHash: string): boolean {
  const computedHash = hashApiKey(apiKey);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(keyHash)
  );
}

/**
 * Generate a webhook secret for HMAC signature verification
 * 
 * @returns Webhook secret string
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * Generate HMAC signature for webhook payload
 * 
 * @param payload - The webhook payload to sign
 * @param secret - The webhook secret
 * @returns HMAC signature
 */
export function generateWebhookSignature(payload: string | object, secret: string): string {
  const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
  
  return crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");
}

/**
 * Verify webhook signature
 * 
 * @param payload - The webhook payload
 * @param signature - The signature to verify
 * @param secret - The webhook secret
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string | object,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Normalize IP address to IPv4 format
 * Handles IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
 * 
 * @param ip - IP address to normalize
 * @returns Normalized IPv4 address or original if already IPv4/IPv6
 */
export function normalizeIp(ip: string): string {
  // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  
  // Handle compressed IPv6 localhost (::1)
  if (ip === "::1") {
    return "127.0.0.1";
  }
  
  return ip;
}

/**
 * Check if an IP address is in a CIDR range
 * 
 * @param ip - IPv4 address to check
 * @param cidr - CIDR notation (e.g., "192.168.1.0/24")
 * @returns true if IP is in range
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split("/");
  
  // Skip if not valid IPv4 CIDR
  if (!bits || !range.includes(".")) {
    return false;
  }
  
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  
  try {
    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(range);
    
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

function ipToNumber(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    throw new Error("Invalid IPv4 address");
  }
  
  return parts
    .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * Check if an IP address is allowed based on IP restrictions
 * 
 * @param ip - IP address to check (will be normalized)
 * @param allowedIps - Array of allowed IPs/CIDR ranges
 * @returns true if IP is allowed (or if no restrictions)
 */
export function isIpAllowed(ip: string, allowedIps: string[]): boolean {
  // If no restrictions, allow all
  if (!allowedIps || allowedIps.length === 0) {
    return true;
  }
  
  // Normalize IP (handle IPv6-mapped IPv4)
  const normalizedIp = normalizeIp(ip);
  
  // Check if IP matches any allowed IP or CIDR range
  return allowedIps.some(allowed => {
    if (allowed.includes("/")) {
      // CIDR range - normalize the IP for comparison
      return isIpInCidr(normalizedIp, allowed);
    } else {
      // Exact IP match - normalize both for comparison
      return normalizedIp === normalizeIp(allowed);
    }
  });
}


/**
 * Decrypt webhook secret for dispatch
 * @param encryptedSecret - Encrypted webhook secret from database
 * @returns Plain text secret for signing webhook payloads
 */
export async function decryptWebhookSecret(encryptedSecret: string): Promise<string> {
  const { decryptSecret } = await import("./encryption");
  return decryptSecret(encryptedSecret);
}
