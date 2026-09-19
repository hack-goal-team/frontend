# МосКоллектор Дашборд

Сервис предиктивной аналитики для диспетчерской.

## Требования

- Node.js 20.x (LTS)
- npm 10.x

## Установка с нуля

### 1. Установить Node.js

**Windows:** скачать LTS с [https://nodejs.org/en/download](https://nodejs.org/en/download), установить, проверить:

```bash
node -v   # v20.x.x
npm -v    # 10.x.x
```

**Linux/macOS:** через nvm или пакетный менеджер.

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить окружение

Скопировать `.env.template` и при необходимости изменить:

```bash
VITE_API_URL=/api/v1
VITE_API_TOKEN=demo-local-token
VITE_USE_MOCK=true
VITE_USE_MOCK_DELAY=true
```

## Запуск для разработки

```bash
npm run dev
```

Приложение: [http://localhost:5173/](http://localhost:5173/)

**Моки:** при `VITE_USE_MOCK=true` MSW перехватывает запросы к `/api/v1/*`.

## Сборка для продакшена

```bash
npm run build
```

Результат — папка `dist/`.

### Локальная проверка сборки

```bash
npm run preview
```

Сервер: [http://localhost:4173/](http://localhost:4173/)

### Деплой на Nginx

1. Скопировать `dist/*` на сервер (например, в `/var/www/app/`).
2. Настроить Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/app;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. Проверить и перезагрузить:

```bash
sudo nginx -t
sudo systemctl reload nginx
```
