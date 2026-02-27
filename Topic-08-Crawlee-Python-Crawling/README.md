# Subject 8: Crawlee and Crawling Persian Websites (Python)

## Overview

This subject introduces web crawling using the Crawlee Python SDK, with special focus on respectful crawling practices and extracting Persian (Farsi) content. You'll learn to build scalable web scrapers that handle JavaScript-heavy sites, respect robots.txt, and process Persian text effectively.

## Learning Objectives

By the end of this subject, you will be able to:

- **Use Crawlee Python SDK**: Implement web crawlers using Crawlee's powerful framework
- **Practice Respectful Crawling**: Follow ethical scraping practices and respect website policies
- **Handle Persian Content**: Extract and process Persian/Farsi text and websites
- **Implement Data Extraction**: Build robust parsers for various content types
- **Manage Large-Scale Crawling**: Handle pagination, deduplication, and rate limiting
- **Store Extracted Data**: Persist crawled data in JSON, databases, or other formats

## Prerequisites

- Completion of Subjects 1-7 (Git through gRPC)
- Python programming proficiency
- Basic understanding of HTML and CSS
- Familiarity with HTTP concepts

## Subject Structure

### 📚 Tutorials (Conceptual Learning)

1. **[Crawlee Basics](tutorials/01-crawlee-basics.md)**
   - Introduction to Crawlee Python SDK
   - Core concepts: Actors, Requests, Datasets
   - Basic crawler implementation
   - Understanding the crawling lifecycle

2. **[Respectful Crawling](tutorials/02-respectful-crawling.md)**
   - Robots.txt parsing and compliance
   - Rate limiting and polite crawling
   - Legal and ethical considerations
   - Crawling best practices

3. **[Persian Content Extraction](tutorials/03-persian-content-extraction.md)**
   - Persian text encoding and character sets
   - Right-to-left text handling
   - Persian website patterns and structures
   - Cultural and linguistic considerations

4. **[Data Extraction Patterns](tutorials/04-data-extraction-patterns.md)**
   - CSS selectors and XPath expressions
   - Structured data extraction
   - Handling dynamic content
   - Data cleaning and normalization

5. **[Storage Options](tutorials/05-storage-options.md)**
   - JSON file storage
   - Database integration
   - CSV and other formats
   - Data persistence strategies

### 🛠️ Workshops (Hands-on Practice)

1. **[Basic Crawler](workshops/workshop-01-basic-crawler.md)**
   - Setting up Crawlee project
   - Creating first crawler
   - Basic page scraping
   - Saving extracted data

2. **[Respectful Crawling](workshops/workshop-02-respectful-crawling.md)**
   - Implementing robots.txt compliance
   - Adding delays and rate limiting
   - Error handling and retries
   - Monitoring crawler behavior

3. **[Persian Content Extraction](workshops/workshop-03-persian-content-extraction.md)**
   - Persian news website crawling
   - Blog content extraction
   - Forum and social media scraping
   - Text encoding handling

4. **[Advanced Data Extraction](workshops/workshop-04-advanced-data-extraction.md)**
   - Complex website structures
   - JavaScript-heavy sites
   - API endpoint discovery
   - Advanced parsing techniques

5. **[Storage & Persistence](workshops/workshop-05-storage-persistence.md)**
   - Database integration
   - File system storage
   - Data deduplication
   - Large dataset handling

### 📝 Homework Assignments

The `homeworks/` directory contains:
- Persian website crawling projects
- Data extraction challenges
- Respectful crawling implementations

### 📋 Assessments

The `assessments/` directory contains:
- Crawling ethics quiz
- Technical implementation challenges
- Persian text processing exercises

## Key Crawlee Concepts

### Basic Crawler Structure

```python
from crawlee import PlaywrightCrawler, Request

async def main():
    crawler = PlaywrightCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        # Extract data from the page
        title = await context.page.title()
        content = await context.page.locator('article').text_content()

        # Save the data
        await context.push_data({
            'url': context.request.url,
            'title': title,
            'content': content
        })

    # Add requests to crawl
    await crawler.add_requests([
        Request.from_url('https://example.com'),
    ])

    # Run the crawler
    await crawler.run()

if __name__ == '__main__':
    asyncio.run(main())
```

### Respectful Crawling Implementation

```python
from crawlee import PlaywrightCrawler, Request
from crawlee.browsers import BrowserPool
from crawlee.proxy_configuration import ProxyConfiguration
import asyncio
import time

async def main():
    # Configure browser pool with proper settings
    browser_pool = BrowserPool.with_default_plugin(
        max_open_pages_per_browser=5,
        browser_launch_options={
            'headless': True,
            'args': ['--no-sandbox', '--disable-setuid-sandbox']
        }
    )

    crawler = PlaywrightCrawler(
        browser_pool=browser_pool,
        max_concurrency=3,  # Respectful concurrency
        max_requests_per_minute=60  # Rate limiting
    )

    @crawler.router.default_handler
    async def request_handler(context):
        # Check robots.txt compliance
        if not await check_robots_txt(context.request.url):
            context.log.info(f'Skipping {context.request.url} - robots.txt disallows')
            return

        # Add delay between requests
        await asyncio.sleep(1)  # 1 second delay

        # Extract data...
        data = await extract_data(context)
        await context.push_data(data)

    # Start crawling
    await crawler.add_requests([
        Request.from_url('https://example.com'),
    ])

    await crawler.run()

async def check_robots_txt(url):
    # Implementation for robots.txt checking
    # Return True if crawling is allowed
    pass
```

### Persian Content Extraction

```python
import re
from crawlee import PlaywrightCrawler, Request
from urllib.parse import urlparse

async def main():
    crawler = PlaywrightCrawler()

    @crawler.router.default_handler
    async def request_handler(context):
        # Persian content extraction
        persian_content = await extract_persian_content(context.page)

        await context.push_data({
            'url': context.request.url,
            'title': persian_content['title'],
            'content': persian_content['content'],
            'language': 'fa',  # Persian language code
            'encoding': 'utf-8'
        })

    async def extract_persian_content(page):
        # Extract Persian text content
        title_element = page.locator('h1, .title, [class*="title"]')
        title = await title_element.text_content() if await title_element.count() > 0 else ""

        # Extract main content (Persian articles often use specific selectors)
        content_selectors = [
            'article',
            '.content',
            '.post-content',
            '[class*="content"]',
            '.entry-content'
        ]

        content = ""
        for selector in content_selectors:
            element = page.locator(selector)
            if await element.count() > 0:
                content = await element.text_content()
                break

        # Clean and normalize Persian text
        title = clean_persian_text(title)
        content = clean_persian_text(content)

        return {
            'title': title,
            'content': content
        }

    def clean_persian_text(text):
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())

        # Handle Persian-specific characters and normalization
        # Add more Persian text processing as needed

        return text

    # Add Persian websites to crawl
    persian_sites = [
        'https://www.bbc.com/persian',
        'https://www.irna.ir/',
        # Add more Persian websites
    ]

    requests = [Request.from_url(url) for url in persian_sites]
    await crawler.add_requests(requests)

    await crawler.run()
```

## Crawling Best Practices

### Respectful Crawling Guidelines

1. **Check robots.txt**: Always respect website crawling policies
2. **Rate Limiting**: Don't overwhelm servers with requests
3. **User-Agent**: Identify your crawler properly
4. **Crawl Delays**: Add delays between requests
5. **Off-Peak Hours**: Crawl during low-traffic periods
6. **Data Limits**: Don't download unnecessary content

### Robots.txt Compliance

```python
import urllib.robotparser
from urllib.parse import urlparse

class RobotsChecker:
    def __init__(self):
        self.parsers = {}

    def can_fetch(self, url, user_agent='*'):
        domain = urlparse(url).netloc
        if domain not in self.parsers:
            robots_url = f"https://{domain}/robots.txt"
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(robots_url)
            try:
                rp.read()
                self.parsers[domain] = rp
            except:
                # If robots.txt can't be read, assume crawling is allowed
                return True

        return self.parsers[domain].can_fetch(user_agent, url)
```

### Handling Pagination

```python
async def handle_pagination(context):
    # Extract current page data
    await extract_page_data(context)

    # Find next page link
    next_page_selector = 'a.next, .pagination .next, [rel="next"]'
    next_link = context.page.locator(next_page_selector)

    if await next_link.count() > 0:
        next_url = await next_link.get_attribute('href')
        if next_url:
            # Add next page to crawling queue
            await context.add_requests([
                Request.from_url(next_url, label='pagination')
            ])
```

## Persian Language Considerations

### Text Processing
- **Encoding**: Always use UTF-8 for Persian text
- **RTL Support**: Handle right-to-left text rendering
- **Character Normalization**: Normalize Persian characters (ی/ي, ک/ك, etc.)
- **Word Tokenization**: Consider Persian word boundaries

### Website Patterns
- **News Sites**: Persian news websites follow similar structures
- **Blogs**: WordPress and similar platforms common
- **Forums**: Persian forum software and structures
- **E-commerce**: Persian online stores and marketplaces

## Resources & References

### 📖 Official Documentation
- [Crawlee Python SDK](https://crawlee.dev/python/) - Official documentation
- [Playwright](https://playwright.dev/python/) - Browser automation
- [Beautiful Soup](https://www.crummy.com/software/BeautifulSoup/) - HTML parsing

### 🛠️ Tools & Libraries
- [Crawlee CLI](https://crawlee.dev/python/docs/cli) - Command-line tools
- [Persian Text Processing](https://github.com/persiannlp) - Persian NLP tools
- [Scrapy](https://scrapy.org/) - Alternative crawling framework

### 📚 Additional Learning
- [Web Scraping Best Practices](https://blog.apify.com/web-scraping-best-practices/) - Ethics and techniques
- [Persian Language Resources](https://www.loc.gov/rr/geography/pdf/persian.pdf) - Language guides
- [robots.txt Specification](https://www.robotstxt.org/) - Crawling standards

## Getting Started

1. **Review Prerequisites** from previous subjects
2. **Install Crawlee** following the installation guides in `installation/`
3. **Complete Workshop 1** to create your first basic crawler
4. **Work through Tutorials** to understand respectful crawling and Persian content
5. **Practice with Workshops** to implement various crawling scenarios
6. **Complete Homework** assignments for comprehensive practice

## Common Crawling Patterns

### News Article Extraction

```python
async def extract_news_article(context):
    article = {
        'title': await context.page.locator('h1.article-title').text_content(),
        'summary': await context.page.locator('.article-summary').text_content(),
        'content': await context.page.locator('.article-body').text_content(),
        'author': await context.page.locator('.author-name').text_content(),
        'publish_date': await context.page.locator('.publish-date').text_content(),
        'tags': await context.page.locator('.article-tags span').all_text_contents(),
        'url': context.request.url
    }
    return article
```

### Product Data Extraction

```python
async def extract_product_data(context):
    product = {
        'name': await context.page.locator('.product-name').text_content(),
        'price': await context.page.locator('.product-price').text_content(),
        'description': await context.page.locator('.product-description').text_content(),
        'images': await context.page.locator('.product-image').all_attributes('src'),
        'specifications': await extract_specifications(context.page),
        'reviews': await extract_reviews(context.page)
    }
    return product
```

### Social Media Content

```python
async def extract_social_posts(context):
    posts = await context.page.locator('.post').all()
    extracted_posts = []

    for post in posts:
        post_data = {
            'author': await post.locator('.author').text_content(),
            'content': await post.locator('.content').text_content(),
            'timestamp': await post.locator('.timestamp').text_content(),
            'likes': await post.locator('.likes-count').text_content(),
            'comments': await extract_comments(post)
        }
        extracted_posts.append(post_data)

    return extracted_posts
```

## Assessment Criteria

- **Ethical Crawling**: Proper robots.txt compliance and rate limiting
- **Data Extraction**: Effective parsing of Persian content and structures
- **Error Handling**: Robust handling of network issues and site changes
- **Data Quality**: Clean, structured, and deduplicated extracted data
- **Performance**: Efficient crawling without overwhelming target sites
- **Code Quality**: Maintainable, well-documented crawler code

## Next Steps

After completing this subject, you'll be ready for:
- **Subject 9**: PostgreSQL database schema design
- **Subject 10**: Building complete data pipelines
- Large-scale data collection and processing

---

*Web crawling is a powerful tool for data collection, but it must be done responsibly. This subject teaches both the technical skills and ethical considerations needed for effective web scraping.*
