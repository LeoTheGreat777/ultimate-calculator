FROM nginx:alpine

# Only the app's files go into the web root, so nothing else in the repo is ever served.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js charts.js history-interaction.js styles.css icon.svg manifest.webmanifest /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/api/health || exit 1
