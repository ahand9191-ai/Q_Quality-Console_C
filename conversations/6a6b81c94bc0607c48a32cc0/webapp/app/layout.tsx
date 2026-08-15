import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Q.C. Quality Console — MTR Verification',
  description: 'Automated Mill Test Report verification for domestic steel compliance and AWS D1.1/D1.5 welding code validation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
