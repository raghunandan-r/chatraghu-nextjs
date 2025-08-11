export const metadata = { title: 'Chat with Raghu', description: 'Chat with Assistant AI' };
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html:
              `
                html, body { height: 100%; margin: 0; }
                body { background: #000; color: #fff; font: 14px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                * { box-sizing: border-box; }
              `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}