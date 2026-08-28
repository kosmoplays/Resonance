
import fs from 'fs';
async function test() {
  const res = await fetch('https://music.youtube.com/youtubei/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20230508.01.00' } }, query: 'taylor swift' })
  });
  const json = await res.json();
  fs.writeFileSync('yt_dump.json', JSON.stringify(json, null, 2));
}
test().catch(console.error);
