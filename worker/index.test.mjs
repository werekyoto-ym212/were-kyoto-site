import assert from "node:assert/strict";
import test from "node:test";
import worker, { validateForm } from "./index.mjs";

const env = {
  TURNSTILE_SITE_KEY: "site-key-present",
  TURNSTILE_SECRET_KEY: "secret-present",
  RESEND_API_KEY: "resend-present",
  CONTACT_FROM: "were. <contact@example.com>",
  CONTACT_TO: "owner@example.com",
};

function validForm(overrides = {}) {
  const values = {
    name: "テスト 太郎",
    business: "テスト店舗",
    email: "sender@example.com",
    topics: ["Webサイト", "予約システム"],
    booking_method: "LINE",
    timing: "3か月以内",
    message: "相談内容です。",
    website: "",
    "cf-turnstile-response": "valid-token",
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
  }
  return form;
}

function post(form = validForm()) {
  return new Request("https://were-kyoto.com/api/contact", { method: "POST", body: form });
}

test("validates required, formats, lengths, choices, and unexpected fields", () => {
  assert.ok(validateForm(validForm()).data);
  assert.match(validateForm(validForm({ name: "" })).error, /お名前/);
  assert.match(validateForm(validForm({ email: "invalid" })).error, /メールアドレス/);
  assert.match(validateForm(validForm({ message: "x".repeat(5001) })).error, /文字数/);
  assert.match(validateForm(validForm({ topics: ["想定外"] })).error, /ご相談内容/);
  assert.match(validateForm(validForm({ booking_method: "想定外" })).error, /予約受付方法/);
  const extra = validForm();
  extra.append("admin", "true");
  assert.match(validateForm(extra).error, /不明な項目/);
  const duplicate = validForm();
  duplicate.append("name", "duplicate");
  assert.match(validateForm(duplicate).error, /複数/);
});

test("returns 503 without required bindings and never calls an external service", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls += 1; throw new Error("unexpected"); };
  try {
    const response = await worker.fetch(post(), {});
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("honeypot returns generic success without Turnstile or Resend calls", async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls += 1; throw new Error("unexpected"); };
  try {
    const response = await worker.fetch(post(validForm({ website: "spam.example" })), env);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("Location"), "/thanks/");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects failed Turnstile and does not call Resend", async () => {
  const urls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ success: false });
  };
  try {
    const response = await worker.fetch(post(), env);
    assert.equal(response.status, 400);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /siteverify/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sends exactly once after valid Turnstile and returns 303 only on Resend success", async () => {
  const urls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    urls.push(String(url));
    if (String(url).includes("siteverify")) {
      return Response.json({ success: true, action: "contact", hostname: "were-kyoto.com" });
    }
    const body = JSON.parse(options.body);
    assert.equal(body.reply_to, "sender@example.com");
    assert.match(body.text, /テスト 太郎/);
    return Response.json({ id: "message-id" });
  };
  try {
    const response = await worker.fetch(post(), env);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("Location"), "/thanks/");
    assert.equal(urls.filter((url) => url.includes("api.resend.com")).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps the user on the form when Resend rejects the request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => String(url).includes("siteverify")
    ? Response.json({ success: true, action: "contact", hostname: "were-kyoto.com" })
    : Response.json({ message: "rejected" }, { status: 422 });
  try {
    const response = await worker.fetch(post(), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Location"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
