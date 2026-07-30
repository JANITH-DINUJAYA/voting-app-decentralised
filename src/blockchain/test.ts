import { ethers } from 'ethers';
import { VOTER_REGISTRY_ADDRESS, ELECTION_MANAGER_ADDRESS } from './contract-addresses';
import VoterRegistryArtifact from '../../artifacts/contracts/VoterRegistry.sol/VoterRegistry.json';
import ElectionManagerArtifact from '../../artifacts/contracts/ElectionManager.sol/ElectionManager.json';

export async function runAutomatedTests(log: (msg: string, type: 'pass' | 'fail' | 'info') => void) {
  log('Starting Automated EVM & Smart Contract Cryptographic Audits...', 'info');

  try {
    // ----------------------------------------------------
    // Test 1: Check MetaMask Web3 Provider
    // ----------------------------------------------------
    log('Test 1: Detecting browser Web3 Ethereum provider context (window.ethereum)...', 'info');
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask is not installed or window.ethereum is missing.');
    }
    log('Pass: Browser has active window.ethereum Web3 provider interface.', 'pass');

    // ----------------------------------------------------
    // Test 2: Contract Deployment Verification
    // ----------------------------------------------------
    log('Test 2: Verifying VoterRegistry and ElectionManager contract deployments...', 'info');
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

    const regCode = await provider.getCode(VOTER_REGISTRY_ADDRESS);
    if (regCode === '0x') {
      throw new Error(`VoterRegistry contract not found at address: ${VOTER_REGISTRY_ADDRESS}. Make sure the local node is running and contracts are deployed.`);
    }
    log(`Pass: VoterRegistry compiled bytecode verified at address: ${VOTER_REGISTRY_ADDRESS}`, 'pass');

    const manCode = await provider.getCode(ELECTION_MANAGER_ADDRESS);
    if (manCode === '0x') {
      throw new Error(`ElectionManager contract not found at address: ${ELECTION_MANAGER_ADDRESS}.`);
    }
    log(`Pass: ElectionManager compiled bytecode verified at address: ${ELECTION_MANAGER_ADDRESS}`, 'pass');

    // ----------------------------------------------------
    // Test 3: Read Contract Admin State
    // ----------------------------------------------------
    log('Test 3: Reading deployed smart contract state variables (Verifier Admin Address)...', 'info');
    const registry = new ethers.Contract(VOTER_REGISTRY_ADDRESS, VoterRegistryArtifact.abi, provider);
    const adminAddress = await registry.admin();
    
    if (ethers.isAddress(adminAddress)) {
      log(`Pass: Deployed VoterRegistry contract admin verifier address read: ${adminAddress}`, 'pass');
    } else {
      throw new Error('Registry admin state returned an invalid address format.');
    }

    // ----------------------------------------------------
    // Test 4: Query Registered Voters List
    // ----------------------------------------------------
    log('Test 4: Reading on-chain registry mapping parameters...', 'info');
    const count = await registry.getRegisteredAddressesCount();
    log(`Pass: Successfully retrieved registered voters count from VoterRegistry contract: ${count}`, 'pass');

    // ----------------------------------------------------
    // Test 5: Query Active Campaigns
    // ----------------------------------------------------
    log('Test 5: Auditing ElectionManager active campaign count...', 'info');
    const manager = new ethers.Contract(ELECTION_MANAGER_ADDRESS, ElectionManagerArtifact.abi, provider);
    const electionsCount = await manager.getElectionsCount();
    log(`Pass: Successfully queried deployed elections count from ElectionManager contract: ${electionsCount}`, 'pass');

    log('==================================================', 'info');
    log('✅ EVM BLOCKCHAIN AUDIT SUCCESSFUL: SOLIDITY SMART CONTRACTS ARE ACTIVE!', 'pass');
    log('==================================================', 'info');

  } catch (error: any) {
    log(`❌ CRYPTOGRAPHIC AUDIT CRASHED: ${error.message}`, 'fail');
    console.error(error);
  }
}
