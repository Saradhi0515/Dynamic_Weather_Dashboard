# Dynamic Weather Dashboard

Real-time, location-based weather information with current conditions and 5-day forecast.

By default, the app works without any API key using the free wttr.in API (no signup). If you provide an OpenWeatherMap key, the app will use OWM instead (with official icons and descriptions).

## Features
- Search by city and fetch current weather + 5-day forecast
- Use current location via Geolocation API
- Toggle units between Celsius and Fahrenheit
- Recent searches for quick access
- Accessible, responsive UI with modern styling

## Prerequisites
- Optional: OpenWeatherMap API key (for official OWM data & icons)
  - Sign up: https://home.openweathermap.org/users/sign_up
  - Find API key: https://home.openweathermap.org/api_keys

## Setup
1. (Optional) Copy `config.example.js` to `config.js` and add your OpenWeatherMap API key:
   ```js
   window.WEATHER_CONFIG = {
     OPENWEATHER_API_KEY: "YOUR_KEY"
   };
   ```
2. Open `index.html` in a local web server (recommended) to avoid CORS or geolocation restrictions.

## Run locally (Windows PowerShell examples)
- Option A: VS Code Live Server extension (easiest)
- Option B: Use Python's simple server
  ```powershell
  # If Python is installed
  cd x:\APSSDC_Front-End\Dynamic_Weather_Dashboard
  python -m http.server 5500
  # Then open http://localhost:5500 in your browser
  ```
- Option C: Node http-server
  ```powershell
  npm install -g http-server
  cd x:\APSSDC_Front-End\Dynamic_Weather_Dashboard
  http-server -p 5500
  # Open http://localhost:5500
  ```

## How it works
- If `config.js` defines an `OPENWEATHER_API_KEY`, the app uses OpenWeatherMap:
  - Current: `https://api.openweathermap.org/data/2.5/weather`
  - Forecast: `https://api.openweathermap.org/data/2.5/forecast`
- Otherwise it uses wttr.in (no key):
  - City: `https://wttr.in/<city>?format=j1&num_of_days=5`
  - Coords: `https://wttr.in/<lat>,<lon>?format=j1&num_of_days=5`
- Geolocation API gets your coordinates to request weather by `lat`/`lon`.
- Unit toggle persists in `localStorage`. Recent searches are stored locally as well.

## Notes
- For best results, run over `http://localhost` (not `file://`) since Geolocation often requires a secure/bundled context.
- Free API keys may be rate-limited; if requests fail intermittently, try again later.

## Attribution
- Weather data by [wttr.in](https://wttr.in) (default) and [OpenWeatherMap](https://openweathermap.org/) when an API key is provided.

## License
MIT
