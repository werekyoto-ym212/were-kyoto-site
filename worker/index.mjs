const ALLOWED_FIELDS = new Set([
  "name", "business", "email", "topics", "booking_method", "timing", "message", "website", "cf-turnstile-response",
]);
const TOPICS = new Set(["Webサイト", "予約システム", "顧客管理・カルテ", "まだ決まっていない"]);
const BOOKING_METHODS = new Set(["", "Instagram DM", "LINE", "電話", "ホットペッパー", "その他"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 32 * 1024;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
const clean = (value) => typeof value === "string" ? value.trim() : "";

export function validateForm(form) {
  const counts = new Map();
  for (const key of form.keys()) {
    if (!ALLOWED_FIELDS.has(key)) return { error: "送信内容に不明な項目があります。ページを再読み込みしてください。" };
    counts.set(key, (counts.get(key) || 0) + 1);
    if (key !== "topics" && counts.get(key) > 1) return { error: "同じ項目が複数送信されました。ページを再読み込みしてください。" };
  }

  const data = {
    name: clean(form.get("name")),
    business: clean(form.get("business")),
    email: clean(form.get("email")),
    topics: form.getAll("topics").map(clean),
    bookingMethod: clean(form.get("booking_method")),
    timing: clean(form.get("timing")),
    message: clean(form.get("message")),
    website: clean(form.get("website")),
    turnstileToken: clean(form.get("cf-turnstile-response")),
  };

  if (!data.name || data.name.length > 100) return { error: "お名前を100文字以内で入力してください。" };
  if (!EMAIL_PATTERN.test(data.email) || data.email.length > 254) return { error: "メールアドレスを正しく入力してください。" };
  if (data.business.length > 150 || data.timing.length > 100 || data.message.length > 5000 || data.website.length > 200) {
    return { error: "入力できる文字数を超えています。" };
  }
  if (data.topics.length > TOPICS.size || data.topics.some((topic) => !TOPICS.has(topic))) {
    return { error: "ご相談内容を選び直してください。" };
  }
  if (!BOOKING_METHODS.has(data.bookingMethod)) return { error: "現在の予約受付方法を選び直してください。" };
  if (!data.website && (!data.turnstileToken || data.turnstileToken.length > 2048)) {
    return { error: "安全確認を完了してください。" };
  }
  return { data };
}

async function verifyTurnstile(token, secret, request) {
  const payload = new FormData();
  payload.set("secret", secret);
  payload.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) payload.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: payload });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.action === "contact" && result.hostname === new URL(request.url).hostname;
}

function emailText(data) {
  return [
    "were-kyoto.com から新しいお問い合わせが届きました。", "",
    `お名前: ${data.name}`,
    `店舗・事業名: ${data.business || "（未入力）"}`,
    `メールアドレス: ${data.email}`,
    `ご相談内容: ${data.topics.length ? data.topics.join("、") : "（未選択）"}`,
    `現在の予約受付方法: ${data.bookingMethod || "（未選択）"}`,
    `ご希望の時期: ${data.timing || "（未入力）"}`, "", "自由記述:", data.message || "（未入力）",
  ].join("\n");
}

async function sendEmail(data, env) {
  const subjectName = data.name.replace(/[\r\n]+/g, " ");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: data.email,
      subject: `【were.】Webサイトからのお問い合わせ（${subjectName}様）`,
      text: emailText(data),
    }),
  });
  return response.ok;
}

async function contact(request, env) {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY || !env.RESEND_API_KEY || !env.CONTACT_FROM || !env.CONTACT_TO) {
    return json({ message: "現在フォームを利用できません。恐れ入りますが、メールでお問い合わせください。" }, 503);
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ message: "送信内容が大きすぎます。" }, 413);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ message: "送信元を確認できませんでした。" }, 403);
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return json({ message: "送信形式を確認できませんでした。" }, 415);
  }

  let body;
  let form;
  try {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return json({ message: "送信内容が大きすぎます。" }, 413);
    form = await new Request(request.url, { method: "POST", headers: request.headers, body }).formData();
  } catch {
    return json({ message: "送信内容を読み取れませんでした。" }, 400);
  }
  const validated = validateForm(form);
  if (validated.error) return json({ message: validated.error }, 400);
  if (validated.data.website) return new Response(null, { status: 303, headers: { Location: "/thanks/", "Cache-Control": "no-store" } });

  let turnstileValid = false;
  try {
    turnstileValid = await verifyTurnstile(validated.data.turnstileToken, env.TURNSTILE_SECRET_KEY, request);
  } catch {
    return json({ message: "安全確認に失敗しました。時間をおいて再度お試しください。" }, 502);
  }
  if (!turnstileValid) return json({ message: "安全確認に失敗しました。もう一度お試しください。" }, 400);

  try {
    if (!await sendEmail(validated.data, env)) throw new Error("email rejected");
  } catch {
    return json({ message: "送信できませんでした。入力内容は残っています。時間をおいて再度お試しください。" }, 502);
  }
  return new Response(null, { status: 303, headers: { Location: "/thanks/", "Cache-Control": "no-store" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact/config" && request.method === "GET") {
      if (!env.TURNSTILE_SITE_KEY) return json({ message: "設定が完了していません。" }, 503);
      return json({ sitekey: env.TURNSTILE_SITE_KEY });
    }
    if (url.pathname === "/api/contact" && request.method === "POST") return contact(request, env);
    if (url.pathname.startsWith("/api/")) return json({ message: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
