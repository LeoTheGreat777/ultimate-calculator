FROM python:3.13-alpine

WORKDIR /app
COPY . /app

ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/app/data
ENV PORT=80

RUN mkdir -p /app/data

EXPOSE 80

CMD ["python", "server.py"]
