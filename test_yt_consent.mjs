
async function test() {
  const res = await fetch('https://music.youtube.com/youtubei/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': 'CONSENT=YES+cb' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20230508.01.00' } }, query: 'taylor swift' })
  });
  console.log(res.ok);
  const json = await res.json();
  console.log('Got json');
}
test().catch(console.error);
