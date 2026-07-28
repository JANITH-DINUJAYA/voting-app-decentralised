import { App } from '../main';
import type { UserProfile } from '../main';
import { Wallet } from '../blockchain/Wallet';
import { Transaction } from '../blockchain/Transaction';

export class LoginRegister {
  private app: App;

  // Tabs
  private tabSignIn!: HTMLButtonElement;
  private tabSignUp!: HTMLButtonElement;
  private signInForm!: HTMLElement;
  private signUpForm!: HTMLElement;

  // Login inputs
  private connectedView!: HTMLElement;
  private loginUsernameInput!: HTMLInputElement;
  private loginPasswordInput!: HTMLInputElement;
  private btnLoginAuth!: HTMLButtonElement;

  // Sign Up inputs
  private registerUsernameInput!: HTMLInputElement;
  private registerPasswordInput!: HTMLInputElement;
  private registerFullnameInput!: HTMLInputElement;
  private registerEmailInput!: HTMLInputElement;
  private registerRoleSelect!: HTMLSelectElement;
  private btnRegisterAuth!: HTMLButtonElement;

  // Admin Login inputs
  private adminLoginKeyInput!: HTMLInputElement;
  private btnAdminLoginSubmit!: HTMLButtonElement;
  private btnDemoAdminKey!: HTMLButtonElement;

  // Active Session display
  private sessUsername!: HTMLElement;
  private sessFullname!: HTMLElement;
  private sessEmail!: HTMLElement;
  private sessRole!: HTMLElement;

  // Wallet Setup sections
  private walletDisconnectedSubview!: HTMLElement;
  private walletConnectedSubview!: HTMLElement;
  private btnProfileGenerateWallet!: HTMLButtonElement;
  private sessWalletAddress!: HTMLElement;
  private btnSessCopyAddress!: HTMLButtonElement;
  private sessKycStatusBadge!: HTMLElement;
  private btnLoginClaimFaucet!: HTMLButtonElement;

  // KYC Submission views inside Connected Profile
  private kycRegistrationSubview!: HTMLElement;
  private kycCompletedSubview!: HTMLElement;
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
  private submittedDetailsBox!: HTMLElement;

  // Keys toggle
  private toggleKeysLabel!: HTMLElement;
  private keysChevron!: HTMLElement;
  private keysBox!: HTMLElement;
  private pubkeyHexArea!: HTMLTextAreaElement;
  private privkeyHexArea!: HTMLTextAreaElement;
  private btnDisconnect!: HTMLButtonElement;

  // State variables
  private selectedFile: File | null = null;
  private uploadedImageUrl: string = '';
  private isEditing: boolean = false;

  constructor(app: App) {
    this.app = app;
    this.initElements();
    this.initEvents();
  }

  // Neon Database holds all user session logs on server-side. No local seed required.

  private initElements() {
    // Tabs (in the login screen)
    this.tabSignIn = document.getElementById('tab-btn-signin') as HTMLButtonElement;
    this.tabSignUp = document.getElementById('tab-btn-signup') as HTMLButtonElement;
    this.signInForm = document.getElementById('auth-signin-form')!;
    this.signUpForm = document.getElementById('auth-signup-form')!;

    // Anonymous views (login screen only)
    // Connected view (profile panel)
    this.connectedView = document.getElementById('login-connected-view')!;
    this.loginUsernameInput = document.getElementById('login-username') as HTMLInputElement;
    this.loginPasswordInput = document.getElementById('login-password') as HTMLInputElement;
    this.btnLoginAuth = document.getElementById('btn-login-auth') as HTMLButtonElement;

    // Sign Up inputs
    this.registerUsernameInput = document.getElementById('register-username') as HTMLInputElement;
    this.registerPasswordInput = document.getElementById('register-password') as HTMLInputElement;
    this.registerFullnameInput = document.getElementById('register-fullname') as HTMLInputElement;
    this.registerEmailInput = document.getElementById('register-email') as HTMLInputElement;
    this.registerRoleSelect = document.getElementById('register-role-select') as HTMLSelectElement;
    this.btnRegisterAuth = document.getElementById('btn-register-auth') as HTMLButtonElement;

    // Admin Login inputs
    this.adminLoginKeyInput = document.getElementById('admin-login-key') as HTMLInputElement;
    this.btnAdminLoginSubmit = document.getElementById('btn-admin-login-submit') as HTMLButtonElement;
    this.btnDemoAdminKey = document.getElementById('btn-demo-admin-key') as HTMLButtonElement;

    // Connected views
    this.sessUsername = document.getElementById('sess-username')!;
    this.sessFullname = document.getElementById('sess-fullname')!;
    this.sessEmail = document.getElementById('sess-email')!;
    this.sessRole = document.getElementById('sess-role')!;

    // Wallet Section
    this.walletDisconnectedSubview = document.getElementById('sess-wallet-disconnected-subview')!;
    this.walletConnectedSubview = document.getElementById('sess-wallet-connected-subview')!;
    this.btnProfileGenerateWallet = document.getElementById('btn-profile-generate-wallet') as HTMLButtonElement;
    this.sessWalletAddress = document.getElementById('sess-wallet-address')!;
    this.btnSessCopyAddress = document.getElementById('btn-sess-copy-address') as HTMLButtonElement;
    this.sessKycStatusBadge = document.getElementById('sess-kyc-status-badge')!;
    this.btnLoginClaimFaucet = document.getElementById('btn-login-claim-faucet') as HTMLButtonElement;

    // KYC Submission Inside connected
    this.kycRegistrationSubview = document.getElementById('sess-kyc-registration-subview')!;
    this.kycCompletedSubview = document.getElementById('sess-kyc-completed-subview')!;
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
    this.submittedDetailsBox = document.getElementById('register-submitted-details')!;

    // Credentials Toggle
    this.toggleKeysLabel = document.getElementById('login-toggle-keys')!;
    this.keysChevron = document.getElementById('login-keys-chevron')!;
    this.keysBox = document.getElementById('login-keys-box')!;
    this.pubkeyHexArea = document.getElementById('login-pubkey-hex') as HTMLTextAreaElement;
    this.privkeyHexArea = document.getElementById('login-privkey-hex') as HTMLTextAreaElement;
    this.btnDisconnect = document.getElementById('btn-login-disconnect') as HTMLButtonElement;

    // Hide demo shortcuts in production mode
    if (this.app.productionMode) {
      const demoContainer = document.getElementById('demo-key-container');
      if (demoContainer) {
        demoContainer.style.display = 'none';
      }
    }
  }

  private initEvents() {
    // Tab switching
    this.tabSignIn.addEventListener('click', () => this.switchTab('signin'));
    this.tabSignUp.addEventListener('click', () => this.switchTab('signup'));

    // Auth events
    this.btnLoginAuth.addEventListener('click', () => this.handleSignIn());
    this.btnRegisterAuth.addEventListener('click', () => this.handleSignUp());
    this.btnDisconnect.addEventListener('click', () => this.handleSignOut());

    // Admin login events
    this.btnAdminLoginSubmit.addEventListener('click', () => this.handleAdminKeyLogin());
    this.btnDemoAdminKey.addEventListener('click', () => this.loadDemoAdminKey());

    // Wallet Generation & Claim Faucet
    this.btnProfileGenerateWallet.addEventListener('click', () => this.generateWalletPostLogin());
    this.btnSessCopyAddress.addEventListener('click', () => this.copyAddress());
    this.btnLoginClaimFaucet.addEventListener('click', () => this.claimFaucetGas());

    // Drag-and-drop file inputs
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
    this.toggleKeysLabel.addEventListener('click', () => this.toggleKeysDisplay());
  }

  private switchTab(mode: 'signin' | 'signup') {
    if (mode === 'signin') {
      this.tabSignIn.classList.add('active');
      this.tabSignIn.style.borderBottomColor = 'var(--color-primary)';
      this.tabSignUp.classList.remove('active');
      this.tabSignUp.style.borderBottomColor = 'transparent';
      this.signInForm.style.display = 'flex';
      this.signUpForm.style.display = 'none';
    } else {
      this.tabSignUp.classList.add('active');
      this.tabSignUp.style.borderBottomColor = 'var(--color-primary)';
      this.tabSignIn.classList.remove('active');
      this.tabSignIn.style.borderBottomColor = 'transparent';
      this.signUpForm.style.display = 'flex';
      this.signInForm.style.display = 'none';
    }
  }

  // --- MOCK AUTHENTICATION SYSTEM ---
  private async handleSignIn() {
    const username = this.loginUsernameInput.value.trim().toLowerCase();
    const password = this.loginPasswordInput.value.trim();

    if (!username || !password) {
      this.app.showNotification('Please enter both username and password.', 'error');
      return;
    }

    if (username === 'admin') {
      this.app.showNotification('Administrative accounts must authenticate via the Cryptographic Key Portal.', 'error');
      return;
    }

    try {
      this.btnLoginAuth.disabled = true;
      this.btnLoginAuth.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login credentials incorrect.');
      }

      await this.authenticateSession(data);

    } catch (e: any) {
      this.app.showNotification(e.message, 'error');
    } finally {
      this.btnLoginAuth.disabled = false;
      this.btnLoginAuth.innerHTML = '<i class="fa-solid fa-circle-check"></i> Log In';
    }
  }

  private async handleSignUp() {
    const username = this.registerUsernameInput.value.trim().toLowerCase();
    const password = this.registerPasswordInput.value.trim();
    const fullName = this.registerFullnameInput.value.trim();
    const email = this.registerEmailInput.value.trim();
    const role = this.registerRoleSelect.value as 'VOTER' | 'CANDIDATE';

    if (!username || !password || !fullName || !email) {
      this.app.showNotification('Please fill in all register fields.', 'error');
      return;
    }

    if (username === 'admin' || username === 'voter' || username === 'candidate') {
      this.app.showNotification('Reserved system username. Choose another.', 'error');
      return;
    }

    try {
      this.btnRegisterAuth.disabled = true;
      this.btnRegisterAuth.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';

      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName, email, role })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed.');
      }

      this.app.showNotification('Account created successfully! Logging you in...', 'success');
      this.registerUsernameInput.value = '';
      this.registerPasswordInput.value = '';
      this.registerFullnameInput.value = '';
      this.registerEmailInput.value = '';

      await this.authenticateSession(data);

    } catch (e: any) {
      this.app.showNotification(e.message, 'error');
    } finally {
      this.btnRegisterAuth.disabled = false;
      this.btnRegisterAuth.innerHTML = '<i class="fa-solid fa-circle-check"></i> Register Account';
    }
  }

  private async handleAdminKeyLogin() {
    const keyHex = this.adminLoginKeyInput.value.trim();
    if (!keyHex) {
      this.app.showNotification('Please enter the Admin Private Key Hex.', 'error');
      return;
    }

    try {
      this.btnAdminLoginSubmit.disabled = true;
      this.btnAdminLoginSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Key...';

      // The admin public key corresponding to our preset private key:
      const adminPubKeyHex = '3059301306072a8648ce3d020106082a8648ce3d03010703420004f54756c5fea436f3ad4ad2a09a5d26be68ffc1e5f3d92fe7899ad53a601fd80af9333ecef1a20a5068c58d43bba87256581f69d0fa09c24334ddd0bd868fe5c9';

      const w = new Wallet();
      await w.importFromHex(keyHex, adminPubKeyHex);

      const adminAddress = this.app.blockchain.adminAddress;
      if (w.address.toLowerCase() !== adminAddress.toLowerCase()) {
        throw new Error('Imported address does not match system administrator credentials.');
      }

      // Login success
       this.app.activeUser = {
        username: 'admin',
        role: 'ADMIN',
        fullName: 'System Administrator',
        email: 'admin@votechain.net',
        walletAddress: w.address,
        walletPrivateKey: keyHex,
        walletPublicKey: adminPubKeyHex
      };
      localStorage.setItem('votechain_session', JSON.stringify(this.app.activeUser));
      this.app.wallet = w;

      this.adminLoginKeyInput.value = '';
      this.app.showNotification('Admin cryptographic credentials verified successfully!', 'success');
      this.app.refreshAllViews();
      window.location.hash = '#/admin';

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Verification Failed: ${e.message}`, 'error');
    } finally {
      this.btnAdminLoginSubmit.disabled = false;
      this.btnAdminLoginSubmit.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Verify Cryptographic Key';
    }
  }

  private loadDemoAdminKey() {
    this.adminLoginKeyInput.value = '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b020101042013c369ba077f7a330f47615b5e75248e53187fd49eed9df27205c24edf072b2aa14403420004f54756c5fea436f3ad4ad2a09a5d26be68ffc1e5f3d92fe7899ad53a601fd80af9333ecef1a20a5068c58d43bba87256581f69d0fa09c24334ddd0bd868fe5c9';
  }

  private async authenticateSession(profile: UserProfile) {
    this.app.activeUser = profile;
    localStorage.setItem('votechain_session', JSON.stringify(profile));

    // If wallet already exists in details, load it
    if (profile.walletPrivateKey && profile.walletPublicKey) {
      const w = new Wallet();
      await w.importFromHex(profile.walletPrivateKey, profile.walletPublicKey);
      this.app.wallet = w;

      // Sync database profile KYC status back to blockchain if missing on-chain
      if (profile.walletAddress && profile.kycStatus && profile.kycStatus !== 'UNSUBMITTED') {
        const addr = profile.walletAddress.toLowerCase();
        const onChainProfile = this.app.blockchain.voterRegistry.get(addr);
        if (!onChainProfile) {
          this.app.blockchain.voterRegistry.set(addr, {
            name: profile.fullName,
            email: profile.email,
            nicPhoto: profile.nicPhoto || 'https://via.placeholder.com/400x250?text=Loaded+From+Database',
            status: profile.kycStatus as any,
            role: profile.role === 'ADMIN' ? 'VOTER' : (profile.role as any),
            bio: profile.bio || ''
          });

          if (profile.kycStatus === 'VERIFIED') {
            this.app.blockchain.verifiedAddresses.add(addr);
          }
          this.app.blockchain.saveState();
        }
      }
    } else {
      this.app.wallet = null;
    }

    this.loginUsernameInput.value = '';
    this.loginPasswordInput.value = '';
    this.isEditing = false;

    this.app.showNotification(`Signed in successfully as ${profile.fullName}!`, 'success');
    
    // Redirect based on role
    this.app.refreshAllViews();
    
    if (profile.role === 'ADMIN') {
      window.location.hash = '#/admin';
    } else if (profile.role === 'CANDIDATE') {
      window.location.hash = '#/candidate';
    } else {
      window.location.hash = '#/voter';
    }

    // Force immediate router evaluation regardless of whether hash changed
    if (this.app.router) {
      this.app.router.handleRouting();
    }
  }

  private handleSignOut() {
    this.app.activeUser = null;
    this.app.wallet = null;
    this.isEditing = false;
    this.clearFileSelection();
    localStorage.removeItem('votechain_session');
    
    this.app.showNotification('Account signed out successfully.', 'info');
    this.app.refreshAllViews();
    window.location.hash = '#/login';
  }

  // --- CRYPTOGRAPHIC WALLET CREATION POST-LOGIN ---
  private async generateWalletPostLogin() {
    if (!this.app.activeUser) return;
    try {
      this.btnProfileGenerateWallet.disabled = true;
      this.btnProfileGenerateWallet.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Keys...';

      const w = new Wallet();
      await w.generate();
      this.app.wallet = w;

      const activeUser = this.app.activeUser;
      
      const response = await fetch('/api/update-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: activeUser.username,
          walletAddress: w.address,
          walletPrivateKey: w.privateKeyHex,
          walletPublicKey: w.publicKeyHex
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to bind keys.');
      }

      this.app.activeUser = {
        ...activeUser,
        walletAddress: w.address,
        walletPrivateKey: w.privateKeyHex,
        walletPublicKey: w.publicKeyHex
      };

      localStorage.setItem('votechain_session', JSON.stringify(this.app.activeUser));

      this.app.showNotification('Wallet generated and linked to Neon database profile!', 'success');
      this.app.refreshAllViews();
    } catch (e: any) {
      this.app.showNotification(`Key generation failed: ${e.message}`, 'error');
    } finally {
      this.btnProfileGenerateWallet.disabled = false;
      this.btnProfileGenerateWallet.innerHTML = '<i class="fa-solid fa-key"></i> Generate Wallet Key Pair';
    }
  }

  private copyAddress() {
    if (!this.app.wallet) return;
    navigator.clipboard.writeText(this.app.wallet.address).then(() => {
      this.app.showNotification('Derived Wallet Address copied to clipboard!', 'info');
    });
  }

  private async claimFaucetGas() {
    if (!this.app.wallet) return;
    try {
      this.btnLoginClaimFaucet.disabled = true;
      this.btnLoginClaimFaucet.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Requesting Faucet...';

      const w = this.app.wallet;
      const nonce = this.app.blockchain.getNonce(w.address);
      const tx = new Transaction({
        sender: w.address,
        recipient: '0x0000000000000000000000000000000000000000',
        type: 'CLAIM_FAUCET',
        payload: {},
        nonce,
        timestamp: Date.now(),
        publicKey: w.publicKeyHex
      });

      await tx.signTransaction(w);
      await this.app.blockchain.addTransaction(tx);

      this.app.showNotification('Faucet request queued in mempool! Go to explorer to mine it.', 'success');
      this.app.refreshAllViews();
    } catch (e: any) {
      this.app.showNotification(`Faucet failed: ${e.message}`, 'error');
    } finally {
      this.btnLoginClaimFaucet.disabled = false;
      this.btnLoginClaimFaucet.innerHTML = '<i class="fa-solid fa-coins"></i> Claim Faucet Tokens (Gas)';
    }
  }

  // --- KYC SUBMISSION METHODS ---
  private handleFileSelection(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  private setFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.app.showNotification('Only image files are allowed for NIC identification.', 'error');
      return;
    }
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        this.previewImage.src = e.target.result;
        this.previewBox.style.display = 'flex';
        this.fileNameText.textContent = file.name;
        this.uploadStatusText.textContent = 'NIC loaded. Ready to sign.';
      }
    };
    reader.readAsDataURL(file);
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

  private async submitKycProfile() {
    if (!this.app.wallet || !this.app.activeUser) return;

    const activeUser = this.app.activeUser;
    const name = activeUser.fullName;
    const email = activeUser.email;
    const role = activeUser.role;
    const bio = this.regBioText.value.trim();

    if (!this.selectedFile && !this.uploadedImageUrl) {
      this.app.showNotification('Please select or upload your National Identity Card (NIC) photo.', 'error');
      return;
    }

    try {
      this.btnSubmitReg.disabled = true;

      // ── STEP 1: Upload image to ImgBB and get a permanent hosted URL ──
      if (this.selectedFile) {
        this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading NIC photo...';
        this.progressBarContainer.style.display = 'block';
        this.progressBarFill.style.width = '15%';
        this.uploadStatusText.textContent = 'Uploading to image host...';

        const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY;

        if (!imgbbKey) {
          throw new Error('Image hosting API key (VITE_IMGBB_API_KEY) is not configured. Please add it to your .env file.');
        }

        // Convert file to base64 (ImgBB requires base64 without the data:... prefix)
        this.progressBarFill.style.width = '30%';
        const base64Full = await this.readFileAsDataURL(this.selectedFile);
        const base64Data = base64Full.split(',')[1]; // strip data:image/...;base64, prefix

        this.progressBarFill.style.width = '50%';
        this.uploadStatusText.textContent = 'Hosting image on ImgBB...';

        const formData = new FormData();
        formData.append('key', imgbbKey);
        formData.append('image', base64Data);
        formData.append('name', `nic_${activeUser.username}_${Date.now()}`);

        const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
        });

        this.progressBarFill.style.width = '80%';

        if (!imgbbRes.ok) {
          const errData = await imgbbRes.json().catch(() => ({}));
          throw new Error(`Image upload failed: ${errData?.error?.message || `HTTP ${imgbbRes.status}`}`);
        }

        const imgbbData = await imgbbRes.json();

        if (!imgbbData?.success || !imgbbData?.data?.url) {
          throw new Error('Image host did not return a valid URL. Please try again.');
        }

        // ImgBB returns: data.url (direct), data.display_url, data.thumb.url
        this.uploadedImageUrl = imgbbData.data.url;
        this.progressBarFill.style.width = '100%';
        this.uploadStatusText.textContent = `✓ Image hosted successfully!`;
        console.log('NIC photo hosted at:', this.uploadedImageUrl);
      }

      // ── STEP 2: Save the hosted URL to Neon DB ──
      this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Neon Database...';

      const dbResponse = await fetch('/api/update-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: activeUser.username,
          nicPhoto: this.uploadedImageUrl,  // Store the real hosted URL in DB
          bio: bio || ''
        })
      });
      const dbData = await dbResponse.json();
      if (!dbResponse.ok) {
        throw new Error(dbData.error || 'Failed to save KYC credentials to database.');
      }

      // Update local session
      this.app.activeUser.nicPhoto = this.uploadedImageUrl;
      this.app.activeUser.kycStatus = 'PENDING';
      this.app.activeUser.bio = bio || '';
      localStorage.setItem('votechain_session', JSON.stringify(this.app.activeUser));

      // ── STEP 3: Build & sign the on-chain KYC transaction ──
      // The hosted URL is short (~50 chars) so safe to embed in the transaction payload
      this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing KYC Registry...';

      const w = this.app.wallet;
      const currentNonce = this.app.blockchain.getNonce(w.address);
      const isCandidate = role === 'CANDIDATE';

      const payload: any = {
        name,
        email,
        nicPhoto: this.uploadedImageUrl  // Real hosted URL stored on-chain
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

      await tx.signTransaction(w);
      await this.app.blockchain.addTransaction(tx);

      this.isEditing = false;
      this.app.showNotification('KYC application submitted! Photo hosted, saved to database, and registered on-chain.', 'success');
      this.app.refreshAllViews();

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`KYC submit failed: ${e.message}`, 'error');
      this.progressBarFill.style.width = '0%';
      this.uploadStatusText.textContent = 'Upload failed. Try again.';
    } finally {
      this.btnSubmitReg.disabled = false;
      this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-file-signature"></i> Sign &amp; Submit KYC Registration';

    }
  }

  private toggleKeysDisplay() {
    const isHidden = this.keysBox.style.display === 'none';
    if (isHidden) {
      this.keysBox.style.display = 'flex';
      this.keysChevron.classList.remove('fa-chevron-down');
      this.keysChevron.classList.add('fa-chevron-up');
    } else {
      this.keysBox.style.display = 'none';
      this.keysChevron.classList.remove('fa-chevron-up');
      this.keysChevron.classList.add('fa-chevron-down');
    }
  }

  /** Called by sidebar sign-out button */
  public triggerSignOut() {
    this.handleSignOut();
  }

  // --- RENDER LOGIC ---
  render() {
    const isLoggedIn = this.app.activeUser !== null;
    const currentHash = window.location.hash;
    const isLoginScreen = currentHash === '#/login' || currentHash === '#/admin/login';
    const isProfilePanel = currentHash === '#/profile';

    // If on login screen and not logged in — show login forms
    if (isLoginScreen && !isLoggedIn) {
      return; // login screen HTML is always visible, no action needed
    }

    // If on profile panel and logged in — show connected view
    if (isProfilePanel && isLoggedIn) {
      if (this.connectedView) this.connectedView.style.display = 'flex';
      this.renderProfileConnected();
    }
  }

  private renderProfileConnected() {
    if (!this.app.activeUser) return;

    const user = this.app.activeUser;

    // Update profile fields
    if (this.sessUsername) this.sessUsername.textContent = user.username;
    if (this.sessFullname) this.sessFullname.textContent = user.fullName;
    if (this.sessEmail) this.sessEmail.textContent = user.email;

    // Update role badge
    if (this.sessRole) {
      const roleClasses: Record<string, string> = { VOTER: 'verified', CANDIDATE: 'unverified', ADMIN: 'unverified' };
      const roleColors: Record<string, string> = { VOTER: '', CANDIDATE: 'color: var(--color-primary); border-color: rgba(157,78,221,0.3); background: rgba(157,78,221,0.1);', ADMIN: 'color: var(--color-warning); border-color: rgba(255,183,0,0.3); background: rgba(255,183,0,0.08);' };
      this.sessRole.className = `status-badge ${roleClasses[user.role] || 'verified'}`;
      this.sessRole.style.cssText = roleColors[user.role] || '';
      this.sessRole.textContent = user.role;
    }

    // Wallet section
    const hasWallet = this.app.wallet !== null;
    if (!hasWallet) {
      if (this.walletDisconnectedSubview) this.walletDisconnectedSubview.style.display = 'flex';
      if (this.walletConnectedSubview) this.walletConnectedSubview.style.display = 'none';
      return;
    }

    if (this.walletDisconnectedSubview) this.walletDisconnectedSubview.style.display = 'none';
    if (this.walletConnectedSubview) this.walletConnectedSubview.style.display = 'flex';

    const w = this.app.wallet!;
    if (this.sessWalletAddress) this.sessWalletAddress.textContent = w.address;
    if (this.pubkeyHexArea) this.pubkeyHexArea.value = w.publicKeyHex;
    if (this.privkeyHexArea) this.privkeyHexArea.value = w.privateKeyHex;

    // Faucet button
    if (this.btnLoginClaimFaucet) this.btnLoginClaimFaucet.style.display = 'block';

    // KYC status check across Blockchain Registry, Mempool, and Database Profile
    const profile = this.app.blockchain.voterRegistry.get(w.address.toLowerCase());

    const pendingKycTx = this.app.blockchain.pendingTransactions.find(t =>
      t.sender.toLowerCase() === w.address.toLowerCase() &&
      (t.type === 'REGISTER_VOTER_KYC' || t.type === 'REGISTER_CANDIDATE_KYC')
    );

    // Check if there's a pending VERIFY_IDENTITY tx for this user (approval in flight)
    const pendingVerifyTx = this.app.blockchain.pendingTransactions.find(t =>
      t.type === 'VERIFY_IDENTITY' &&
      t.payload.targetAddress?.toLowerCase() === w.address.toLowerCase()
    );

    let displayProfile: { name: string; email: string; nicPhoto: string; status: string; role: string; bio?: string } | null = null;

    if (profile) {
      // Resolve nicPhoto: if blockchain has a compact reference, use session photo (from DB)
      let resolvedPhoto = profile.nicPhoto;
      if (!resolvedPhoto || resolvedPhoto.startsWith('kyc:db:')) {
        resolvedPhoto = user.nicPhoto || 'https://via.placeholder.com/400x250?text=NIC+Photo';
      }
      // If approval is in-flight show status as VERIFYING to avoid confusion
      const displayStatus = pendingVerifyTx && profile.status === 'PENDING'
        ? 'VERIFYING'
        : profile.status;
      displayProfile = {
        name: profile.name,
        email: profile.email,
        nicPhoto: resolvedPhoto,
        status: displayStatus,
        role: profile.role,
        bio: profile.bio
      };
      // Sync session kycStatus with on-chain state
      if (this.app.activeUser && profile.status !== this.app.activeUser.kycStatus) {
        this.app.activeUser.kycStatus = profile.status;
        localStorage.setItem('votechain_session', JSON.stringify(this.app.activeUser));
      }
    } else if (pendingKycTx) {
      let resolvedPhoto = pendingKycTx.payload.nicPhoto;
      if (!resolvedPhoto || resolvedPhoto.startsWith('kyc:db:')) {
        resolvedPhoto = user.nicPhoto || 'https://via.placeholder.com/400x250?text=NIC+Photo';
      }
      displayProfile = {
        name: pendingKycTx.payload.name,
        email: pendingKycTx.payload.email,
        nicPhoto: resolvedPhoto,
        status: 'PENDING',
        role: pendingKycTx.type === 'REGISTER_CANDIDATE_KYC' ? 'CANDIDATE' : 'VOTER',
        bio: pendingKycTx.payload.bio
      };
    } else if (user.kycStatus && user.kycStatus !== 'UNSUBMITTED') {
      displayProfile = {
        name: user.fullName,
        email: user.email,
        nicPhoto: user.nicPhoto || 'https://via.placeholder.com/400x250?text=NIC+Photo+Unavailable',
        status: user.kycStatus,
        role: user.role,
        bio: user.bio
      };
    }

    // Candidate bio field visibility
    if (this.regBioGroup) {
      this.regBioGroup.style.display = user.role === 'CANDIDATE' ? 'flex' : 'none';
    }

    if (!displayProfile || this.isEditing) {
      if (this.kycRegistrationSubview) this.kycRegistrationSubview.style.display = 'flex';
      if (this.kycCompletedSubview) this.kycCompletedSubview.style.display = 'none';

      if (displayProfile && this.isEditing) {
        if (this.regBioText) this.regBioText.value = displayProfile.bio || '';
        this.uploadedImageUrl = displayProfile.nicPhoto;
        if (this.previewImage) this.previewImage.src = displayProfile.nicPhoto;
        if (this.previewBox) this.previewBox.style.display = 'flex';
        if (this.fileNameText) this.fileNameText.textContent = 'Current photo loaded.';
        if (this.uploadStatusText) this.uploadStatusText.textContent = 'Drag a new image to replace.';
      }
    } else {
      if (this.kycRegistrationSubview) this.kycRegistrationSubview.style.display = 'none';
      if (this.kycCompletedSubview) this.kycCompletedSubview.style.display = 'flex';

      if (this.sessKycStatusBadge) {
        const badge = this.sessKycStatusBadge;
        if (displayProfile.status === 'VERIFIED') {
          badge.innerHTML = '<span class="status-badge verified"><i class="fa-solid fa-circle-check"></i> Verified On-Chain</span>';
        } else if (displayProfile.status === 'REJECTED') {
          badge.innerHTML = '<span class="status-badge rejected"><i class="fa-solid fa-circle-xmark"></i> Application Rejected</span>';
        } else if (displayProfile.status === 'VERIFYING') {
          badge.innerHTML = '<span class="status-badge pending" style="color: var(--color-secondary);"><i class="fa-solid fa-shield-halved fa-spin"></i> Verification Mining...</span>';
        } else {
          badge.innerHTML = '<span class="status-badge pending"><i class="fa-solid fa-hourglass-half"></i> Audit Pending</span>';
        }
      }

      if (this.submittedDetailsBox) {
        this.submittedDetailsBox.innerHTML = `
          <div class="profile-data-row"><span class="profile-data-label">Name on Record</span><span class="profile-data-value">${displayProfile.name}</span></div>
          <div class="profile-data-row"><span class="profile-data-label">Email</span><span class="profile-data-value">${displayProfile.email}</span></div>
          <div class="profile-data-row"><span class="profile-data-label">Role</span><span class="profile-data-value">${displayProfile.role}</span></div>
          ${displayProfile.bio ? `<div class="profile-data-row"><span class="profile-data-label">Manifesto</span><span class="profile-data-value" title="${displayProfile.bio}" style="max-width: 50%; white-space: normal;">${displayProfile.bio.substring(0, 80)}${displayProfile.bio.length > 80 ? '...' : ''}</span></div>` : ''}
          <div style="margin-top: 0.5rem;">
            <span class="profile-data-label">NIC Document</span>
            <img src="${displayProfile.nicPhoto}" alt="NIC" style="width: 100%; max-height: 140px; object-fit: contain; background: var(--bg-main); border: 1px solid var(--border-color); margin-top: 0.4rem; display: block;" />
          </div>
          <button id="btn-edit-profile" class="btn btn-ghost btn-sm" style="margin-top: 0.5rem;"><i class="fa-solid fa-user-pen"></i> Edit KYC Details</button>
        `;
        document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
          this.isEditing = true;
          this.render();
        });
      }
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
