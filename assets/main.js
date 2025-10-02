async function renderNasaImages(query, mountId, limit = 8) {
  const wrap = document.getElementById(mountId);
  if (!wrap) { return; }
  wrap.innerHTML = `<div class="notice">Loading "${query}" images from NASA...</div>`;
  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`;
    const res = await fetch(url);
    const data = await res.json();
    const items = (data?.collection?.items || []).slice(0, limit);
    if (!items.length) {
      wrap.innerHTML = `<div class="notice">No results found for ${query}.</div>`;
      return;
    }
    const cards = [];
    for (const it of items) {
      const meta = (it.data && it.data[0]) || {};
      const nasaId = meta.nasa_id;
      const title = meta.title || query;
      let thumb = (it.links && it.links[0] && it.links[0].href) || "";
      let origHref = "";
      try {
        const assetRes = await fetch(`https://images-api.nasa.gov/asset/${nasaId}`);
        const asset = await assetRes.json();
        const hrefs = (asset?.collection?.items || []).map(x => x.href);
        origHref = hrefs.find(h => /~orig\.(jpg|jpeg|png|tif)$/i.test(h)) ||
                   hrefs.find(h => /\.(jpg|jpeg|png)$/i.test(h)) ||
                   (hrefs[0] || "");
        if (!thumb) { thumb = origHref; }
      } catch (e) {
        /* ignore individual asset failures */
      }
      const safeTitle = title.replace(/"/g, '&quot;');
      const html = `
        <article class="card">
          <img class="thumb" alt="${safeTitle}" loading="lazy" src="${thumb}"/>
          <div class="body">
            <h3>${safeTitle}</h3>
            <div class="meta">
              <a class="btn small" href="${origHref || thumb}" target="_blank" rel="noopener">Download</a>
              <a class="btn ghost small" href="https://images.nasa.gov/search?q=${encodeURIComponent(query)}" target="_blank" rel="noopener">Open in NASA Library</a>
            </div>
          </div>
        </article>`;
      cards.push(html);
    }
    wrap.innerHTML = `<div class="grid cols-3">${cards.join("")}</div>`;
  } catch (err) {
    wrap.innerHTML = `<div class="notice">Could not contact the NASA Images API. Please try again.</div>`;
  }
}

function initSpotTheStation() {
  const form = document.querySelector("#sts-form");
  const frame = document.querySelector("#sts-frame");
  if (!form || !frame) { return; }
  function update() {
    const city = document.getElementById("city").value.trim() || "New York";
    const region = document.getElementById("region").value.trim() || "New_York";
    const country = document.getElementById("country").value.trim() || "United_States";
    const src = `https://spotthestation.nasa.gov/widget/index.cfm?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}`;
    frame.src = src;
  }
  form.addEventListener("input", update);
  update();
}

function initCupolaViewport() {
  const viewport = document.querySelector("[data-cupola-window]");
  if (!viewport) { return; }
  const frame = viewport.querySelector(".cupola-frame");
  const earth = viewport.querySelector(".cupola-earth");
  const stars = viewport.querySelector(".cupola-stars");
  if (!frame) { return; }

  let raf = 0;
  const applyTilt = (normX, normY) => {
    const tiltY = (normX - 0.5) * 18;
    const tiltX = (0.5 - normY) * 12;
    frame.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    frame.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    if (earth) {
      earth.style.setProperty("--earth-x", `${((normX - 0.5) * 40).toFixed(1)}px`);
      earth.style.setProperty("--earth-y", `${((normY - 0.5) * 40).toFixed(1)}px`);
      earth.style.setProperty("--earth-z", "60px");
    }
    if (stars) {
      stars.style.transform = `translate3d(${((normX - 0.5) * -30).toFixed(1)}px, ${((normY - 0.5) * -30).toFixed(1)}px, -80px)`;
    }
  };

  const handlePointer = ev => {
    const rect = viewport.getBoundingClientRect();
    const normX = rect.width ? (ev.clientX - rect.left) / rect.width : 0.5;
    const normY = rect.height ? (ev.clientY - rect.top) / rect.height : 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => applyTilt(normX, normY));
  };

  const reset = () => {
    cancelAnimationFrame(raf);
    frame.style.setProperty("--tilt-y", "0deg");
    frame.style.setProperty("--tilt-x", "0deg");
    if (earth) {
      earth.style.setProperty("--earth-x", "0px");
      earth.style.setProperty("--earth-y", "0px");
      earth.style.setProperty("--earth-z", "60px");
    }
    if (stars) {
      stars.style.transform = "translate3d(0px, 0px, -80px)";
    }
  };

  viewport.addEventListener("pointermove", handlePointer);
  viewport.addEventListener("pointerleave", reset);
  viewport.addEventListener("pointerdown", reset);
  viewport.addEventListener("pointerup", reset);
  reset();
}

function initEarthOrbitMap() {
  const mount = document.getElementById("earth-orbit-map");
  if (!mount || typeof Cesium === "undefined") { return; }
  if (mount.dataset.ready === "true") { return; }
  mount.dataset.ready = "true";

  if (typeof Cesium.Ion !== "undefined" && !Cesium.Ion.defaultAccessToken) {
    Cesium.Ion.defaultAccessToken = "";
  }

  const viewer = new Cesium.Viewer(mount, {
    imageryProvider: new Cesium.UrlTemplateImageryProvider({
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      credit: "(c) OpenStreetMap contributors"
    }),
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayerPicker: false,
    geocoder: false,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    fullscreenButton: false,
    navigationHelpButton: false,
    homeButton: false,
    infoBox: false,
    selectionIndicator: false,
    requestRenderMode: true
  });

  const scene = viewer.scene;
  scene.globe.enableLighting = true;
  scene.globe.baseColor = Cesium.Color.fromCssColorString("#020512");
  scene.skyBox && (scene.skyBox.show = false);
  scene.moon && (scene.moon.show = false);
  scene.sun && (scene.sun.show = false);
  scene.fog.enabled = false;

  const destination = Cesium.Cartesian3.fromDegrees(-142.9894608, -3.8340697, 19903487);
  const orientation = {
    heading: Cesium.Math.toRadians(207.09),
    pitch: Cesium.Math.toRadians(-60),
    roll: 0
  };

  scene.camera.setView({ destination, orientation });

  const controller = scene.screenSpaceCameraController;
  controller.minimumZoomDistance = 500000;
  controller.maximumZoomDistance = 60000000;
  controller.enableCollisionDetection = false;

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-142.9894608, -3.8340697, 0),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString("#ff922b").withAlpha(0.9),
      outlineWidth: 2,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.9)
    },
    label: {
      text: "South Pacific marker",
      font: "13px Inter, system-ui",
      pixelOffset: new Cesium.Cartesian2(0, -18),
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      showBackground: true,
      backgroundColor: Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.55)
    }
  });

  const creditContainer = viewer.cesiumWidget && viewer.cesiumWidget.creditContainer;
  if (creditContainer) {
    creditContainer.style.display = "none";
  }

  const resetBtn = document.querySelector("[data-reset-orbit]");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      viewer.camera.flyTo({
        destination,
        orientation,
        duration: 1.6,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
      });
    });
  }

  mount.viewer = viewer;
}


document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cupola-gallery")) {
    renderNasaImages("cupola international space station", "cupola-gallery", 9);
  }
  if (document.getElementById("nbl-gallery")) {
    renderNasaImages("Neutral Buoyancy Laboratory", "nbl-gallery", 9);
  }
  if (document.getElementById("sts-frame")) {
    initSpotTheStation();
  }
  initCupolaViewport();
  initEarthOrbitMap();
});
