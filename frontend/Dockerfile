FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM --platform=linux/amd64 nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '' \
    '    gzip on;' \
    '    gzip_vary on;' \
    '    gzip_min_length 1024;' \
    '    gzip_proxied any;' \
    '    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss image/svg+xml;' \
    '' \
    '    location = /index.html {' \
    '        add_header Cache-Control "no-cache";' \
    '        try_files /index.html =404;' \
    '    }' \
    '' \
    '    location /assets/ {' \
    '        add_header Cache-Control "public, max-age=31536000, immutable";' \
    '        try_files $uri =404;' \
    '    }' \
    '' \
    '    location / {' \
    '        add_header Cache-Control "no-cache";' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
