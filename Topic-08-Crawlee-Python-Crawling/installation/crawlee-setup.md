# Crawlee Python Development Setup

## Overview
This guide covers setting up a Python environment for web crawling with Crawlee, including dependencies, virtual environments, and development tools.

## Prerequisites
- Python 3.8+ installed
- Basic command line knowledge
- Understanding of web scraping concepts

---

## Virtual Environment Setup

```bash
# Create project directory
mkdir crawlee-project
cd crawlee-project

# Create virtual environment
uv venv

# Activate environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Upgrade pip
uv add --upgrade pip
```

---

## Core Dependencies Installation

```bash
# Install Crawlee Python SDK
uv add crawlee

# Additional crawling dependencies
uv add requests beautifulsoup4 lxml selenium webdriver-manager

# Data processing
uv add pandas numpy

# Storage and databases
uv add sqlalchemy aiosqlite

# Configuration and logging
uv add python-dotenv loguru

# Development tools
uv add black flake8 pytest httpx
```

---

## Project Structure

```
crawlee-project/
├── .venv/
├── src/
│   ├── __init__.py
│   ├── crawlers/
│   │   ├── __init__.py
│   │   ├── base_crawler.py
│   │   └── specific_crawler.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── data_models.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── data/
│   ├── raw/
│   └── processed/
├── tests/
│   ├── __init__.py
│   └── test_crawler.py
├── scripts/
│   └── run_crawler.py
├── config/
│   ├── settings.py
│   └── .env
├── requirements.txt
├── pyproject.toml
├── README.md
└── .gitignore
```

---

## Configuration Files

### requirements.txt
```
crawlee==0.1.0
requests==2.31.0
beautifulsoup4==4.12.2
lxml==4.9.3
selenium==4.15.2
webdriver-manager==4.0.1
pandas==2.1.3
sqlalchemy==2.0.23
aiosqlite==0.19.0
python-dotenv==1.0.0
loguru==0.7.2
black==23.11.0
pytest==7.4.3
httpx==0.25.2
```

### .env Configuration
```
# Database
DATABASE_URL=sqlite:///./data/crawler.db

# Crawling settings
USER_AGENT=Mozilla/5.0 (compatible; Crawler/1.0)
REQUEST_DELAY=1.0
MAX_REQUESTS_PER_MINUTE=60

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/crawler.log

# API Keys (if needed)
SCRAPER_API_KEY=your_key_here
```

---

## Basic Crawlee Setup

### First Crawler Script
```python
# src/crawlers/base_crawler.py
import asyncio
from crawlee.crawlers import BeautifulSoupCrawler
from crawlee.http_clients import HttpxHttpClient

class BaseCrawler:
    def __init__(self):
        self.http_client = HttpxHttpClient()

    async def crawl_website(self, url: str):
        """Basic website crawling example"""
        crawler = BeautifulSoupCrawler(
            http_client=self.http_client,
            max_requests_per_crawl=10,
        )

        @crawler.router.default_handler
        async def default_handler(context):
            title = context.soup.find('title')
            if title:
                print(f"Page title: {title.text}")

        await crawler.run([url])

if __name__ == "__main__":
    crawler = BaseCrawler()
    asyncio.run(crawler.crawl_website("https://httpbin.org/html"))
```

---

## Development Tools Setup

### VS Code Extensions
- Python (Microsoft)
- Pylance (Microsoft)
- Jupyter (Microsoft)
- GitLens (GitKraken)
- Python Docstring Generator

### Code Quality Tools
```bash
# Install pre-commit
uv add pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml

  - repo: https://github.com/psf/black
    rev: 23.11.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/flake8
    rev: 6.1.0
    hooks:
      - id: flake8
EOF

# Install hooks
pre-commit install
```

---

## Testing Setup

### pytest Configuration
```python
# tests/conftest.py
import pytest
import asyncio
from crawlee.http_clients import HttpxHttpClient

@pytest.fixture
async def http_client():
    client = HttpxHttpClient()
    yield client
    await client.close()

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
```

### Sample Test
```python
# tests/test_crawler.py
import pytest
from src.crawlers.base_crawler import BaseCrawler

class TestBaseCrawler:
    @pytest.mark.asyncio
    async def test_crawler_initialization(self):
        crawler = BaseCrawler()
        assert crawler.http_client is not None

    @pytest.mark.asyncio
    async def test_basic_crawl(self, http_client):
        # Mock test for crawling functionality
        pass
```

---

## Running the Crawler

### Basic Execution
```bash
# Activate virtual environment
source .venv/bin/activate

# Run crawler
python src/crawlers/base_crawler.py

# Run with Python module
python -m src.crawlers.base_crawler
```

### Development Mode
```bash
# Run with auto-reload (using watchfiles)
uv add watchfiles
watchfiles "python src/crawlers/base_crawler.py" src/
```

---

## Docker Setup (Optional)

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p data/raw data/processed logs

# Run the crawler
CMD ["python", "src/crawlers/base_crawler.py"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  crawler:
    build: .
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - PYTHONPATH=/app
    command: python src/crawlers/base_crawler.py
```

---

## Troubleshooting

### Import Errors
```bash
# Check virtual environment
which python
which pip

# Reinstall dependencies
uv add -r requirements.txt --force-reinstall
```

### Network Issues
```bash
# Test connectivity
curl -I https://httpbin.org

# Check proxy settings
env | grep -i proxy
```

### Crawlee Errors
```bash
# Check Crawlee version
python -c "import crawlee; print(crawlee.__version__)"

# Update Crawlee
uv add --upgrade crawlee
```

---

## Performance Considerations

### Rate Limiting
```python
import asyncio
from crawlee.crawlers import BeautifulSoupCrawler

async def crawl_with_delay():
    crawler = BeautifulSoupCrawler(
        max_requests_per_crawl=100,
    )

    # Add delay between requests
    @crawler.pre_navigation_hook
    async def add_delay(context):
        await asyncio.sleep(1)  # 1 second delay

    await crawler.run(['https://example.com'])
```

### Memory Management
```python
# Limit concurrent requests
crawler = BeautifulSoupCrawler(
    max_concurrency=5,  # Limit to 5 concurrent requests
)
```

---

## Next Steps

1. [Learn Crawlee basics](../tutorials/01-crawlee-introduction.md)
2. [Create your first crawler](../workshops/workshop-01-basic-crawling.md)
3. [Handle JavaScript rendering](../tutorials/02-playwright-integration.md)
4. [Store crawled data](../workshops/workshop-02-data-storage.md)

---

## Resources

- [Crawlee Python Documentation](https://crawlee-python.apify.com/)
- [Beautiful Soup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Selenium Documentation](https://selenium-python.readthedocs.io/)
- [Requests Documentation](https://requests.readthedocs.io/)
- [Web Scraping Ethics](https://blog.apify.com/web-scraping-ethics/)
