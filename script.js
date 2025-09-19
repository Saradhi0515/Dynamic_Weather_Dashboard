(function () {
  const OWM_API_BASE = 'https://api.openweathermap.org/data/2.5';
  const OWM_ICON_BASE = 'https://openweathermap.org/img/wn/';
  const WTTR_BASE = 'https://wttr.in';
  const DEFAULT_CITY = 'Hyderabad';

  const statusEl = document.getElementById('status');
  const searchForm = document.getElementById('searchForm');
  const cityInput = document.getElementById('cityInput');
  const geoBtn = document.getElementById('geoBtn');
  const unitToggle = document.getElementById('unitToggle');
  const unitLabel = document.getElementById('unitLabel');

  const currentTemp = document.getElementById('currentTemp');
  const feelsLike = document.getElementById('feelsLike');
  const cityName = document.getElementById('cityName');
  const weatherDesc = document.getElementById('weatherDesc');
  const humidity = document.getElementById('humidity');
  const wind = document.getElementById('wind');
  const weatherIcon = document.getElementById('weatherIcon');

  const forecastGrid = document.getElementById('forecastGrid');
  const recentList = document.getElementById('recentList');

  let units = (localStorage.getItem('units') || 'metric');
  unitToggle.checked = (units === 'imperial');
  unitLabel.textContent = units === 'imperial' ? '°F' : '°C';

  const cfg = window.WEATHER_CONFIG || {};
  const API_KEY = cfg.OPENWEATHER_API_KEY || '';
  const PROVIDER = API_KEY ? 'owm' : 'wttr';

  function setStatus(msg, type = '') {
    statusEl.textContent = msg || '';
    statusEl.className = `status ${type}`.trim();
  }

  function saveRecent(city) {
    if (!city) return;
    const list = JSON.parse(localStorage.getItem('recentCities') || '[]');
    const exists = list.find(c => c.toLowerCase() === city.toLowerCase());
    const updated = [city, ...list.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 6);
    if (!exists || updated.length !== list.length) {
      localStorage.setItem('recentCities', JSON.stringify(updated));
      renderRecent();
    }
  }

  function renderRecent() {
    const list = JSON.parse(localStorage.getItem('recentCities') || '[]');
    recentList.innerHTML = '';
    list.forEach(city => {
      const tag = document.createElement('button');
      tag.className = 'recent-tag';
      tag.textContent = city;
      tag.addEventListener('click', () => {
        cityInput.value = city;
        handleSearch(city);
      });
      recentList.appendChild(tag);
    });
  }

  function formatTemp(value) {
    const unit = units === 'imperial' ? '°F' : '°C';
    return `${Math.round(value)}${unit}`;
  }

  function formatWind(speed) {
    // We display m/s for metric and mph for imperial
    const unit = units === 'imperial' ? 'mph' : 'm/s';
    return `${Math.round(speed)} ${unit}`;
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  }

  async function owmGetWeatherByCity(city) {
    const q = encodeURIComponent(city.trim());
    const url = `${OWM_API_BASE}/weather?q=${q}&appid=${API_KEY}&units=${units}`;
    return fetchJSON(url);
  }

  async function owmGetWeatherByCoords(lat, lon) {
    const url = `${OWM_API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
    return fetchJSON(url);
  }

  async function owmGetForecastByCoords(lat, lon) {
    const url = `${OWM_API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
    return fetchJSON(url);
  }

  function owmUpdateCurrent(data) {
    const { name, sys, weather, main, wind: w } = data;
    cityName.textContent = [name, sys && sys.country].filter(Boolean).join(', ');
    const desc = weather && weather[0] ? weather[0].description : '—';
    weatherDesc.textContent = desc;

    currentTemp.textContent = formatTemp(main.temp);
    feelsLike.textContent = `Feels like ${formatTemp(main.feels_like)}`;
    humidity.textContent = `Humidity: ${Math.round(main.humidity)}%`;
    wind.textContent = `Wind: ${formatWind(w.speed)}`;

    const icon = weather && weather[0] && weather[0].icon;
    if (icon) {
      weatherIcon.src = `${OWM_ICON_BASE}${icon}@2x.png`;
      weatherIcon.classList.remove('hidden');
    } else {
      weatherIcon.src = '';
      weatherIcon.classList.add('hidden');
    }
  }

  function pickDailyAtNoon(list) {
    // For OWM: pick one 3-hourly item per day closest to 12:00
    const byDay = new Map();
    list.forEach(item => {
      const dt = new Date(item.dt * 1000);
      const dayKey = dt.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
      const hour = dt.getHours();
      const prev = byDay.get(dayKey);
      const score = Math.abs(hour - 12);
      if (!prev || score < prev.score) {
        byDay.set(dayKey, { score, item });
      }
    });
    return Array.from(byDay.values())
      .map(v => v.item)
      .sort((a, b) => a.dt - b.dt)
      .slice(0, 5);
  }

  function owmUpdateForecast(forecast) {
    const items = pickDailyAtNoon(forecast.list || []);
    forecastGrid.innerHTML = '';
    items.forEach(f => {
      const dt = new Date(f.dt * 1000);
      const day = dt.toLocaleDateString(undefined, { weekday: 'short' });
      const icon = f.weather && f.weather[0] && f.weather[0].icon;
      const temp = f.main && f.main.temp ? formatTemp(f.main.temp) : '--';
      const desc = f.weather && f.weather[0] ? f.weather[0].description : '';

      const div = document.createElement('div');
      div.className = 'forecast-item';
      div.innerHTML = `
        <div class="day">${day}</div>
        ${icon ? `<img src="${OWM_ICON_BASE}${icon}.png" alt="${desc}" width="48" height="48" />` : ''}
        <div class="f-temp">${temp}</div>
      `;
      forecastGrid.appendChild(div);
    });
  }

  function wttrUrlForCity(city, days = 5) {
    const safe = encodeURIComponent(city.trim());
    return `${WTTR_BASE}/${safe}?format=j1&num_of_days=${days}`;
  }

  function wttrUrlForCoords(lat, lon, days = 5) {
    return `${WTTR_BASE}/${lat},${lon}?format=j1&num_of_days=${days}`;
  }

  async function wttrByCity(city, days = 5) {
    return fetchJSON(wttrUrlForCity(city, days));
  }

  async function wttrByCoords(lat, lon, days = 5) {
    return fetchJSON(wttrUrlForCoords(lat, lon, days));
  }

  function wttrUpdateCurrent(json) {
    const cur = (json.current_condition && json.current_condition[0]) || {};
    const area = (json.nearest_area && json.nearest_area[0]) || {};
    const areaName = area.areaName && area.areaName[0] ? area.areaName[0].value : '';
    const country = area.country && area.country[0] ? area.country[0].value : '';
    cityName.textContent = [areaName, country].filter(Boolean).join(', ') || areaName || '—';

    const desc = cur.weatherDesc && cur.weatherDesc[0] ? cur.weatherDesc[0].value : '—';
    weatherDesc.textContent = desc;

    const temp = units === 'imperial' ? Number(cur.temp_F) : Number(cur.temp_C);
    const feels = units === 'imperial' ? Number(cur.FeelsLikeF) : Number(cur.FeelsLikeC);
    const hum = cur.humidity ? Number(cur.humidity) : null;
  const windSpd = units === 'imperial' ? Number(cur.windspeedMiles) : Number(cur.windspeedKmph) / 3.6;

    currentTemp.textContent = isFinite(temp) ? formatTemp(temp) : '--';
    feelsLike.textContent = isFinite(feels) ? `Feels like ${formatTemp(feels)}` : 'Feels like --';
    humidity.textContent = `Humidity: ${isFinite(hum) ? Math.round(hum) : '--'}%`;
    wind.textContent = `Wind: ${isFinite(windSpd) ? formatWind(windSpd) : '--'}`;

    const iconUrl = cur.weatherIconUrl && cur.weatherIconUrl[0] ? cur.weatherIconUrl[0].value : '';
    if (iconUrl) {
      weatherIcon.src = iconUrl;
      weatherIcon.classList.remove('hidden');
    } else {
      weatherIcon.src = '';
      weatherIcon.classList.add('hidden');
    }
  }

  function wttrUpdateForecast(json, days = 5) {
    forecastGrid.innerHTML = '';
    const arr = json.weather || [];
    arr.slice(0, days).forEach(dayObj => {
      const dateStr = dayObj.date;
      const dt = dateStr ? new Date(dateStr) : null;
      const day = dt ? dt.toLocaleDateString(undefined, { weekday: 'short' }) : '';
      const max = units === 'imperial' ? Number(dayObj.maxtempF) : Number(dayObj.maxtempC);
      const hourly = dayObj.hourly || [];
      const mid = hourly.find(h => h.time === '1200') || hourly[Math.min(4, Math.max(0, hourly.length - 1))] || {};
      const iconUrl = mid.weatherIconUrl && mid.weatherIconUrl[0] ? mid.weatherIconUrl[0].value : '';
      const desc = mid.weatherDesc && mid.weatherDesc[0] ? mid.weatherDesc[0].value : '';

      const div = document.createElement('div');
      div.className = 'forecast-item';
      div.innerHTML = `
        <div class="day">${day}</div>
        ${iconUrl ? `<img src="${iconUrl}" alt="${desc}" width="48" height="48" />` : ''}
        <div class="f-temp">${isFinite(max) ? formatTemp(max) : '--'}</div>
      `;
      forecastGrid.appendChild(div);
    });
  }

  async function loadByCoords(lat, lon) {
    setStatus('Loading weather…');
    try {
      if (PROVIDER === 'owm') {
        const current = await owmGetWeatherByCoords(lat, lon);
        owmUpdateCurrent(current);
        const forecast = await owmGetForecastByCoords(lat, lon);
        owmUpdateForecast(forecast);
      } else {
        const wttr = await wttrByCoords(lat, lon, 5);
        wttrUpdateCurrent(wttr);
        wttrUpdateForecast(wttr, 5);
      }
      setStatus('Updated.', 'success');
    } catch (err) {
      console.error(err);
      setStatus('Could not fetch weather for your location.', 'error');
    }
  }

  async function handleSearch(city) {
    if (!city || !city.trim()) {
      setStatus('Please enter a valid city name.', 'error');
      return;
    }
    setStatus('Loading weather…');
    try {
      if (PROVIDER === 'owm') {
        const data = await owmGetWeatherByCity(city);
        owmUpdateCurrent(data);
        saveRecent(data.name);
        const { coord } = data;
        if (coord && typeof coord.lat === 'number' && typeof coord.lon === 'number') {
          const forecast = await owmGetForecastByCoords(coord.lat, coord.lon);
          owmUpdateForecast(forecast);
        }
      } else {
        const wttr = await wttrByCity(city, 5);
        wttrUpdateCurrent(wttr);
        wttrUpdateForecast(wttr, 5);
        const area = (wttr.nearest_area && wttr.nearest_area[0]) || null;
        const canonical = area && area.areaName && area.areaName[0] ? area.areaName[0].value : city;
        saveRecent(canonical);
      }
      setStatus('Updated.', 'success');
    } catch (err) {
      console.error(err);
      setStatus('Could not fetch weather. Check the city name or try again later.', 'error');
    }
  }

  async function handleGeo() {
    if (!('geolocation' in navigator)) {
      setStatus('Geolocation is not supported by this browser.', 'error');
      return;
    }
    setStatus('Getting your location…');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        await loadByCoords(latitude, longitude);
      } catch (err) {
        console.error(err);
        setStatus('Could not fetch weather for your location.', 'error');
      }
    }, (err) => {
      console.warn(err);
      setStatus('Location permission denied or unavailable.', 'error');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  function handleUnitToggle() {
    units = unitToggle.checked ? 'imperial' : 'metric';
    localStorage.setItem('units', units);
    unitLabel.textContent = units === 'imperial' ? '°F' : '°C';
    // Re-fetch for the last searched city or geolocation if available.
    const last = document.querySelector('.recent-tag');
    if (last) {
      handleSearch(last.textContent);
    } else if (navigator.geolocation) {
      handleGeo();
    }
  }

  renderRecent();

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch(cityInput.value);
  });

  geoBtn.addEventListener('click', () => {
    handleGeo();
  });

  unitToggle.addEventListener('change', handleUnitToggle);

  (function firstLoad() {
    const fallback = () => {
      cityInput.value = DEFAULT_CITY;
      handleSearch(DEFAULT_CITY);
    };
    if (!('geolocation' in navigator)) {
      fallback();
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        fallback();
      }
    }, 4000);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        const { latitude, longitude } = pos.coords;
        await loadByCoords(latitude, longitude);
      } catch (e) {
        console.error(e);
        fallback();
      }
    }, (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.warn(err);
      fallback();
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  })();
})();
