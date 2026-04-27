import CONFIG from '../../config';

// Proxied through hime_api.py /hime/weather
export async function getWeather(location: string): Promise<string> {
  const res = await fetch(CONFIG.WEATHER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location }),
  });
  if (!res.ok) throw new Error(`weather HTTP ${res.status}`);
  const data = await res.json();
  return data.summary as string;
}
