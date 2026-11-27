# VAZEDGAME

Veb-bazlı oyun platforması. Qara və Sarı temalı, 3D animasiya ilə səhifə keçidləri, demo rejimində qeydiyyat və daxil olma.

## Canlı Sayt
https://vazedgame.vercel.app

## ✅ Xüsusiyyətlər (Tamamlı)

- Sayt adı: **VAZEDGAME** (kartal logosu)
- Tema: Qara və Sarı
- 3D animasiya ilə səhifə keçidləri
- Üst saolda **Daxil ol** və **Qeydiyyatdan Keç** düymələri
- 4 xanalı Qeydiyyat prosesi (demo rejim):
  1. Təkrarlanmayan İstifadəçi adı (hərf, rəqəm, `_`)
  2. E-poçt ünvanı (doğrulama yoxdur)
  3. Şifrə (6–16 simvol, hərf+rəqəm+xüsusi işarət)
  4. Şifrə təkrarı (doğrulama kodu tələb olunmur)
- Oyun kataloq (3 oyun, hələ hazırlanma mərhələsində)
- Profil səhifəsi (demo)
- Çıxış funksiyası
- Təklif və şikayət e-poçtı: vasifmikayilov00@gmail.com
- Responsive dizayn (mobil, planshet, masaüstü)

## ⚠️ Demo Rejim — Mühütlü Xətaşdır

Bu versiya **sıfır büdcə (zero budget)**-də hazırlanmışdır və **demo rejimində** çalışır:

| Xüsusiyyət | Status | Açıqlama |
|----------|--------|----------|
| E-poçt doğrulaması | ❌ Deaktiv-edilib | Real e-poçt xidməti (Resend, SMTP və s.) utilisée edilmir |
| Gerçek authentikasiya | ❌ Deaktiv-edilib | Daxil olma və qeydiyyat yalnız demo rejimində |
| Şifrə saxlanması | ❌ Yoxdur | Şifrə heçkədə (localStorage, sessionStorage, server) saxlanılmır |
| Server oturumu | ❌ Deaktiv-edilib | Oturum yalnız sessionStorage-dadır (sekme bağlandığında silinir) |
| Veritabanı | ❌ Yoxdur | Heçkə bir veritabanı käyt edilmir |

## Qeydiyyat Maddeleri (Demo, Azerbaijanca)

- Username təkrarlanarsa xəbərdarlıq göstərilir (frontend-də).
- E-poçt doygunluğu yoxlanılır (frontend-də).
- Şifrə uyğun olmasa yenidən yoxlama xəbərdarlığı verilir.
- E-poçt doğrulama kodu tələb olunmur (demo rejim).
- Daxil olma hər hansı boş olmayan username və şifrə ilə qəbul edilir (demo).

## Texniki Mımari

- Frontend: Vanilla HTML/CSS/JS (React və ya digər framework istifadə edilmir)
- Backend: Yoxdur (api routes 503 qaytarır)
- E-poçt servisi: Yoxdur (deaktiv-edilib)
- Şifrə hashilməsi: Yoxdur (şifrə saxlanılmır)
- Oturum: sessionStorage (yalnız demo, Yerli)

## Tələb olunan Ortam Dəyşənləri

**Heçkə biri tələb olunmur.** Heçkə bir API açarı, veritabanı və ya əobilə xidmət lazımdır.

## Yerli Depot (GitHub)
https://github.com/morbiyus/WEBSITE-001

## Yerli İşə Salmaq

`index.html` faylını hər hansı brauzerdə açın. API routes yalnız Vercel-də işləyər (503 qaytarır).

## İnternetdə Açmaq

Bu qovladaki faylları host etdimək lazımdır:
- Vercel (Hobby ücretsiz plan — statik fayllar)
- GitHub Pages (yalnız statik fayllar)
- Netlify (ücretsiz plan)

## Yerli Paket Yükləmə

Heçkə bir paket yükləmə tələb olunmur (`dependencies: {}`).

## Vercel Dağıtımı

```bash
vercel --prod
```

## Qeyd

Bu versiya **demo amaçlıdır** və gerçek bir oyun platforması deyil. Gerçek authentikasiya, e-poçt doğrulaması və veritabanı üçün ücretli xidmətlər (Vercel Postgres, Supabase, Resend və s.) tələb olunur. Bu reversiya yalınzca 인터feys və demo foydalanıcı akışını göstərir.
