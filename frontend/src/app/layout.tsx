import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTP Gridlock Intelligence — Autonomous Traffic Command Center",
  description: "AI-driven parking violation intelligence platform for Bengaluru Traffic Police. Features computer vision detection, predictive forecasting, digital twin simulation, and real-time field alerts.",
  keywords: "BTP, Bengaluru Traffic Police, parking violations, AI, computer vision, traffic intelligence, Gridlock",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header style={{ 
          background: 'rgba(15, 17, 26, 0.85)', 
          borderBottom: '1px solid var(--surface-border)',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(16px)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '36px', height: '36px', 
              background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', 
              borderRadius: '10px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontWeight: 'bold', fontSize: '0.75rem',
              boxShadow: '0 0 20px rgba(59,130,246,0.3)',
            }}>
              BTP
            </div>
            <div>
              <h1 style={{ fontSize: '1.15rem', margin: 0, letterSpacing: '0.3px', lineHeight: 1.2 }}>
                Gridlock <span className="gradient-text">Intelligence</span>
              </h1>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                AUTONOMOUS TRAFFIC COMMAND CENTER
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 14px', borderRadius: '20px',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 500 }}>Live • Bengaluru</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>
        
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', paddingBottom: '4rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
