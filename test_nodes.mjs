
const nodes = ['https://vid.puffyan.us', 'https://invidious.jing.rocks', 'https://invidious.lunar.icu', 'https://yewtu.be', 'https://inv.tux.pizza', 'https://pipedapi.tokhmi.xyz', 'https://pipedapi.kavin.rocks'];
async function test() {
  for (const n of nodes) {
    try {
      const isPiped = n.includes('piped');
      const url = isPiped ? n + '/search?q=taylor+swift&filter=music_songs' : n + '/api/v1/search?q=taylor+swift';
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log(n, res.ok, await res.text().then(t => t.length));
    } catch(e) { console.log(n, e.message); }
  }
}
test();
