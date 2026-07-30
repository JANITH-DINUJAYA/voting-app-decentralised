import { ethers } from 'ethers';
import VoterRegistryArtifact from '../../artifacts/contracts/VoterRegistry.sol/VoterRegistry.json';
import ElectionManagerArtifact from '../../artifacts/contracts/ElectionManager.sol/ElectionManager.json';
import { VOTER_REGISTRY_ADDRESS, ELECTION_MANAGER_ADDRESS } from './contract-addresses';

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
  public publicKeyHex: string = 'METAMASK_MANAGED';
  public privateKeyHex: string = 'METAMASK_MANAGED';
  public provider: ethers.BrowserProvider | null = null;
  public signer: ethers.Signer | null = null;

  public registryContract: ethers.Contract | null = null;
  public managerContract: ethers.Contract | null = null;

  constructor() {}

  static async deriveAddress(publicKeyHex: string): Promise<string> {
    return '0x' + (await sha256(publicKeyHex)).slice(-40);
  }

  static async verify(_data: string, _signatureHex: string, _publicKeyHex: string): Promise<boolean> {
    return true;
  }

  async importFromHex(_privateKeyHex: string, _publicKeyHex: string): Promise<void> {
    // No-op mock for MetaMask sessions
  }

  /**
   * Connects to MetaMask and sets up contract bindings
   */
  async connect(): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask extension is required to connect to the Ethereum Network.');
    }
    
    this.provider = new ethers.BrowserProvider((window as any).ethereum);
    const accounts = await this.provider.send('eth_requestAccounts', []);
    this.signer = await this.provider.getSigner();
    this.address = accounts[0];

    // Initialize contract bindings with signer context
    this.registryContract = new ethers.Contract(
      VOTER_REGISTRY_ADDRESS,
      VoterRegistryArtifact.abi,
      this.signer
    );

    this.managerContract = new ethers.Contract(
      ELECTION_MANAGER_ADDRESS,
      ElectionManagerArtifact.abi,
      this.signer
    );

    return this.address;
  }

  /**
   * Signs a data message with MetaMask signer
   */
  async sign(data: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected to MetaMask.');
    }
    return await this.signer.signMessage(data);
  }
}
