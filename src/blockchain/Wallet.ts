// Helper utilities for Hex translation
export function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    result[key] = sortKeys(obj[key]);
  }
  return result;
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i].toString(16);
    hex += code.length === 1 ? '0' + code : code;
  }
  return hex;
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

// Simple SHA-256 helper using Web Crypto API
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return arrayBufferToHex(hashBuffer);
}

export class Wallet {
  public address: string = '';
  public publicKeyHex: string = '';
  public privateKeyHex: string = '';
  
  private publicKey: CryptoKey | null = null;
  private privateKey: CryptoKey | null = null;

  constructor() {}

  /**
   * Generates a new ECDSA P-256 keypair and derives the address
   */
  async generate(): Promise<void> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true, // extractable keys
      ['sign', 'verify']
    );

    this.publicKey = keyPair.publicKey;
    this.privateKey = keyPair.privateKey;

    const spkiBuffer = await crypto.subtle.exportKey('spki', this.publicKey);
    this.publicKeyHex = arrayBufferToHex(spkiBuffer);

    const pkcs8Buffer = await crypto.subtle.exportKey('pkcs8', this.privateKey);
    this.privateKeyHex = arrayBufferToHex(pkcs8Buffer);

    this.address = await Wallet.deriveAddress(this.publicKeyHex);
  }

  /**
   * Imports an existing keypair from hexadecimal strings
   */
  async importFromHex(privateKeyHex: string, publicKeyHex: string): Promise<void> {
    this.privateKeyHex = privateKeyHex;
    this.publicKeyHex = publicKeyHex;

    const pkcs8Buffer = hexToArrayBuffer(privateKeyHex);
    const spkiBuffer = hexToArrayBuffer(publicKeyHex);

    this.privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Buffer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign']
    );

    this.publicKey = await crypto.subtle.importKey(
      'spki',
      spkiBuffer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['verify']
    );

    this.address = await Wallet.deriveAddress(this.publicKeyHex);
  }

  /**
   * Derive a standard-looking blockchain address (0x...) from public key hex
   */
  static async deriveAddress(publicKeyHex: string): Promise<string> {
    const hash = await sha256(publicKeyHex);
    // Grab the last 40 characters and prefix with 0x (similar to Ethereum format)
    return '0x' + hash.slice(-40);
  }

  /**
   * Signs a data string with the private key
   * Returns signature as a Hex string
   */
  async sign(data: string): Promise<string> {
    if (!this.privateKey) {
      throw new Error('Wallet private key is not loaded.');
    }
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signatureBuffer = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      this.privateKey,
      dataBuffer
    );

    return arrayBufferToHex(signatureBuffer);
  }

  /**
   * Verifies if a signature is valid for a given data string and public key hex
   */
  static async verify(data: string, signatureHex: string, publicKeyHex: string): Promise<boolean> {
    try {
      const spkiBuffer = hexToArrayBuffer(publicKeyHex);
      const signatureBuffer = hexToArrayBuffer(signatureHex);
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        spkiBuffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        true,
        ['verify']
      );

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      return await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' },
        },
        publicKey,
        signatureBuffer,
        dataBuffer
      );
    } catch (e) {
      console.error('Signature verification error:', e);
      return false;
    }
  }
}
