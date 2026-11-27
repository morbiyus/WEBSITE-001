# VAZEDGAME

Veb-bazlı oyun platforması. Qara və Sarı temalı, 3D.animasiya ilə keçidlərə sahip, daxil olaraq oynanacaq oyunlar yaranıb.

## Xüsusiyyətlər
- Sayt adı: **VAZEDGAME** (qartal logosu)
- Tema: Qara və Sarı
- 3D.animasiya ilə səhifə keçidləri
- Üst saolda **Sign up** və **Login** düymələri
- 4 xanalı Qeydiyyat prosesi:
  1. Təkrarlanmayan İstifadəçi adı (hərf, rəqəm, `_`)
  2. E-poçt ünvanı
  3. Şifrə (6–16 simvol, hərf+rəqəm+xüsusi işarət)
  4. Şifrə təkrarı + e-poçta 6 rəqəmli kodla təsdiq
- Daxil olunarsa oyunları oynamağa icazə
- Çıxış və yenidən giriş (yalnız Username + Şifrə)
- Əsas səhifənin aşağı hesabında təklif/şikayət e-poçtı: vasifmikayilov00@gmail.com

## Qeydiyyat Maddələri (Azerbaijanca)
- Username təkrar olunarsa xəbərdarlıq göstərilir.
- Şifrə uyğun olmasa yenidən yoxlama xəbərdarlığı verilir.
- Bütün xanı doldurdulduqda 6 rəqəmli kod e-poçtuna göndərilir (demo rejimində simulyasiya olunur).
- Daxil olunanda username/şifrə bazada yoxdusa "Siz Qeydiyyatdan Keçməmisiniz" görünür.

## Yerli Depot (GitHub)
https://github.com/vazedlux/-WEBSITE-001.git

## İşə salmaq (lokal)
`index.html` faylını hər hansı brauzerdə açın.

## İnternetdə açmaq (brauzer axtarışa görə tapa bilmək üçün)
Bu qovladaki faylları host etdimək lazımdır, məsələn:
- GitHub Pages (repo → Settings → Pages → source: main)
- Vercel / Netlify (doldurmaq və deploy etmək kifayətdir)

Host edildikdən sonra verilmiş domen vasitəsilə herkes brauzerdə axtarışla tapa biləcək.

## Qeyd
E-poçt üzrə 6 rəqəmli kodun gerçek şəkildə göndərilməsi üçün backend (Node/PHP/python) və email servis (SMTP / SendGrid / Mailgun) lazımdır. Cari versiyada Kod simulyasiya olunur və konsolda göstərilir.
