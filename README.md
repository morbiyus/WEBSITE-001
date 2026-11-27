# VAZEDGAME

Veb-bazlı oyun platforması. Qara və Sarı temalı, 3D animasiya ilə səhifə keçidləri, e-poçt doğrulamalı qeydiyyat və server tərəfli authentication.

## Canlı Sayt
https://vazedgame.vercel.app

## Xüsusiyyətlər
- Sayt adı: **VAZEDGAME** (kartal logosu)
- Tema: Qara və Sarı
- 3D animasiya ilə səhifə keçidləri
- Üst saolda **Daxil ol** və **Qeydiyyatdan Keç** düymələri
- 4 xanalı Qeydiyyat prosesi:
  1. Təkrarlanmayan İstifadəçi adı (hərf, rəqəm, `_`)
  2. E-poçt ünvanı
  3. Şifrə (6–16 simvol, hərf+rəqəm+xüsusi işarət)
  4. Şifrə təkrarı + e-poçta 6 rəqəmli kodla təsdiq
- Gerçek e-poçt doğrulama kodu (Resend vasitəsilə)
- Server tərəfli giriş (login) və çıxış (logout)
- Şifrələr bcrypt ilə hashglomérationla saxlanılır
- HttpOnly, Secure, SameSite=Strict oturum çerezləri
- Yalnız e-poçt doğrulanmış hesablar daxil ola bilər
- Təklif və şikayət e-poçtı: vasifmikayilov00@gmail.com

## Qeydiyyat Maddeleri (Azerbaijanca)
- Username təkrarlanarsa xəbərdarlıq göstərilir.
- E-poçt təkrarlanarsa xəbərdarlıq göstərilir.
- Şifrə uyğun olmasa yenidən yoxlama xəbərdarlığı verilir.
- Bütün xanı doldurdulduqda 6 rəqəmli kod e-poçtuna göndərilir.
- Kod 5 dəqiqə ərzində qüvvədədir.
- Maksimum 5 dəfə səhv kodu daxil etmək olar.
- Kod yenidən göndərilməsi 60 saniyə cooldown ile məhduddur.
- Daxil olunanda username/şifrə server tərcöhündə yoxlanılır.

## Texniki Mımari
- Frontend: Vanilla HTML/CSS/JS (React və ya digər framework istifadə edilmir)
- Backend: Vercel Serverless Functions (Node.js)
- E-poçt servisi: Resend (https://resend.com)
- Şifrə hashilməsi: bcryptjs
- Verifikasiya kodları: kriptografik təhlükəsiz 6 rəqəmli kodlar, hashləşdirilmiş saxlanılır
- Oturum: HttpOnly, Secure, SameSite=Strict çerezlər

## Tələb olunan Vercel Ortam Dəyşənləri
Vercel Dashboard → Settings → Environment Variables aşağıdakıları əlavə edin:

| Dəyişən | Açıqlama |
|---------|----------|
| `RESEND_API_KEY` | Resend API açarı (https://resend.com)에서 alın) |
| `RESEND_FROM_EMAIL` | Doğrulanmış gönderici ünvanı (məs.: onboarding@resend.dev) |
| `SESSION_SECRET` | Oturum çerez imzalama üçün təsadüfi sır |

## Yerli Depot (GitHub)
https://github.com/morbiyus/WEBSITE-001

## Yerli İşə Salmaq
1. `index.html` faylını hər hansı brauzerdə açın (statik səhifə).
2. API маршрутları yalnız Vercel-də işləyər (yerli development üçün `vercel dev` istifadə edin).

## İnternetdə Açmaq
Bu qovladaki faylları host etdimək lazımdır:
- Vercel (təslif edilir — api routes fəaliyyətdə)
- GitHub Pages (yalnız statik fayllar, API routes işləməyəcək)
- Netlify

## Yerli Paket Yükləmə
```bash
npm install
```

## Vercel Dağıtımı
```bash
npm run deploy
```

## Qeyd
Cari versiyada istifadəçi saxlamaq üçün in-memory store istifadə olunur. Vercel serverless funksiyaları cooled başlamaqda bu store sıfırlanır. Production-da istifadəçi və doğrulama kodlarının saxlanılması üçün **Vercel Postgres**, **Supabase** və ya **Upstash Redis** istifadə edilməsi tələb olunur. `api/auth/shared-users.js` və `api/auth/shared-store.js` modulları real veritabanı ilə dəyişdirilməlidir.
