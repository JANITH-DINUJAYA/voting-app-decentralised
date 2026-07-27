import { App } from '../main';
import { Wallet } from '../blockchain/Wallet';
import { Transaction } from '../blockchain/Transaction';

export class LoginRegister {
  private app: App;
  
  // Login Elements
  private anonymousView!: HTMLElement;
  private connectedView!: HTMLElement;
  private btnGenerate!: HTMLButtonElement;
  private importPrivkeyInput!: HTMLInputElement;
  private importPubkeyInput!: HTMLInputElement;
  private btnConnectSubmit!: HTMLButtonElement;
  
  private activeAddressText!: HTMLElement;
  private btnCopyAddress!: HTMLButtonElement;
  private statusBadge!: HTMLElement;
  private btnClaimAdminFaucet!: HTMLButtonElement;
  private btnGoRegister!: HTMLButtonElement;
  private btnDisconnect!: HTMLButtonElement;
  
  private toggleKeysLabel!: HTMLElement;
  private keysChevron!: HTMLElement;
  private keysBox!: HTMLElement;
  private pubkeyHexArea!: HTMLTextAreaElement;
  private privkeyHexArea!: HTMLTextAreaElement;

  // Register Elements
  private warningView!: HTMLElement;
  private formArea!: HTMLElement;
  private completedView!: HTMLElement;
  
  private regNameInput!: HTMLInputElement;
  private regEmailInput!: HTMLInputElement;
  private regWalletInput!: HTMLInputElement;
  private regRoleSelect!: HTMLSelectElement;
  private regBioGroup!: HTMLElement;
  private regBioText!: HTMLTextAreaElement;
  
  private dropzone!: HTMLElement;
  private fileInput!: HTMLInputElement;
  private previewBox!: HTMLElement;
  private previewImage!: HTMLImageElement;
  private fileNameText!: HTMLElement;
  private uploadStatusText!: HTMLElement;
  private progressBarContainer!: HTMLElement;
  private progressBarFill!: HTMLElement;
  private btnRemoveNic!: HTMLButtonElement;
  
  private btnSubmitReg!: HTMLButtonElement;
  
  private completionStatusText!: HTMLElement;
  private submittedDetailsBox!: HTMLElement;

  // State variables for file upload
  private selectedFile: File | null = null;
  private uploadedImageUrl: string = '';
  private isEditing: boolean = false;

  constructor(app: App) {
    this.app = app;
    this.initElements();
    this.initEvents();
  }

  private initElements() {
    // Login
    this.anonymousView = document.getElementById('login-anonymous-view')!;
    this.connectedView = document.getElementById('login-connected-view')!;
    this.btnGenerate = document.getElementById('btn-login-generate') as HTMLButtonElement;
    this.importPrivkeyInput = document.getElementById('login-privkey') as HTMLInputElement;
    this.importPubkeyInput = document.getElementById('login-pubkey') as HTMLInputElement;
    this.btnConnectSubmit = document.getElementById('btn-login-submit') as HTMLButtonElement;
    
    this.activeAddressText = document.getElementById('login-wallet-address')!;
    this.btnCopyAddress = document.getElementById('btn-login-copy-address') as HTMLButtonElement;
    this.statusBadge = document.getElementById('login-status-badge')!;
    this.btnClaimAdminFaucet = document.getElementById('btn-login-claim-faucet') as HTMLButtonElement;
    this.btnGoRegister = document.getElementById('btn-login-go-register') as HTMLButtonElement;
    this.btnDisconnect = document.getElementById('btn-login-disconnect') as HTMLButtonElement;
    
    this.toggleKeysLabel = document.getElementById('login-toggle-keys')!;
    this.keysChevron = document.getElementById('login-keys-chevron')!;
    this.keysBox = document.getElementById('login-keys-box')!;
    this.pubkeyHexArea = document.getElementById('login-pubkey-hex') as HTMLTextAreaElement;
    this.privkeyHexArea = document.getElementById('login-privkey-hex') as HTMLTextAreaElement;

    // Register
    this.warningView = document.getElementById('register-unconnected-warning')!;
    this.formArea = document.getElementById('register-form-area')!;
    this.completedView = document.getElementById('register-completed-view')!;
    
    this.regNameInput = document.getElementById('reg-name') as HTMLInputElement;
    this.regEmailInput = document.getElementById('reg-email') as HTMLInputElement;
    this.regWalletInput = document.getElementById('reg-wallet') as HTMLInputElement;
    this.regRoleSelect = document.getElementById('reg-role') as HTMLSelectElement;
    this.regBioGroup = document.getElementById('reg-bio-group')!;
    this.regBioText = document.getElementById('reg-bio') as HTMLTextAreaElement;
    
    this.dropzone = document.getElementById('nic-dropzone')!;
    this.fileInput = document.getElementById('nic-file-input') as HTMLInputElement;
    this.previewBox = document.getElementById('nic-preview-box')!;
    this.previewImage = document.getElementById('nic-image-preview') as HTMLImageElement;
    this.fileNameText = document.getElementById('nic-file-name')!;
    this.uploadStatusText = document.getElementById('nic-upload-status')!;
    this.progressBarContainer = document.getElementById('nic-progress-bar-container')!;
    this.progressBarFill = document.getElementById('nic-progress-bar-fill')!;
    this.btnRemoveNic = document.getElementById('btn-remove-nic') as HTMLButtonElement;
    
    this.btnSubmitReg = document.getElementById('btn-submit-registration') as HTMLButtonElement;
    
    this.completionStatusText = document.getElementById('register-completion-status-text')!;
    this.submittedDetailsBox = document.getElementById('register-submitted-details')!;
  }

  private initEvents() {
    // Login Click Events
    this.btnGenerate.addEventListener('click', () => this.generateWallet());
    this.btnConnectSubmit.addEventListener('click', () => this.importWalletKeys());
    this.btnCopyAddress.addEventListener('click', () => this.copyAddress());
    this.btnClaimAdminFaucet.addEventListener('click', () => this.claimAdminFaucet());
    this.btnGoRegister.addEventListener('click', () => { window.location.hash = '#/register'; });
    this.btnDisconnect.addEventListener('click', () => this.disconnectWallet());
    this.toggleKeysLabel.addEventListener('click', () => this.toggleKeysDisplay());

    // Register Drag & Drop Events
    this.regRoleSelect.addEventListener('change', () => this.handleRoleChange());
    
    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
    
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.style.borderColor = 'var(--color-secondary)';
      this.dropzone.style.background = 'rgba(0, 245, 212, 0.05)';
    });

    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.style.borderColor = 'var(--border-color)';
      this.dropzone.style.background = 'var(--bg-card)';
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.style.borderColor = 'var(--border-color)';
      this.dropzone.style.background = 'var(--bg-card)';
      
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        this.setFile(e.dataTransfer.files[0]);
      }
    });

    this.btnRemoveNic.addEventListener('click', () => this.clearFileSelection());
    this.btnSubmitReg.addEventListener('click', () => this.submitKycProfile());
  }

  // --- WALLET CONNECT LOGIC ---
  private async generateWallet() {
    try {
      this.btnGenerate.disabled = true;
      this.btnGenerate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Keys...';
      
      const w = new Wallet();
      await w.generate();
      this.app.wallet = w;
      
      this.app.showNotification('Asymmetric keypair generated via Web Crypto API!', 'success');
      this.app.refreshAllViews();
    } catch (e: any) {
      this.app.showNotification(`Key generation failed: ${e.message}`, 'error');
    } finally {
      this.btnGenerate.disabled = false;
      this.btnGenerate.innerHTML = '<i class="fa-solid fa-key"></i> Create New Wallet';
    }
  }

  private async importWalletKeys() {
    const priv = this.importPrivkeyInput.value.trim();
    const pub = this.importPubkeyInput.value.trim();

    if (!priv || !pub) {
      this.app.showNotification('Please fill in both key hex exports.', 'error');
      return;
    }

    try {
      this.btnConnectSubmit.disabled = true;
      this.btnConnectSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';

      const w = new Wallet();
      await w.importFromHex(priv, pub);
      this.app.wallet = w;

      this.importPrivkeyInput.value = '';
      this.importPubkeyInput.value = '';

      this.app.showNotification('Wallet credentials imported successfully!', 'success');
      this.app.refreshAllViews();
    } catch (e) {
      this.app.showNotification('Import failed: Check that hex formats are correct.', 'error');
    } finally {
      this.btnConnectSubmit.disabled = false;
      this.btnConnectSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Connect Keys';
    }
  }

  private copyAddress() {
    if (!this.app.wallet) return;
    navigator.clipboard.writeText(this.app.wallet.address).then(() => {
      this.app.showNotification('Address copied to clipboard!');
    });
  }

  private async claimAdminFaucet() {
    if (!this.app.wallet) return;
    
    try {
      this.btnClaimAdminFaucet.disabled = true;
      this.btnClaimAdminFaucet.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Broadking claim...';
      
      const w = this.app.wallet;
      const currentNonce = this.app.blockchain.getNonce(w.address);

      const tx = new Transaction({
        sender: w.address,
        recipient: '0x0000000000000000000000000000000000000000',
        type: 'CLAIM_FAUCET',
        payload: { name: 'Admin Account' },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: w.publicKeyHex
      });

      await tx.signTransaction(w);
      await this.app.blockchain.addTransaction(tx);

      this.app.showNotification('Faucet transaction broadcast. Go to Block Explorer to mine this block.', 'info');
      this.app.refreshAllViews();
    } catch (e: any) {
      this.app.showNotification(`Claim failed: ${e.message}`, 'error');
    } finally {
      this.btnClaimAdminFaucet.disabled = false;
      this.btnClaimAdminFaucet.innerHTML = '<i class="fa-solid fa-crown"></i> Claim Admin Status (Faucet)';
    }
  }

  private disconnectWallet() {
    this.app.wallet = null;
    this.uploadedImageUrl = '';
    this.selectedFile = null;
    this.isEditing = false;
    this.app.showNotification('Wallet disconnected.', 'info');
    window.location.hash = '#/';
  }

  private toggleKeysDisplay() {
    const isVisible = this.keysBox.style.display === 'flex';
    this.keysBox.style.display = isVisible ? 'none' : 'flex';
    this.keysChevron.className = isVisible ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
  }

  // --- REGISTRATION LOGIC ---
  private handleRoleChange() {
    const isCandidate = this.regRoleSelect.value === 'CANDIDATE';
    this.regBioGroup.style.display = isCandidate ? 'flex' : 'none';
  }

  private handleFileSelection(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.setFile(target.files[0]);
    }
  }

  private setFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.app.showNotification('Please upload an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.app.showNotification('File is too large. Max size is 5MB.', 'error');
      return;
    }

    this.selectedFile = file;
    this.fileNameText.textContent = file.name;
    this.uploadStatusText.textContent = 'Ready to upload.';
    
    // Display thumbnail preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImage.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    this.previewBox.style.display = 'flex';
    this.uploadedImageUrl = '';
  }

  private clearFileSelection() {
    this.selectedFile = null;
    this.uploadedImageUrl = '';
    this.previewBox.style.display = 'none';
    this.previewImage.src = '';
    this.fileInput.value = '';
    this.progressBarContainer.style.display = 'none';
    this.progressBarFill.style.width = '0%';
  }

  /**
   * Performs direct POST request to ImgBB and submits register transaction
   */
  private async submitKycProfile() {
    if (!this.app.wallet) return;

    const name = this.regNameInput.value.trim();
    const email = this.regEmailInput.value.trim();
    const role = this.regRoleSelect.value;
    const bio = this.regBioText.value.trim();

    if (!name || !email) {
      this.app.showNotification('Name and email are required.', 'error');
      return;
    }

    if (!this.selectedFile && !this.uploadedImageUrl) {
      this.app.showNotification('Please select or upload your National Identity Card (NIC) photo.', 'error');
      return;
    }

    try {
      this.btnSubmitReg.disabled = true;

      // 1. Upload NIC to ImgBB if a new file is selected
      if (this.selectedFile) {
        this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading NIC to ImgBB...';
        this.progressBarContainer.style.display = 'block';
        this.progressBarFill.style.width = '20%';
        this.uploadStatusText.textContent = 'Uploading image...';

        const apiKey = import.meta.env.VITE_IMGBB_API_KEY || 'da1765c9c1b48ca59296e6d1eb7a003f';

        const formData = new FormData();
        formData.append('image', this.selectedFile);

        this.progressBarFill.style.width = '50%';
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          throw new Error(`ImgBB API responded with code: ${res.status}`);
        }

        this.progressBarFill.style.width = '80%';
        const data = await res.json();
        
        if (data && data.data && data.data.url) {
          this.uploadedImageUrl = data.data.url;
          this.progressBarFill.style.width = '100%';
          this.uploadStatusText.textContent = 'ImgBB upload successful!';
        } else {
          throw new Error('Image URL missing in ImgBB response.');
        }
      }

      // 2. Build Transaction
      this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing KYC Registry...';
      
      const w = this.app.wallet;
      const currentNonce = this.app.blockchain.getNonce(w.address);
      const isCandidate = role === 'CANDIDATE';
      
      const payload: any = {
        name,
        email,
        nicPhoto: this.uploadedImageUrl
      };
      
      if (isCandidate) {
        payload.bio = bio || 'Nominated representative.';
      }

      const tx = new Transaction({
        sender: w.address,
        recipient: '0x0000000000000000000000000000000000000000',
        type: isCandidate ? 'REGISTER_CANDIDATE_KYC' : 'REGISTER_VOTER_KYC',
        payload: payload,
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: w.publicKeyHex
      });

      // Sign transaction
      await tx.signTransaction(w);

      // Submit to mempool
      await this.app.blockchain.addTransaction(tx);

      this.isEditing = false; // Reset editing state
      this.app.showNotification('KYC application submitted! Transaction queued in mempool.', 'success');
      this.app.refreshAllViews();

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`KYC submit failed: ${e.message}`, 'error');
      this.progressBarFill.style.width = '0%';
      this.uploadStatusText.textContent = 'Upload failed. Try again.';
    } finally {
      this.btnSubmitReg.disabled = false;
      this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-file-signature"></i> Sign & Submit KYC Registration';
    }
  }

  // --- RENDER LOGIC ---
  render() {
    const isLoggedIn = this.app.wallet !== null;

    // Login views sync
    if (!isLoggedIn) {
      this.anonymousView.style.display = 'flex';
      this.connectedView.style.display = 'none';
      
      // Register unconnected warning sync
      this.warningView.style.display = 'block';
      this.formArea.style.display = 'none';
      this.completedView.style.display = 'none';
      return;
    }

    const w = this.app.wallet!;
    this.anonymousView.style.display = 'none';
    this.connectedView.style.display = 'flex';
    
    this.activeAddressText.textContent = w.address;
    this.pubkeyHexArea.value = w.publicKeyHex;
    this.privkeyHexArea.value = w.privateKeyHex;

    // Determine verification status badge
    const adminAddress = this.app.blockchain.adminAddress;
    const isVerifierAdmin = adminAddress && w.address.toLowerCase() === adminAddress.toLowerCase();
    
    const profile = this.app.blockchain.voterRegistry.get(w.address.toLowerCase());

    this.warningView.style.display = 'none';
    this.btnClaimAdminFaucet.style.display = 'none';
    this.btnGoRegister.style.display = 'none';

    // Renders verification status badge in Connect Wallet page
    if (isVerifierAdmin) {
      this.statusBadge.innerHTML = `
        <i class="fa-solid fa-shield-check" style="color: var(--color-secondary);"></i>
        <span style="color: var(--color-secondary);">System Admin Verifier</span>
      `;
    } else if (profile) {
      if (profile.status === 'VERIFIED') {
        this.statusBadge.innerHTML = `
          <i class="fa-solid fa-circle-check" style="color: var(--color-secondary);"></i>
          <span style="color: var(--color-secondary);">On-Chain Verified Voter</span>
        `;
      } else if (profile.status === 'REJECTED') {
        this.statusBadge.innerHTML = `
          <i class="fa-solid fa-circle-xmark" style="color: var(--color-danger);"></i>
          <span style="color: var(--color-danger);">KYC Verification Rejected</span>
        `;
        this.btnGoRegister.style.display = 'inline-flex';
      } else {
        this.statusBadge.innerHTML = `
          <i class="fa-solid fa-clock" style="color: #ffaa00;"></i>
          <span style="color: #ffaa00;">Verification Pending approval</span>
        `;
      }
    } else {
      this.statusBadge.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-danger);"></i>
        <span style="color: var(--color-danger);">No KYC Profile Registered</span>
      `;
      this.btnGoRegister.style.display = 'inline-flex';
      
      // If blockchain has no Admin, show claim admin button for demo convenience
      if (!adminAddress) {
        this.btnClaimAdminFaucet.style.display = 'inline-flex';
        
        // If claiming is already pending in mempool
        const isFaucetPending = this.app.blockchain.pendingTransactions.some(
          t => t.sender.toLowerCase() === w.address.toLowerCase() && t.type === 'CLAIM_FAUCET'
        );
        this.btnClaimAdminFaucet.disabled = isFaucetPending;
        if (isFaucetPending) {
          this.btnClaimAdminFaucet.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mining claim...';
        } else {
          this.btnClaimAdminFaucet.innerHTML = '<i class="fa-solid fa-crown"></i> Claim Admin Status (Faucet)';
        }
      }
    }

    // Register Form Sync
    if (profile && !this.isEditing) {
      this.formArea.style.display = 'none';
      this.completedView.style.display = 'block';

      this.completionStatusText.textContent = profile.status === 'VERIFIED' 
        ? 'Your KYC credentials are verified and active on the block ledger.'
        : profile.status === 'REJECTED'
        ? 'Your KYC application was rejected by the System Verifier Admin. Please click Edit below to update details and re-apply.'
        : 'Your identity profile is currently pending verification audits from the System Admin.';
        
      this.submittedDetailsBox.innerHTML = `
        <div><strong>Name:</strong> ${profile.name}</div>
        <div><strong>Email:</strong> ${profile.email}</div>
        <div><strong>Role Nominated:</strong> ${profile.role}</div>
        ${profile.bio ? `<div><strong>Manifesto:</strong> ${profile.bio}</div>` : ''}
        <div><strong>KYC Status:</strong> <span style="font-weight:700; color: ${profile.status === 'VERIFIED' ? 'var(--color-secondary)' : '#ffaa00'};">${profile.status}</span></div>
        <div style="margin-top:0.5rem; display:flex; flex-direction:column; gap:0.25rem;">
          <strong>NIC ID Photo:</strong>
          <a href="${profile.nicPhoto}" target="_blank" style="color: var(--color-secondary); text-decoration:none;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Hosted Photo Link (ImgBB)</a>
          <img src="${profile.nicPhoto}" style="max-height:100px; width:fit-content; border:1px solid var(--border-color); margin-top:0.25rem;" />
        </div>
        <button id="btn-edit-kyc" class="btn" style="margin-top: 1rem; width: 100%; padding: 0.5rem; font-size: 0.85rem;"><i class="fa-solid fa-user-pen"></i> Edit Profile Details</button>
      `;

      // Bind edit button
      const editBtn = document.getElementById('btn-edit-kyc') as HTMLButtonElement;
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.isEditing = true;
          this.regNameInput.value = profile.name;
          this.regEmailInput.value = profile.email;
          this.regRoleSelect.value = profile.role;
          if (profile.role === 'CANDIDATE') {
            this.regBioText.value = profile.bio || '';
          }
          this.uploadedImageUrl = profile.nicPhoto;
          this.previewImage.src = profile.nicPhoto;
          this.fileNameText.textContent = "Current Hosted Image on ImgBB";
          this.uploadStatusText.textContent = "Using existing photo. Upload a new file to change.";
          this.previewBox.style.display = 'flex';
          this.app.refreshAllViews();
        });
      }
    } else {
      this.formArea.style.display = 'flex';
      this.completedView.style.display = 'none';
      
      this.regWalletInput.value = w.address;
      this.handleRoleChange(); // sync role inputs bio display
    }
  }
}
