# Интерфейс «Москоллектор»

Клиентское приложение диспетчерского стенда. Реализованные маршруты, права и
ограничения описаны в [архитектуре](docs/architecture.md).

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
npm ci
```

### 3. Настроить окружение

Скопировать `.env.template` в `.env.local`. Шаблон включает MSW для автономной
демонстрации. Для подключения к запущенному бэкенду задайте:

```bash
VITE_API_URL=/api/v1
VITE_USE_MOCK=false
VITE_API_TARGET=http://localhost:8080
```

## Запуск для разработки

```bash
npm run dev
```

Приложение: [http://localhost:5173/](http://localhost:5173/)

**Моки:** при `VITE_USE_MOCK=true` MSW перехватывает запросы к `/api/v1/*`
только в режиме разработки. При `VITE_USE_MOCK=false` Vite проксирует `/api/*`
на `VITE_API_TARGET`. Переменная `VITE_API_TOKEN` из шаблона клиентом не
используется: авторизация работает через cookie-сессию. Секреты нельзя
размещать в переменных `VITE_*`: они попадают в клиентскую сборку.

## Проверки

```bash
npm run lint
npm run typecheck
npm run format:check
npm run test:run
```

Состав тестов зависит от текущей версии репозитория. `npm run build` также
выполняет проверку типов (`vue-tsc -b`).

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
    location /api/ {
        proxy_pass http://backend:8080;
    }
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

Для SSE `/api/v1/notifications/stream` на прокси следует отключить
буферизацию ответа. Пример конфигурации стенда — `backend/deploy/nginx-frontend.conf`.
Бэкенд публикует Swagger на `/swagger-ui.html` и JSON на `/v3/api-docs`.
Контракт интерфейса хранится в `backend/docs/openapi-frontend.yaml`.
YAML содержит и проектные договорённости; фактически доступные маршруты
проверяйте по запущенному API.
