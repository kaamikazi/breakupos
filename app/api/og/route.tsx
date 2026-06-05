import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const situations = parseInt(searchParams.get('situations') ?? '0', 10)
  const compatibility = parseInt(searchParams.get('compatibility') ?? '0', 10)
  const redFlags = parseInt(searchParams.get('red_flags') ?? '0', 10)

  const compatColor =
    compatibility <= 30 ? '#ef4444' :
    compatibility <= 60 ? '#f59e0b' :
    compatibility <= 80 ? '#14b8a6' :
    '#22c55e'

  const compatLabel =
    compatibility <= 30 ? 'Run.' :
    compatibility <= 60 ? 'Proceed with caution.' :
    compatibility <= 80 ? 'Promising.' :
    'Strong signal.'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#09090b',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 700 }}>Breakup</span>
          <span style={{ color: '#ff4d6d', fontSize: '28px', fontWeight: 700 }}>OS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: '#71717a', fontSize: '18px' }}>
            Private relationship clarity
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#ffffff', fontSize: '56px', fontWeight: 700, lineHeight: 1 }}>
                {situations}
              </span>
              <span style={{ color: '#71717a', fontSize: '16px' }}>situations</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: compatColor, fontSize: '56px', fontWeight: 700, lineHeight: 1 }}>
                {compatibility}
              </span>
              <span style={{ color: '#71717a', fontSize: '16px' }}>avg compatibility</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#ef4444', fontSize: '56px', fontWeight: 700, lineHeight: 1 }}>
                {redFlags}
              </span>
              <span style={{ color: '#71717a', fontSize: '16px' }}>red flags</span>
            </div>
          </div>
          <div style={{ color: compatColor, fontSize: '24px', fontStyle: 'italic' }}>
            {compatLabel}
          </div>
        </div>

        <div style={{ color: '#3f3f46', fontSize: '16px' }}>
          breakupos.com · Private beta
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
