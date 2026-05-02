import type { Metadata, Viewport } from "next";
// @ts-ignore
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZENIX AI Trading Terminal",
  description: "Advanced SMC Trading & Market Intelligence",
  applicationName: "ZENIX AI",
  appleWebApp: {
    capable: true,
    title: "ZENIX AI",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(msg, url, line, col, error) {
                var d = document.createElement('div');
                d.style.position = 'fixed'; d.style.top = '0'; d.style.left = '0'; d.style.right = '0'; d.style.background = 'red'; d.style.color = 'white'; d.style.zIndex = '999999'; d.style.padding = '20px'; d.style.fontSize = '14px'; d.style.wordWrap = 'break-word';
                d.innerText = 'FATAL ERROR: ' + msg + '\\nAt: ' + url + ':' + line + ':' + col;
                document.body.appendChild(d);
                return false;
              };
              window.onunhandledrejection = function(event) {
                var d = document.createElement('div');
                d.style.position = 'fixed'; d.style.bottom = '0'; d.style.left = '0'; d.style.right = '0'; d.style.background = 'orange'; d.style.color = 'black'; d.style.zIndex = '999999'; d.style.padding = '20px'; d.style.fontSize = '14px'; d.style.wordWrap = 'break-word';
                d.innerText = 'PROMISE REJECTION: ' + (event.reason ? event.reason.message || event.reason : 'Unknown');
                document.body.appendChild(d);
              };
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
