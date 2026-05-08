import './globals.css';

export const metadata = {
  title: '오점뭐 (오늘 점심 뭐?)',
  description: '직장인을 위한 초근접성 점심 결정 솔루션',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <main className="app-container">
          {children}
        </main>
      </body>
    </html>
  );
}
