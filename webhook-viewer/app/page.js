'use client';

import { useEffect, useMemo, useState } from 'react';

const TOKEN_KEY = 'notification_webhook_token';

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getTitle(event) {
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') return 'Text payload';
  return payload.title || payload.appName || payload.packageName || payload.application || 'Notification';
}

function getBody(event) {
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') return String(payload || '');
  return payload.text || payload.body || payload.message || payload.content || '';
}

export default function Home() {
  const [token, setToken] = useState('');
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const webhookUrl = useMemo(() => {
    if (!token || typeof window === 'undefined') return '';
    return `${window.location.origin}/api/webhook/${token}`;
  }, [token]);

  async function loadEvents(activeToken = token, options = {}) {
    if (!activeToken) return;
    if (!options.silent) setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/events?token=${encodeURIComponent(activeToken)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '读取失败');
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  function resetToken() {
    const nextToken = generateToken();
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setEvents([]);
    setCopied(false);
    loadEvents(nextToken);
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => {
    let savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      savedToken = generateToken();
      localStorage.setItem(TOKEN_KEY, savedToken);
    }

    setToken(savedToken);
    loadEvents(savedToken);

    const timer = setInterval(() => {
      loadEvents(savedToken, { silent: true });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Webhook Inbox</p>
          <h1>通知回调查看器</h1>
          <p className="hint">页面会在浏览器 localStorage 里保存一个随机 token，用这个 token 生成回调 URL，并每 3 秒轮询属于该 token 的消息。</p>
        </div>
        <button className="button" onClick={() => loadEvents()} type="button">{loading ? '刷新中' : '刷新'}</button>
      </section>

      <section className="panel">
        <label>Webhook URL</label>
        <div className="urlRow">
          <input readOnly value={webhookUrl} />
          <button onClick={copyUrl} type="button">{copied ? '已复制' : '复制'}</button>
        </div>
        <p>把这个地址填到 Android App 的 webhook URL。不要把 token 发给别人，否则别人可以写入并查看这个 token 下的数据。</p>
        <button className="linkButton" onClick={resetToken} type="button">重新生成 token</button>
      </section>

      {error ? (
        <div className="empty">
          <h2>读取失败</h2>
          <p>{error}</p>
        </div>
      ) : null}

      {!error && events.length === 0 ? (
        <div className="empty">
          <h2>暂无通知</h2>
          <p>等待 Android 端 POST 到上面的 Webhook URL。</p>
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
              <time>{new Date(event.receivedAt).toLocaleString('zh-CN', { hour12: false })}</time>
            </div>
            <details>
              <summary>查看原始数据</summary>
              <pre>{JSON.stringify(event.payload, null, 2)}</pre>
            </details>
          </article>
        ))}
      </div>
    </main>
  );
}
