# Optimi Scraper Backend
# Build: docker build -t optimi-scraper -f scraper/Dockerfile .
# Run:  docker run -p 8000:8000 -e OPENAI_API_KEY=sk-... optimi-scraper

FROM python:3.11-slim

WORKDIR /app

COPY . /app/scraper/
RUN pip install --no-cache-dir -r /app/scraper/requirements.txt

EXPOSE 8000

CMD ["uvicorn", "scraper.api:app", "--host", "0.0.0.0", "--port", "8000"]
