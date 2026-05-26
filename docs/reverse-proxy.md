Reverse Proxy Hardening

Nginx example:

server {
  listen 443 ssl http2;
  server_name example.com;

  ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers on;
  ssl_ciphers HIGH:!aNULL:!MD5;

  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id;
    proxy_set_header Connection "";
  }
}

Cloudflare (minimum settings):
- SSL/TLS mode: Full (strict)
- Always Use HTTPS: ON
- HSTS: Enable (includeSubDomains + preload)
- WAF: OWASP Managed Rules ON

Docker reverse proxy (traefik) labels example:

- traefik.http.routers.portfolio.rule=Host(`example.com`)
- traefik.http.routers.portfolio.entrypoints=websecure
- traefik.http.routers.portfolio.tls=true
- traefik.http.middlewares.hsts.headers.stsSeconds=63072000
- traefik.http.middlewares.hsts.headers.stsIncludeSubdomains=true
- traefik.http.middlewares.hsts.headers.stsPreload=true
- traefik.http.middlewares.security.headers.contentTypeNosniff=true
- traefik.http.middlewares.security.headers.frameDeny=true
- traefik.http.routers.portfolio.middlewares=hsts,security
