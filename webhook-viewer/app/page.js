'use client';

import { useEffect, useMemo, useState } from 'react';

const TOKEN_KEY = 'notification_webhook_token';

function generateToken() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function normalizeToken(value) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function isValidToken(value) {
  return /^[a-zA-Z0-9_-]{6,64}$/.test(value);
}

function normalizePayload(payload) {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;
  try { return JSON.parse(payload); } catch { return null; }
}

function getTitle(event) {
  const payload = normalizePayload(event.payload);
  if (!payload) return '文本消息';
  return payload.title || payload.appName || payload.packageName || payload.application || '通知';
}

function getBody(event) {
  const payload = normalizePayload(event.payload);
  if (!payload) return String(event.payload || '');
  return payload.text || payload.body || payload.message || payload.content || '';
}

export default function Home() {
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastPollAt, setLastPollAt] = useState(null);

  const webhookUrl = useMemo(() => {
    if (!token || typeof window === 'undefined') return '';
    return `${window.location.origin}/api/webhook/${token}`;
  }, [token]);

  async function loadEvents(activeToken = token, options = {}) {
    if (!activeToken || !isValidToken(activeToken)) return;
    if (!options.silent) setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/events?token=${encodeURIComponent(activeToken)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || '读取失败');
      setEvents(data.events || []);
      setLastPollAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  function saveToken(nextToken) {
    const normalized = normalizeToken(nextToken);
    if (!isValidToken(normalized)) {
      setError('token 需要 6-64 位，只能包含字母、数字、下划线和短横线');
      return;
    }

    localStorage.setItem(TOKEN_KEY, normalized);
    setToken(normalized);
    setTokenInput(normalized);
    setEvents([]);
    setCopied(false);
    if (normalized === token) {
      loadEvents(normalized);
    }
  }

  function resetToken() {
    saveToken(generateToken());
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => {
    let savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken || !isValidToken(savedToken)) {
      savedToken = generateToken();
      localStorage.setItem(TOKEN_KEY, savedToken);
    }

    setToken(savedToken);
    setTokenInput(savedToken);
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    loadEvents(token);

    const timer = setInterval(() => {
      loadEvents(token, { silent: true });
    }, 10000);

    return () => clearInterval(timer);
  }, [token]);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Webhook Inbox</p>
        <h1>通知回调</h1>
        <p className="hint">复制下面的地址到 Android App。消息只保留 1 小时，页面每 10 秒自动刷新。</p>
      </section>

      <section className="panel compactPanel">
        <label>Webhook URL</label>
        <div className="urlRow">
          <input readOnly value={webhookUrl} />
          <button onClick={copyUrl} type="button">{copied ? '已复制' : '复制'}</button>
        </div>

        <label className="fieldLabel">Token</label>
        <div className="urlRow tokenRow">
          <input value={tokenInput} onChange={event => setTokenInput(normalizeToken(event.target.value))} />
          <button onClick={() => saveToken(tokenInput)} type="button">设置</button>
        </div>

        <div className="actions splitActions">
          <button className="linkButton" onClick={resetToken} type="button">随机 token</button>
          <button className="linkButton" onClick={() => loadEvents()} type="button">{loading ? '刷新中' : '刷新'}</button>
        </div>
      </section>

      <section className="statusBar">
        <span>{events.length} 条</span>
        <span>保留 1 小时</span>
        <span>{lastPollAt ? lastPollAt.toLocaleTimeString('zh-CN', { hour12: false }) : '等待刷新'}</span>
      </section>

      {error ? <div className="empty errorBox"><p>{error}</p></div> : null}

      {!error && events.length === 0 ? (
        <div className="empty">
          <h2>暂无通知</h2>
          <p>等待 Android 端 POST 到 Webhook URL。</p>
        </div>
      ) : null}

      <div className="list">
        {events.map(event => (
          <article className="card" key={event.id}>
            <div className="cardHeader">
              <div>
                <h2>{getTitle(event)}</h2>
                <p>{getBody(event)}</p>
              </div>
              <time>{(() => { const p = normalizePayload(event.payload); return p && p.postTime ? new Date(p.postTime).toLocaleString('zh-CN', { hour12: false }) : new Date(event.receivedAt).toLocaleString('zh-CN', { hour12: false }); })()}</time>
            </div>
            <details>
              <summary>原始数据</summary>
              <pre>{JSON.stringify(event.payload, null, 2)}</pre>
            </details>
          </article>
        ))}
      </div>
    </main>
  );
}
