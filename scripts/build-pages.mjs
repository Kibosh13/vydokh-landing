import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = resolve(root, ".pages-dist");

await rm(output, { recursive: true, force: true });
await cp(resolve(root, "site"), output, { recursive: true });

const indexPath = resolve(output, "index.html");
let index = await readFile(indexPath, "utf8");
index = index.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1" />\n    <meta name="robots" content="noindex,nofollow,noarchive" />',
);
index = index.replace(
  '<button class="cta-button contact-submit" type="submit">Передать контакт</button>',
  '<button class="cta-button contact-submit" type="submit" disabled aria-disabled="true">Заявки доступны на основном сайте</button>',
);
index = index.replace(
  'Контакт сохранится в заявках организаторов. Мы напишем вам в Telegram.',
  'В статической демоверсии сохранение заявок отключено. Используйте прямые ссылки Telegram.',
);

const listenerMarker = "document.getElementById('contact-form').addEventListener('submit',async event=>{";
const listenerStart = index.indexOf(listenerMarker);
if (listenerStart < 0) throw new Error("Contact form listener was not found");
const lineStart = index.lastIndexOf("\n", listenerStart) + 1;
const lineEnd = index.indexOf("\n", listenerStart);
const staticListener = "      document.getElementById('contact-form').addEventListener('submit',event=>{event.preventDefault();const status=document.getElementById('contact-form-status');status.dataset.state='error';status.textContent='В статической демоверсии заявки не сохраняются. Напишите организатору напрямую в Telegram.';});";
index = `${index.slice(0, lineStart)}${staticListener}${index.slice(lineEnd)}`;
await writeFile(indexPath, index);

const admin = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <meta name="theme-color" content="#081c1b" />
    <title>CRM недоступна · Выдох 2.0</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23081c1b'/%3E%3Cpath d='M17 28c9-1 17 3 22 10M24 18c4 6 11 8 22 7M20 45c8-4 17-4 27 1' fill='none' stroke='%23b89662' stroke-width='3.5' stroke-linecap='round'/%3E%3C/svg%3E" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500&family=Prata&display=swap" rel="stylesheet" />
    <style>
      *{box-sizing:border-box}body{min-width:320px;min-height:100svh;margin:0;display:grid;place-items:center;padding:1rem;color:#171b19;background:linear-gradient(145deg,#f2efe8,#e8e2d7);font-family:"Manrope",Arial,sans-serif}.card{width:min(620px,100%);padding:clamp(1.5rem,6vw,3.5rem);border:1px solid #b29a77;border-radius:1rem;background:rgba(248,246,241,.78);box-shadow:0 22px 55px rgba(38,31,21,.08)}.kicker{margin:0 0 .8rem;color:#a98652;font-size:.72rem;font-weight:600;letter-spacing:.17em;text-transform:uppercase}h1{margin:0;font-family:"Prata",Georgia,serif;font-size:clamp(2.2rem,8vw,4.4rem);font-weight:400;line-height:1.05}p{margin:1.2rem 0 0;color:#555b55;line-height:1.65}a{display:inline-block;margin-top:1.5rem;padding:.8rem 1.15rem;color:#fff;background:#8d7048;border-radius:999px;text-decoration:none}
    </style>
  </head>
  <body><main class="card"><p class="kicker">Выдох 2.0 · статическая демоверсия</p><h1>CRM доступна только в полной версии</h1><p>GitHub Pages не поддерживает серверную базу заявок и закрытый админ-доступ. Дизайн сайта можно посмотреть в демоверсии, а рабочая CRM остаётся в основной размещённой версии.</p><a href="../">Вернуться к лендингу</a></main></body>
</html>`;
await mkdir(resolve(output, "admin"), { recursive: true });
await writeFile(resolve(output, "admin/index.html"), admin);
await writeFile(resolve(output, "robots.txt"), "User-agent: *\nDisallow: /\n");
await writeFile(resolve(output, ".nojekyll"), "");

console.log(`Built GitHub Pages demo in ${output}`);
