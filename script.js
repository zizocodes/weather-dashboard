/* ══════════════════════════════════════════════════
   ATMOS WEATHER DASHBOARD — script.js  v2
   ➜  Replace API_KEY below with your OpenWeatherMap key
      Get a free key at: https://openweathermap.org/api
══════════════════════════════════════════════════ */

const API_KEY  = "YOUR_API_KEY_HERE"; // ← your key here
const BASE_URL = "https://api.openweathermap.org/data/2.5";

/* ── DOM ── */
const searchInput        = document.getElementById("searchInput");
const searchInputCompact = document.getElementById("searchInputCompact");
const btnSearch          = document.getElementById("btnSearch");
const btnSearchCompact   = document.getElementById("btnSearchCompact");
const btnGeo             = document.getElementById("btnGeo");
const btnTheme           = document.getElementById("btnTheme");
const btnBack            = document.getElementById("btnBack");
const errorDismiss       = document.getElementById("errorDismiss");

const loaderWrap  = document.getElementById("loaderWrap");
const errorWrap   = document.getElementById("errorWrap");
const errorMsg    = document.getElementById("errorMsg");
const mainContent = document.getElementById("mainContent");
const landingHero = document.getElementById("landingHero");

const recentChips        = document.getElementById("recentChips");
const recentWrap         = document.getElementById("recentWrap");
const recentChipsCompact = document.getElementById("recentChipsCompact");

/* Hero card */
const cityName      = document.getElementById("cityName");
const countryBadge  = document.getElementById("countryBadge");
const dateTime      = document.getElementById("dateTime");
const weatherIconLg = document.getElementById("weatherIconLg");
const conditionLabel= document.getElementById("conditionLabel");
const tempMain      = document.getElementById("tempMain");
const feelsLike     = document.getElementById("feelsLike");
const humidityEl    = document.getElementById("humidity");
const windSpeedEl   = document.getElementById("windSpeed");
const pressureEl    = document.getElementById("pressure");
const visibilityEl  = document.getElementById("visibility");
const sunriseEl     = document.getElementById("sunrise");
const sunsetEl      = document.getElementById("sunset");
const tempMinEl     = document.getElementById("tempMin");
const tempMaxEl     = document.getElementById("tempMax");
const heroBgIcon    = document.getElementById("heroBgIcon");

/* Widgets */
const humidityGauge    = document.getElementById("humidityGauge");
const gaugeVal         = document.getElementById("gaugeVal");
const compassNeedleWrap= document.getElementById("compassNeedleWrap");
const windDegText      = document.getElementById("windDegText");
const rangeFill        = document.getElementById("rangeFill");
const rangeThumb       = document.getElementById("rangeThumb");
const rMin             = document.getElementById("rMin");
const rMax             = document.getElementById("rMax");
const cloudRing        = document.getElementById("cloudRing");
const cloudVal         = document.getElementById("cloudVal");
const scoreNum         = document.getElementById("scoreNum");
const scoreBarFill     = document.getElementById("scoreBarFill");
const scoreDesc        = document.getElementById("scoreDesc");

const forecastStrip = document.getElementById("forecastStrip");
let chartTemp, chartHumidity, chartWind;

/* ── STATE ── */
let recentCities = JSON.parse(localStorage.getItem("atmos_recent") || "[]");

/* ══════════════════════════════════════════════════
   LIVE CLOCK
══════════════════════════════════════════════════ */
function tickClock() {
  const now = new Date();
  document.getElementById("clockTime").textContent =
    now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
  document.getElementById("clockDate").textContent =
    now.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}
tickClock();
setInterval(tickClock, 1000);

/* ══════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem("atmos_theme") || "light";
  document.body.classList.toggle("dark", saved === "dark");
})();

btnTheme.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("atmos_theme", dark ? "dark" : "light");
  if (chartTemp) rebuildCharts(chartTemp._data, chartHumidity._data, chartWind._data);
});

/* ══════════════════════════════════════════════════
   SEARCH WIRING
══════════════════════════════════════════════════ */
function doSearch(val) {
  const city = val.trim();
  if (city) fetchWeather(city);
}

btnSearch.addEventListener("click",         () => doSearch(searchInput.value));
btnSearchCompact.addEventListener("click",  () => doSearch(searchInputCompact.value));
searchInput.addEventListener("keydown",       e => e.key === "Enter" && doSearch(searchInput.value));
searchInputCompact.addEventListener("keydown",e => e.key === "Enter" && doSearch(searchInputCompact.value));

/* Quick city pills */
document.querySelectorAll(".qpill").forEach(btn =>
  btn.addEventListener("click", () => fetchWeather(btn.dataset.city))
);

/* Back button */
btnBack.addEventListener("click", () => {
  mainContent.hidden = true;
  landingHero.hidden = false;
  document.body.setAttribute("data-weather", "default");
  renderParticles("default");
});

/* Error dismiss */
errorDismiss.addEventListener("click", () => {
  errorWrap.hidden = true;
  if (mainContent.hidden) landingHero.hidden = false;
});

/* ══════════════════════════════════════════════════
   GEOLOCATION
══════════════════════════════════════════════════ */
btnGeo.addEventListener("click", () => {
  if (!navigator.geolocation) { showError("Geolocation not supported by your browser."); return; }
  showLoader();
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    ()  => { hideLoader(); showError("Location access denied. Search manually."); }
  );
});

/* ══════════════════════════════════════════════════
   RECENT SEARCHES
══════════════════════════════════════════════════ */
function renderRecentChips() {
  [recentChips, recentChipsCompact].forEach(container => {
    container.innerHTML = "";
    recentCities.forEach(city => {
      const c = document.createElement("button");
      c.className = "chip";
      c.textContent = city;
      c.addEventListener("click", () => fetchWeather(city));
      container.appendChild(c);
    });
  });
  recentWrap.style.display = recentCities.length ? "flex" : "none";
}

function saveRecentCity(city) {
  recentCities = [city, ...recentCities.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 5);
  localStorage.setItem("atmos_recent", JSON.stringify(recentCities));
  renderRecentChips();
}

/* ══════════════════════════════════════════════════
   UI STATE HELPERS
══════════════════════════════════════════════════ */
function showLoader() {
  landingHero.hidden = true;
  loaderWrap.hidden  = false;
  errorWrap.hidden   = true;
  mainContent.hidden = true;
}
function hideLoader() { loaderWrap.hidden = true; }

function showError(msg) {
  errorMsg.textContent = msg;
  errorWrap.hidden  = false;
  if (mainContent.hidden) landingHero.hidden = false;
  hideLoader();
}

function showMain() {
  errorWrap.hidden   = true;
  landingHero.hidden = true;
  mainContent.hidden = false;
  hideLoader();
}

/* ══════════════════════════════════════════════════
   FETCH — CURRENT WEATHER
══════════════════════════════════════════════════ */
async function fetchWeather(city) {
  showLoader();
  try {
    const res  = await fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) throw new Error("⏳ API key not activated yet — new keys take up to 2 hours to go live. Please wait and retry.");
      if (res.status === 404) throw new Error(`🔍 "${city}" not found. Try a specific city name like "Kuwait City" or "Dubai".`);
      if (res.status === 429) throw new Error("⚠️ Too many requests. Please wait a moment.");
      throw new Error(`Error ${res.status}: ${data.message || "Unknown error"}`);
    }

    saveRecentCity(data.name);
    searchInputCompact.value = data.name;
    renderCurrentWeather(data);
    fetchForecast(data.coord.lat, data.coord.lon);
  } catch (err) {
    hideLoader();
    showError(err.message);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    const res  = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) throw new Error("⏳ API key not activated yet. New keys take up to 2 hours.");
      throw new Error(`Location weather unavailable. (${res.status})`);
    }
    saveRecentCity(data.name);
    searchInput.value = data.name;
    searchInputCompact.value = data.name;
    renderCurrentWeather(data);
    fetchForecast(lat, lon);
  } catch (err) {
    hideLoader();
    showError(err.message);
  }
}

/* ══════════════════════════════════════════════════
   FETCH — FORECAST
══════════════════════════════════════════════════ */
async function fetchForecast(lat, lon) {
  try {
    const res  = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    if (!res.ok) throw new Error("Forecast unavailable.");
    const data = await res.json();
    renderForecast(data.list);
    renderCharts(data.list);
  } catch (err) {
    console.warn("Forecast:", err.message);
  } finally {
    showMain();
  }
}

/* ══════════════════════════════════════════════════
   RENDER — CURRENT WEATHER
══════════════════════════════════════════════════ */
function renderCurrentWeather(d) {
  const code  = d.weather[0].id;
  const icon  = d.weather[0].icon;
  const isNight = icon.endsWith("n");

  /* Text */
  cityName.textContent      = d.name;
  countryBadge.textContent  = d.sys.country;
  dateTime.textContent      = formatDateTime(new Date());
  weatherIconLg.src         = `https://openweathermap.org/img/wn/${icon}@2x.png`;
  weatherIconLg.alt         = d.weather[0].description;
  conditionLabel.textContent= d.weather[0].description;
  tempMain.textContent      = Math.round(d.main.temp);
  feelsLike.textContent     = `Feels like ${Math.round(d.main.feels_like)}°C`;
  humidityEl.textContent    = `${d.main.humidity}%`;
  windSpeedEl.textContent   = `${(d.wind.speed * 3.6).toFixed(1)} km/h`;
  pressureEl.textContent    = `${d.main.pressure} hPa`;
  visibilityEl.textContent  = `${(d.visibility / 1000).toFixed(1)} km`;
  sunriseEl.textContent     = formatTime(new Date(d.sys.sunrise * 1000));
  sunsetEl.textContent      = formatTime(new Date(d.sys.sunset  * 1000));
  tempMinEl.textContent     = `${Math.round(d.main.temp_min)}°C`;
  tempMaxEl.textContent     = `${Math.round(d.main.temp_max)}°C`;

  /* Humidity gauge (SVG circle: r=48, circumference≈301.6) */
  const circ = 301.6;
  const offset = circ - (d.main.humidity / 100) * circ;
  humidityGauge.style.strokeDashoffset = offset;
  gaugeVal.textContent = `${d.main.humidity}%`;

  /* Wind compass */
  if (d.wind.deg !== undefined) {
    compassNeedleWrap.style.transform = `rotate(${d.wind.deg}deg)`;
    windDegText.textContent = `${d.wind.deg}° ${degToDir(d.wind.deg)}`;
  }

  /* Temp range bar */
  const tMin = d.main.temp_min, tMax = d.main.temp_max, tCur = d.main.temp;
  const pct  = tMax > tMin ? ((tCur - tMin) / (tMax - tMin)) * 100 : 50;
  rangeFill.style.width  = `${pct}%`;
  rangeThumb.style.left  = `${pct}%`;
  rMin.textContent = `${Math.round(tMin)}°`;
  rMax.textContent = `${Math.round(tMax)}°`;

  /* Cloud cover ring (circumference≈238.8 for r=38) */
  const clouds = d.clouds ? d.clouds.all : 0;
  cloudRing.style.strokeDashoffset = 238.8 - (clouds / 100) * 238.8;
  cloudVal.textContent = `${clouds}%`;

  /* Comfort score (0-100 based on ideal conditions) */
  const score = calcComfortScore(d);
  scoreNum.textContent = score;
  scoreBarFill.style.width = `${score}%`;
  scoreDesc.textContent = score >= 80 ? "Perfect conditions ✨"
                        : score >= 60 ? "Comfortable 😊"
                        : score >= 40 ? "Manageable 🌤"
                        : score >= 20 ? "Unpleasant ⚠️"
                        : "Extreme conditions 🔥";

  /* Hero deco icon */
  heroBgIcon.textContent = getWeatherEmoji(code, isNight);

  /* Dynamic background + particles */
  applyWeatherBackground(code, isNight);
}

/* ══════════════════════════════════════════════════
   RENDER — 5-DAY FORECAST
══════════════════════════════════════════════════ */
function renderForecast(list) {
  /* Pick noon-closest entry per day */
  const days = {};
  list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    const hour = parseInt(item.dt_txt.split(" ")[1]);
    if (!days[date] || Math.abs(hour - 12) < Math.abs(parseInt(days[date].dt_txt.split(" ")[1]) - 12))
      days[date] = item;
  });

  forecastStrip.innerHTML = "";
  Object.values(days).slice(0, 5).forEach((item, i) => {
    const d    = new Date(item.dt * 1000);
    const day  = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday:"short" });
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.style.animationDelay = `${i * 0.08}s`;
    card.innerHTML = `
      <p class="fc-day">${day}</p>
      <img class="fc-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="${item.weather[0].description}" />
      <p class="fc-high">${Math.round(item.main.temp_max)}°</p>
      <p class="fc-low">${Math.round(item.main.temp_min)}°</p>
      <p class="fc-desc">${item.weather[0].description}</p>
    `;
    forecastStrip.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════
   RENDER — CHART.JS CHARTS
══════════════════════════════════════════════════ */
function renderCharts(list) {
  const slice  = list.slice(0, 8);
  const labels = slice.map(i => i.dt_txt.split(" ")[1].slice(0, 5));
  const temps  = slice.map(i => Math.round(i.main.temp));
  const humids = slice.map(i => i.main.humidity);
  const winds  = slice.map(i => parseFloat((i.wind.speed * 3.6).toFixed(1)));
  rebuildCharts({ labels, data: temps }, { labels, data: humids }, { labels, data: winds });
}

function rebuildCharts(tempD, humidD, windD) {
  if (chartTemp)     chartTemp.destroy();
  if (chartHumidity) chartHumidity.destroy();
  if (chartWind)     chartWind.destroy();

  const dark      = document.body.classList.contains("dark");
  const gridColor = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const txtColor  = dark ? "#4e6890" : "#8fa0b8";

  const base = {
    responsive:true, maintainAspectRatio:true,
    animation:{ duration:900, easing:"easeOutQuart" },
    plugins:{ legend:{ display:false }, tooltip:{ mode:"index", intersect:false,
      backgroundColor: dark ? "rgba(14,22,44,0.9)" : "rgba(255,255,255,0.95)",
      titleColor: dark ? "#e2eaf8" : "#0c1a2e",
      bodyColor:  dark ? "#7a9ec8" : "#4a6080",
      borderColor: dark ? "rgba(80,130,220,0.2)" : "rgba(0,0,0,0.08)",
      borderWidth:1, padding:10, cornerRadius:10,
    }},
    scales:{
      x:{ grid:{ color:gridColor }, ticks:{ color:txtColor, font:{ size:10 } } },
      y:{ grid:{ color:gridColor }, ticks:{ color:txtColor, font:{ size:10 } } }
    }
  };

  chartTemp = new Chart(document.getElementById("chartTemp"), {
    type:"line",
    data:{ labels:tempD.labels, datasets:[{
      label:"°C", data:tempD.data, fill:true, tension:.45,
      pointRadius:4, pointHoverRadius:7,
      borderColor:"#3b82f6", pointBackgroundColor:"#3b82f6",
      backgroundColor:makeGrad("chartTemp","rgba(59,130,246,0.35)","rgba(59,130,246,0)")
    }]},
    options:base
  });
  chartTemp._data = tempD;

  chartHumidity = new Chart(document.getElementById("chartHumidity"), {
    type:"bar",
    data:{ labels:humidD.labels, datasets:[{
      label:"%", data:humidD.data, borderRadius:6,
      backgroundColor:makeGrad("chartHumidity","rgba(34,211,238,0.75)","rgba(34,211,238,0.15)"),
      borderColor:"#22d3ee", borderWidth:1.5
    }]},
    options:base
  });
  chartHumidity._data = humidD;

  chartWind = new Chart(document.getElementById("chartWind"), {
    type:"line",
    data:{ labels:windD.labels, datasets:[{
      label:"km/h", data:windD.data, fill:true, tension:.45,
      pointRadius:4, pointHoverRadius:7,
      borderColor:"#a78bfa", pointBackgroundColor:"#a78bfa",
      backgroundColor:makeGrad("chartWind","rgba(167,139,250,0.30)","rgba(167,139,250,0)")
    }]},
    options:base
  });
  chartWind._data = windD;
}

function makeGrad(id, top, bot) {
  const ctx  = document.getElementById(id).getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 180);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bot);
  return grad;
}

/* ══════════════════════════════════════════════════
   DYNAMIC BACKGROUND + PARTICLES
══════════════════════════════════════════════════ */
function applyWeatherBackground(code, isNight) {
  let key = "default";
  if (isNight)                       key = "night";
  else if (code >= 200 && code < 300) key = "rain";
  else if (code >= 300 && code < 400) key = "rain";
  else if (code >= 500 && code < 600) key = "rain";
  else if (code >= 600 && code < 700) key = "snow";
  else if (code === 800)              key = "clear";
  else if (code > 800)                key = "clouds";

  document.body.setAttribute("data-weather", key);
  renderParticles(key);
}

function renderParticles(type) {
  const container = document.getElementById("particles");
  container.innerHTML = "";

  if (type === "rain") {
    for (let i = 0; i < 70; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const sz = Math.random() * 1.5 + 1;
      Object.assign(p.style, {
        width:`${sz}px`, height:`${sz * 9}px`,
        background:"rgba(147,197,253,0.5)", borderRadius:"2px",
        left:`${Math.random()*100}%`,
        animationDuration:`${0.6 + Math.random()*0.7}s`,
        animationDelay:`-${Math.random()*2}s`
      });
      container.appendChild(p);
    }
  } else if (type === "snow") {
    for (let i = 0; i < 80; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const sz = Math.random() * 7 + 3;
      Object.assign(p.style, {
        width:`${sz}px`, height:`${sz}px`,
        background:"rgba(255,255,255,0.88)",
        left:`${Math.random()*100}%`,
        animationDuration:`${3+Math.random()*4}s`,
        animationDelay:`-${Math.random()*5}s`
      });
      container.appendChild(p);
    }
  } else if (type === "night") {
    for (let i = 0; i < 120; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const sz = Math.random() * 2.5 + 0.6;
      Object.assign(s.style, {
        width:`${sz}px`, height:`${sz}px`,
        top:`${Math.random()*85}%`, left:`${Math.random()*100}%`,
        animationDuration:`${2+Math.random()*3}s`,
        animationDelay:`-${Math.random()*3}s`
      });
      container.appendChild(s);
    }
  } else if (type === "clear") {
    /* Floating sun rays */
    for (let i = 0; i < 8; i++) {
      const ray = document.createElement("div");
      ray.style.cssText = `
        position:absolute; top:${5+i*3}%; left:${60+i*2}%;
        width:2px; height:${40+i*15}px;
        background:linear-gradient(transparent,rgba(251,191,36,0.3),transparent);
        transform:rotate(${i*10}deg);
        animation:fall ${3+i}s ease-in-out infinite alternate;
        animation-delay:${i*0.4}s;
        border-radius:2px;
      `;
      container.appendChild(ray);
    }
  }
}

/* ══════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════ */
function formatDateTime(d) {
  return d.toLocaleDateString("en-US", { weekday:"long", day:"numeric", month:"long", year:"numeric" })
    + " · "
    + d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
}

function formatTime(d) {
  return d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
}

function degToDir(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getWeatherEmoji(code, isNight) {
  if (isNight) return "🌙";
  if (code >= 200 && code < 300) return "⛈️";
  if (code >= 300 && code < 400) return "🌦️";
  if (code >= 500 && code < 600) return "🌧️";
  if (code >= 600 && code < 700) return "❄️";
  if (code >= 700 && code < 800) return "🌫️";
  if (code === 800)               return "☀️";
  if (code === 801 || code === 802) return "⛅";
  return "☁️";
}

/**
 * Calculate a comfort score 0-100 based on temperature, humidity, wind
 * Ideal: 20-24°C, 40-60% humidity, <15 km/h wind
 */
function calcComfortScore(d) {
  const temp  = d.main.temp;
  const humid = d.main.humidity;
  const wind  = d.wind.speed * 3.6;

  /* Temperature score (ideal 20-24) */
  let tScore = 100 - Math.min(100, Math.abs(temp - 22) * 4);

  /* Humidity score (ideal 40-60%) */
  let hScore = 100 - Math.min(100, Math.abs(humid - 50) * 1.8);

  /* Wind score (ideal 0-10 km/h) */
  let wScore = wind < 10 ? 100 : Math.max(0, 100 - (wind - 10) * 3);

  return Math.round((tScore * 0.5 + hScore * 0.3 + wScore * 0.2));
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
(function init() {
  renderRecentChips();
  /* Auto-load last searched city */
  if (recentCities.length > 0) {
    searchInput.value = recentCities[0];
    fetchWeather(recentCities[0]);
  }
})();
