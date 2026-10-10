FROM python:3.13-alpine

WORKDIR /app
COPY . /app

ENV PYTHONUNBUFFERED=1
ENV PORT=80

EXPOSE 80

CMD ["python", "server.py"]
