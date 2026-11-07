/* Universal Weather — search a city, see its current conditions.
   Data: Open-Meteo (free, no API key). */
(() => {
  'use strict';

  const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
  const DEFAULT_CITY = 'Patna';
  const TIMEOUT_MS = 10000;
  const HOURS_SHOWN = 8;

  /* WMO weather code → sky theme, icon, labels and a line of prose.
     Only the theme changes the atmosphere; the layout never moves. */
  const CONDITIONS = {
    0:  { theme: 'sunny',  icon: 'sun',   night: 'moon',          label: 'Clear Sky',      mood: 'Clear & Bright',
          quote: 'Open sky and unbroken light settling over {city}.',
          nightQuote: 'A still, open sky above {city} as the day’s warmth fades.', nightMood: 'Clear & Still' },
    1:  { theme: 'sunny',  icon: 'sun',   night: 'moon',          label: 'Mostly Clear',   mood: 'Fair & Mild',
          quote: 'Thin, high light drifting lazily over {city}.',
          nightQuote: 'A calm, mostly clear night settling over {city}.', nightMood: 'Calm & Clear' },
    2:  { theme: 'partly', icon: 'partly-day', night: 'partly-night', label: 'Partly Cloudy', mood: 'Sun & Cloud',
          quote: 'Soft light breaking through slow-moving cloud over {city}.',
          nightQuote: 'Slow cloud drifting across a quiet night over {city}.', nightMood: 'Cloud & Quiet' },
    3:  { theme: 'cloudy', icon: 'cloud', label: 'Overcast',        mood: 'Grey & Still',
          quote: 'A low, even ceiling of cloud resting over {city}.' },
    45: { theme: 'cloudy', icon: 'fog',   label: 'Fog',             mood: 'Hushed & Misty',
          quote: 'Fog folding quietly through the streets of {city}.' },
    48: { theme: 'cloudy', icon: 'fog',   label: 'Freezing Fog',    mood: 'Hushed & Frosted',
          quote: 'A frosted fog hanging motionless over {city}.' },
    51: { theme: 'rain',   icon: 'rain',  label: 'Light Drizzle',   mood: 'Fine & Damp',
          quote: 'A fine, patient mist of rain drifting over {city}.' },
    53: { theme: 'rain',   icon: 'rain',  label: 'Drizzle',         mood: 'Soft & Damp',
          quote: 'Steady drizzle softening the edges of {city}.' },
    55: { theme: 'rain',   icon: 'rain',  label: 'Heavy Drizzle',   mood: 'Grey & Wet',
          quote: 'A dense, persistent drizzle settling over {city}.' },
    56: { theme: 'rain',   icon: 'rain',  label: 'Freezing Drizzle', mood: 'Cold & Damp',
          quote: 'A fine, icy drizzle glazing the air over {city}.' },
    57: { theme: 'rain',   icon: 'rain',  label: 'Freezing Drizzle', mood: 'Cold & Damp',
          quote: 'A fine, icy drizzle glazing the air over {city}.' },
    61: { theme: 'rain',   icon: 'rain',  label: 'Light Rain',      mood: 'Gentle & Wet',
          quote: 'Light rain tapping quietly across {city}.' },
    63: { theme: 'rain',   icon: 'rain',  label: 'Rain',            mood: 'Steady Rain',
          quote: 'Steady rain washing slowly over {city}.' },
    65: { theme: 'rain',   icon: 'rain',  label: 'Heavy Rain',      mood: 'Heavy Rain',
          quote: 'Rain falling in long, heavy sheets over {city}.' },
    66: { theme: 'rain',   icon: 'rain',  label: 'Freezing Rain',   mood: 'Cold & Wet',
          quote: 'Cold rain slicking every surface in {city}.' },
    67: { theme: 'rain',   icon: 'rain',  label: 'Freezing Rain',   mood: 'Cold & Wet',
          quote: 'Heavy, freezing rain glazing every surface in {city}.' },
    71: { theme: 'snow',   icon: 'snow',  label: 'Light Snow',      mood: 'Soft & White',
          quote: 'A few soft flakes drifting down over {city}.' },
    73: { theme: 'snow',   icon: 'snow',  label: 'Snow',            mood: 'Quiet & White',
          quote: 'Snow settling in a hush over {city}.' },
    75: { theme: 'snow',   icon: 'snow',  label: 'Heavy Snow',      mood: 'Deep & White',
          quote: 'Thick snow gathering silently across {city}.' },
    77: { theme: 'snow',   icon: 'snow',  label: 'Snow Grains',     mood: 'Fine & White',
          quote: 'Fine grains of snow skimming over {city}.' },
    80: { theme: 'rain',   icon: 'rain',  label: 'Rain Showers',    mood: 'Passing Showers',
          quote: 'Brief showers passing over {city}.' },
    81: { theme: 'rain',   icon: 'rain',  label: 'Rain Showers',    mood: 'Passing Showers',
          quote: 'Showers moving in and out across {city}.' },
    82: { theme: 'rain',   icon: 'rain',  label: 'Heavy Showers',   mood: 'Heavy Showers',
          quote: 'Sudden, heavy showers sweeping over {city}.' },
    85: { theme: 'snow',   icon: 'snow',  label: 'Snow Showers',    mood: 'Drifting Snow',
          quote: 'Snow showers drifting across {city}.' },
    86: { theme: 'snow',   icon: 'snow',  label: 'Heavy Snow Showers', mood: 'Heavy Snow',
          quote: 'Heavy snow showers sweeping over {city}.' },
    95: { theme: 'storm',  icon: 'storm', label: 'Thunderstorm',    mood: 'Charged & Dark',
          quote: 'Thunder rolling low and heavy above {city}.' },
    96: { theme: 'storm',  icon: 'storm', label: 'Storm & Hail',    mood: 'Charged & Dark',
          quote: 'A thunderstorm with hail crossing {city}.' },
    99: { theme: 'storm',  icon: 'storm', label: 'Storm & Hail',    mood: 'Charged & Dark',
          quote: 'A heavy thunderstorm with hail over {city}.' }
  };
  const FALLBACK = { theme: 'cloudy', icon: 'cloud', label: 'Cloudy', mood: 'Grey & Still',
                     quote: 'A quiet, cloud-covered sky over {city}.' };

  const $ = (id) => document.getElementById(id);
  const el = {
    body: document.body, app: $('app'),
    form: $('search-form'), input: $('search-input'),
    status: $('status'), statusText: $('status-text'),
    meta: $('meta'), city: $('city'), when: $('when'),
    temp: $('temp'), tileIcon: $('tile-icon'), tileLabel: $('tile-label'), quote: $('quote'),
    pill: $('pill'), feels: $('feels'), feelsNote: $('feels-note'),
    updated: $('updated'), high: $('high'), low: $('low'),
    hours: $('hours')
  };

  let requestId = 0;
  let hasData = false;

  /* ---------- helpers ---------- */

  const fmtTemp = (n) => (Math.round(n) < 0 ? '−' : '') + Math.abs(Math.round(n));
  const fmtDeg = (n) => `${fmtTemp(n)}°C`;

  async function getJSON(url, signal) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function withTimeout(ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return { signal: ctrl.signal, done: () => clearTimeout(t) };
  }

  function describe(code, isDay) {
    const c = CONDITIONS[code] || FALLBACK;
    if (isDay) return { ...c, iconName: c.icon };
    return {
      ...c,
      iconName: c.night || c.icon,
      quote: c.nightQuote || c.quote,
      mood: c.nightMood || c.mood
    };
  }

  function feelsNote(actual, feels) {
    const d = feels - actual;
    if (d <= -3) return 'Much colder than the air';
    if (d <= -1.5) return 'A little cooler than the air';
    if (d < 1.5) return 'Close to the air temperature';
    if (d < 3) return 'A little warmer than the air';
    return 'Much warmer than the air';
  }

  function setStatus(text, isError = false) {
    el.statusText.textContent = text;
    el.status.classList.toggle('is-error', isError);
  }

  function setState(state) {
    el.body.dataset.state = state;
    el.app.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }

  /* ---------- data ---------- */

  /* "Paris", "Paris, France", "Phoenix, Arizona" */
  async function findPlace(query, signal) {
    const [name, ...rest] = query.split(',');
    const hint = rest.join(' ').trim().toLowerCase();
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(name.trim())}&count=${hint ? 10 : 1}&language=en&format=json`;
    const data = await getJSON(url, signal);
    const results = data.results || [];
    if (!results.length) return null;
    if (!hint) return results[0];
    const match = results.find((r) =>
      [r.country, r.country_code, r.admin1].some((v) => v && v.toLowerCase().includes(hint)));
    return match || null;
  }

  function getWeather(place, signal) {
    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: 'temperature_2m,apparent_temperature,weather_code,is_day',
      hourly: 'temperature_2m,weather_code,is_day,precipitation_probability',
      daily: 'temperature_2m_max,temperature_2m_min',
      forecast_days: 2,
      timezone: 'auto'
    });
    return getJSON(`${WEATHER_URL}?${params}`, signal);
  }

  /* ---------- render ---------- */

  function render(place, wx) {
    el.app.classList.remove('is-empty');
    const cur = wx.current;
    const info = describe(cur.weather_code, cur.is_day === 1);

    // Place
    const useRegion = ['US', 'GB'].includes(place.country_code) && place.admin1;
    const region = useRegion ? place.admin1 : place.country;
    const cityName = region ? `${place.name}, ${region}` : place.name;
    const ns = place.latitude >= 0 ? 'N' : 'S';
    const ew = place.longitude >= 0 ? 'E' : 'W';
    const coords = `${Math.abs(place.latitude).toFixed(4)}° ${ns}, ${Math.abs(place.longitude).toFixed(4)}° ${ew}`;
    const elev = typeof place.elevation === 'number' ? ` · Elev. ${Math.round(place.elevation)}m` : '';

    // Local wall-clock time at the place (API returns it already localised)
    const local = new Date(`${cur.time}Z`);
    const weekday = local.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
    const dayMonth = local.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const clock = local.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });

    // Sky
    el.body.className = `weather-${info.theme}`;

    el.meta.textContent = coords + elev;
    el.city.textContent = cityName;
    el.when.textContent = `${weekday}, ${dayMonth} · ${info.mood}`;
    el.temp.textContent = String(Math.abs(Math.round(cur.temperature_2m)));
    el.temp.toggleAttribute('data-neg', Math.round(cur.temperature_2m) < 0);
    el.tileIcon.setAttribute('href', `#i-${info.iconName}`);
    el.tileLabel.textContent = info.label;
    el.quote.textContent = `“${info.quote.replace('{city}', place.name)}”`;

    el.pill.textContent = `Local · ${wx.timezone_abbreviation || wx.timezone || ''}`.replace(/ · $/, '');
    el.feels.textContent = fmtDeg(cur.apparent_temperature);
    el.feelsNote.textContent = feelsNote(cur.temperature_2m, cur.apparent_temperature);
    el.updated.textContent = clock;
    el.high.textContent = fmtDeg(wx.daily.temperature_2m_max[0]);
    el.low.textContent = fmtDeg(wx.daily.temperature_2m_min[0]);
    renderHours(wx);

    setStatus(`Current conditions · ${info.label}`);
    document.title = `${place.name} ${fmtTemp(cur.temperature_2m)}° · Universal Weather`;

    // Replay the gentle entrance
    el.app.classList.remove('enter');
    void el.app.offsetWidth;
    el.app.classList.add('enter');
  }

  /* Now + the next seven hours, in the place's own local time */
  function renderHours(wx) {
    const h = wx.hourly;
    if (!h || !h.time) { el.hours.innerHTML = ''; return; }
    const found = h.time.indexOf(`${wx.current.time.slice(0, 13)}:00`);
    const from = found === -1 ? 0 : found;
    const items = [];

    for (let i = 0; i < HOURS_SHOWN && from + i < h.time.length; i++) {
      const k = from + i;
      const info = describe(h.weather_code[k], h.is_day[k] === 1);
      const time = i === 0 ? 'Now'
        : new Date(`${h.time[k]}:00Z`).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' });
      const pop = h.precipitation_probability ? h.precipitation_probability[k] : null;
      items.push(`
        <li class="hour${i === 0 ? ' hour--now' : ''}">
          <span class="hour__time">${time}</span>
          <svg class="icon hour__icon" aria-hidden="true"><use href="#i-${info.iconName}"/></svg>
          <span class="hour__temp">${fmtTemp(h.temperature_2m[k])}°</span>
          <span class="hour__label">${info.label}</span>
          ${typeof pop === 'number' ? `<span class="hour__rain"><svg class="icon" aria-hidden="true"><use href="#i-drop"/></svg>${pop}%</span>` : ''}
        </li>`);
    }
    el.hours.innerHTML = items.join('');
    el.hours.scrollLeft = 0;
  }

  function renderEmpty(message) {
    el.app.classList.add('is-empty');
    el.meta.innerHTML = '&nbsp;';
    el.city.textContent = 'Weather unavailable';
    el.when.innerHTML = '&nbsp;';
    el.temp.textContent = '--';
    el.temp.removeAttribute('data-neg');
    el.tileLabel.innerHTML = '&nbsp;';
    el.quote.textContent = message;
  }

  /* ---------- flow ---------- */

  async function loadCity(query) {
    const id = ++requestId;
    const req = withTimeout(TIMEOUT_MS);
    setState('loading');
    setStatus('Fetching conditions…');

    try {
      const place = await findPlace(query, req.signal);
      if (id !== requestId) return;
      if (!place) {
        setStatus(`No place found for “${query}”. Try another spelling.`, true);
        if (!hasData) renderEmpty('Search for a city to see its weather.');
        return;
      }
      const wx = await getWeather(place, req.signal);
      if (id !== requestId) return;
      render(place, wx);
      hasData = true;
    } catch (err) {
      if (id !== requestId) return;
      setStatus('Couldn’t reach the weather service. Please try again.', true);
      if (!hasData) renderEmpty('Check your connection, then search for a city.');
    } finally {
      req.done();
      if (id === requestId) setState('ready');
    }
  }

  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = el.input.value.trim();
    if (!q) { el.input.focus(); return; }
    el.input.blur();
    loadCity(q);
  });

  loadCity(DEFAULT_CITY);
})();
