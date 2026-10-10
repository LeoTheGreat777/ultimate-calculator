# Ultimate Calculator

A fast, modern, privacy-friendly all-in-one calculator for everyday calculations. Built as a lightweight client-side web app with a responsive interface that works on desktop and mobile.

## Features

### Calculator
- Standard arithmetic with operator precedence and brackets
- Calculator-style percentages
- Decimal and negative number support
- Calculation history
- Copy results
- Keyboard support
- Step-by-step calculation explanations
- Intermediate results are shown so complex calculations are easy to understand

### Unit Converter
- Length, area (including stremma), mass, volume, speed, time, data, energy, power, pressure, angle and temperature conversions
- Calculator-style arithmetic directly inside unit fields
- Expressions can be chained just like the main calculator
- Percentage calculations
- Automatic conversion while entering an expression
- Switch conversion direction
- Keypad-based input designed for a calculator-like experience

### Graph
- Plot up to three functions of x
- Roots, minima, maxima and intersections are marked
- Pan, zoom, fit to the curve and save the graph as an image

### Dedicated Calculators
- Fuel cost calculator, with saved entries and their averages
- Electricity/energy cost calculator
- VAT add/remove calculator (VAT rounded to cents, as on invoices)
- Charts and step-by-step explanations for every tool
- Each tool remembers the values typed in it; AC clears them

### Interface
- Responsive desktop and mobile layouts
- Dark and light themes
- English and Greek language support
- Installable on phones: an install button opens the install dialog on Android, and shows a short Add to Home Screen guide on iPhone
- Mobile-friendly calculator controls
- Clean, compact UI with dedicated mode navigation
- Calculation explanations presented in a readable step-by-step view

## Authors

Leonidas Kampaxis and Efstathios Konstantinos Tsakiris

## Technology

Ultimate Calculator is intentionally lightweight: plain HTML, CSS and vanilla JavaScript, with no framework, no build step and no backend.

- `index.html`, `styles.css` – the page and its styles
- `app.js` – calculator engine (exact fractions), modes, tools, history, translations
- `charts.js` – Graph mode, tool charts, the History chart and the fuel log (canvas, no libraries)
- `history-interaction.js` – the History sheet's drag and scroll gestures
- `Dockerfile`, `nginx.conf` – the Docker image: nginx serving only the app's files

Calculations happen in the browser, and history and settings are stored in the browser (localStorage). There are no accounts and nothing is sent to a server.

## Run locally

This is a static web app, so it can be served by any static web server.

### Any static web server

```bash
python3 -m http.server 8080
```

### Docker

```bash
docker build -t ultimate-calculator .
docker run --rm -p 8080:80 ultimate-calculator
```

Then open `http://localhost:8080`.

## Deployment

Every push to `main` runs two GitHub Actions workflows, so both deployments always get the same version:

- **GitHub Pages** – the static site
- **Docker image** – `ghcr.io/leothegreat777/ultimate-calculator:latest` (see `docker-compose.yml`). Pull it again (`docker compose pull && docker compose up -d`) to update a self-hosted copy.

If two pushes land within seconds of each other, the older run is cancelled and only the newest one deploys. A cancelled run in the Actions tab is expected in that case.

## Versioning

The version is written in `app.js` (`VERSION`) and in `index.html` (the footer and the `?v=` on each script and stylesheet, which makes browsers load the new files). Bump all of them together.

## Project Direction

The goal is to turn Ultimate Calculator into a single calculation interface for as many everyday calculations as possible, while keeping the core experience fast, simple and independent of AI or a backend.

The project is actively evolving. The interface, calculation modes and conversion system are being refined continuously with a strong focus on making the app feel like a polished native calculator rather than a collection of separate web forms.

## Roadmap

Planned areas include:

- Currency conversion
- More unit categories and conversions
- Discounts, markup and margins
- Date and time calculations
- Loan and interest calculations
- Reusable formulas
- More advanced calculation history
- More dedicated calculators
- Improved mobile UX
- Additional languages
- Continued accessibility and interaction improvements

## Self-hosting

The application is designed to be easy to self-host. It is a static site, so it runs on GitHub Pages, behind Nginx or any static web server, or from the Docker image, with no database or application backend.
