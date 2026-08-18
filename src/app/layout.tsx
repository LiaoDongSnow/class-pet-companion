import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: '课上小伴 | 教学互动助手',
  description: '集学生管理、宠物领养、积分激励、随机点名于一体的课堂互动教学助手',
  keywords: ['教学助手', '课堂互动', '宠物领养', '积分系统', '随机点名'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
