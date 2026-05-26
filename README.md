# Portfolio (2025)

Personal portfolio site: project case studies, lightweight 3D and shader demos, bilingual copy (English and German).

Built with Vue 3, TypeScript, and Vite. Motion via GSAP and Lenis, 3D via three.js, audio via Howler. GLSL is compiled through vite-plugin-glsl.

## Backend

The repo now includes a secure Fastify CRUD API for projects in server/.

### Scripts

| Command | Description |
| --- | --- |
| npm run backend:dev | Start the API in watch mode |
| npm run backend:start | Start the API once |
| npm run backend:typecheck | Typecheck the backend only |

### Environment

Copy .env.example to .env and configure admin credentials plus session settings. The backend will refuse to start without valid values.

Required env:
- ADMIN_USERNAME
- ADMIN_PASSWORD_HASH
- ADMIN_SESSION_SECRET

Optional env:
- ADMIN_COOKIE_NAME (default: admin_session)
- PORTFOLIO_CORS_ORIGINS (comma-separated whitelist)
- ADMIN_SESSION_TTL_MS (default: 12h)
- ADMIN_SESSION_IDLE_MS (default: 30m)
- VITE_API_BASE_URL

Important:
- Jangan gunakan default ADMIN_USERNAME=admin di production.
- Pastikan ADMIN_SESSION_SECRET panjang (>= 32 karakter) dan acak.

### Generate password hash

Password admin disimpan sebagai hash scrypt dengan format salt:hash (hex).
Gunakan node untuk membuat hash:

node -e "const { randomBytes, scryptSync } = require('node:crypto'); const password = 'your-strong-password'; const salt = randomBytes(16); const hash = scryptSync(password, salt, 64); process.stdout.write(`${salt.toString('hex')}:${hash.toString('hex')}`);"

### Admin auth flow

1) Frontend memanggil POST /api/auth/login dengan username dan password.
2) Server memverifikasi kredensial dan membuat session ID acak.
3) Server mengirim cookie HttpOnly (SameSite=Strict) berisi session ID.
4) Frontend memanggil GET /api/auth/session untuk memperoleh CSRF token.
5) Semua request mutating (POST/PUT/PATCH/DELETE) mengirim header X-CSRF-Token.
6) Frontend bisa memanggil GET /api/auth/me untuk cek sesi.
7) Logout menggunakan POST /api/auth/logout untuk invalidasi session.

Cookie session bersifat HttpOnly sehingga tidak bisa diakses lewat JavaScript dan hanya dipakai untuk autentikasi.

### Endpoints

- GET /health - health check
- GET /api/projects - list projects
- GET /api/projects/:slug - fetch one project
- POST /api/projects - create a project (requires admin session + CSRF)
- PUT /api/projects/:slug - replace a project (requires admin session + CSRF)
- PATCH /api/projects/:slug - partially update a project (requires admin session + CSRF)
- DELETE /api/projects/:slug - delete a project (requires admin session + CSRF)
- POST /api/uploads - upload a media file (requires admin session + CSRF)
- GET /api/uploads - list uploaded files (requires admin session)
- DELETE /api/uploads/:filename - delete a file (requires admin session + CSRF)
- POST /api/auth/login - admin login
- POST /api/auth/logout - admin logout
- GET /api/auth/me - get current admin session
- GET /api/auth/session - get CSRF token for the active session

### Security Notes

- Session cookie memakai HttpOnly + SameSite=Strict untuk meminimalkan XSS/CSRF.
- CSRF token wajib untuk semua request mutating.
- CORS hanya mengizinkan origin dari PORTFOLIO_CORS_ORIGINS.
- Session disimpan server-side dengan idle timeout dan expiration.

### Recommended Production Settings

- Set NODE_ENV=production dan jalankan di HTTPS agar cookie Secure aktif.
- Gunakan ADMIN_USERNAME unik (bukan admin).
- Gunakan password kuat dan hash scrypt dari langkah di atas.
- Set PORTFOLIO_CORS_ORIGINS ke domain frontend produksi.
- Pertimbangkan store Redis untuk session di environment multi-instance.

### Redis setup

- Set REDIS_URL ke URL Redis (contoh: redis://localhost:6379)
- Set REDIS_PREFIX untuk namespace key (default: portfolio:session)
- Jika REDIS_URL kosong, backend fallback ke memory store

### Reverse proxy setup

Lihat docs/reverse-proxy.md untuk contoh konfigurasi Nginx, Cloudflare, dan Docker proxy.

### Hardening checklist

- Pastikan HSTS aktif di reverse proxy.
- Pastikan proxy header X-Forwarded-Proto dan X-Forwarded-For ter-set.
- Batasi akses admin hanya dari origin terdaftar.
- Aktifkan ADMIN_SESSION_FINGERPRINT bila ingin binding ringan ke User-Agent.

### Incident response basic

- Jika suspect compromise: rotasi ADMIN_SESSION_SECRET, restart backend.
- Putuskan sesi aktif dengan invalidate semua session (rotasi ADMIN_SESSION_SECRET).
- Audit log tersedia di output backend dengan prefix "audit".

### Final Security Checklist

- HTTPS wajib untuk semua request admin.
- Secure cookie aktif (NODE_ENV=production).
- Origin whitelist hanya ke domain frontend tepercaya.
- Rotasi ADMIN_SESSION_SECRET secara berkala (invalidate semua session).
- Siapkan backup data (data/projects.json + data/uploads).
- Gunakan Redis/DB untuk session jika multi-instance.
- Cara revoke semua session: ganti ADMIN_SESSION_SECRET dan restart backend.

### Frontend admin

Open /admin in the app to manage project records. The admin session is stored in HttpOnly cookies, and the panel uses the same backend CRUD routes listed above.

Uploaded files are served from /uploads/, and the existing portfolio assets are served from /assets/ so stored project records can point at repo assets safely during development.

## Scripts

| Command        | Description                          |
| -------------- | ------------------------------------ |
| npm run dev   | Dev server on port 3000 (strictPort) |
| npm run build | vue-tsc then production bundle to dist/ |
| npm run preview | Serve the production build locally |
| npm run typecheck | Typecheck only (vue-tsc -b) |

## Content

- Projects: src/content/projects/{en,de}/<slug>.ts — copy, tags, media, links. Slugs must align with projectIds in src/content/projects/index.ts.
- Previews / listing: src/content/projects/previews/.
- Tags: variants and labels live in src/components/tagVariants.ts (used by Tag.vue and content types).

## Stack (high level)

- Vue 3 (<script setup>), SCSS with shared mixins (src/assets/styles/)
- i18n helpers under src/i18n/
- WebGL / GLSL under src/three/ where applicable

## Credits & Attribution

This project was created and designed by Shahib Kholil.

If you use this project or substantial parts of its source code as a base for your own portfolio or work, attribution must be preserved.

Please keep:
- existing credit comments in the source code
- this attribution section in the README
- a visible reference to the original project/repository in derivative works

Original portfolio:
-> https://Shahib-hckh.com

Commercial reuse or redistribution of substantial portions of this project without permission is prohibited.
