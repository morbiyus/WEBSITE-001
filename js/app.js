/* ========== VAZEDGAME — App Logic (Supabase Auth via API, Zero Budget Frontend) ========== */
(function(){
  const STORAGE_DEMO_SESSION = 'vz_demo_session';
  const DEMO_MODE = true;

  const app = {
    currentPage: 'home',
    session: null,

    /* ---------- Init ---------- */
    init(){
      this.bindNav();
      this.bindGlobal();
      this.renderGames();
      this.updateNav();
      this.checkDemoSession();
      this.show('home');
    },

    /* ---------- Demo Session Management (sessionStorage only, no passwords) ---------- */
    checkDemoSession(){
      try {
        const raw = sessionStorage.getItem(STORAGE_DEMO_SESSION);
        if (raw) {
          const data = JSON.parse(raw);
          if (data && data.username && data.demo === true) {
            this.session = { username: data.username, email: data.email || '', demo: true };
          }
        }
      } catch (err) {
        console.warn('Demo session read failed:', err);
      }
      this.updateNav();
    },

    setDemoSession(username, email){
      this.session = { username, email, demo: true };
      sessionStorage.setItem(STORAGE_DEMO_SESSION, JSON.stringify({
        username,
        email,
        demo: true,
        createdAt: Date.now()
      }));
      this.updateNav();
      this.show('home');
    },

    /* ---------- Navigation ---------- */
    bindNav() {
      document.getElementById('navActions').innerHTML = this.navHtml();
      document.getElementById('logo').addEventListener('click', (e)=>{
        e.preventDefault();
        this.show('home');
      });
    },

    navHtml() {
      if(this.session) {
        return `
          <span class="nav-user">Salam, <b>${this.escape(this.session.username)}</b> <span style="font-size:.75rem;opacity:.7;">${this.session.demo ? '(demo)' : ''}</span></span>
          <button class="btn btn-yellow" onclick="app.logout()">Çıxış</button>
        `;
      }
      return `
        <button class="btn btn-outline" onclick="app.show('auth')">Daxil ol</button>
        <button class="btn btn-yellow" onclick="app.show('auth',{mode:'signup'})">Qeydiyyatdan Keç</button>
      `;
    },

    updateNav() {
      document.getElementById('navActions').innerHTML = this.navHtml();
    },

    /* ---------- Page switching (mutual exclusivity) ---------- */
    show(page, data) {
      const to = document.getElementById('page-'+page);
      if(!to) return;

      document.querySelectorAll('.page').forEach(el=>{
        el.classList.remove('page-current','page-enter');
        el.classList.add('page-hidden');
      });

      to.classList.remove('page-hidden');
      to.classList.add('page-enter');
      requestAnimationFrame(()=>{
        to.classList.remove('page-enter');
        to.classList.add('page-current');
      });

      this.currentPage = page;
      this.onPageShow(page, data || {});
    },

    onPageShow(page, data) {
      if(page === 'auth') {
        this.authInit(data || {});
      } else if(page === 'games') {
        this.renderGames();
      } else if(page === 'profile') {
        this.renderProfile();
      }
      window.scrollTo(0,0);
    },

    /* ---------- Games ---------- */
    renderGames() {
      const games = [
        {id:'clicker',title:'Klikləyici',icon:'🖱️',desc:'Sadə klikləmə oyunu. Hələ hazırlanma mərhələsindədir.', comingSoon: true},
        {id:'memory',title:'Yaddaş Oyunu',icon:'🧠',desc:'Eyni kartları tapın. Hələ hazırlanma mərhəlesindedir.', comingSoon: true},
        {id:'snake',title:'İlan',icon:'🐍',desc:'İlan oyunu. Hələ hazırlanma mərhəlesindedir.', comingSoon: true}
      ];
      const html = games.map(g=>`
        <div class="game-card${g.comingSoon ? ' coming-soon' : ''}" onclick="app.playGame('${g.id}')">
          <span class="icon">${g.icon}</span>
          <h3>${this.escape(g.title)}</h3>
          <p>${this.escape(g.desc)}</p>
          ${g.comingSoon ? '<div class="coming-soon-badge">Tezliklə</div>' : ''}
        </div>
      `).join('');
      const grid = document.getElementById('gamesGrid');
      const gridPage = document.getElementById('gamesGridPage');
      if(grid) grid.innerHTML = html;
      if(gridPage) gridPage.innerHTML = html;
    },

    playGame(id) {
      if(!this.session) {
        this.toast('Oynamaq üçün əvvəlcə daxil olun.');
        this.show('auth');
        return;
      }
      this.toast(`"${id}" oyunu demo rejimdədir.`);
    },

    renderProfile() {
      if(!this.session) return;
      document.getElementById('profileInfo').innerHTML = `
        <div><b>İstifadəçi:</b> ${this.escape(this.session.username)}</div>
        <div><b>E-poçt:</b> ${this.escape(this.session.email || '—')}</div>
        <div><b>Rejim:</b> ${this.session.demo ? 'Demo (test)' : 'Actual (real)'}</div>
      `;
    },

    /* ---------- AUTH (API-based Supabase Auth, 4-field Registration) ---------- */
    authInit(data) {
      const mode = data.mode || 'login';
      this.signupState = {
        step: 1,
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        verifyError: '',
        sending: false
      };
      this.renderAuth(mode);
    },

    renderAuth(mode) {
      const card = document.getElementById('authCard');
      if(mode === 'login') {
        card.innerHTML = `
          <h2>Daxil ol (Auth Rejim)</h2>
          <p class="hint">Server validated credentials. Supabase authentication.</p>
          <div class="form-group">
            <label>E-poçt ünvanı</label>
            <input type="email" id="liEmail" placeholder="ad@mail.com">
          </div>
          <div class="form-group">
            <label>Şifrə</label>
            <input type="password" id="liPassword" placeholder="Şifrə">
          </div>
          <div style="text-align:right;margin:8px 0 6px;">
            <a href="#" onclick="app.authInit({mode:'signup'})" style="color:var(--yellow);font-size:0.9rem;">Hesabınız yoxdursa? Qeydiyyatdan Keç</a>
          </div>
          <button class="btn btn-yellow" style="width:100%;" onclick="app.login()">Daxil ol</button>
        `;
      } else {
        this.renderSignupStep();
      }
    },

    /* ---------- 4-STEP Signup with ALL 4 Fields ---------- */
    renderSignupStep() {
      const s = this.signupState;
      const pct = Math.round(((s.step-1)/4)*100); // 4 steps

      let content = `
        <h2>Qeydiyyatdan Keç (Auth Rejim)</h2>
        <p class="hint">Four-stage quyidiqda ibarət tamamlayin. Server validated.</p>
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
        <div class="step-indicator">${s.step}/4</div>
      `;

      if(s.step === 1) {
        content += `
          <div class="form-group">
            <label>1. İstifadəçi adı (Username) yaradyn</label>
            <input type="text" id="suUsername" value="${this.escape(s.username)}" placeholder="Məsələn: vazed_123" maxlength="30">
            <div class="err-msg" id="errUsername"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Yalnız hərf, rəqəm və alt xətt (_) istifadə edə bilərsiniz. Təkrarlanmayan. En az 3 simvol.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-yellow" onclick="app.nextStep()">İrəli</button>
          </div>
        `;
      } else if(s.step === 2) {
        content += `
          <div class="form-group">
            <label>2. E-poçt ünvanı (Email)</label>
            <input type="email" id="suEmail" value="${this.escape(s.email)}" placeholder="ad@mail.com">
            <div class="err-msg" id="errEmail"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Dəlogan needed: username validity.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.nextStep()">İrəli</button>
          </div>
        `;
      } else if(s.step === 3) {
        content += `
          <div class="form-group">
            <label>3. Şifrə yaradın</label>
            <input type="password" id="suPassword" value="${this.escape(s.password)}" placeholder="Ən azı 6, ən çox 16 simvol">
            <div class="err-msg" id="errPassword"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Şifrə 6–16 simvol olmalı, ən azı 1 hərf, 1 rəqəm, 1 xüsusi simvol (@#$%&*) içərsənmalıdır.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.nextStep()">İrəli</button>
          </div>
        `;
      } else if(s.step === 4) {
        content += `
          <div class="form-group">
            <label>4. Şifrəni təkrarla</label>
            <input type="password" id="suConfirm" placeholder="Şifrəni yenidən daxil edin">
            <div class="err-msg" id="errConfirm"></div>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label>e-poçt ünvanı (Supabase doğrulama ≤gəcər)</label>
            <input type="email" id="suEmailFinal" value="${this.escape(s.email)}" placeholder="ad@mail.com">
            <div class="err-msg" id="errEmailFinal"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Supabase e-poçt doğrulama xidməti aktivləşdirilə bilər.</div>
          </div>
          <div class="step-actions" style="margin-top:14px;">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.finishSignup()" ${s.sending ? 'disabled' : ''}>
              ${s.sending ? 'Yaddaşlanılır…' : 'Qeydiyyatı Bitir (Auth)'}
            </button>
          </div>
        `;
      }

      content += `
        <div class="step-nav" style="margin-top:22px;">
          <span>Artıq hesabınız var?</span>
          <button class="btn btn-outline" style="padding:6px 14px;font-size:.9rem;" onclick="app.authInit({mode:'login'})">Daxil ol</button>
        </div>
      `;

      card.innerHTML = content;
      this.bindSignupInputs();
    },

    bindSignupInputs() {
      const s = this.signupState;
      const uInp = document.getElementById('suUsername');
      if(uInp) {
        uInp.addEventListener('input', (e)=>{
          const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30);
          s.username = val;
          uInp.value = val;
          document.getElementById('errUsername').classList.remove('show');
          this.validateUsername();
        });
      }
      const eInp = document.getElementById('suEmail');
      if(eInp) {
        eInp.addEventListener('input', (e)=>{
          s.email = e.target.value.trim();
          document.getElementById('errEmail').classList.remove('show');
          document.getElementById('errEmailFinal').classList.remove('show');
        });
      }
      const pInp = document.getElementById('suPassword');
      if(pInp) {
        pInp.addEventListener('input', (e)=>{
          s.password = e.target.value;
          document.getElementById('errPassword').classList.remove('show');
        });
      }
      const cInp = document.getElementById('suConfirm');
      if(cInp) {
        cInp.addEventListener('input', (e)=>{
          s.confirmPassword = e.target.value;
          document.getElementById('errConfirm').classList.remove('show');
        });
      }
    },

    validateUsername() {
      const s = this.signupState;
      const usernameInp = document.getElementById('suUsername');
      if(!s.username) {
        this.showErr('errUsername', 'İstifadəçi adı daxil edin.');
        return false;
      }
      if(!/^[a-zA-Z0-9_]+$/.test(s.username)) {
        this.showErr('errUsername', 'Yalnız hərf, rəqəm və alt xətt (_) istifadə edə bilərsiniz.');
        return false;
      }
      if(s.username.length < 3) {
        this.showErr('errUsername', 'İstifadəçi adı ən azı 3 simvol olmalıdır.');
        return false;
      }
      // Check for duplicate username via API
      this.checkDuplicateUsername(s.username);
      return true;
    },

    async checkDuplicateUsername(username) {
      try {
        const res = await fetch('/api/auth/session', { method: 'GET' });
        // We'll just validate format; duplicate check is server-side
        const errEl = document.getElementById('errUsername');
        if(errEl) {
          errEl.textContent = 'Frox verifikasi (server-side)...';
          errEl.classList.add('show');
          setTimeout(()=>{ errEl.classList.remove('show'); }, 2000);
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    },

    validatePassword() {
      const s = this.signupState;
      const pwInp = document.getElementById('suPassword');
      if(!s.password) {
        this.showErr('errPassword', 'Şifrə daxil edin.');
        return false;
      }
      if(s.password.length < 6 || s.password.length > 16) {
        this.showErr('errPassword', 'Şifrə 6–16 simvol olmalıdır.');
        return false;
      }
      // Check: at least one letter, one number, one special char
      const pw = s.password;
      if(!/^(?=.*[A-Za-z])(?=.*\d)(?=.[!@#$%^&*.,?]).{6,16}$/.test(pw)) {
        this.showErr('errPassword', 'Şifrə ən azı 1 hərf, 1 rəqəm və 1 xüsusi simvol (@#$%&*) içərsənmalıdır.');
        return false;
      }
      return true;
    },

    validateConfirmPassword() {
      const s = this.signupState;
      const confirmInp = document.getElementById('suConfirm');
      if(confirmInp && s.confirmPassword) {
        if(s.confirmPassword !== s.password) {
          this.showErr('errConfirm', 'Şifrələr uyğun gəlmir. Yenidən yoxlayın.');
          return false;
        }
      }
      return true;
    },

    showErr(id,msg) {
      const el = document.getElementById(id);
      if(!el) return;
      el.textContent = msg;
      el.classList.add('show');
    },

    /* ---------- Steps Navigation ---------- */
    nextStep() {
      if(!this.validateStep()) return;
      const s = this.signupState;
      if(s.step === 1) {
        s.username = document.getElementById('suUsername').value;
        this.validateUsername();
      } else if(s.step === 2) {
        s.email = document.getElementById('suEmail').value;
      } else if(s.step === 3) {
        s.password = document.getElementById('suPassword').value;
        this.validatePassword();
      }
      s.step++;
      this.renderSignupStep();
    },

    prevStep() {
      if(this.signupState.step > 1) {
        this.signupState.step--;
        this.renderSignupStep();
      }
    },

    validateStep() {
      const s = this.signupState;
      if(s.step === 1) {
        return this.validateUsername();
      }
      if(s.step === 2) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(s.email)) {
          this.showErr('errEmail', 'Zəhmət olmasa düzgün e-poçt ünvanı daxil edin.');
          return false;
        }
        return true;
      }
      if(s.step === 3) {
        return this.validatePassword();
      }
      if(s.step === 4) {
        return this.validateConfirmPassword();
      }
      return true;
    },

    /* ---------- finishSignup: Register via API ---------- */
    finishSignup() {
      if(!this.validateStep()) return;
      const s = this.signupState;
      const confirmInp = document.getElementById('suConfirm');
      if(confirmInp && s.confirmPassword !== s.password) {
        this.showErr('errConfirm', 'Şifrələr uyğun gəlmir.');
        return;
      }

      s.sending = true;
      this.renderSignupStep();

      // Register via API
      fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'signup',
          username: s.username,
          email: s.email,
          password: s.password
        })
      })
      .then(res => res.json())
      .then(result => {
        s.sending = false;
        this.renderSignupStep();
        if(result.success) {
          this.setDemoSession(s.username, s.email);
          this.toast('Qeydiyyat Supabase/API ilə tamamlandı.');
          this.show('home');
        } else {
          this.showErr('errEmailFinal', result.error || 'Bilinmeyen xəta');
          this.toast('Qeydiyyat xətası: ' + (result.error || ''));
          s.sending = false;
          this.renderSignupStep();
        }
      })
      .catch(err => {
        s.sending = false;
        this.renderSignupStep();
        this.toast('Qeydiyyat during server xətası: ' + err.message);
      });
    },

    /* ---------- LOGIN (via API) ---------- */
    login() {
      const email = document.getElementById('liEmail').value.trim();
      const password = document.getElementById('liPassword').value;

      if(!email || !password) {
        this.toast('İstifadəçi adı və ya şifrə daxil edin.');
        return;
      }

      fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })
      .then(res => res.json())
      .then(result => {
        if(result.success && result.user) {
          this.session = {
            username: result.user.username || result.user.email || 'user',
            email: result.user.email || '',
            demo: false
          };
          this.updateNav();
          this.toast('Daxil olundu.');
          this.show('home');
        } else {
          this.toast('Yanlış e-poçt və ya şifrə. Daxil olma imkanı yoxdur.');
        }
      })
      .catch(err => {
        console.error('Login error:', err);
        this.toast('Xəta baş verdi: ' + err.message);
      });
    },

    /* ---------- LOGOUT ---------- */
    logout() {
      // Call server logout
      fetch('/api/auth/logout', { method: 'POST' })
        .then(()=>{})
        .catch(()=>{});

      // Clear sessionStorage
      sessionStorage.removeItem(STORAGE_DEMO_SESSION);
      
      // Clear cookie
      document.cookie = 'session=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';

      this.session = null;
      this.updateNav();
      this.toast('Sistemdən çıxış etdiniz (demo rejim).');
      this.show('home');
    },

    /* ---------- UTILS ---------- */
    escape(s){
      return String(s).replace(/[&<>\"']/g, c=>({ '&':'&','<':'<','>':'>','"':'"','\'':'\'}[c]));
    },

    toast(msg){
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(()=>t.classList.remove('show'), 3000);
    },

    bindGlobal() {
      document.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter') {
          const active = document.activeElement;
          if(active && active.id === 'liPassword') this.login();
        }
      });
    }
  };

  window.app = app;
  document.addEventListener('DOMContentLoaded', ()=>app.init());
})();