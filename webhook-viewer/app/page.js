import { getRecentEvents } from '@/lib/events';

export const dynamic = 'force-dynamic';

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

export default async function Home() {
  let events = [];
  let error = null;

  try {
    events = await getRecentEvents(100);
  } catch (err) {
    error = err.message;
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Webhook Inbox</p>
          <h1>通知回调查看器</h1>
          <p className="hint">把 Android App 的 Webhook URL 设置为 <code>/api/webhook</code>，收到通知后会显示在这里。</p>
        </div>
        <a className="button" href="/">刷新</a>
      </section>

      {error ? (
        <div className="empty">
          <h2>还不能读取数据</h2>
          <p>{error}</p>
          <p>部署到 Vercel 后，请在项目里绑定 Vercel Blob 存储。</p>
        </div>
      ) : null}

      {!error && events.length === 0 ? (
        <div className="empty">
          <h2>暂无通知</h2>
          <p>等待 Android 端 POST 到 <code>/api/webhook</code>。</p>
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
