import CONFIG from '../../config';

// Proxied through hime_api.py /hime/stock (uses yfinance on backend)
export async function getStock(symbol: string): Promise<string> {
  const res = await fetch(CONFIG.STOCK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) throw new Error(`stock HTTP ${res.status}`);
  const data = await res.json();
  return data.summary as string;
}
