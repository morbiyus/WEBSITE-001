/* ========== VAZEDGAME — App Logic (Demo Mode, Zero Budget) ========== */
(function(){
  const STORAGE_DEMO_SESSION = 'vz_demo_session';
  const DEMO_MODE = true;

  const app = {
    currentPage: 'home',
    session: null,

    signupState: {
      step: 1,                    // 1 username, 2 password, 3 finish
      username: '',
      email: '',
      password: '',
      verifyError: '',
      sending: false
    },

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

    async logout(){
      sessionStorage.removeItem(STORAGE_DEMO_SESSION);
      this.session = null;
      this.updateNav();
      this.show('home');
      this.toast('Sistemdən çıxış etdiniz (demo rejim).');
    },

    /* ---------- Navigation ---------- */
    bindNav(){
      document.getElementById('navActions').innerHTML = this.navHtml();
      document.getElementById('logo').addEventListener('click', (e)=>{
        e.preventDefault();
        this.show('home');
      });
    },

    navHtml(){
      if(this.session){
        return `
          <span class="nav-user">Salam, <b>${this.escape(this.session.username)}</b> <span style="font-size:.75rem;opacity:.7;">(demo)</span></span>
          <button class="btn btn-yellow" onclick="app.logout()">Çıxış</button>
        `;
      }
      return `
        <button class="btn btn-outline" onclick="app.show('auth')">Daxil ol</button>
        <button class="btn btn-yellow" onclick="app.show('auth',{mode:'signup'})">Qeydiyyatdan Keç</button>
      `;
    },

    updateNav(){
      document.getElementById('navActions').innerHTML = this.navHtml();
    },

    /* ---------- Page switching (mutual exclusivity) ---------- */
    show(page, data){
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

    onPageShow(page, data){
      if(page === 'auth'){
        this.authInit(data || {});
      } else if(page === 'games'){
        this.renderGames();
      } else if(page === 'profile'){
        this.renderProfile();
      }
      window.scrollTo(0,0);
    },

    /* ---------- Games ---------- */
    renderGames(){
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

    playGame(id){
      if(!this.session){
        this.toast('Oynamaq üçün əvvəlcə daxil olun.');
        this.show('auth');
        return;
      }
      this.toast(`"${id}" oyunu hazırlanma mərhələsindədir.`);
    },

    renderProfile(){
      if(!this.session) return;
      document.getElementById('profileInfo').innerHTML = `
        <div><b>İstifadəçi:</b> ${this.escape(this.session.username)}</div>
        <div><b>E-poçt:</b> ${this.escape(this.session.email || '—')}</div>
        <div><b>Rejim:</b> Demo (test)</div>
      `;
    },

    /* ---------- AUTH (Demo Mode) ---------- */
    authInit(data){
      const mode = data.mode || 'login';
      this.signupState = {
        step:1, username:'', email:'', password:'', verifyError:'', sending:false
      };
      this.renderAuth(mode);
    },

    renderAuth(mode){
      const card = document.getElementById('authCard');
      if(mode === 'login'){
        card.innerHTML = `
          <h2>Daxil ol (Demo Rejim)</h2>
          <p class="hint">Bu demo rejimidir. İstifadəçi adınızı və şifrənizi daxil edin. Şifrə heçkəyə saxlanılmır.</p>
          <div class="form-group">
            <label>İstifadəçi adı (Username)</label>
            <input type="text" id="liUsername" placeholder="İstifadəçi adı...">
          </div>
          <div class="form-group">
            <label>Şifrə</label>
            <input type="password" id="liPassword" placeholder="Şifrə...">
          </div>
          <div style="text-align:right;margin:8px 0 6px;">
            <a href="#" onclick="app.authInit({mode:'signup'})" style="color:var(--yellow);font-size:0.9rem;">Qeydiyyatdan keçməmisiniz?</a>
          </div>
          <button class="btn btn-yellow" style="width:100%;" onclick="app.login()">Daxil ol</button>
          <div class="step-nav">
            <span>Hesabınız yoxdursa?</span>
            <button class="btn btn-outline" style="padding:6px 14px;font-size:.9rem;" onclick="app.authInit({mode:'signup'})">Qeydiyyatdan Keç</button>
          </div>
        `;
      } else {
        this.renderSignupStep();
      }
    },

    renderSignupStep(){
      const s = this.signupState;
      const card = document.getElementById('authCard');
      const pct = Math.round(((s.step-1)/3)*100); // 3 steps instead of 4

      let content = `
        <h2>Qeydiyyatdan Keç (Demo Rejim)</h2>
        <p class="hint">Üç addımdan ibarət quyidagi prosesini tamamlayın. Bu demo rejimidir — e-poçt doğrulaması mümkün deyildir.</p>
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
        <div class="step-indicator">${s.step}/3</div>
      `;

      if(s.step === 1){
        content += `
          <div class="form-group">
            <label>1. İstifadəçi adı (Username) yaradın</label>
            <input type="text" id="suUsername" value="${this.escape(s.username)}" placeholder="Məsələn: vazed_123" maxlength="30">
            <div class="err-msg" id="errUsername"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Yalnız hərf, rəqəm və alt xətt (_) istifadə edə bilərsiniz. Təkrar oluna bilməz.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-yellow" onclick="app.nextStep()">İrəli</button>
          </div>
        `;
      } else if(s.step === 2){
        content += `
          <div class="form-group">
            <label>2. Şifrə yaradın</label>
            <input type="password" id="suPassword" value="${this.escape(s.password)}" placeholder="Ən azı 6, ən çox 16 simvol">
            <div class="err-msg" id="errPassword"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Hərf, rəqəm və xüsusi işarətlərdən ibarət olmalıdır (6–16 simvol). Şifrə heçkəyə saxlanılmır.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.nextStep()">İrəli</button>
          </div>
        `;
      } else if(s.step === 3){
        content += `
          <div class="form-group">
            <label>3. Şifrəni təkrarla</label>
            <input type="password" id="suConfirm" placeholder="Şifrəni yenidən daxil edin">
            <div class="err-msg" id="errConfirm"></div>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label>e-poçt ünvanı (içərisə daxil edə bilərsiniz, doğrulama yoxdur)</label>
            <input type="email" id="suEmail" value="${this.escape(s.email)}" placeholder="ad@mail.com">
            <div class="err-msg" id="errEmail"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Demo rejimində e-poçt doğrulaması mümkün deyildir.</div>
          </div>
          <div class="step-actions" style="margin-top:14px;">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.finishSignup()" id="btnFinish" ${s.sending ? 'disabled' : ''}>
              ${s.sending ? 'Yaddaşlanılır…' : 'Qeydiyyatı Bitir (Demo)'}
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

    bindSignupInputs(){
      const s = this.signupState;
      const uInp = document.getElementById('suUsername');
      if(uInp){
        uInp.addEventListener('input', (e)=>{
          s.username = e.target.value.replace(/[^a-zA-Z0-9_]/g,'');
          uInp.value = s.username;
          document.getElementById('errUsername').textContent = '';
          document.getElementById('errUsername').classList.remove('show');
        });
      }
      const eInp = document.getElementById('suEmail');
      if(eInp){
        eInp.addEventListener('input', (e)=>{
          s.email = e.target.value.trim();
          document.getElementById('errEmail').textContent = '';
          document.getElementById('errEmail').classList.remove('show');
        });
      }
      const pInp = document.getElementById('suPassword');
      if(pInp){
        pInp.addEventListener('input', (e)=>{
          s.password = e.target.value;
          document.getElementById('errPassword').textContent = '';
          document.getElementById('errPassword').classList.remove('show');
        });
      }
      // No code boxes needed - email verification disabled
    },

    showErr(id,msg){
      const el = document.getElementById(id);
      if(!el) return;
      el.textContent = msg;
      el.classList.add('show');
    },

    /* ---------- Steps ---------- */
    nextStep(){
      if(!this.validateStep()) return;
      const s = this.signupState;
      if(s.step === 1){
        s.username = document.getElementById('suUsername').value;
      } else if(s.step === 2){
        s.password = document.getElementById('suPassword').value;
      }
      s.step++;
      this.renderSignupStep();
    },

    prevStep(){
      if(this.signupState.step > 1){
        this.signupState.step--;
        this.renderSignupStep();
      }
    },

    validateStep(){
      const s = this.signupState;
      if(s.step === 1){
        if(!s.username){ this.showErr('errUsername','İstifadəçi adı daxil edin.'); return false; }
        if(!/^[a-zA-Z0-9_]+$/.test(s.username)){ this.showErr('errUsername,'Yalnız hərf, rəqəm və alt xətt (_) istifadə edə bilərsiniz.'); return false; }
        if(s.username.length < 3){ this.showErr('errUsername,'İstifadəçi adı ən azı 3 simvol olmalıdır.'); return false; }
        return true;
      }
      if(s.step === 2){
        if(!s.password || !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,16}$/.test(s.password)){ this.showErr('errPassword,'Şifrə 6–16 simvol olmalı və hərf, rəqəm və xüsusi işarətlərdən ibarət olmalıdır.'); return false; }
        return true;
      }
      if(s.step === 3){
        const confirm = document.getElementById('suConfirm').value;
        if(confirm !== s.password){ this.showErr('errConfirm,'Şifrələr uyğun gəlmir. Yenidən yoxlayın.'); return false; }
        return true;
      }
      return true;
    },

    finishSignup(){
      if(!this.validateStep()) return;
      const s = this.signupState;
      const confirm = document.getElementById('suConfirm').value;
      if(confirm !== s.password){
        this.showErr('errConfirm,'Şifrələr uyğun gəlmir.');
        return;
      }

      s.sending = true;
      this.renderSignupStep();

      // Demo mode: complete registration without any backend call
      // NEVER store password in sessionStorage or localStorage
      setTimeout(()=>{
        s.sending = false;
        this.setDemoSession(s.username, s.email);
        this.toast('Qeydiyyat demo rejimində tamamlandı. E-poçt doğrulaması mümkün deyildir.');
      }, 600);
    },

    /* ---------- LOGIN (Demo Mode) ---------- */
    login(){
      const u = document.getElementById('liUsername').value.trim();
      const p = document.getElementById('liPassword').value;
      if(!u || !p){
        this.toast('İstifadəçi adı və şifrə daxil edin.');
        return;
      }
      // Demo mode: accept any non-empty credentials, never store password
      this.setDemoSession(u, 'demo@example.com');
      this.toast('Demo rejimində daxil olundu. Bu gerçek authentikasiya deyil.');
    },

    /* ---------- Utils ---------- */
    escape(s){return String(s).replace(/[&<>"']/g, c=>({ '&':'&','<':'<','>':'>','"':'"',"'":"'" }[c]));},

    toast(msg){
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(()=>t.classList.remove('show'), 3000);
    },

    bindGlobal(){
      document.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          const active = document.activeElement;
          if(active && active.id === 'liPassword') this.login();
        }
      });
    }
  };

  window.app = app;
  document.addEventListener('DOMContentLoaded', ()=>app.init());
})();