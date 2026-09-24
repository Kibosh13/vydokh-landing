const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isAuthorized(request, env) {
  const expected = typeof env.ADMIN_PASSWORD === "string" ? env.ADMIN_PASSWORD : "";
  const provided = request.headers.get("authorization") || "";
  return expected.length >= 12 && provided === `Bearer ${expected}`;
}

async function createLead(request, env) {
  if (!env.DB) return json({ error: "Сервис заявок временно недоступен." }, 503);

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Неверный формат заявки." }, 415);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Не удалось прочитать заявку." }, 400);
  }

  const name = clean(payload?.name, 100);
  const telegram = clean(payload?.telegram, 120);
  const website = clean(payload?.website, 200);

  if (website) return json({ ok: true }, 201);
  if (name.length < 2) return json({ error: "Укажите имя." }, 400);
  if (telegram.length < 2) return json({ error: "Укажите ваш Telegram." }, 400);

  try {
    const result = await env.DB.prepare(
      "INSERT INTO leads (name, telegram, status, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(name, telegram, "new", Date.now())
      .run();
    return json({ ok: true, id: result.meta?.last_row_id ?? null }, 201);
  } catch (error) {
    console.error("Unable to save lead", error);
    return json({ error: "Не удалось сохранить заявку. Попробуйте ещё раз." }, 503);
  }
}

async function listLeads(request, env) {
  if (!env.ADMIN_PASSWORD) return json({ error: "Админ-доступ не настроен." }, 503);
  if (!isAuthorized(request, env)) return json({ error: "Неверный пароль." }, 401);
  if (!env.DB) return json({ error: "База заявок временно недоступна." }, 503);

  try {
    const result = await env.DB.prepare(
      "SELECT id, name, telegram, status, created_at FROM leads ORDER BY created_at DESC LIMIT 500",
    ).all();
    return json({ leads: result.results || [] });
  } catch (error) {
    console.error("Unable to load leads", error);
    return json({ error: "Не удалось загрузить заявки." }, 503);
  }
}

async function updateLead(request, env, id) {
  if (!env.ADMIN_PASSWORD) return json({ error: "Админ-доступ не настроен." }, 503);
  if (!isAuthorized(request, env)) return json({ error: "Неверный пароль." }, 401);
  if (!env.DB) return json({ error: "База заявок временно недоступна." }, 503);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Некорректная заявка." }, 400);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Не удалось прочитать данные." }, 400);
  }
  const status = payload?.status;
  if (status !== "new" && status !== "contacted") {
    return json({ error: "Некорректный статус." }, 400);
  }

  try {
    const result = await env.DB.prepare("UPDATE leads SET status = ? WHERE id = ?")
      .bind(status, id)
      .run();
    if (!result.meta?.changes) return json({ error: "Заявка не найдена." }, 404);
    return json({ ok: true });
  } catch (error) {
    console.error("Unable to update lead", error);
    return json({ error: "Не удалось обновить заявку." }, 503);
  }
}

async function serveAsset(request, env, pathname) {
  if (!env.ASSETS) return new Response("Asset service unavailable", { status: 503 });
  if (pathname === "/admin") {
    const url = new URL(request.url);
    url.pathname = "/admin/";
    return Response.redirect(url, 302);
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leads" && request.method === "POST") {
      return createLead(request, env);
    }
    if (url.pathname === "/api/admin/leads" && request.method === "GET") {
      return listLeads(request, env);
    }
    const leadMatch = url.pathname.match(/^\/api\/admin\/leads\/(\d+)$/);
    if (leadMatch && request.method === "PATCH") {
      return updateLead(request, env, Number(leadMatch[1]));
    }
    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Маршрут не найден." }, 404);
    }

    return serveAsset(request, env, url.pathname);
  },
};
