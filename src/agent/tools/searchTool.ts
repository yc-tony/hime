import CONFIG from '../../config';

// Proxied through hime_api.py /hime/search to avoid CORS and hide any API keys
export async function webSearch(query: string): Promise<string> {
  const res = await fetch(CONFIG.SEARCH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const data = await res.json();
  // data.results is an array of { title, snippet, url }
  const results: Array<{ title: string; snippet: string; url: string }> = data.results ?? [];
  if (results.length === 0) return '搜尋沒有找到相關結果。';
  return results.slice(0, 5).map(r => `【${r.title}】\n${r.snippet}\n${r.url}`).join('\n\n');
}
