import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { sha256 } from "@noble/hashes/sha2.js";

const PASSWORD_HASH_ALGORITHM = "pbkdf2-sha256";
const DEFAULT_PASSWORD_HASH_ITERATIONS = 150_000;
const DERIVED_KEY_BYTES = 32;
const LEGACY_SCRYPT_CONFIG = {
  N: 16_384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 128 * 16_384 * 16 * 2,
} as const;

const encoder = new TextEncoder();

const normalizePassword = (password: string) => password.normalize("NFKC");

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const fromHex = (value: string) => {
  if (value.length % 2 !== 0) {
    throw new Error("Invalid hex payload.");
  }

  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < value.length; index += 2) {
    const byte = Number.parseInt(value.slice(index, index + 2), 16);

    if (Number.isNaN(byte)) {
      throw new Error("Invalid hex payload.");
    }

    bytes[index / 2] = byte;
  }

  return bytes;
};

const timingSafeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftByte = left[index];
    const rightByte = right[index];

    if (leftByte === undefined || rightByte === undefined) {
      return false;
    }

    diff |= leftByte ^ rightByte;
  }

  return diff === 0;
};

const derivePbkdf2Key = async (password: string, salt: Uint8Array, iterations: number) =>
  pbkdf2Async(sha256, encoder.encode(normalizePassword(password)), salt, {
    c: iterations,
    dkLen: DERIVED_KEY_BYTES,
  });

const verifyLegacyScryptHash = async (password: string, hash: string) => {
  const [salt, key] = hash.split(":");

  if (!salt || !key) {
    return false;
  }

  const derivedKey = await scryptAsync(normalizePassword(password), salt, LEGACY_SCRYPT_CONFIG);
  return timingSafeEqual(derivedKey, fromHex(key));
};

const parsePbkdf2Hash = (hash: string) => {
  const [algorithm, iterationValue, salt, key] = hash.split("$");

  if (algorithm !== PASSWORD_HASH_ALGORITHM || !iterationValue || !salt || !key) {
    return null;
  }

  const iterations = Number.parseInt(iterationValue, 10);

  if (!Number.isInteger(iterations) || iterations < 1) {
    return null;
  }

  return {
    iterations,
    salt: fromHex(salt),
    key: fromHex(key),
  };
};

export const isLegacyScryptHash = (hash: string) => hash.includes(":");

export const hashPassword = async (
  password: string,
  iterations = DEFAULT_PASSWORD_HASH_ITERATIONS,
) => {
  if (!Number.isInteger(iterations) || iterations < 1) {
    throw new Error("Password hash iterations must be a positive integer.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derivePbkdf2Key(password, salt, iterations);

  return `${PASSWORD_HASH_ALGORITHM}$${iterations}$${toHex(salt)}$${toHex(key)}`;
};

export const verifyPassword = async ({
  hash,
  password,
}: {
  hash: string;
  password: string;
}) => {
  try {
    if (isLegacyScryptHash(hash)) {
      return verifyLegacyScryptHash(password, hash);
    }

    const parsedHash = parsePbkdf2Hash(hash);

    if (!parsedHash) {
      return false;
    }

    const derivedKey = await derivePbkdf2Key(password, parsedHash.salt, parsedHash.iterations);
    return timingSafeEqual(derivedKey, parsedHash.key);
  } catch {
    return false;
  }
};

export const defaultPasswordHashIterations = DEFAULT_PASSWORD_HASH_ITERATIONS;
