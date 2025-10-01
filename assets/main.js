
async function renderNasaImages(query, mountId, limit=8){
  const wrap = document.getElementById(mountId);
  if(!wrap){ return; }
  wrap.innerHTML = `<div class="notice">Loading “${query}” images from NASA…</div>`;
  try{
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`;
    const res = await fetch(url);
    const data = await res.json();
    const items = (data?.collection?.items || []).slice(0, limit);
    if(!items.length){ wrap.innerHTML = `<div class="notice">No results found for ${query}.</div>`; return; }
    const cards = [];
    for(const it of items){
      const meta = (it.data && it.data[0]) || {};
      const nasa_id = meta.nasa_id;
      const title = meta.title || query;
      let thumb = (it.links && it.links[0] && it.links[0].href) || "";
      let origHref = "";
      try{
        const assetRes = await fetch(`https://images-api.nasa.gov/asset/${nasa_id}`);
        const asset = await assetRes.json();
        const hrefs = (asset?.collection?.items || []).map(x => x.href);
        origHref = hrefs.find(h => /~orig\.(jpg|jpeg|png|tif)$/i.test(h)) ||
                   hrefs.find(h => /\.(jpg|jpeg|png)$/i.test(h)) ||
                   (hrefs[0] || "");
        if(!thumb) thumb = origHref;
      }catch(e){ /* ignore */ }
      const html = `
        <article class="card">
          <img class="thumb" alt="${title.replace(/"/g,'&quot;')}" loading="lazy" src="${thumb}"/>
          <div class="body">
            <h3>${title}</h3>
            <div class="meta">
              <a class="btn small" href="${origHref || thumb}" target="_blank" rel="noopener">Download</a>
              <a class="btn ghost small" href="https://images.nasa.gov/search?q=${encodeURIComponent(query)}" target="_blank" rel="noopener">Open in NASA Library</a>
            </div>
          </div>
        </article>`;
      cards.push(html);
    }
    wrap.innerHTML = `<div class="grid cols-3">${cards.join("")}</div>`;
  }catch(err){
    wrap.innerHTML = `<div class="notice">Could not contact the NASA Images API. Please try again.</div>`;
  }
}

function initSpotTheStation(){
  const form = document.querySelector("#sts-form");
  const frame = document.querySelector("#sts-frame");
  if(!form || !frame) return;
  function update(){
    const city = document.getElementById("city").value.trim() || "New York";
    const region = document.getElementById("region").value.trim() || "New_York";
    const country = document.getElementById("country").value.trim() || "United_States";
    const src = `https://spotthestation.nasa.gov/widget/index.cfm?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}`;
    frame.src = src;
  }
  form.addEventListener("input", update);
  update();
}

document.addEventListener("DOMContentLoaded", () => {
  if(document.getElementById("cupola-gallery")){ renderNasaImages("cupola international space station", "cupola-gallery", 9); }
  if(document.getElementById("nbl-gallery")){ renderNasaImages("Neutral Buoyancy Laboratory", "nbl-gallery", 9); }
  if(document.getElementById("sts-frame")){ initSpotTheStation(); }
});
