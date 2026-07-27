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
  private anonymousView!: HTMLElement;
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

  // Demo buttons
  private btnDemoAdmin!: HTMLButtonElement;
  private btnDemoVoter!: HTMLButtonElement;
  private btnDemoCandidate!: HTMLButtonElement;

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
    this.seedUsersDatabase();
    this.initElements();
    this.initEvents();
  }

  private seedUsersDatabase() {
    const existing = localStorage.getItem('votechain_users');
    if (!existing) {
      const defaultUsers: Record<string, UserProfile & { passwordHash: string }> = {
        admin: {
          username: 'admin',
          passwordHash: 'admin', // Demo simple password match
          role: 'ADMIN',
          fullName: 'System Administrator',
          email: 'admin@votechain.net',
          walletAddress: '0xe513658465d6997d28be6460851b77dc703bf13a',
          walletPrivateKey: '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b020101042013c369ba077f7a330f47615b5e75248e53187fd49eed9df27205c24edf072b2aa14403420004f54756c5fea436f3ad4ad2a09a5d26be68ffc1e5f3d92fe7899ad53a601fd80af9333ecef1a20a5068c58d43bba87256581f69d0fa09c24334ddd0bd868fe5c9',
          walletPublicKey: '3059301306072a8648ce3d020106082a8648ce3d03010703420004f54756c5fea436f3ad4ad2a09a5d26be68ffc1e5f3d92fe7899ad53a601fd80af9333ecef1a20a5068c58d43bba87256581f69d0fa09c24334ddd0bd868fe5c9'
        },
        voter: {
          username: 'voter',
          passwordHash: 'voter',
          role: 'VOTER',
          fullName: 'Demo Voter Profile',
          email: 'voter@votechain.net',
          walletAddress: '0x5a54ae7355004c6834bb619bc411a2c1bb71fb91',
          walletPrivateKey: '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b020101042037d182389d0763c9898910cef4b767b083c6a1588565021e32e022851608f2c6a14403420004dfb2a82844c4f6f6b0ce4c11bda1cdbd404201787f6ba69692ea9de98412e8ea7fd4ee32891c1e40ea89d9a3e2ed9314c21dcc3600ece8a527fb86e1d658d4d1',
          walletPublicKey: '3059301306072a8648ce3d020106082a8648ce3d03010703420004dfb2a82844c4f6f6b0ce4c11bda1cdbd404201787f6ba69692ea9de98412e8ea7fd4ee32891c1e40ea89d9a3e2ed9314c21dcc3600ece8a527fb86e1d658d4d1'
        },
        candidate: {
          username: 'candidate',
          passwordHash: 'candidate',
          role: 'CANDIDATE',
          fullName: 'Demo Candidate platform',
          email: 'candidate@votechain.net',
          walletAddress: '0x1fc1a0c3e8f4f0713ec2a921120765fca726cafb',
          walletPrivateKey: '308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420bbad54903c36aa68d8705d620444ee2e2ffacc4fc53fbf5fbd531573781ad342a14403420004fa6f63b3486b75e8ac8308008a2c78d4cefb55a946b83586c0c100259fc2798fdb8faaf9e88428856df4f594e224d008efc4b2208c840559cb754cb6a022aeb9',
          walletPublicKey: '3059301306072a8648ce3d020106082a8648ce3d03010703420004fa6f63b3486b75e8ac8308008a2c78d4cefb55a946b83586c0c100259fc2798fdb8faaf9e88428856df4f594e224d008efc4b2208c840559cb754cb6a022aeb9'
        }
      };
      localStorage.setItem('votechain_users', JSON.stringify(defaultUsers));
    }
  }

  private initElements() {
    // Tabs
    this.tabSignIn = document.getElementById('tab-btn-signin') as HTMLButtonElement;
    this.tabSignUp = document.getElementById('tab-btn-signup') as HTMLButtonElement;
    this.signInForm = document.getElementById('auth-signin-form')!;
    this.signUpForm = document.getElementById('auth-signup-form')!;

    // Anonymous views
    this.anonymousView = document.getElementById('login-anonymous-view')!;
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

    // Demo buttons
    this.btnDemoAdmin = document.getElementById('btn-demo-admin') as HTMLButtonElement;
    this.btnDemoVoter = document.getElementById('btn-demo-voter') as HTMLButtonElement;
    this.btnDemoCandidate = document.getElementById('btn-demo-candidate') as HTMLButtonElement;

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
  }

  private initEvents() {
    // Tab switching
    this.tabSignIn.addEventListener('click', () => this.switchTab('signin'));
    this.tabSignUp.addEventListener('click', () => this.switchTab('signup'));

    // Auth events
    this.btnLoginAuth.addEventListener('click', () => this.handleSignIn());
    this.btnRegisterAuth.addEventListener('click', () => this.handleSignUp());
    this.btnDisconnect.addEventListener('click', () => this.handleSignOut());

    // Demo Logins
    this.btnDemoAdmin.addEventListener('click', () => this.quickLogin('admin', 'admin'));
    this.btnDemoVoter.addEventListener('click', () => this.quickLogin('voter', 'voter'));
    this.btnDemoCandidate.addEventListener('click', () => this.quickLogin('candidate', 'candidate'));

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
  private handleSignIn() {
    const username = this.loginUsernameInput.value.trim().toLowerCase();
    const password = this.loginPasswordInput.value.trim();

    if (!username || !password) {
      this.app.showNotification('Please enter both username and password.', 'error');
      return;
    }

    const users = JSON.parse(localStorage.getItem('votechain_users') || '{}');
    const user = users[username];

    if (!user || user.passwordHash !== password) {
      this.app.showNotification('Invalid username or password credentials.', 'error');
      return;
    }

    // Success Authentication
    this.authenticateSession(user);
  }

  private handleSignUp() {
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

    const users = JSON.parse(localStorage.getItem('votechain_users') || '{}');
    if (users[username]) {
      this.app.showNotification('Username already registered.', 'error');
      return;
    }

    // Save account
    users[username] = {
      username,
      passwordHash: password,
      role,
      fullName,
      email
    };
    localStorage.setItem('votechain_users', JSON.stringify(users));

    this.app.showNotification('Account created successfully! Logging you in...', 'success');
    this.registerUsernameInput.value = '';
    this.registerPasswordInput.value = '';
    this.registerFullnameInput.value = '';
    this.registerEmailInput.value = '';

    this.authenticateSession(users[username]);
  }

  private quickLogin(username: string, pass: string) {
    this.loginUsernameInput.value = username;
    this.loginPasswordInput.value = pass;
    this.handleSignIn();
  }

  private async authenticateSession(profile: UserProfile) {
    this.app.activeUser = profile;

    // If wallet already exists in details, load it
    if (profile.walletPrivateKey && profile.walletPublicKey) {
      const w = new Wallet();
      await w.importFromHex(profile.walletPrivateKey, profile.walletPublicKey);
      this.app.wallet = w;
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
  }

  private handleSignOut() {
    this.app.activeUser = null;
    this.app.wallet = null;
    this.isEditing = false;
    this.clearFileSelection();
    
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

      // Persist the new wallet parameters in simulated user database
      const users = JSON.parse(localStorage.getItem('votechain_users') || '{}');
      const activeUser = this.app.activeUser;
      if (users[activeUser.username]) {
        users[activeUser.username].walletPrivateKey = w.privateKeyHex;
        users[activeUser.username].walletPublicKey = w.publicKeyHex;
        users[activeUser.username].walletAddress = w.address;
        
        // Sync local app state
        this.app.activeUser = users[activeUser.username];
        localStorage.setItem('votechain_users', JSON.stringify(users));
      }

      this.app.showNotification('Asymmetric keypair generated via Web Crypto API!', 'success');
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

      // 1. Upload NIC to ImgBB if a new file is selected
      if (this.selectedFile) {
        this.btnSubmitReg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading NIC to ImgBB...';
        this.progressBarContainer.style.display = 'block';
        this.progressBarFill.style.width = '20%';
        this.uploadStatusText.textContent = 'Uploading image...';

        const apiKey = import.meta.env.VITE_IMGBB_API_KEY || 'bbfda5a6eaea6c85b9c3125b4c8cc463';

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

      await tx.signTransaction(w);
      await this.app.blockchain.addTransaction(tx);

      this.isEditing = false;
      this.app.showNotification('KYC application submitted! Queueing block mining...', 'success');
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

  // --- RENDER LOGIC ---
  render() {
    const isLoggedIn = this.app.activeUser !== null;
    if (!isLoggedIn) {
      document.body.classList.add('logged-out');
      this.anonymousView.style.display = 'flex';
      this.connectedView.style.display = 'none';
      return;
    }

    document.body.classList.remove('logged-out');
    this.anonymousView.style.display = 'none';
    this.connectedView.style.display = 'flex';

    const user = this.app.activeUser!;
    this.sessUsername.textContent = user.username;
    this.sessFullname.textContent = user.fullName;
    this.sessEmail.textContent = user.email;
    this.sessRole.textContent = user.role;

    // Wallet generation subviews check
    const hasWallet = this.app.wallet !== null;
    if (!hasWallet) {
      this.walletDisconnectedSubview.style.display = 'flex';
      this.walletConnectedSubview.style.display = 'none';
      return;
    }

    this.walletDisconnectedSubview.style.display = 'none';
    this.walletConnectedSubview.style.display = 'flex';

    const w = this.app.wallet!;
    this.sessWalletAddress.textContent = w.address;
    this.pubkeyHexArea.value = w.publicKeyHex;
    this.privkeyHexArea.value = w.privateKeyHex;

    // Toggle faucet button based on roles (all users can claim faucet, but only if they need gas)
    this.btnLoginClaimFaucet.style.display = 'block';

    // Sync KYC status views
    const profile = this.app.blockchain.voterRegistry.get(w.address.toLowerCase());
    
    // Bio element role toggle
    if (user.role === 'CANDIDATE') {
      this.regBioGroup.style.display = 'flex';
    } else {
      this.regBioGroup.style.display = 'none';
    }

    if (!profile || this.isEditing) {
      // Form submission layout
      this.kycRegistrationSubview.style.display = 'flex';
      this.kycCompletedSubview.style.display = 'none';
      
      if (profile && this.isEditing) {
        this.regBioText.value = profile.bio || '';
        this.uploadedImageUrl = profile.nicPhoto;
        this.previewImage.src = profile.nicPhoto;
        this.previewBox.style.display = 'flex';
        this.fileNameText.textContent = 'Recycled current photo';
        this.uploadStatusText.textContent = 'Current photo loaded. Re-upload drag zone optional.';
      }
    } else {
      // Submitted layout
      this.kycRegistrationSubview.style.display = 'none';
      this.kycCompletedSubview.style.display = 'flex';

      const badge = this.sessKycStatusBadge;
      badge.className = '';
      badge.style.display = 'inline-flex';

      if (profile.status === 'VERIFIED') {
        badge.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--color-secondary);"></i> Verified On-Chain';
        badge.style.color = 'var(--color-secondary)';
      } else if (profile.status === 'REJECTED') {
        badge.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: var(--color-danger);"></i> Application Rejected';
        badge.style.color = 'var(--color-danger)';
      } else {
        badge.innerHTML = '<i class="fa-solid fa-hourglass-half" style="color: var(--color-primary);"></i> Audit Pending';
        badge.style.color = 'var(--color-primary)';
      }

      this.submittedDetailsBox.innerHTML = `
        <div><strong>Name on Record:</strong> ${profile.name}</div>
        <div><strong>Email Address:</strong> ${profile.email}</div>
        <div><strong>Registered Role:</strong> ${profile.role}</div>
        ${profile.bio ? `<div><strong>Manifesto:</strong> "${profile.bio}"</div>` : ''}
        <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem;">
          <strong>NIC ID Card File:</strong>
          <img src="${profile.nicPhoto}" alt="NIC" style="width: 100%; max-height: 120px; object-fit: contain; border: 1px solid var(--border-color); background: var(--bg-main);" />
        </div>
        <button id="btn-edit-profile" class="btn btn-secondary" style="margin-top: 0.75rem; font-size: 0.8rem; padding: 0.4rem 0.75rem;"><i class="fa-solid fa-user-pen"></i> Edit Profile Details</button>
      `;

      // Bind edit button click handler
      document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
        this.isEditing = true;
        this.render();
      });
    }
  }
}
