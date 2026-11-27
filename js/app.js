/* ========== VAZEDGAME — App Logic (Demo Mode, Zero Budget) ========== */
(function(){
  const STORAGE_DEMO_SESSION = 'vz_demo_session';
  const DEMO_MODE = true;

  const app = {
    currentPage: 'home',
    session: null,

    signupState: {
      step: 1,                    // 1 username, 2 email, 3 password, 4 verify
      username: '',
      email: '',
      password: '',
      codeEntered: '',
      codeSent: false,
      verifyError: '',
      sending: false,
      verifying: false
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
          // Only restore username, never password or token
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
      // Store ONLY username + email in sessionStorage (cleared on tab close). NEVER store password.
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
        {id:'memory',title:'Yaddaş Oyunu',icon:'🧠',desc:'Eyni kartları tapın. Hələ hazırlanma mərhələsindədir.', comingSoon: true},
        {id:'snake',title:'İlan',icon:'🐍',desc:'İlan oyunu. Hələ hazırlanma mərhələsindədir.', comingSoon: true}
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
        step:1, username:'', email:'', password:'', codeEntered:'',
        verifyError:'', sending:false, verifying:false
      };
      this.renderAuth(mode);
    },

    renderAuth(mode){
      const card = document.getElementById('authCard');
      if(mode === 'login'){
        card.innerHTML = `
          <h2>Daxil ol (Demo Rejim)</h2>
          <p class="hint">Bu demo rejimidir. İstifadəçi adınızı və şifrənizi daxil edin. Şifrə heçkėje saxlanılmır.</p>
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
      const pct = Math.round(((s.step-1)/4)*100);

      let content = `
        <h2>Qeydiyyatdan Keç (Demo Rejim)</h2>
        <p class="hint">Dörd addımdan ibarət quyidagi prosesini tamamlayın. Bu demo rejimidir — e-poçt doğrulaması mümkün deyildir.</p>
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
        <div class="step-indicator">${s.step}/4</div>
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
            <label>2. E-poçt ünvanı</label>
            <input type="email" id="suEmail" value="${this.escape(s.email)}" placeholder="ad@mail.com">
            <div class="err-msg" id="errEmail"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">E-poçt doğrulaması hal-hazırda mümkün deyildir. Bu xana yalnız işarəтивdir.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.nextStep()">İrəli</button>
          </div>
        `;
      } else if(s.step === 3){
        content += `
          <div class="form-group">
            <label>3. Şifrə yaradın</label>
            <input type="password" id="suPassword" value="${this.escape(s.password)}" placeholder="Ən azı 6, ən çox 16 simvol">
            <div class="err-msg" id="errPassword"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Hərf, rəqəm və xüsusi işarətlərdən ibarət olmalıdır (6–16 simvol). Şifrə heçkəyə saxlanılmır.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.nextStep()">İrəli</button>
          </div>
        `;
      } else if(s.step === 4){
        content += `
          <div class="form-group">
            <label>4. Şifrəni təkrarla</label>
            <input type="password" id="suConfirm" placeholder="Şifrəni yenidən daxil edin">
            <div class="err-msg" id="errConfirm"></div>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label>E-poçt doğrulama kodu</label>
            <div class="code-row" id="codeRow">
              ${Array.from({length:6}).map((_,i)=>`<input type="text" class="code-box" maxlength="1" id="code${i}" autocomplete="off" placeholder="0">`).join('')}
            </div>
            <div class="err-msg" id="errCode">${s.verifyError}</div>
            <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span class="hint" style="font-size:.85rem;color:var(--gray);">Demo rejimində doğrulama kodu tələb olunmur. İstədiyiniz 6 rəqəmi daxil edə bilərsiniz.</span>
            </div>
          </div>
          <div class="step-actions" style="margin-top:14px;">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.finishSignup()" id="btnFinish" ${s.verifying ? 'disabled' : ''}>
              ${s.verifying ? 'Yoxlanılır…' : 'Qeydiyyatı Bitir (Demo)'}
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
      for(let i=0;i<6;i++){
        const cb = document.getElementById('code'+i);
        if(cb){
          cb.addEventListener('input', (e)=>{
            let v = e.target.value.replace(/\D/g,'').slice(0,1);
            e.target.value = v;
            s.codeEntered = Array.from({length:6},(_,j)=>document.getElementById('code'+j).value).join('');
            if(v && i<5) document.getElementById('code'+(i+1)).focus();
            document.getElementById('errCode').textContent = '';
            document.getElementById('errCode').classList.remove('show');
          });
          cb.addEventListener('keydown', (e)=>{
            if(e.key === 'Backspace' && !e.target.value && i>0) document.getElementById('code'+(i-1)).focus();
          });
        }
      }
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
        s.email = document.getElementById('suEmail').value;
      } else if(s.step === 3){
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
        if(!/^[a-zA-Z0-9_]+$/.test(s.username)){ this.showErr('errUsername','Yalnız hərf, rəqəm və alt xətt (_) istifadə edə bilərsiniz.'); return false; }
        if(s.username.length < 3){ this.showErr('errUsername','İstifadəçi adı ən azı 3 simvol olmalıdır.'); return false; }
        return true;
      }
      if(s.step === 2){
        if(!s.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)){ this.showErr('errEmail','Düzgün e-poçt ünvanı daxil edin.'); return false; }
        return true;
      }
      if(s.step === 3){
        if(!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,16}$/.test(s.password || '')){ this.showErr('errPassword','Şifrə 6–16 simvol olmalı və hərf, rəqəm və xüsusi işarətlərdən ibarət olmalıdır.'); return false; }
        return true;
      }
      if(s.step === 4){
        const confirm = document.getElementById('suConfirm').value;
        if(confirm !== s.password){ this.showErr('errConfirm','Şifrələr uyğun gəlmir. Yenidən yoxlayın.'); return false; }
        // Demo mode: code entry is optional, but require 6 digits if entered
        if(s.codeEntered.length > 0 && s.codeEntered.length !== 6){
          this.showErr('errCode','6 xananın hamısını doldurun.');
          return false;
        }
        return true;
      }
      return true;
    },

    finishSignup(){
      if(!this.validateStep()) return;
      const s = this.signupState;
      const confirm = document.getElementById('suConfirm').value;
      if(confirm !== s.password){
        this.showErr('errConfirm','Şifrələr uyğun gəlmir.');
        return;
      }

      s.verifying = true;
      this.renderSignupStep();

      // Demo mode: complete registration without any backend call
      // NEVER store password in sessionStorage or localStorage
      setTimeout(()=>{
        s.verifying = false;
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
    escape(s){return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]));},

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
