/* ========== VAZEDGAME — App Logic ========== */
(function(){
  const API_BASE = ''; // same-origin Vercel serverless functions
  const STORAGE_USERS = 'vz_users';
  const STORAGE_SESSION = 'vz_session';

  const app = {
    currentPage: 'home',
    users: JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]'),
    session: JSON.parse(localStorage.getItem(STORAGE_SESSION) || 'null'),

    signupState: {
      step: 1,                    // 1 username, 2 email, 3 password, 4 verify
      username: '',
      email: '',
      password: '',
      codeEntered: '',
      codeSent: false,            // true after API confirms code sent
      resendCooldown: 0,          // timestamp when resend becomes available
      verifyError: '',            // last verification error message
      sending: false,             // API call in flight
      verifying: false
    },

    /* ---------- Init ---------- */
    init(){
      this.bindNav();
      this.bindGlobal();
      this.renderGames();
      this.updateNav();
      this.show('home');
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
          <span class="nav-user">Salam, <b>${this.escape(this.session.username)}</b></span>
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

      // Reset ALL pages first — guarantees no leftover modal/overlay from previous route
      document.querySelectorAll('.page').forEach(el=>{
        el.classList.remove('page-current','page-enter');
        el.classList.add('page-hidden');
      });

      // Show only the target page
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

    /* ---------- Session ---------- */
    setSession(user){
      this.session = {username: user.username, email: user.email};
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(this.session));
      this.updateNav();
      this.show('home');
    },

    logout(){
      this.session = null;
      localStorage.removeItem(STORAGE_SESSION);
      this.updateNav();
      this.show('home');
      this.toast('Sistemdən çıxış etdiniz.');
    },

    /* ---------- Games ---------- */
    renderGames(){
      const games = [
        {id:'clicker',title:'Klikləyici',icon:'🖱️',desc:'Sadə klikləmə oyunu. Çox kliklə, çox qazanın.'},
        {id:'memory',title:'Yaddaş Oyunu',icon:'🧠',desc:'Eyni kartları tapın.'},
        {id:'snake',title:'Yılan',icon:'🐍',desc:'Yılan oyunu (təzə versiya préparationdafadır).'}
      ];
      const html = games.map(g=>`
        <div class="game-card" onclick="app.playGame('${g.id}')">
          <span class="icon">${g.icon}</span>
          <h3>${this.escape(g.title)}</h3>
          <p>${this.escape(g.desc)}</p>
        </div>
      `).join('');
      const grid = document.getElementById('gamesGrid');
      const gridPage = document.getElementById('gamesGridPage');
      if(grid) grid.innerHTML = html;
      if(gridPage) gridPage.innerHTML = html;
    },

    playGame(id){
      if(!this.session){
        this.toast('Oynamək üçün əvvəlcə daxil olun.');
        this.show('auth');
        return;
      }
      this.toast(`"${id}" oyunu hazırlanma aşamasındadır. Daxil olaraq oynaya bilərsiniz.`);
    },

    renderProfile(){
      if(!this.session) return;
      document.getElementById('profileInfo').innerHTML = `
        <div><b>İstifadəçi:</b> ${this.escape(this.session.username)}</div>
        <div><b>E-poçt:</b> ${this.escape(this.session.email)}</div>
        <div><b>Status:</b> Qeydiyyatdan keçirib,aktiv</div>
      `;
    },

    /* ---------- AUTH ---------- */
    authInit(data){
      const mode = data.mode || 'login';
      this.signupState = {
        step:1, username:'', email:'', password:'', codeEntered:'',
        codeSent:false, resendCooldown:0, verifyError:'', sending:false, verifying:false
      };
      this.renderAuth(mode);
    },

    renderAuth(mode){
      const card = document.getElementById('authCard');
      if(mode === 'login'){
        card.innerHTML = `
          <h2>Daxil ol</h2>
          <p class="hint">Oynamak üçün istifadəçi adınız və şifrənizle daxil olun.</p>
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
        <h2>Qeydiyyatdan Keç</h2>
        <p class="hint">Dörd addımdan ibarət quyidagi prosesini tamamlayın.</p>
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
            <button class="btn btn-yellow" onclick="app.nextStep()">Əvələc</button>
          </div>
        `;
      } else if(s.step === 2){
        content += `
          <div class="form-group">
            <label>2. E-poçt ünvanı</label>
            <input type="email" id="suEmail" value="${this.escape(s.email)}" placeholder="ad@mail.com">
            <div class="err-msg" id="errEmail"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Doğrulama kodu bu ünvana göndəriləcək.</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.nextStep()">Əvələc</button>
          </div>
        `;
      } else if(s.step === 3){
        content += `
          <div class="form-group">
            <label>3. Şifrə yaradın</label>
            <input type="password" id="suPassword" value="${this.escape(s.password)}" placeholder="Ən azı 6, ən çox 16 simvol">
            <div class="err-msg" id="errPassword"></div>
            <div class="hint" style="margin-top:6px;color:var(--gray);font-size:.85rem;">Hərf, rəqəm və xüsusi işarətlərdən ibarət olmalıdır (6–16 simvol).</div>
          </div>
          <div class="step-actions">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.nextStep()">Əvələc</button>
          </div>
        `;
      } else if(s.step === 4){
        const cooldownRemaining = Math.max(0, Math.ceil((s.resendCooldown - Date.now())/1000));
        const canResend = cooldownRemaining === 0;
        content += `
          <div class="form-group">
            <label>4. Şifrəni təkrarla</label>
            <input type="password" id="suConfirm" placeholder="Şifrəni yenidən daxil edin">
            <div class="err-msg" id="errConfirm"></div>
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label>E-poçtunuza göndəriləcək 6 rəqəmli kodu daxil edin</label>
            <div class="code-row" id="codeRow">
              ${Array.from({length:6}).map((_,i)=>`<input type="text" class="code-box" maxlength="1" id="code${i}" autocomplete="off">`).join('')}
            </div>
            <div class="err-msg" id="errCode">${s.verifyError}</div>
            <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-outline" style="padding:6px 12px;font-size:.85rem;" onclick="app.resendCode()" ${!canResend ? 'disabled' : ''} id="btnResend">
                ${canResend ? 'Kodu yenidən göndər' : `Yenidən göndərə bilərsiniz (${cooldownRemaining}s)`}
              </button>
              ${!s.codeSent ? `<span class="hint" style="font-size:.85rem;color:var(--gray);">Kod hələ göndərilməyib.</span>` : ''}
            </div>
          </div>
          <div class="step-actions" style="margin-top:14px;">
            <button class="btn btn-outline" onclick="app.prevStep()">← Geri</button>
            <button class="btn btn-yellow" onclick="app.finishSignup()" id="btnFinish" ${s.verifying ? 'disabled' : ''}>
              ${s.verifying ? 'Yoxlanılır…' : 'Qeydiyyatı Bitir'}
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
        this.sendVerificationCode();
      } else if(s.step === 3){
        s.password = document.getElementById('suPassword').value;
      }
      if(s.step !== 2){ // step 2 handled async by sendVerificationCode
        s.step++;
        this.renderSignupStep();
      }
    },

    async sendVerificationCode(){
      const s = this.signupState;
      const email = document.getElementById('suEmail').value.trim();
      if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        this.showErr('errEmail','Düzgün e-poçt ünvanı daxil edin.');
        return;
      }
      s.sending = true;
      this.renderSignupStep();
      try {
        const resp = await fetch(`${API_BASE}/api/auth/send-code`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({email})
        });
        const data = await resp.json();
        if(data.success){
          s.codeSent = true;
          s.resendCooldown = Date.now() + 60000; // 60s cooldown
          s.step = 3; // skip to password after code sent
          this.renderSignupStep();
        } else {
          this.showErr('errEmail', data.error || 'Kod göndərilə bilmədi.');
          s.sending = false;
          this.renderSignupStep();
        }
      } catch(err){
        this.showErr('errEmail','Şəbəkə xətası. Zəhmət olmasa, yenidən cəhd edin.');
        s.sending = false;
        this.renderSignupStep();
      }
    },

    async resendCode(){
      const s = this.signupState;
      const cooldownRemaining = Math.max(0, Math.ceil((s.resendCooldown - Date.now())/1000));
      if(cooldownRemaining > 0) return;
      s.sending = true;
      this.renderSignupStep();
      try {
        const resp = await fetch(`${API_BASE}/api/auth/send-code`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({email: s.email})
        });
        const data = await resp.json();
        if(data.success){
          s.resendCooldown = Date.now() + 60000;
          this.renderSignupStep();
          this.toast('Yeni kod e-poçtunuza göndərilib.');
        } else {
          this.showErr('errCode', data.error || 'Kod yenidən göndərilə bilmədi.');
          s.sending = false;
          this.renderSignupStep();
        }
      } catch(err){
        this.showErr('errCode','Şəbəkə xətası.');
        s.sending = false;
        this.renderSignupStep();
      }
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
        if(this.users.find(u=>u.username.toLowerCase() === s.username.toLowerCase())){ this.showErr('errUsername','Bu istifadəçi adı artıq istifadə olunmaktadır. Başqa bir username seçin.'); return false; }
        return true;
      }
      if(s.step === 2){
        if(!s.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)){ this.showErr('errEmail','Düzgün e-poçt ünvanı daxil edin.'); return false; }
        return true;
      }
      if(s.step === 3){
        if(!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,16}$/.test(s.password || '')){ this.showErr('errPassword','Şifrə 6–16 simvol olmalı və hərf, rəqəm və xüsusi işarət enthältmalıdır.'); return false; }
        return true;
      }
      if(s.step === 4){
        const confirm = document.getElementById('suConfirm').value;
        if(confirm !== s.password){ this.showErr('errConfirm','Şifrələr uyğunlaşmıyor. Yenidən yoxlayın.'); return false; }
        if(s.codeEntered.length !== 6){ this.showErr('errCode','6 xananın tamamını doldurun.'); return false; }
        return true;
      }
      return true;
    },

    async finishSignup(){
      if(!this.validateStep()) return;
      const s = this.signupState;
      const confirm = document.getElementById('suConfirm').value;
      if(confirm !== s.password){
        this.showErr('errConfirm','Şifrələr uyğunlaşmıyor.');
        return;
      }

      s.verifying = true;
      this.renderSignupStep();

      try {
        const resp = await fetch(`${API_BASE}/api/auth/verify-code`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            email: s.email,
            code: s.codeEntered,
            username: s.username,
            password: s.password
          })
        });
        const data = await resp.json();
        if(data.success){
          localStorage.setItem(STORAGE_USERS, JSON.stringify([...this.users, {username:s.username, email:s.email, password:s.password}]));
          this.users.push({username:s.username, email:s.email, password:s.password});
          this.toast('Qeydiyyat uğurla tamamlandı. İndi daxil ola bilərsiniz.');
          this.authInit({mode:'login'});
        } else {
          s.verifyError = data.error || 'Doğrulama uğursuz oldub.';
          s.verifying = false;
          this.renderSignupStep();
        }
      } catch(err){
        s.verifyError = 'Şəbəkə xətası. Yenidən cəhd edin.';
        s.verifying = false;
        this.renderSignupStep();
      }
    },

    /* ---------- LOGIN ---------- */
    async login(){
      const u = document.getElementById('liUsername').value.trim();
      const p = document.getElementById('liPassword').value;
      if(!u || !p){
        this.toast('İstifadəçi adı və şifrə daxil edin.');
        return;
      }
      const user = this.users.find(x=>x.username.toLowerCase() === u.toLowerCase() && x.password === p);
      if(user){
        this.toast('Xoş gəldiniz, ' + user.username + '!');
        this.setSession(user);
      } else {
        this.toast('Siz Qeydiyyatdan Keçməmisiniz.');
      }
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
