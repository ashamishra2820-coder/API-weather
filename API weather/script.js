// 1) Apni OpenWeatherMap API key yahan paste karo
const API_KEY = "paste your API key here";
const BASE = "https://api.openweathermap.org/data/2.5";

const $ = (id) => document.getElementById(id);
const screens = { start: $("screen-start"), city: $("screen-city"), weather: $("screen-weather") };

function show(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

$("btn-start").addEventListener("click", () => { show("city"); $("city-input").focus(); });
$("btn-back").addEventListener("click", () => { $("error").textContent = ""; show("city"); });

$("city-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = $("city-input").value.trim();
  if (!city) return;
  await loadWeather(city);
});

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new Error("API key galat hai ya abhi active nahi hui (2 ghante tak lag sakte hain).");
    if (res.status === 404) throw new Error("City nahi mili. Spelling check karke dobara try karo.");
    throw new Error(data.message || "Kuch gadbad ho gayi.");
  }
  return data;
}

async function loadWeather(city) {
  $("error").textContent = "";
  if (API_KEY === "YOUR_API_KEY_HERE") {
    $("error").textContent = "Pehle script.js me apni API key daalo.";
    return;
  }
  $("loader").hidden = false;
  try {
    const q = encodeURIComponent(city);
    const current = await getJSON(`${BASE}/weather?q=${q}&units=metric&appid=${API_KEY}`);
    const { lat, lon } = current.coord;
    const [forecast, air] = await Promise.all([
      getJSON(`${BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      getJSON(`${BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`).catch(() => null),
    ]);
    render(current, forecast, air);
    show("weather");
  } catch (err) {
    $("error").textContent = err.message;
  } finally {
    $("loader").hidden = true;
  }
}

const icon = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;
// City ke local time ke hisaab se time dikhane ke liye offset use kar rahe hain
const fmtTime = (unix, tz, opts) =>
  new Date((unix + tz) * 1000).toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", ...opts });

function render(c, f, air) {
  const tz = c.timezone;
  const w = c.weather[0];

  $("w-city").textContent = `${c.name}, ${c.sys.country}`;
  $("w-date").textContent = new Date((c.dt + tz) * 1000).toLocaleDateString("en-US", {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
  });
  $("w-icon").src = `https://openweathermap.org/img/wn/${w.icon}@4x.png`;
  $("w-icon").alt = w.description;
  $("w-temp").textContent = Math.round(c.main.temp);
  $("w-desc").textContent = w.description;
  $("w-max").textContent = Math.round(c.main.temp_max);
  $("w-min").textContent = Math.round(c.main.temp_min);
  $("w-updated").textContent = "Updated " + fmtTime(c.dt, tz);

  $("w-humidity").textContent = c.main.humidity + "%";
  $("w-wind").textContent = (c.wind.speed * 3.6).toFixed(1) + " km/h";
  $("w-feels").textContent = Math.round(c.main.feels_like) + "°C";
  $("w-pressure").textContent = c.main.pressure + " hPa";
  $("w-vis").textContent = (c.visibility / 1000).toFixed(1) + " km";
  $("w-clouds").textContent = c.clouds.all + "%";
  $("w-sunrise").textContent = fmtTime(c.sys.sunrise, tz);
  $("w-sunset").textContent = fmtTime(c.sys.sunset, tz);

  // Aaj ke agle 5 time-slots (3-3 ghante ke)
  $("hourly").innerHTML = f.list.slice(0, 5).map((h) => `
    <div class="hour">
      <small>${Math.round(h.main.temp)}°C</small>
      <img src="${icon(h.weather[0].icon)}" alt="${h.weather[0].description}">
      <small>${fmtTime(h.dt, tz, { hour: "numeric", minute: undefined })}</small>
    </div>`).join("");

  // Air quality
  const labels = ["Good", "Fair", "Moderate", "Poor", "Very poor"];
  $("w-aqi").textContent = air ? `${labels[air.list[0].main.aqi - 1]} (AQI ${air.list[0].main.aqi}/5)` : "Not available";

  // 5-day forecast: din ke hisaab se group
  const days = {};
  f.list.forEach((item) => {
    const key = new Date((item.dt + tz) * 1000).toISOString().slice(0, 10);
    (days[key] ||= []).push(item);
  });
  $("daily").innerHTML = Object.entries(days).slice(0, 5).map(([key, items]) => {
    const max = Math.round(Math.max(...items.map((i) => i.main.temp_max)));
    const min = Math.round(Math.min(...items.map((i) => i.main.temp_min)));
    const mid = items[Math.floor(items.length / 2)];
    const name = new Date(key + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    return `<div class="day">
      <span>${name}</span>
      <img src="${icon(mid.weather[0].icon)}" alt="${mid.weather[0].description}">
      <span style="text-transform:capitalize">${mid.weather[0].description}</span>
      <span>${max}° / ${min}°</span>
    </div>`;
  }).join("");
}
