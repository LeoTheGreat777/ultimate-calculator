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
- Length, weight, volume, speed and temperature conversions
- Calculator-style arithmetic directly inside unit fields
- Expressions can be chained just like the main calculator
- Percentage calculations
- Automatic conversion while entering an expression
- Switch conversion direction
- Keypad-based input designed for a calculator-like experience

### Dedicated Calculators
- Fuel cost calculator
- Electricity/energy cost calculator
- VAT add/remove calculator

### Interface
- Responsive desktop and mobile layouts
- Dark and light themes
- English and Greek language support
- Installable PWA
- Offline-capable static web app
- Mobile-friendly calculator controls
- Clean, compact UI with dedicated mode navigation
- Calculation explanations presented in a readable step-by-step view

## Technology

Ultimate Calculator is intentionally lightweight and does not require a backend for its core functionality.

- HTML
- CSS
- Vanilla JavaScript
- Progressive Web App
- Docker / Nginx for self-hosting

Calculations are performed locally in the browser. No account or server is required for the core calculator.

## Run locally

This is a static web app, so it can be served by any static web server.

### Docker

```bash
docker build -t ultimate-calculator .
docker run --rm -p 8080:80 ultimate-calculator
```

Then open:

```
http://localhost:8080
```

You can also serve the project directly with any local static HTTP server.

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

The application is designed to be easy to self-host. Because the core application is static, it can run behind Nginx, a simple web server, Docker, or another static hosting platform without requiring a database or application backend.
