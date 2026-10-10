# Ultimate Calculator

A fast, modern, privacy-friendly all-in-one calculator for everyday calculations. Built as a lightweight client-side web app with a responsive interface that works on desktop and mobile.

**Live:** https://uc.kampaxis.com

## Features

### Calculator
- Standard arithmetic with operator precedence and brackets
- Calculator-style percentages
- Change sign (±): hold − on the keypad, or F9 on a keyboard
- Decimal and negative number support
- Calculation history
- Copy results
- Keyboard support
- Step-by-step explanations of how a result was worked out
- Brackets that change nothing are tidied away; C clears the number being typed, AC everything

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
- Responsive desktop and mobile layouts, in portrait and landscape (keypad beside the display when a phone is turned sideways)
- Dark and light themes
- English and Greek language support
- Installable on phones: an install button opens the install dialog on Android, and shows a short Add to Home Screen guide on iPhone
- Mobile-friendly calculator controls
- One-tap mode tabs (Calculator, Units, Graph, VAT, Fuel, Energy); Alt+1–6 on a keyboard
- Calculation explanations presented in a readable step-by-step view
- Tips for every mode, with keyboard shortcuts on computers, from the footer (or ? on a keyboard)

## Authors

Leonidas Kampaxis and Efstathios Konstantinos Tsakiris (Λεωνίδας Κάμπαξης και Ευστάθιος Κωνσταντίνος Τσακίρης)

## Technology

Ultimate Calculator is intentionally lightweight: plain HTML, CSS and vanilla JavaScript, with no framework, no build step and no backend. Calculations happen in the browser, and history and settings are stored in the browser (localStorage). There are no accounts and nothing is sent to a server.

```
public/              the website, exactly as it is served
  index.html         page shell
  styles.css         all styles and themes
  js/                the app, one file per area (calculator, units, tools, graph, history, ...)
  manifest.webmanifest, icons
tests/test_app.py    browser tests (Playwright)
tools/bump-version.py  sets the version everywhere it appears
Dockerfile, nginx.conf the Docker image: nginx serving public/
docker-compose.yml   for running the image yourself
```

The scripts in `public/js/` are plain scripts that share globals, loaded in a fixed order by `index.html`. `CLAUDE.md` describes what each one contains and how the code works.

## Run locally

It is a static site, so any static web server works:

```bash
python3 -m http.server 8080 -d public
```

or with Docker:

```bash
docker build -t ultimate-calculator .
docker run --rm -p 8080:80 ultimate-calculator
```

Then open `http://localhost:8080`.

## Tests

```bash
pip install playwright && python3 -m playwright install chromium   # once
python3 tests/test_app.py
```

The tests open the app in Chromium at desktop and phone sizes, in both languages and themes, and check the calculator, brackets, Units, the tools, History, the mode tabs, the language switch and that nothing is cut off on phones.

## Deployment

Every push to `main` runs one GitHub Actions workflow (`.github/workflows/deploy.yml`): the tests first, and only if they pass,

- **GitHub Pages** – the site at https://uc.kampaxis.com
- **Docker image** – `ghcr.io/leothegreat777/ultimate-calculator:latest`, tested before it is published. To update a self-hosted copy: `docker compose pull && docker compose up -d`.

If the tests fail, nothing is deployed and the live site stays as it was. If two pushes land within seconds of each other, the older run is cancelled and only the newest one deploys.

## Versioning

Run `python3 tools/bump-version.py` once per release. It sets the version in `public/js/core.js` and in `public/index.html` (the footer and the `?v=` on every script and stylesheet, which makes browsers load the new files).

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

The application is designed to be easy to self-host. It is a static site (the `public/` folder), so it runs on GitHub Pages, behind Nginx or any static web server, or from the Docker image, with no database or application backend.
