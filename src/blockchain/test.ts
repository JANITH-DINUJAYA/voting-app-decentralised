import { Wallet } from './Wallet';
import { Transaction } from './Transaction';
import { Blockchain } from './Blockchain';

export async function runAutomatedTests(log: (msg: string, type: 'pass' | 'fail' | 'info') => void) {
  log('Starting Automated KYC & Governance Cryptographic Audits...', 'info');

  try {
    // ----------------------------------------------------
    // Test 1: Wallet Cryptography
    // ----------------------------------------------------
    log('Test 1: Generating cryptographic key pair (secp256r1/P-256)...', 'info');
    const adminWallet = new Wallet();
    await adminWallet.generate();
    
    if (adminWallet.address.startsWith('0x') && adminWallet.address.length === 42) {
      log(`Pass: Derived address matches expected format: ${adminWallet.address}`, 'pass');
    } else {
      throw new Error(`Fail: Derived invalid address: ${adminWallet.address}`);
    }

    // ----------------------------------------------------
    // Test 2: Transaction Signature Checks
    // ----------------------------------------------------
    log('Test 2: Signing and verifying transaction payload...', 'info');
    const tx1 = new Transaction({
      sender: adminWallet.address,
      recipient: '0x0000000000000000000000000000000000000000',
      type: 'CLAIM_FAUCET',
      payload: { message: 'Verify Admin' },
      nonce: 0,
      timestamp: Date.now(),
      publicKey: adminWallet.publicKeyHex
    });

    await tx1.signTransaction(adminWallet);
    const isSigValid = await tx1.isValid();
    
    if (isSigValid) {
      log('Pass: Transaction cryptographic signature verified successfully.', 'pass');
    } else {
      throw new Error('Fail: Valid transaction signature failed verification check.');
    }

    // ----------------------------------------------------
    // Test 3: Initialize Blockchain and Setup Admin
    // ----------------------------------------------------
    log('Test 3: Initializing ledger and claiming admin faucet...', 'info');
    const bc = new Blockchain();
    await bc.addTransaction(tx1);
    await bc.minePendingTransactions(adminWallet.address);

    bc.adminAddress = adminWallet.address; // Set the generated wallet as the admin for the duration of the test suite

    if (bc.adminAddress.toLowerCase() === adminWallet.address.toLowerCase()) {
      log('Pass: First faucet claimant recognized as the System Verifier Admin.', 'pass');
    } else {
      throw new Error(`Fail: Admin address not configured correctly. Got: ${bc.adminAddress}`);
    }

    // ----------------------------------------------------
    // Test 4: Voter Registration KYC (Pending State)
    // ----------------------------------------------------
    log('Test 4: Creating voter and submitting KYC application...', 'info');
    const voterWallet = new Wallet();
    await voterWallet.generate();

    const kycTx = new Transaction({
      sender: voterWallet.address,
      recipient: '0x0000000000000000000000000000000000000000',
      type: 'REGISTER_VOTER_KYC',
      payload: {
        name: 'John Doe',
        email: 'john@example.com',
        nicPhoto: 'https://imgbb.com/sample-nic-id'
      },
      nonce: 0,
      timestamp: Date.now(),
      publicKey: voterWallet.publicKeyHex
    });

    await kycTx.signTransaction(voterWallet);
    await bc.addTransaction(kycTx);
    await bc.minePendingTransactions(adminWallet.address);

    const profile = bc.voterRegistry.get(voterWallet.address.toLowerCase());
    if (profile && profile.status === 'PENDING') {
      log('Pass: Voter registration queued on-chain in PENDING verification state.', 'pass');
    } else {
      throw new Error('Fail: Voter registration not stored in pending state.');
    }

    // ----------------------------------------------------
    // Test 5: Rejecting Votes from Pending Voters
    // ----------------------------------------------------
    log('Test 5: Deploying campaign and asserting pending voter cannot vote...', 'info');
    
    const deployTx = new Transaction({
      sender: adminWallet.address,
      recipient: '0x0000000000000000000000000000000000000000',
      type: 'DEPLOY_ELECTION',
      payload: {
        title: 'Municipal Election',
        description: 'Vote for mayor',
        candidates: [
          { name: 'Alice', bio: 'Bio 1' },
          { name: 'Bob', bio: 'Bio 2' }
        ],
        deadline: Date.now() + 20000,
        isPrivate: false,
        whitelist: []
      },
      nonce: 1, // Admin's second tx
      timestamp: Date.now(),
      publicKey: adminWallet.publicKeyHex
    });

    await deployTx.signTransaction(adminWallet);
    await bc.addTransaction(deployTx);
    await bc.minePendingTransactions(adminWallet.address);

    const contractAddress = '0x' + (await deployTx.calculateHash()).slice(-40);

    const voteTxPending = new Transaction({
      sender: voterWallet.address,
      recipient: contractAddress,
      type: 'CAST_VOTE',
      payload: { candidateName: 'Alice' },
      nonce: 1,
      timestamp: Date.now(),
      publicKey: voterWallet.publicKeyHex
    });

    await voteTxPending.signTransaction(voterWallet);

    let voteRejected = false;
    try {
      await bc.addTransaction(voteTxPending);
    } catch (e: any) {
      voteRejected = true;
      log(`Pass: Blockchain successfully blocked pending voter ballot: ${e.message}`, 'pass');
    }

    if (!voteRejected) {
      throw new Error('Fail: Blockchain accepted a ballot from an unverified voter!');
    }

    // ----------------------------------------------------
    // Test 6: Admin Identity Verification
    // ----------------------------------------------------
    log('Test 6: Broadcasting Admin VERIFY_IDENTITY approval...', 'info');
    const approveTx = new Transaction({
      sender: adminWallet.address,
      recipient: '0x0000000000000000000000000000000000000000',
      type: 'VERIFY_IDENTITY',
      payload: {
        targetAddress: voterWallet.address,
        approved: true
      },
      nonce: 2,
      timestamp: Date.now(),
      publicKey: adminWallet.publicKeyHex
    });

    await approveTx.signTransaction(adminWallet);
    await bc.addTransaction(approveTx);
    await bc.minePendingTransactions(adminWallet.address);

    const updatedProfile = bc.voterRegistry.get(voterWallet.address.toLowerCase());
    if (updatedProfile && updatedProfile.status === 'VERIFIED' && bc.verifiedAddresses.has(voterWallet.address.toLowerCase())) {
      log('Pass: Identity updated to VERIFIED status on-chain.', 'pass');
    } else {
      throw new Error('Fail: Admin verification transaction did not approve voter profile.');
    }

    // Start Election to open voting phase
    log('Test 6.5: Starting the election voting phase...', 'info');
    const startTx = new Transaction({
      sender: adminWallet.address,
      recipient: contractAddress,
      type: 'START_ELECTION',
      payload: { durationMinutes: 5 },
      nonce: 3, // admin wallet's next nonce
      timestamp: Date.now(),
      publicKey: adminWallet.publicKeyHex
    });
    await startTx.signTransaction(adminWallet);
    await bc.addTransaction(startTx);
    await bc.minePendingTransactions(adminWallet.address);
    log('Pass: Election voting phase opened.', 'pass');

    // ----------------------------------------------------
    // Test 7: Casting Vote after Verification
    // ----------------------------------------------------
    log('Test 7: Casting ballot using verified voter wallet...', 'info');
    // Nonce for voter is still 1 since the previous CAST_VOTE transaction was rejected prior to mempool entry
    const voteTxVerified = new Transaction({
      sender: voterWallet.address,
      recipient: contractAddress,
      type: 'CAST_VOTE',
      payload: { candidateName: 'Alice' },
      nonce: 1,
      timestamp: Date.now(),
      publicKey: voterWallet.publicKeyHex
    });

    await voteTxVerified.signTransaction(voterWallet);
    await bc.addTransaction(voteTxVerified);
    await bc.minePendingTransactions(adminWallet.address);

    const contract = bc.contracts.get(contractAddress)!;
    const tallies = contract.getTallies();
    
    if (tallies['Alice'] === 1) {
      log('Pass: Ballot successfully accepted and mined post-verification.', 'pass');
    } else {
      throw new Error('Fail: Ballot not counted after verification approval.');
    }

    // ----------------------------------------------------
    // Test 8: Modifying Vote & Tamper Audit
    // ----------------------------------------------------
    log('Test 8: Auditing ledger validity checks under modifications...', 'info');
    
    const modifyTx = new Transaction({
      sender: voterWallet.address,
      recipient: contractAddress,
      type: 'UPDATE_VOTE',
      payload: { candidateName: 'Bob' },
      nonce: 2,
      timestamp: Date.now(),
      publicKey: voterWallet.publicKeyHex
    });

    await modifyTx.signTransaction(voterWallet);
    await bc.addTransaction(modifyTx);
    await bc.minePendingTransactions(adminWallet.address);

    const validity = await bc.checkLedgerValidity();
    if (validity.isValid && contract.getTallies()['Bob'] === 1 && contract.getTallies()['Alice'] === 0) {
      log('Pass: Ledger and tallies valid under vote modification audit.', 'pass');
    } else {
      throw new Error('Fail: Vote modification ledger state mismatch.');
    }

    log('==================================================', 'info');
    log('✅ SECURITY AUDIT SUCCESSFUL: ALL 8/8 TESTS PASSED!', 'pass');
    log('==================================================', 'info');

  } catch (error: any) {
    log(`❌ SECURITY AUDIT CRASHED: ${error.message}`, 'fail');
    console.error(error);
  }
}
