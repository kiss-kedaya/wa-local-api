import './styles.css';

export const metadata = {
  title: 'Notification Webhook Viewer',
  description: 'Simple notification webhook inbox'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
