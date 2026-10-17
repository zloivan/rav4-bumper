# Бампер для RAV4

Пошаговая страница для поиска и замены переднего бампера на Toyota RAV4 2018 (гибрид) в Минске.

Сайт: https://khomichkovamaria.github.io/rav4-bumper/

## Как устроено

- `site/index.html` — страница. Работает в любом браузере на телефоне, без регистрации. Отметки (звонки, ответы, выбор) хранятся на устройстве.
- `site/data.json` — продавцы, цены и новые объявления. Страница подгружает его при каждом открытии.
- `.github/workflows/site.yml` — каждый день в 08:40 по Минску проверяет Kufar (`scripts/update.mjs`), отмечает снятые объявления, сохраняет `data.json` и публикует сайт на GitHub Pages. Запустить вручную: Actions → «Обновление данных и публикация сайта» → Run workflow.
- `worker/` — чат-помощник (Cloudflare Workers AI, бесплатный план). Включается сам, когда в Settings → Secrets and variables → Actions добавлены `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`.

## Включить чат

1. Зарегистрироваться на cloudflare.com (бесплатно) и один раз открыть раздел Workers & Pages, чтобы появился адрес `*.workers.dev`.
2. My Profile → API Tokens → Create Token → шаблон «Edit Cloudflare Workers». Скопировать токен.
3. Account ID — на главной странице аккаунта справа.
4. В этом репозитории: Settings → Secrets and variables → Actions → New repository secret: `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`.
5. Actions → «Обновление данных и публикация сайта» → Run workflow. Кнопка «Спросить помощника» появится на сайте.
