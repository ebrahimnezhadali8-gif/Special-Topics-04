# Tutorial 02: Respectful Crawling with Robots.txt and Rate Limiting

## Overview
This tutorial covers ethical and respectful web crawling practices, focusing on robots.txt compliance, rate limiting, and responsible crawling behavior. You'll learn how to build crawlers that respect website owners' preferences and avoid being blocked or banned.

## Understanding Robots.txt

### What is Robots.txt?

Robots.txt is a standard used by websites to communicate with web crawlers and other web robots. It's a text file placed in the root directory of a website that specifies which parts of the website crawlers are allowed to access.

**Example robots.txt file:**
```
User-agent: *
Disallow: /private/
Disallow: /admin/
Disallow: /api/
Allow: /public/

User-agent: Googlebot
Allow: /

User-agent: BadBot
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

### Robots.txt Structure

- **User-agent**: Specifies which crawler the rules apply to
- **Disallow**: Paths that should not be crawled
- **Allow**: Exceptions to Disallow rules
- **Crawl-delay**: Suggested delay between requests (not all crawlers respect this)
- **Sitemap**: Location of the website's sitemap

### Reading and Parsing Robots.txt

```python
import urllib.robotparser
from urllib.parse import urlparse, urljoin
import requests
import time

class RobotsParser:
    """Parse and check robots.txt compliance"""

    def __init__(self):
        self.parsers = {}  # Cache parsers by domain

    def can_fetch(self, user_agent: str, url: str) -> bool:
        """Check if URL can be fetched according to robots.txt"""
        domain = self._get_domain(url)

        # Get or create parser for this domain
        if domain not in self.parsers:
            self.parsers[domain] = self._create_parser(domain)

        parser = self.parsers[domain]
        return parser.can_fetch(user_agent, url)

    def get_crawl_delay(self, user_agent: str, url: str) -> float:
        """Get suggested crawl delay for the domain"""
        domain = self._get_domain(url)

        if domain not in self.parsers:
            self.parsers[domain] = self._create_parser(domain)

        # Note: urllib.robotparser doesn't support Crawl-delay
        # This is a simplified implementation
        return 1.0  # Default 1 second delay

    def _create_parser(self, domain: str) -> urllib.robotparser.RobotFileParser:
        """Create and populate a robots.txt parser for a domain"""
        parser = urllib.robotparser.RobotFileParser()
        robots_url = f"https://{domain}/robots.txt"

        try:
            parser.set_url(robots_url)
            parser.read()
        except Exception as e:
            # If robots.txt can't be read, assume everything is allowed
            print(f"Could not read robots.txt for {domain}: {e}")
            parser = self._create_default_parser()

        return parser

    def _create_default_parser(self) -> urllib.robotparser.RobotFileParser:
        """Create a default parser that allows everything"""
        parser = urllib.robotparser.RobotFileParser()
        # Default parser allows everything
        return parser

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        parsed = urlparse(url)
        return parsed.netloc

# Usage
robots = RobotsParser()

if robots.can_fetch('MyCrawler/1.0', 'https://example.com/page'):
    print("Can crawl this page")
else:
    print("Blocked by robots.txt")
```

### Advanced Robots.txt Handling

```python
import re
from typing import Dict, List, Optional

class AdvancedRobotsParser:
    """Advanced robots.txt parser with more features"""

    def __init__(self):
        self.robots_cache: Dict[str, Dict] = {}

    def can_fetch(self, user_agent: str, url: str) -> bool:
        """Check if URL can be fetched"""
        rules = self._get_robots_rules(url)

        # Check specific user agent rules first
        if user_agent in rules:
            user_rules = rules[user_agent]
        elif '*' in rules:
            user_rules = rules['*']
        else:
            return True  # No rules found, assume allowed

        path = urlparse(url).path

        # Check disallow rules
        for disallow in user_rules.get('disallow', []):
            if self._path_matches(disallow, path):
                # Check if there's an allow rule that overrides
                allowed = False
                for allow in user_rules.get('allow', []):
                    if self._path_matches(allow, path):
                        allowed = True
                        break
                if not allowed:
                    return False

        return True

    def get_crawl_delay(self, user_agent: str, url: str) -> float:
        """Get crawl delay for user agent"""
        rules = self._get_robots_rules(url)

        # Check specific user agent
        if user_agent in rules and 'crawl_delay' in rules[user_agent]:
            return rules[user_agent]['crawl_delay']

        # Check wildcard
        if '*' in rules and 'crawl_delay' in rules['*']:
            return rules['*']['crawl_delay']

        return 1.0  # Default delay

    def get_sitemaps(self, url: str) -> List[str]:
        """Get sitemap URLs from robots.txt"""
        rules = self._get_robots_rules(url)
        return rules.get('sitemaps', [])

    def _get_robots_rules(self, url: str) -> Dict:
        """Get parsed robots.txt rules for domain"""
        domain = self._get_domain(url)

        if domain in self.robots_cache:
            return self.robots_cache[domain]

        rules = self._parse_robots_txt(domain)
        self.robots_cache[domain] = rules
        return rules

    def _parse_robots_txt(self, domain: str) -> Dict:
        """Parse robots.txt content"""
        robots_url = f"https://{domain}/robots.txt"

        try:
            response = requests.get(robots_url, timeout=10)
            content = response.text
        except:
            return self._create_default_rules()

        return self._parse_robots_content(content)

    def _parse_robots_content(self, content: str) -> Dict:
        """Parse robots.txt content into structured rules"""
        rules = {}
        current_agent = None

        for line in content.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue

            if line.lower().startswith('user-agent:'):
                current_agent = line.split(':', 1)[1].strip()
                if current_agent not in rules:
                    rules[current_agent] = {'disallow': [], 'allow': []}
            elif line.lower().startswith('disallow:') and current_agent:
                path = line.split(':', 1)[1].strip()
                rules[current_agent]['disallow'].append(path)
            elif line.lower().startswith('allow:') and current_agent:
                path = line.split(':', 1)[1].strip()
                rules[current_agent]['allow'].append(path)
            elif line.lower().startswith('crawl-delay:') and current_agent:
                try:
                    delay = float(line.split(':', 1)[1].strip())
                    rules[current_agent]['crawl_delay'] = delay
                except:
                    pass
            elif line.lower().startswith('sitemap:'):
                if 'sitemaps' not in rules:
                    rules['sitemaps'] = []
                sitemap_url = line.split(':', 1)[1].strip()
                rules['sitemaps'].append(sitemap_url)

        return rules

    def _create_default_rules(self) -> Dict:
        """Create default rules when robots.txt can't be read"""
        return {'*': {'disallow': [], 'allow': []}}

    def _path_matches(self, pattern: str, path: str) -> bool:
        """Check if path matches robots.txt pattern"""
        if not pattern:
            return False

        # Convert robots.txt wildcards to regex
        regex_pattern = re.escape(pattern)
        regex_pattern = regex_pattern.replace(r'\*', '.*')

        # Add end anchor if pattern doesn't end with /
        if not pattern.endswith('/') and not pattern.endswith('*'):
            regex_pattern += r'(?:/.*)?$'
        else:
            regex_pattern += r'.*'

        return bool(re.match(regex_pattern, path))

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        parsed = urlparse(url)
        return parsed.netloc
```

## Rate Limiting and Politeness

### Basic Rate Limiting

```python
import time
import asyncio
from collections import defaultdict
from typing import Dict

class RateLimiter:
    """Simple rate limiter for respectful crawling"""

    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_minute / 60.0
        self.domain_requests: Dict[str, list] = defaultdict(list)
        self.lock = asyncio.Lock()

    async def wait_if_needed(self, url: str):
        """Wait if necessary to respect rate limits"""
        async with self.lock:
            domain = self._get_domain(url)
            now = time.time()

            # Clean old requests (older than 1 minute)
            self.domain_requests[domain] = [
                req_time for req_time in self.domain_requests[domain]
                if now - req_time < 60
            ]

            # Check if we can make another request
            if len(self.domain_requests[domain]) >= self.requests_per_minute:
                # Wait until we can make another request
                oldest_request = min(self.domain_requests[domain])
                wait_time = 60 - (now - oldest_request)
                if wait_time > 0:
                    await asyncio.sleep(wait_time)

            # Record this request
            self.domain_requests[domain].append(now)

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        return urlparse(url).netloc

# Usage with Crawlee
from crawlee import BeautifulSoupCrawler

async def main():
    rate_limiter = RateLimiter(requests_per_minute=20)
    crawler = BeautifulSoupCrawler(max_concurrency=2)

    @crawler.pre_navigation_hooks.append
    async def rate_limit(context):
        await rate_limiter.wait_if_needed(context.request.url)

    @crawler.router.default_handler
    async def request_handler(context):
        # Process page
        pass

    await crawler.run(['https://example.com'])
```

### Advanced Rate Limiting with Domain-Specific Rules

```python
from typing import Dict, Optional
import asyncio
import time

class AdvancedRateLimiter:
    """Advanced rate limiter with domain-specific rules"""

    def __init__(self):
        # Default rules
        self.default_rules = {
            'requests_per_minute': 30,
            'burst_limit': 5,
            'cooldown_period': 60
        }

        # Domain-specific rules
        self.domain_rules = {
            'example.com': {'requests_per_minute': 10},
            'news-site.com': {'requests_per_minute': 5},
            'api.example.com': {'requests_per_minute': 60},
        }

        # Request tracking
        self.domain_requests: Dict[str, list] = defaultdict(list)
        self.domain_burst_count: Dict[str, int] = defaultdict(int)
        self.domain_last_request: Dict[str, float] = {}

    async def wait_if_needed(self, url: str):
        """Wait if necessary to respect rate limits"""
        domain = self._get_domain(url)
        rules = self.domain_rules.get(domain, self.default_rules)
        now = time.time()

        # Check burst limit
        if self.domain_burst_count[domain] >= rules['burst_limit']:
            # Check if cooldown period has passed
            last_request = self.domain_last_request.get(domain, 0)
            if now - last_request < rules['cooldown_period']:
                wait_time = rules['cooldown_period'] - (now - last_request)
                await asyncio.sleep(wait_time)
                self.domain_burst_count[domain] = 0

        # Clean old requests
        self.domain_requests[domain] = [
            req_time for req_time in self.domain_requests[domain]
            if now - req_time < 60
        ]

        # Check rate limit
        if len(self.domain_requests[domain]) >= rules['requests_per_minute']:
            # Calculate wait time
            oldest_request = min(self.domain_requests[domain])
            wait_time = 60 - (now - oldest_request)

            if wait_time > 0:
                await asyncio.sleep(wait_time)

        # Record request
        self.domain_requests[domain].append(now)
        self.domain_burst_count[domain] += 1
        self.domain_last_request[domain] = now

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        return urlparse(url).netloc

    def add_domain_rule(self, domain: str, requests_per_minute: int,
                       burst_limit: Optional[int] = None):
        """Add custom rules for a domain"""
        rules = {'requests_per_minute': requests_per_minute}
        if burst_limit:
            rules['burst_limit'] = burst_limit
        self.domain_rules[domain] = rules

    def get_domain_stats(self, domain: str) -> Dict:
        """Get statistics for a domain"""
        now = time.time()
        recent_requests = [
            req_time for req_time in self.domain_requests[domain]
            if now - req_time < 60
        ]

        return {
            'requests_last_minute': len(recent_requests),
            'burst_count': self.domain_burst_count[domain],
            'last_request': self.domain_last_request.get(domain)
        }
```

### Distributed Rate Limiting with Redis

```python
import redis
import time
import asyncio

class RedisRateLimiter:
    """Distributed rate limiter using Redis"""

    def __init__(self, redis_client: redis.Redis, requests_per_minute: int = 30):
        self.redis = redis_client
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60

    async def wait_if_needed(self, url: str):
        """Wait if necessary to respect rate limits"""
        domain = self._get_domain(url)
        key = f"ratelimit:{domain}"

        while True:
            # Get current request count
            current_count = self.redis.get(key) or 0
            current_count = int(current_count)

            if current_count < self.requests_per_minute:
                # Increment and set expiry
                pipe = self.redis.pipeline()
                pipe.incr(key)
                pipe.expire(key, self.window_seconds)
                pipe.execute()
                break
            else:
                # Wait for next window
                ttl = self.redis.ttl(key)
                if ttl > 0:
                    await asyncio.sleep(ttl)
                else:
                    # Reset if TTL is expired
                    self.redis.delete(key)

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        return urlparse(url).netloc
```

## Respectful Crawling Implementation

### Complete Respectful Crawler

```python
from crawlee import BeautifulSoupCrawler, Request
from typing import List, Dict, Any
import asyncio
import logging

logger = logging.getLogger(__name__)

class RespectfulCrawler:
    """Crawler that respects robots.txt and implements rate limiting"""

    def __init__(self, user_agent: str = "RespectfulCrawler/1.0"):
        self.user_agent = user_agent
        self.robots_parser = AdvancedRobotsParser()
        self.rate_limiter = AdvancedRateLimiter()

        # Configure crawler with respectful settings
        self.crawler = BeautifulSoupCrawler(
            max_concurrency=2,  # Low concurrency
            max_request_retries=2,
            request_timeout=30
        )

        self._setup_hooks()

    def _setup_hooks(self):
        """Setup pre-navigation hooks for respectful crawling"""

        @self.crawler.pre_navigation_hooks.append
        async def check_robots_txt(context):
            """Check robots.txt before making request"""
            url = context.request.url

            if not self.robots_parser.can_fetch(self.user_agent, url):
                logger.warning(f"Blocked by robots.txt: {url}")
                # Skip this request
                context.request.skip = True
                return

            logger.info(f"Allowed by robots.txt: {url}")

        @self.crawler.pre_navigation_hooks.append
        async def apply_rate_limiting(context):
            """Apply rate limiting"""
            await self.rate_limiter.wait_if_needed(context.request.url)

        @self.crawler.pre_navigation_hooks.append
        async def set_headers(context):
            """Set respectful headers"""
            context.request.headers.update({
                'User-Agent': self.user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',  # Do Not Track
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            })

    async def crawl_website(self, start_urls: List[str], max_pages: int = 50) -> List[Dict[str, Any]]:
        """Crawl website respectfully"""

        results = []

        @self.crawler.router.default_handler
        async def request_handler(context):
            try:
                soup = context.soup

                # Extract basic information
                title = soup.find('title').text.strip() if soup.find('title') else ''
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                description = meta_desc.get('content', '') if meta_desc else ''

                # Get page metadata
                page_data = {
                    'url': context.request.url,
                    'title': title,
                    'description': description,
                    'status_code': context.http_response.status_code,
                    'response_time': context.request.loaded_at.timestamp() - context.request.created_at.timestamp(),
                    'crawled_at': context.request.loaded_at.isoformat()
                }

                results.append(page_data)
                logger.info(f"Crawled: {context.request.url} - {title[:50]}...")

            except Exception as e:
                logger.error(f"Error processing {context.request.url}: {e}")

        # Create initial requests
        requests = [Request.from_url(url) for url in start_urls]

        # Run crawler with limit
        await self.crawler.run(requests[:max_pages])

        return results

    def get_crawler_stats(self) -> Dict[str, Any]:
        """Get crawler statistics"""
        return {
            'user_agent': self.user_agent,
            'robots_parser_cache_size': len(self.robots_parser.robots_cache),
            'rate_limiter_domains': list(self.rate_limiter.domain_rules.keys()),
            'crawler_stats': {
                'requests_finished': self.crawler.statistics.requests_finished,
                'requests_failed': self.crawler.statistics.requests_failed,
                'bytes_received': self.crawler.statistics.bytes_received
            }
        }
```

### Sitemap-Aware Crawling

```python
import xml.etree.ElementTree as ET
from typing import List, Optional
import gzip
import requests

class SitemapCrawler:
    """Crawler that uses sitemaps for respectful crawling"""

    def __init__(self, robots_parser: AdvancedRobotsParser):
        self.robots_parser = robots_parser

    def get_sitemap_urls(self, domain: str) -> List[str]:
        """Get all URLs from sitemap"""
        sitemap_urls = self.robots_parser.get_sitemaps(f"https://{domain}")

        all_urls = []

        for sitemap_url in sitemap_urls:
            urls = self._parse_sitemap(sitemap_url)
            all_urls.extend(urls)

        return all_urls

    def _parse_sitemap(self, sitemap_url: str) -> List[str]:
        """Parse sitemap XML and extract URLs"""
        try:
            response = requests.get(sitemap_url, timeout=30)
            response.raise_for_status()

            # Handle gzip compression
            if response.headers.get('content-encoding') == 'gzip':
                content = gzip.decompress(response.content)
            else:
                content = response.content

            # Parse XML
            root = ET.fromstring(content)

            urls = []
            # Handle standard sitemap format
            for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'):
                loc_elem = url_elem.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if loc_elem is not None and loc_elem.text:
                    urls.append(loc_elem.text)

            # Handle sitemap index
            for sitemap_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap'):
                loc_elem = sitemap_elem.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                if loc_elem is not None and loc_elem.text:
                    # Recursively parse sitemap
                    urls.extend(self._parse_sitemap(loc_elem.text))

            return urls

        except Exception as e:
            print(f"Error parsing sitemap {sitemap_url}: {e}")
            return []
```

## Crawler Detection and Evasion

### Basic Detection Avoidance

```python
class StealthCrawler:
    """Crawler that attempts to avoid detection"""

    def __init__(self):
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ]

        self.current_ua_index = 0

    def get_next_user_agent(self) -> str:
        """Rotate user agents"""
        ua = self.user_agents[self.current_ua_index]
        self.current_ua_index = (self.current_ua_index + 1) % len(self.user_agents)
        return ua

    def get_random_delay(self, base_delay: float = 1.0) -> float:
        """Get random delay to appear more human-like"""
        import random
        return base_delay + random.uniform(0.5, 2.0)

    def should_add_human_like_behavior(self) -> bool:
        """Randomly decide to add human-like behavior"""
        import random
        return random.random() < 0.1  # 10% chance
```

### Important Note on Detection Avoidance

⚠️ **Important**: While some detection avoidance techniques exist, attempting to bypass anti-bot measures may violate website terms of service and can be illegal in some jurisdictions. Always prioritize ethical crawling and respect website owners' preferences through robots.txt and reasonable rate limiting.

## Monitoring and Compliance

### Crawler Compliance Monitoring

```python
class ComplianceMonitor:
    """Monitor crawler compliance with respectful crawling practices"""

    def __init__(self):
        self.stats = {
            'total_requests': 0,
            'blocked_by_robots': 0,
            'rate_limited_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'domains_crawled': set()
        }

    def record_request(self, url: str, allowed: bool, status_code: int):
        """Record a crawler request"""
        self.stats['total_requests'] += 1
        self.stats['domains_crawled'].add(self._get_domain(url))

        if not allowed:
            self.stats['blocked_by_robots'] += 1
        elif status_code == 200:
            self.stats['successful_requests'] += 1
        elif status_code == 429:  # Rate limited
            self.stats['rate_limited_requests'] += 1
        else:
            self.stats['failed_requests'] += 1

    def get_compliance_report(self) -> Dict[str, Any]:
        """Generate compliance report"""
        total = self.stats['total_requests']
        blocked_percentage = (self.stats['blocked_by_robots'] / total * 100) if total > 0 else 0
        rate_limited_percentage = (self.stats['rate_limited_requests'] / total * 100) if total > 0 else 0

        return {
            'summary': {
                'total_requests': total,
                'domains_crawled': len(self.stats['domains_crawled']),
                'blocked_by_robots': self.stats['blocked_by_robots'],
                'rate_limited': self.stats['rate_limited_requests'],
                'successful': self.stats['successful_requests']
            },
            'compliance': {
                'robots_txt_compliance': 100 - blocked_percentage,
                'rate_limiting_compliance': 100 - rate_limited_percentage,
                'overall_compliance': 100 - blocked_percentage - rate_limited_percentage
            }
        }

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        return urlparse(url).netloc
```

## Best Practices

### 1. Always Check Robots.txt First
```python
# Before starting any crawl
if not robots_parser.can_fetch(user_agent, start_url):
    print(f"Crawling not allowed: {start_url}")
    exit(1)
```

### 2. Implement Reasonable Rate Limiting
```python
# Start conservative and adjust based on website response
rate_limiter = AdvancedRateLimiter()
rate_limiter.add_domain_rule('example.com', requests_per_minute=10)
```

### 3. Respect Server Responses
```python
# Handle rate limiting responses
if response.status_code == 429:
    retry_after = int(response.headers.get('Retry-After', 60))
    await asyncio.sleep(retry_after)
```

### 4. Monitor Your Crawler's Impact
```python
# Log and monitor crawler activity
compliance_monitor = ComplianceMonitor()
# Track each request and generate reports
```

### 5. Be Transparent
```python
# Use descriptive user agent
user_agent = "MyResearchCrawler/1.0 (research@example.com)"
```

## Hands-on Exercises

### Exercise 1: Robots.txt Compliance
1. Create a robots.txt parser
2. Test it against real websites
3. Implement robots.txt checking in a crawler
4. Handle different user agent rules

### Exercise 2: Rate Limiting Implementation
1. Build a domain-specific rate limiter
2. Test it with different websites
3. Implement exponential backoff for retries
4. Monitor rate limiting effectiveness

### Exercise 3: Respectful Crawler
1. Combine robots.txt and rate limiting
2. Add proper headers and delays
3. Implement sitemap-aware crawling
4. Monitor compliance and generate reports

## Next Steps
- [Persian Content Extraction Tutorial](../tutorials/03-persian-content-extraction.md)
- [Workshop: Basic Crawler](../workshops/workshop-01-basic-crawler.md)

## Additional Resources
- [Robots.txt Specification](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Web Crawling Ethics](https://blog.apify.com/web-scraping-legality/)
- [Rate Limiting Best Practices](https://tools.ietf.org/html/rfc6585)
- [Google Crawler Guidelines](https://developers.google.com/search/docs/advanced/crawling/overview)
