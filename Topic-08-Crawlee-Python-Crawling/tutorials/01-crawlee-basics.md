# Tutorial 01: Crawlee Python SDK Fundamentals

## Overview
This tutorial introduces the Crawlee Python SDK, a powerful web scraping framework designed for building reliable and scalable crawlers. You'll learn the core concepts, components, and basic usage patterns of Crawlee for Python development.

## What is Crawlee?

Crawlee is a web scraping and browser automation library that helps you build reliable crawlers. The Python version provides:

- **Request Routing**: Handle different types of pages with different logic
- **Auto-scaling**: Automatically manage concurrency based on system resources
- **Error Handling**: Built-in retry mechanisms and error recovery
- **Data Storage**: Multiple storage backends for crawled data
- **Browser Automation**: Integration with Playwright for JavaScript-heavy sites

### Key Differences from Other Scraping Libraries

| Feature | Crawlee Python | BeautifulSoup + Requests | Scrapy |
|---------|----------------|------------------------|--------|
| **Concurrency** | Automatic scaling | Manual threading | Built-in |
| **Error Handling** | Built-in retries | Manual implementation | Good |
| **Data Storage** | Built-in datasets | Manual | Built-in |
| **Browser Automation** | Playwright integration | Separate setup | Limited |
| **Queue Management** | Automatic | Manual | Built-in |
| **Rate Limiting** | Built-in | Manual | Manual |

## Core Components

### 1. Crawler Classes

Crawlee provides different crawler classes for different use cases:

#### HttpCrawler
Best for simple HTTP requests and REST APIs:
```python
from crawlee import HttpCrawler, Request

async def main():
    crawler = HttpCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        # Extract JSON data
        data = context.json
        print(f"Received data: {data}")

    await crawler.run(['https://api.example.com/data'])
```

#### BeautifulSoupCrawler
Ideal for HTML parsing with BeautifulSoup:
```python
from crawlee import BeautifulSoupCrawler

async def main():
    crawler = BeautifulSoupCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        soup = context.soup
        title = soup.find('title').text if soup.find('title') else 'No title'
        print(f"Page title: {title}")

    await crawler.run(['https://example.com'])
```

#### ParselCrawler
Uses Parsel (similar to Scrapy selectors):
```python
from crawlee import ParselCrawler

async def main():
    crawler = ParselCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        # Use CSS selectors
        title = context.selector.css('title::text').get()
        links = context.selector.css('a::attr(href)').getall()

        print(f"Title: {title}")
        print(f"Found {len(links)} links")

    await crawler.run(['https://example.com'])
```

#### PlaywrightCrawler
For JavaScript-heavy websites:
```python
from crawlee import PlaywrightCrawler

async def main():
    crawler = PlaywrightCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        page = context.page
        # Wait for dynamic content
        await page.wait_for_selector('h1')
        title = await page.title()
        print(f"Page title: {title}")

    await crawler.run(['https://example.com'])
```

### 2. Request and Response Objects

#### Request Object
```python
from crawlee import Request

# Basic request
request = Request.from_url('https://example.com')

# Request with custom data
request = Request.from_url(
    'https://example.com',
    user_data={'priority': 'high', 'source': 'manual'},
    headers={'User-Agent': 'My Crawler 1.0'}
)

# Request with label for routing
request = Request.from_url(
    'https://example.com/api',
    label='api_endpoint'
)
```

#### Context Object
The context object provides access to all request/response data:
```python
@crawler.router.default_handler
async def request_handler(context):
    # Request information
    url = context.request.url
    method = context.request.method
    user_data = context.request.user_data

    # Response information
    status_code = context.http_response.status_code
    headers = context.http_response.headers

    # Content (varies by crawler type)
    # For BeautifulSoupCrawler
    soup = context.soup

    # For HttpCrawler
    json_data = context.json
    text_data = context.text

    # For ParselCrawler
    selector = context.selector

    # For PlaywrightCrawler
    page = context.page
```

### 3. Router and Handlers

The router directs requests to appropriate handlers based on labels or patterns:
```python
from crawlee import BeautifulSoupCrawler

async def main():
    crawler = BeautifulSoupCrawler()

    # Default handler for all requests
    @crawler.router.default_handler
    async def default_handler(context):
        print(f"Processing: {context.request.url}")

    # Handler for specific label
    @crawler.router.handler('product_page')
    async def product_handler(context):
        soup = context.soup
        title = soup.find('h1', class_='product-title')
        price = soup.find('span', class_='price')

        print(f"Product: {title.text if title else 'N/A'}")
        print(f"Price: {price.text if price else 'N/A'}")

    # Handler for API endpoints
    @crawler.router.handler('api_endpoint')
    async def api_handler(context):
        data = context.json
        print(f"API Response: {data}")

    await crawler.run([
        'https://example.com',
        Request.from_url('https://example.com/product/123', label='product_page'),
        Request.from_url('https://api.example.com/data', label='api_endpoint')
    ])
```

### 4. Data Storage

Crawlee provides built-in storage for crawled data:

#### Dataset Storage
```python
from crawlee import BeautifulSoupCrawler, Dataset

async def main():
    crawler = BeautifulSoupCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        soup = context.soup

        # Extract data
        article = {
            'title': soup.find('title').text if soup.find('title') else '',
            'url': context.request.url,
            'timestamp': context.request.loaded_at.isoformat()
        }

        # Store in dataset
        await context.push_data(article)

    await crawler.run(['https://example.com'])

    # Access stored data
    dataset = await Dataset.open()
    data = await dataset.get_data()
    print(f"Stored {len(data.items)} items")
```

#### Key-Value Store
```python
from crawlee import KeyValueStore

async def main():
    # Open or create a key-value store
    store = await KeyValueStore.open('my_store')

    # Store data
    await store.set_value('config', {'setting': 'value'})
    await store.set_value('binary_data', b'binary content', 'application/octet-stream')

    # Retrieve data
    config = await store.get_value('config')
    print(f"Config: {config}")
```

### 5. Request Queue

Manage URLs to crawl with automatic deduplication:
```python
from crawlee import RequestQueue, BeautifulSoupCrawler

async def main():
    # Open or create a request queue
    queue = await RequestQueue.open('my_queue')

    # Add requests to queue
    await queue.add_request(Request.from_url('https://example.com'))
    await queue.add_request(Request.from_url('https://example.com/page1'))
    await queue.add_request(Request.from_url('https://example.com/page2'))

    # Use queue with crawler
    crawler = BeautifulSoupCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        soup = context.soup
        title = soup.find('title').text if soup.find('title') else 'No title'
        print(f"Processed: {title}")

        # Add more URLs to queue
        for link in soup.find_all('a', href=True):
            await context.enqueue_links([link['href']])

    # Run crawler with queue
    await crawler.run(queue)
```

## Configuration and Settings

### Crawler Configuration
```python
from crawlee import BeautifulSoupCrawler

async def main():
    crawler = BeautifulSoupCrawler(
        # Concurrency settings
        max_concurrency=10,
        min_concurrency=1,

        # Request settings
        max_request_retries=3,
        request_timeout=30,

        # Queue settings
        max_requests_per_minute=60,

        # Error handling
        ignore_ssl_errors=False,

        # Browser settings (for PlaywrightCrawler)
        browser_type='chromium',
        headless=True
    )

    @crawler.router.default_handler
    async def request_handler(context):
        # Process page
        pass

    await crawler.run(['https://example.com'])
```

### Global Configuration
```python
from crawlee import Configuration

# Configure global settings
config = Configuration.get_global_configuration()
config.max_concurrency = 5
config.request_timeout = 30
config.write_metadata_to_dataset = True

# Or use environment variables
import os
os.environ['CRAWLEE_MAX_CONCURRENCY'] = '3'
os.environ['CRAWLEE_REQUEST_TIMEOUT'] = '60'
```

## Error Handling and Retries

### Built-in Error Handling
```python
from crawlee import BeautifulSoupCrawler

async def main():
    crawler = BeautifulSoupCrawler(
        max_request_retries=3,
        request_timeout=30
    )

    @crawler.router.default_handler
    async def request_handler(context):
        try:
            soup = context.soup
            # Process page
            title = soup.find('title').text if soup.find('title') else 'No title'
            print(f"Title: {title}")

        except Exception as e:
            print(f"Error processing {context.request.url}: {e}")
            # Crawlee will automatically retry failed requests

    @crawler.router.error_handler
    async def error_handler(context):
        print(f"Permanent failure for {context.request.url}: {context.error}")
        # This handler is called when all retries are exhausted

    await crawler.run(['https://example.com'])
```

### Custom Error Handling
```python
from crawlee import BeautifulSoupCrawler
from crawlee.errors import HttpStatusError

async def main():
    crawler = BeautifulSoupCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        # Check response status
        if context.http_response.status_code == 404:
            print(f"Page not found: {context.request.url}")
            return

        if context.http_response.status_code >= 500:
            print(f"Server error: {context.request.url}")
            raise HttpStatusError("Server error")

        # Process page normally
        soup = context.soup
        title = soup.find('title').text if soup.find('title') else 'No title'
        print(f"Title: {title}")

    await crawler.run(['https://example.com'])
```

## Advanced Features

### Pre and Post Navigation Hooks
```python
from crawlee import BeautifulSoupCrawler

async def main():
    crawler = BeautifulSoupCrawler()

    # Pre-navigation hook
    @crawler.pre_navigation_hooks.append
    async def set_user_agent(context):
        context.request.headers['User-Agent'] = 'My Crawler 1.0'

    # Pre-navigation hook for authentication
    @crawler.pre_navigation_hooks.append
    async def add_authentication(context):
        if 'api.example.com' in context.request.url:
            context.request.headers['Authorization'] = 'Bearer token123'

    @crawler.router.default_handler
    async def request_handler(context):
        # Process page
        pass

    # Post-navigation hook
    @crawler.post_navigation_hooks.append
    async def log_response(context):
        print(f"Response status: {context.http_response.status_code}")

    await crawler.run(['https://example.com'])
```

### Session Management
```python
from crawlee import SessionPool, BeautifulSoupCrawler

async def main():
    # Create session pool for handling cookies and sessions
    session_pool = SessionPool(max_pool_size=10)

    crawler = BeautifulSoupCrawler(
        session_pool=session_pool,
        max_session_rotations=5
    )

    @crawler.router.default_handler
    async def request_handler(context):
        # Access session information
        session = context.session
        print(f"Using session: {session.id}")

        # Session persists cookies and other session data
        soup = context.soup
        # Process page

    await crawler.run(['https://example.com'])
```

### Statistics and Monitoring
```python
from crawlee import BeautifulSoupCrawler, Statistics

async def main():
    crawler = BeautifulSoupCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        # Process page
        pass

    # Run crawler
    await crawler.run(['https://example.com'])

    # Get statistics
    stats = crawler.statistics
    print(f"Requests completed: {stats.requests_finished}")
    print(f"Requests failed: {stats.requests_failed}")
    print(f"Retry histogram: {stats.retry_histogram}")
    print(f"Total bytes received: {stats.bytes_received}")

    # Save statistics to file
    await stats.save_to_file('crawler_stats.json')
```

## Best Practices

### 1. Respectful Crawling
```python
from crawlee import BeautifulSoupCrawler
import time

async def main():
    crawler = BeautifulSoupCrawler(
        max_concurrency=2,  # Low concurrency
        max_requests_per_minute=30,  # Rate limiting
        request_timeout=30
    )

    # Add delay between requests
    @crawler.pre_navigation_hooks.append
    async def add_delay(context):
        if hasattr(crawler, '_last_request_time'):
            elapsed = time.time() - crawler._last_request_time
            if elapsed < 2:  # 2 second delay
                await asyncio.sleep(2 - elapsed)

        crawler._last_request_time = time.time()

    @crawler.router.default_handler
    async def request_handler(context):
        # Check robots.txt before processing
        if not await check_robots_txt(context.request.url):
            print(f"Blocked by robots.txt: {context.request.url}")
            return

        # Process page
        pass

    await crawler.run(['https://example.com'])
```

### 2. Memory Management
```python
from crawlee import BeautifulSoupCrawler, Dataset

async def main():
    crawler = BeautifulSoupCrawler()

    processed_count = 0

    @crawler.router.default_handler
    async def request_handler(context):
        nonlocal processed_count

        # Process page
        soup = context.soup
        data = extract_data(soup)

        # Store data immediately to free memory
        await context.push_data(data)

        processed_count += 1

        # Periodic cleanup
        if processed_count % 100 == 0:
            import gc
            gc.collect()  # Force garbage collection

    await crawler.run(['https://example.com'])
```

### 3. Logging and Debugging
```python
import logging
from crawlee import BeautifulSoupCrawler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def main():
    crawler = BeautifulSoupCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        logger = logging.getLogger(__name__)

        logger.info(f"Processing: {context.request.url}")
        logger.debug(f"Request headers: {dict(context.request.headers)}")

        try:
            soup = context.soup
            title = soup.find('title').text if soup.find('title') else 'No title'
            logger.info(f"Extracted title: {title}")

        except Exception as e:
            logger.error(f"Error processing {context.request.url}: {e}")
            raise

    await crawler.run(['https://example.com'])
```

## Hands-on Exercises

### Exercise 1: Basic Crawler
Create a simple crawler that extracts article titles and URLs:
1. Set up a BeautifulSoupCrawler
2. Extract title and URL from pages
3. Store results in a dataset
4. Run on a news website

### Exercise 2: Request Routing
Build a crawler with different handlers for different page types:
1. Create handlers for home page, article pages, and category pages
2. Use request labels to route requests
3. Extract different data types based on page type

### Exercise 3: Error Handling
Implement comprehensive error handling:
1. Add retry logic for failed requests
2. Handle different HTTP status codes
3. Log errors with context information
4. Implement circuit breaker pattern

## Next Steps
- [Respectful Crawling Tutorial](../tutorials/02-respectful-crawling.md)
- [Workshop: Basic Crawler](../workshops/workshop-01-basic-crawler.md)

## Additional Resources
- [Crawlee Python Documentation](https://crawlee-python.dev/)
- [BeautifulSoup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Playwright Documentation](https://playwright.dev/python/docs/intro)
- [Web Scraping Best Practices](https://blog.apify.com/web-scraping-legality/)
