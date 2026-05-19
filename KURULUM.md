# 🎭 Pulse — Kurulum Rehberi
**Vercel + Supabase ile 15 dakikada canlıya al**

---

## Adım 1 — GitHub Reposu Aç

1. [github.com](https://github.com) → **New repository**
2. Repo adı: `pulse` (public veya private, farketmez)
3. Tüm dosyaları (`src/`, `package.json`, `vite.config.js`, `index.html`, `vercel.json`) bu repoya yükle

Hızlı yol — terminalde:
```bash
cd pulse
git init
git add .
git commit -m "ilk commit"
git remote add origin https://github.com/KULLANICI_ADIN/pulse.git
git push -u origin main
```

---

## Adım 2 — Supabase Kur

1. [supabase.com](https://supabase.com) → **New Project**
   - Region: **Frankfurt (eu-central-1)** ← Türkiye'ye en yakın
   - Şifreyi kaydet

2. **SQL Editor** → `supabase_schema_v2.sql` içeriğini yapıştır → **Run**

3. **Storage** → iki bucket oluştur:
   | İsim | Public |
   |------|--------|
   | `avatars` | ✅ |
   | `post-media` | ✅ |
   
   Her bucket için: **Policies** → **New Policy** → "Give users access to own folder" → authenticated

4. **Authentication → Settings**:
   - Email Confirmations: **KAPALI** (küçük topluluk)
   - Site URL: önce `http://localhost:5173`, sonra Vercel URL'ini ekle

5. **Settings → API** → şunları kopyala:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public → `VITE_SUPABASE_ANON_KEY`

---

## Adım 3 — Vercel'e Deploy Et

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub repoyu seç

2. **Environment Variables** kısmına ekle:
   ```
   VITE_SUPABASE_URL      = https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbG...
   ```

3. **Deploy** → 2 dakikada canlıya alınır

---

## Adım 4 — İlk Admin Hesabı Oluştur

1. Siteye gir → **Kayıt Ol** → (davetiye kodu olmadan ilk kayıt için aşağıdaki SQL'i çalıştır)

2. Supabase **SQL Editor**'da:
```sql
-- Davetiye olmadan ilk admin kaydı için geçici izin
UPDATE players SET role = 'admin', is_approved = true 
WHERE username = 'senin_kullanici_adin';
```

3. Artık Admin Panel'e erişebilirsin → **Davetiye Oluştur** → arkadaşlara gönder

---

## Oyuncu Ekleme Akışı

```
Admin → Davetiye Oluştur → Kodu arkadaşa gönder
Arkadaş → Kayıt Ol (kodu girer) → "Onay Bekleniyor" ekranı
Admin → Admin Panel → Üyeler → ✅ Onayla
Arkadaş → Giriş yapar → Karakter oluşturur → Kullanmaya başlar
```

---

## Karakter & Sayfa Sistemi

Her oyuncu istediği kadar karakter veya sayfa açabilir:

**Karakter 🧙** → Bir RP kişisi. Profil fotoğrafı, biyografi, etiketler.
**Sayfa 🏢** → Şirket, lonca, mekan, dernek. Birden fazla oyuncu yönetebilir (yakında).

Giriş yapınca **karakter seçim ekranı** açılır — GTA RP'deki gibi "Kim olarak oynuyorsun?" sorusu.
Header'da her zaman aktif karakteri dropdown ile değiştirebilirsin.

---

## Gönderi Tipleri

| Tip | Anlamı | Stil |
|-----|--------|------|
| 🌸 Gönderi | Normal paylaşım | Düz yazı |
| 🎭 RP Sahnesi | Sahne, kurgu | Serif font |
| 💬 OOC | Out of Character, duyuru | Normal |
| 📖 Lore | Geçmiş, dünya bilgisi | Normal |

---

## Özellik Listesi

- [x] Oyuncu hesabı (gerçek kişi)
- [x] Sınırsız karakter & sayfa per oyuncu
- [x] GTA RP tarzı karakter seçim ekranı
- [x] Gönderi akışı (4 tip)
- [x] Beğeni + yorum
- [x] Görsel yükleme (Supabase Storage)
- [x] Direkt mesajlaşma (karakter → karakter)
- [x] Gerçek zamanlı bildirimler (Supabase Realtime)
- [x] Admin paneli (üye onayı, davetiye, karakter yönetimi)
- [x] Dark mode + light mode
- [x] Mobil uyumlu (responsive)
- [x] Davetiye sistemi (özel topluluk)

---

## Maliyet

| Servis | Ücret |
|--------|-------|
| Supabase Free | 0₺ — 50k satır, 500MB DB, 1GB storage |
| Vercel Free | 0₺ — sınırsız deploy |
| Domain (opsiyonel) | ~350₺/yıl |

**4-5 kişilik RP topluluğu için sonsuza kadar ücretsiz.**

---

## Sorun Giderme

**"Invalid API key" hatası** → .env dosyasını ve Vercel environment variables'ı kontrol et

**Görseller yüklenmiyor** → Supabase Storage bucket'larının Public olduğunu kontrol et

**Realtime çalışmıyor** → Supabase Dashboard → Realtime → Tables → `posts` ve `messages` tablolarını enable et

**Kayıt olunca onay ekranı geliyor** → Normal, admin SQL ile onaylamalı (Adım 4)
