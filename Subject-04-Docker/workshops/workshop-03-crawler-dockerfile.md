# Workshop 03: Crawler Dockerfile

## Overview
This workshop focuses on creating optimized Dockerfiles for web crawling applications. You'll work with Python-based crawlers using libraries like Scrapy, Playwright, and Selenium, implementing best practices for containerized scraping applications.

## Prerequisites
- Completed [Backend Dockerfile Workshop](../workshops/workshop-02-backend-dockerfile.md)
- Basic knowledge of Python web scraping
- Docker installed and running

## Learning Objectives
By the end of this workshop, you will be able to:
- Create Dockerfiles for web scraping applications
- Handle browser automation in containers
- Implement proper proxy and user-agent configuration
- Manage crawling data persistence
- Optimize crawler performance in containers

## Workshop Structure

### Part 1: Basic Scrapy Crawler

#### Step 1: Create Scrapy Application

First, let's create a basic Scrapy spider.

```bash
# Create project directory
mkdir scrapy-crawler
cd scrapy-crawler

# Create requirements.txt
cat > requirements.txt << EOF
scrapy==2.11.0
scrapy-user-agents==0.1.1
scrapy-rotating-proxies==0.6.2
itemadapter==0.8.0
EOF

# Create scrapy.cfg
cat > scrapy.cfg << EOF
[settings]
default = crawler.settings

[deploy]
project = crawler
EOF

# Create project structure
mkdir -p crawler/crawler/spiders

# Create __init__.py files
touch crawler/__init__.py
touch crawler/crawler/__init__.py
touch crawler/crawler/spiders/__init__.py

# Create settings.py
cat > crawler/crawler/settings.py << EOF
BOT_NAME = 'crawler'

SPIDER_MODULES = ['crawler.spiders']
NEWSPIDER_MODULE = 'crawler.spiders'

ROBOTSTXT_OBEY = True

# User Agent
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
]

# Download delay
DOWNLOAD_DELAY = 1

# Concurrent requests
CONCURRENT_REQUESTS = 16
CONCURRENT_REQUESTS_PER_DOMAIN = 8

# AutoThrottle extension
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0

# Logging
LOG_LEVEL = 'INFO'
EOF

# Create spider
cat > crawler/crawler/spiders/example.py << EOF
import scrapy
from scrapy.crawler import CrawlerProcess

class ExampleSpider(scrapy.Spider):
    name = 'example'
    start_urls = ['http://quotes.toscrape.com/']

    def parse(self, response):
        for quote in response.css('div.quote'):
            yield {
                'text': quote.css('span.text::text').get(),
                'author': quote.css('small.author::text').get(),
                'tags': quote.css('div.tags a.tag::text').getall(),
            }

        next_page = response.css('li.next a::attr(href)').get()
        if next_page is not None:
            next_page = response.urljoin(next_page)
            yield scrapy.Request(next_page, callback=self.parse)

if __name__ == '__main__':
    process = CrawlerProcess({
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    process.crawl(ExampleSpider)
    process.start()
EOF
```

#### Step 2: Create Optimized Dockerfile

```dockerfile
# Multi-stage build for Scrapy crawler
FROM python:3.11-slim AS builder

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libxml2-dev \
    libxslt-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
ENV VIRTUAL_ENV=/opt/uv
RUN uv venv /opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim AS production

# Create crawler user
RUN useradd --create-home --shell /bin/bash crawler

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/uv /opt/uv
ENV PATH="/opt/uv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=crawler:crawler . .

# Create data directory
RUN mkdir -p /app/data && chown crawler:crawler /app/data

# Switch to crawler user
USER crawler

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import scrapy; print('Crawler healthy')" || exit 1

# Default command
CMD ["python", "-m", "crawler.spiders.example"]
```

**Build and test:**
```bash
# Build the image
docker build -t scrapy-crawler .

# Run the crawler
docker run --rm -v $(pwd)/data:/app/data scrapy-crawler

# Check output
ls -la data/
```

### Part 2: Playwright Browser Automation

#### Step 1: Create Playwright Crawler

Create a browser-based crawler using Playwright.

```bash
# Create project directory
mkdir playwright-crawler
cd playwright-crawler

# Create requirements.txt
cat > requirements.txt << EOF
playwright==1.40.0
beautifulsoup4==4.12.2
lxml==4.9.3
EOF

# Create crawler script
cat > crawler.py << EOF
import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime

async def crawl_quotes():
    async with async_playwright() as p:
        # Launch browser with anti-detection measures
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        )

        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )

        page = await context.new_page()

        try:
            await page.goto('http://quotes.toscrape.com/js/', wait_until='networkidle')

            quotes = []

            while True:
                # Wait for quotes to load
                await page.wait_for_selector('.quote')

                # Extract quotes from current page
                page_quotes = await page.evaluate('''() => {
                    const quotes = [];
                    document.querySelectorAll('.quote').forEach(quote => {
                        quotes.push({
                            text: quote.querySelector('.text').textContent,
                            author: quote.querySelector('.author').textContent,
                            tags: Array.from(quote.querySelectorAll('.tag')).map(tag => tag.textContent)
                        });
                    });
                    return quotes;
                }''')

                quotes.extend(page_quotes)

                # Check for next page
                next_button = await page.query_selector('li.next a')
                if not next_button:
                    break

                await next_button.click()
                await page.wait_for_timeout(2000)  # Wait for page to load

            # Save results
            result = {
                'timestamp': datetime.now().isoformat(),
                'total_quotes': len(quotes),
                'quotes': quotes
            }

            with open('/app/data/quotes.json', 'w') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)

            print(f"Successfully crawled {len(quotes)} quotes")

        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(crawl_quotes())
EOF
```

#### Step 2: Create Playwright Dockerfile

```dockerfile
# Multi-stage build for Playwright crawler
FROM python:3.11-slim AS builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
ENV VIRTUAL_ENV=/opt/uv
RUN uv venv /opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim AS production

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Create crawler user
RUN useradd --create-home --shell /bin/bash crawler --uid 1001

# Copy virtual environment from builder
COPY --from=builder /opt/uv /opt/uv
ENV PATH="/opt/uv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=crawler:crawler . .

# Create data directory
RUN mkdir -p /app/data && chown crawler:crawler /app/data

# Install Playwright browsers
USER crawler
RUN playwright install chromium

# Switch back to root for final setup
USER root

# Install additional fonts for better compatibility
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Switch to crawler user
USER crawler

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=3 \
    CMD python -c "import playwright; print('Playwright healthy')" || exit 1

# Default command
CMD ["python", "crawler.py"]
```

**Build and test:**
```bash
# Build the image
docker build -t playwright-crawler .

# Run the crawler
docker run --rm -v $(pwd)/data:/app/data playwright-crawler

# Check output
cat data/quotes.json | head -20
```

### Part 3: Selenium-Based Crawler

#### Step 1: Create Selenium Crawler

Create a crawler using Selenium with Chrome.

```bash
# Create project directory
mkdir selenium-crawler
cd selenium-crawler

# Create requirements.txt
cat > requirements.txt << EOF
selenium==4.15.2
webdriver-manager==4.0.1
beautifulsoup4==4.12.2
EOF

# Create crawler script
cat > crawler.py << EOF
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime

def crawl_quotes():
    # Configure Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

    # Initialize driver
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=chrome_options
    )

    try:
        driver.get('http://quotes.toscrape.com/')

        quotes = []
        page = 1

        while True:
            print(f"Crawling page {page}")

            # Wait for content to load
            time.sleep(2)

            # Parse page content
            soup = BeautifulSoup(driver.page_source, 'html.parser')

            for quote_div in soup.find_all('div', class_='quote'):
                quote = {
                    'text': quote_div.find('span', class_='text').text.strip('"'),
                    'author': quote_div.find('small', class_='author').text,
                    'tags': [tag.text for tag in quote_div.find_all('a', class_='tag')]
                }
                quotes.append(quote)

            # Check for next page
            next_link = soup.find('li', class_='next')
            if not next_link:
                break

            # Click next page
            next_button = driver.find_element('css selector', 'li.next a')
            next_button.click()
            page += 1

            # Random delay to be respectful
            time.sleep(1)

        # Save results
        result = {
            'timestamp': datetime.now().isoformat(),
            'total_quotes': len(quotes),
            'pages_crawled': page,
            'quotes': quotes
        }

        with open('/app/data/selenium_quotes.json', 'w') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"Successfully crawled {len(quotes)} quotes from {page} pages")

    finally:
        driver.quit()

if __name__ == '__main__':
    crawl_quotes()
EOF
```

#### Step 2: Create Selenium Dockerfile

```dockerfile
# Multi-stage build for Selenium crawler
FROM python:3.11-slim AS builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
ENV VIRTUAL_ENV=/opt/uv
RUN uv venv /opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN uv add --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim AS production

# Install system dependencies for Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Create crawler user
RUN useradd --create-home --shell /bin/bash crawler --uid 1001

# Copy virtual environment from builder
COPY --from=builder /opt/uv /opt/uv
ENV PATH="/opt/uv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=crawler:crawler . .

# Create data directory
RUN mkdir -p /app/data && chown crawler:crawler /app/data

# Pre-download ChromeDriver (optional, webdriver-manager will handle this)
USER crawler
RUN python -c "from webdriver_manager.chrome import ChromeDriverManager; ChromeDriverManager().install()"

# Switch back to root for final setup
USER root

# Add additional security
RUN chmod 755 /app

# Switch to crawler user
USER crawler

# Environment variables
ENV DISPLAY=:99

# Health check
HEALTHCHECK --interval=120s --timeout=30s --start-period=60s --retries=3 \
    CMD google-chrome --version || exit 1

# Default command
CMD ["python", "crawler.py"]
```

## Challenge Exercises

### Challenge 1: Advanced Scrapy Features
1. Implement proxy rotation in Scrapy Dockerfile
2. Add database storage (SQLite/PostgreSQL)
3. Implement distributed crawling setup
4. Add monitoring and metrics

### Challenge 2: Headless Browser Optimization
1. Optimize Playwright Dockerfile for minimal size
2. Implement browser context reuse
3. Add anti-detection measures
4. Implement screenshot capabilities

### Challenge 3: Production Crawler Setup
1. Create docker-compose.yml for crawler + database
2. Implement rate limiting and throttling
3. Add logging and monitoring
4. Set up scheduled crawling with cron

## Performance Considerations

### Resource Limits
```yaml
# docker-compose.yml
services:
  crawler:
    build: .
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

### Rate Limiting
```python
# In crawler settings
DOWNLOAD_DELAY = 3
RANDOMIZE_DOWNLOAD_DELAY = True
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0
```

### Data Management
```bash
# Volume mounts for data persistence
docker run -v crawler_data:/app/data -v crawler_logs:/app/logs crawler

# Backup strategy
docker run --rm -v crawler_data:/data alpine tar czf - /data > backup.tar.gz
```

## Security Best Practices

### User Permissions
```dockerfile
# Create dedicated crawler user
RUN useradd --create-home --shell /bin/bash crawler --uid 1001 --gid 1001

# Restrict permissions
USER crawler
```

### Network Security
```dockerfile
# Use internal networks
networks:
  crawler-net:
    internal: true
```

### Secrets Management
```bash
# Use environment files
docker run --env-file .env crawler

# Or Docker secrets
echo "proxy_password" | docker secret create proxy_pass
```

## Verification Checklist

### Scrapy Crawler
- [ ] Application builds successfully
- [ ] Multi-stage build implemented
- [ ] Dependencies properly isolated
- [ ] User permissions configured
- [ ] Data persistence works

### Playwright Crawler
- [ ] Browser automation works in container
- [ ] Anti-detection measures implemented
- [ ] Resource usage optimized
- [ ] Error handling robust

### Selenium Crawler
- [ ] Chrome runs in headless mode
- [ ] WebDriver management automated
- [ ] Memory usage controlled
- [ ] Crawling logic reliable

## Troubleshooting

### Common Issues

**Chrome crashes in container**
- Add `--no-sandbox` flag
- Ensure proper shared memory: `--shm-size=2g`
- Check available memory

**Slow crawler performance**
- Implement proper delays between requests
- Use connection pooling
- Optimize browser configurations

**Memory leaks**
- Restart containers periodically
- Implement proper cleanup
- Monitor resource usage

**Anti-bot detection**
- Rotate user agents
- Add random delays
- Use residential proxies
- Implement browser fingerprinting countermeasures

## Next Steps
- [Volumes and Networks Tutorial](../tutorials/05-volumes-networks.md)
- [Workshop: Compose App + Postgres](../workshops/workshop-04-compose-app-postgres.md)

## Additional Resources
- [Scrapy Documentation](https://docs.scrapy.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Selenium Documentation](https://www.selenium.dev/)
- [Crawler Ethics and Legal Considerations](https://blog.apify.com/web-scraping-legality/)
