# Ultimate Calculator

A mobile-first universal calculator for everyday calculations.

## Current MVP

- Standard arithmetic with brackets
- Calculator-style percentages (`20 + 25%`, `80 - 15%`)
- Local calculation history
- Copy result and keyboard support
- Fuel cost calculator
- Electricity cost calculator
- VAT add/remove calculator
- Unit conversions for length, weight, volume, speed and temperature
- Dark/light mode
- Installable PWA with offline support
- Static Docker image for simple self-hosting

## Run locally

This is a static web app. Any static web server works. For example:

```bash
docker build -t ultimate-calculator .
docker run --rm -p 8080:80 ultimate-calculator
```

Then open `http://localhost:8080`.

## Roadmap

The long-term goal is to make this a single calculation interface for almost anything people calculate in daily life, without AI or a backend being required for the core experience.

Planned areas include currency conversion, more units, discounts/markup/margins, date/time calculations, loan/interest calculations, reusable formulas, improved history, and richer mobile UX.
