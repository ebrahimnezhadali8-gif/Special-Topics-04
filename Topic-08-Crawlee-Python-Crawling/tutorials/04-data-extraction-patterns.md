# Tutorial 04: Data Extraction Patterns and Strategies

## Overview
This tutorial covers various data extraction patterns and strategies for web scraping. You'll learn different approaches to extract structured data from HTML, handle dynamic content, and implement robust extraction pipelines that work across different website structures.

## HTML Structure Analysis

### Understanding Page Structures

```python
from bs4 import BeautifulSoup
import requests
from typing import Dict, List, Any
import re

class PageStructureAnalyzer:
    """Analyze HTML page structure for data extraction"""

    def __init__(self):
        self.common_selectors = {
            'articles': [
                'article', '.article', '.post', '.entry',
                '[class*="article"]', '[class*="post"]', '[class*="entry"]'
            ],
            'titles': [
                'h1', '.title', '.headline', '.post-title',
                '[class*="title"]', '[class*="headline"]'
            ],
            'content': [
                '.content', '.post-content', '.entry-content', '.article-content',
                '[class*="content"]', '[class*="text"]', '[class*="body"]'
            ],
            'dates': [
                'time', '.date', '.published', '.timestamp',
                '[datetime]', '[class*="date"]', '[class*="time"]'
            ],
            'authors': [
                '.author', '.byline', '.writer', '.publisher',
                '[class*="author"]', '[rel="author"]'
            ]
        }

    def analyze_structure(self, html_content: str) -> Dict[str, Any]:
        """Analyze page structure and suggest extraction strategies"""
        soup = BeautifulSoup(html_content, 'html.parser')

        analysis = {
            'page_type': self._detect_page_type(soup),
            'structure_score': self._calculate_structure_score(soup),
            'extraction_suggestions': self._suggest_extraction_methods(soup),
            'content_blocks': self._identify_content_blocks(soup),
            'data_patterns': self._detect_data_patterns(soup)
        }

        return analysis

    def _detect_page_type(self, soup: BeautifulSoup) -> str:
        """Detect the type of page (article, list, etc.)"""
        # Check for article indicators
        article_indicators = soup.select('article, .article, .post, .entry')
        if article_indicators:
            return 'article'

        # Check for list/table indicators
        list_indicators = soup.select('ul, ol, table, .list, .grid, .items')
        if list_indicators:
            return 'list'

        # Check for search results
        search_indicators = soup.select('.search-result, .result, .item')
        if search_indicators:
            return 'search_results'

        return 'unknown'

    def _calculate_structure_score(self, soup: BeautifulSoup) -> float:
        """Calculate how well-structured the page is for extraction"""
        score = 0.0

        # Check for semantic HTML
        semantic_tags = ['article', 'section', 'header', 'footer', 'nav', 'aside']
        for tag in semantic_tags:
            if soup.find(tag):
                score += 0.1

        # Check for structured data (JSON-LD, microdata)
        if soup.find(attrs={'type': 'application/ld+json'}):
            score += 0.3
        if soup.find(attrs={'itemtype': True}):
            score += 0.2

        # Check for consistent class naming
        classes = [cls for element in soup.find_all(class_=True) for cls in element.get('class')]
        unique_classes = set(classes)
        if len(unique_classes) > len(classes) * 0.5:  # Reasonable class reuse
            score += 0.2

        return min(score, 1.0)

    def _suggest_extraction_methods(self, soup: BeautifulSoup) -> List[str]:
        """Suggest appropriate extraction methods"""
        suggestions = []

        # Check for structured data
        if soup.find(attrs={'type': 'application/ld+json'}):
            suggestions.append('json_ld_extraction')

        # Check for microdata
        if soup.find(attrs={'itemtype': True}):
            suggestions.append('microdata_extraction')

        # Check for CSS selectors
        if soup.find(class_=True):
            suggestions.append('css_selector_extraction')

        # Check for XPath patterns
        suggestions.append('xpath_extraction')

        # Fallback methods
        suggestions.extend(['regex_extraction', 'text_analysis'])

        return suggestions

    def _identify_content_blocks(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Identify main content blocks on the page"""
        blocks = []

        # Find potential content containers
        selectors = [
            'main', 'article', '.content', '.main-content',
            '.post-content', '.article-content', '#content', '#main'
        ]

        for selector in selectors:
            elements = soup.select(selector)
            for element in elements:
                text_length = len(element.get_text(strip=True))
                if text_length > 100:  # Minimum content length
                    blocks.append({
                        'selector': selector,
                        'tag': element.name,
                        'text_length': text_length,
                        'classes': element.get('class', []),
                        'id': element.get('id')
                    })

        # Sort by text length (largest first)
        blocks.sort(key=lambda x: x['text_length'], reverse=True)

        return blocks[:5]  # Return top 5 blocks

    def _detect_data_patterns(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Detect patterns in the data structure"""
        patterns = {}

        # Count different element types
        element_counts = {}
        for element in soup.find_all():
            tag_name = element.name
            element_counts[tag_name] = element_counts.get(tag_name, 0) + 1

        patterns['element_distribution'] = element_counts

        # Detect table structures
        tables = soup.find_all('table')
        if tables:
            patterns['tables'] = len(tables)
            patterns['table_structures'] = [
                {'rows': len(table.find_all('tr')), 'cols': len(table.find_all('td'))}
                for table in tables[:3]  # Check first 3 tables
            ]

        # Detect list structures
        lists = soup.find_all(['ul', 'ol'])
        if lists:
            patterns['lists'] = len(lists)
            patterns['list_items'] = sum(len(lst.find_all('li')) for lst in lists)

        return patterns
```

## Structured Data Extraction

### JSON-LD and Microdata Extraction

```python
import json
from bs4 import BeautifulSoup
from typing import Dict, List, Any, Optional

class StructuredDataExtractor:
    """Extract structured data from web pages"""

    def __init__(self):
        self.supported_types = {
            'Article': self._extract_article_data,
            'NewsArticle': self._extract_article_data,
            'BlogPosting': self._extract_article_data,
            'Product': self._extract_product_data,
            'Organization': self._extract_organization_data,
            'Person': self._extract_person_data
        }

    def extract_all_structured_data(self, html_content: str) -> List[Dict[str, Any]]:
        """Extract all structured data from the page"""
        soup = BeautifulSoup(html_content, 'html.parser')
        structured_data = []

        # Extract JSON-LD data
        json_ld_data = self._extract_json_ld(soup)
        structured_data.extend(json_ld_data)

        # Extract microdata
        microdata = self._extract_microdata(soup)
        structured_data.extend(microdata)

        return structured_data

    def _extract_json_ld(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract JSON-LD structured data"""
        json_ld_scripts = soup.find_all('script', type='application/ld+json')

        structured_data = []
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    structured_data.extend(data)
                else:
                    structured_data.append(data)
            except (json.JSONDecodeError, TypeError):
                continue

        return structured_data

    def _extract_microdata(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract microdata from HTML"""
        # Find elements with itemscope
        items = soup.find_all(attrs={'itemscope': True})

        microdata_items = []
        for item in items:
            item_data = self._parse_microdata_item(item)
            if item_data:
                microdata_items.append(item_data)

        return microdata_items

    def _parse_microdata_item(self, element) -> Optional[Dict[str, Any]]:
        """Parse a single microdata item"""
        item_type = element.get('itemtype')
        if not item_type:
            return None

        item_data = {'@type': item_type}

        # Find all properties
        properties = element.find_all(attrs={'itemprop': True})
        for prop in properties:
            prop_name = prop.get('itemprop')
            prop_value = self._extract_property_value(prop)
            item_data[prop_name] = prop_value

        return item_data

    def _extract_property_value(self, element) -> Any:
        """Extract value from a microdata property"""
        # Check for item value
        if element.get('itemtype'):
            return self._parse_microdata_item(element)

        # Check for content attribute
        if element.get('content'):
            return element['content']

        # Check for datetime
        if element.get('datetime'):
            return element['datetime']

        # Check for href
        if element.name == 'a' and element.get('href'):
            return element['href']

        # Check for src
        if element.get('src'):
            return element['src']

        # Default to text content
        return element.get_text(strip=True)

    def extract_specific_type(self, html_content: str, data_type: str) -> List[Dict[str, Any]]:
        """Extract specific type of structured data"""
        all_data = self.extract_all_structured_data(html_content)

        filtered_data = []
        for item in all_data:
            item_type = item.get('@type', item.get('type', ''))
            if data_type in item_type:
                filtered_data.append(item)

        return filtered_data

    def _extract_article_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract article-specific data"""
        article = {
            'title': data.get('headline', data.get('name')),
            'content': data.get('articleBody', data.get('text')),
            'author': self._extract_author(data.get('author')),
            'published_at': data.get('datePublished', data.get('dateCreated')),
            'modified_at': data.get('dateModified'),
            'url': data.get('url'),
            'description': data.get('description'),
            'publisher': self._extract_publisher(data.get('publisher'))
        }

        # Clean up None values
        return {k: v for k, v in article.items() if v is not None}

    def _extract_author(self, author_data: Any) -> Optional[str]:
        """Extract author information"""
        if isinstance(author_data, str):
            return author_data
        elif isinstance(author_data, dict):
            return author_data.get('name')
        elif isinstance(author_data, list) and author_data:
            return self._extract_author(author_data[0])
        return None

    def _extract_publisher(self, publisher_data: Any) -> Optional[str]:
        """Extract publisher information"""
        if isinstance(publisher_data, str):
            return publisher_data
        elif isinstance(publisher_data, dict):
            return publisher_data.get('name')
        return None

    def _extract_product_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract product-specific data"""
        product = {
            'name': data.get('name'),
            'description': data.get('description'),
            'price': data.get('offers', {}).get('price'),
            'currency': data.get('offers', {}).get('priceCurrency'),
            'availability': data.get('offers', {}).get('availability'),
            'brand': data.get('brand', {}).get('name') if isinstance(data.get('brand'), dict) else data.get('brand'),
            'sku': data.get('sku'),
            'url': data.get('url')
        }

        return {k: v for k, v in product.items() if v is not None}

    def _extract_organization_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract organization-specific data"""
        org = {
            'name': data.get('name'),
            'description': data.get('description'),
            'url': data.get('url'),
            'email': data.get('email'),
            'telephone': data.get('telephone'),
            'address': data.get('address', {}).get('streetAddress') if isinstance(data.get('address'), dict) else None,
            'logo': data.get('logo')
        }

        return {k: v for k, v in org.items() if v is not None}

    def _extract_person_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract person-specific data"""
        person = {
            'name': data.get('name'),
            'email': data.get('email'),
            'telephone': data.get('telephone'),
            'job_title': data.get('jobTitle'),
            'organization': data.get('worksFor', {}).get('name') if isinstance(data.get('worksFor'), dict) else data.get('worksFor'),
            'url': data.get('url')
        }

        return {k: v for k, v in person.items() if v is not None}
```

## Dynamic Content Handling

### JavaScript-Heavy Website Extraction

```python
from crawlee import PlaywrightCrawler
from typing import Dict, Any, List
import asyncio

class DynamicContentExtractor:
    """Extract data from JavaScript-heavy websites"""

    def __init__(self):
        self.crawler = PlaywrightCrawler(
            max_concurrency=2,
            browser_type='chromium',
            headless=True
        )

    async def extract_dynamic_content(self, urls: List[str]) -> List[Dict[str, Any]]:
        """Extract content from dynamic websites"""
        results = []

        @self.crawler.router.default_handler
        async def dynamic_handler(context):
            page = context.page

            # Wait for dynamic content to load
            await self._wait_for_content(page)

            # Extract data using JavaScript
            data = await self._extract_with_javascript(page)

            # Also extract static content as fallback
            static_data = self._extract_static_fallback(context.soup)

            # Merge results
            merged_data = {**static_data, **data}
            merged_data['url'] = context.request.url
            merged_data['extraction_method'] = 'dynamic'

            results.append(merged_data)

        await self.crawler.run(urls)
        return results

    async def _wait_for_content(self, page):
        """Wait for dynamic content to load"""
        # Common waiting strategies
        wait_strategies = [
            page.wait_for_selector('.content-loaded'),
            page.wait_for_selector('[data-loaded="true"]'),
            page.wait_for_timeout(3000),  # Fallback timeout
        ]

        for strategy in wait_strategies:
            try:
                await strategy
                break
            except:
                continue

    async def _extract_with_javascript(self, page) -> Dict[str, Any]:
        """Extract data using JavaScript execution"""
        try:
            # Execute JavaScript to extract data
            result = await page.evaluate("""
                () => {
                    // Extract data from JavaScript variables
                    const data = {};

                    // Check for common data patterns
                    if (window.articleData) {
                        data.article = window.articleData;
                    }

                    if (window.productData) {
                        data.product = window.productData;
                    }

                    // Extract from DOM with JavaScript
                    const title = document.querySelector('h1')?.textContent?.trim();
                    const content = document.querySelector('.content')?.textContent?.trim();
                    const price = document.querySelector('.price')?.textContent?.trim();

                    return {
                        title: title,
                        content: content,
                        price: price,
                        ...data
                    };
                }
            """)

            return result

        except Exception as e:
            print(f"JavaScript extraction failed: {e}")
            return {}

    def _extract_static_fallback(self, soup) -> Dict[str, Any]:
        """Fallback extraction using static HTML"""
        from bs4 import BeautifulSoup

        data = {}

        # Extract basic information
        title = soup.find('title')
        if title:
            data['static_title'] = title.text.strip()

        content = soup.find(class_='content') or soup.find(id='content')
        if content:
            data['static_content'] = content.get_text(strip=True)

        return data
```

## Pattern-Based Extraction

### CSS Selector and XPath Patterns

```python
from parsel import Selector
from typing import List, Dict, Any, Optional

class PatternBasedExtractor:
    """Extract data using predefined patterns"""

    def __init__(self):
        self.article_patterns = {
            'news_article': {
                'title': ['h1', '.headline', '.article-title', '[class*="title"]'],
                'content': ['.article-content', '.post-content', '.entry-content', '[class*="content"]'],
                'author': ['.author', '.byline', '[rel="author"]', '[class*="author"]'],
                'date': ['time', '.date', '.published', '[datetime]', '[class*="date"]'],
                'tags': ['.tags a', '.categories a', '.post-tags a']
            },
            'blog_post': {
                'title': ['h1.entry-title', '.post-title', '.blog-title'],
                'content': ['.entry-content', '.post-content', '.blog-content'],
                'author': ['.author-name', '.post-author', '.byline'],
                'date': ['.entry-date', '.post-date', '.published'],
                'categories': ['.post-categories a', '.entry-categories a']
            },
            'product': {
                'name': ['h1.product-title', '.product-name', '.item-title'],
                'price': ['.price', '.product-price', '.item-price'],
                'description': ['.product-description', '.item-description'],
                'image': ['.product-image img', '.item-image img'],
                'rating': ['.rating', '.stars', '.product-rating']
            }
        }

    def extract_with_patterns(self, html_content: str, pattern_type: str = 'news_article') -> Dict[str, Any]:
        """Extract data using predefined patterns"""
        selector = Selector(text=html_content)
        patterns = self.article_patterns.get(pattern_type, {})

        extracted_data = {}

        for field, css_selectors in patterns.items():
            value = self._extract_with_selectors(selector, css_selectors, field)
            if value:
                extracted_data[field] = value

        return extracted_data

    def _extract_with_selectors(self, selector: Selector, css_selectors: List[str], field: str) -> Any:
        """Extract data using multiple CSS selectors"""
        for css_selector in css_selectors:
            try:
                if field == 'tags' or field == 'categories':
                    # Extract multiple values
                    elements = selector.css(css_selector)
                    values = [elem.css('::text').get() for elem in elements]
                    values = [v.strip() for v in values if v and v.strip()]
                    if values:
                        return list(set(values))  # Remove duplicates

                elif field == 'image':
                    # Extract image URL
                    element = selector.css(css_selector).first
                    if element:
                        return element.attrib.get('src') or element.attrib.get('data-src')

                elif field == 'rating':
                    # Extract numeric rating
                    element = selector.css(css_selector).first
                    if element:
                        text = element.css('::text').get()
                        if text:
                            # Extract number from text
                            import re
                            numbers = re.findall(r'\d+\.?\d*', text)
                            if numbers:
                                return float(numbers[0])

                else:
                    # Extract single text value
                    element = selector.css(css_selector).first
                    if element:
                        text = element.css('::text').get()
                        if text:
                            return text.strip()

            except Exception:
                continue

        return None

    def learn_patterns_from_examples(self, examples: List[Dict[str, Any]]) -> Dict[str, str]:
        """Learn CSS patterns from examples (simplified)"""
        # This is a simplified pattern learning implementation
        # In production, you'd use more sophisticated methods

        patterns = {}

        # Analyze common selectors across examples
        for field in ['title', 'content', 'author', 'date']:
            selectors = []
            for example in examples:
                if field in example and 'selector' in example[field]:
                    selectors.append(example[field]['selector'])

            if selectors:
                # Find most common selector
                from collections import Counter
                most_common = Counter(selectors).most_common(1)[0][0]
                patterns[field] = most_common

        return patterns
```

## Robust Extraction Pipeline

### Multi-Strategy Extraction

```python
from typing import Dict, Any, List, Callable
import logging

logger = logging.getLogger(__name__)

class RobustExtractor:
    """Extract data using multiple strategies for reliability"""

    def __init__(self):
        self.strategies = [
            self._structured_data_strategy,
            self._pattern_based_strategy,
            self._heuristic_strategy,
            self._fallback_strategy
        ]

        self.quality_checks = [
            self._check_completeness,
            self._check_consistency,
            self._check_plausibility
        ]

    def extract_comprehensive(self, html_content: str, url: str) -> Dict[str, Any]:
        """Extract data using multiple strategies"""
        extraction_results = {}

        # Try each strategy
        for strategy in self.strategies:
            try:
                result = strategy(html_content, url)
                if result:
                    # Validate result
                    quality_score = self._calculate_quality_score(result)

                    extraction_results[strategy.__name__] = {
                        'data': result,
                        'quality_score': quality_score,
                        'strategy': strategy.__name__
                    }

            except Exception as e:
                logger.warning(f"Strategy {strategy.__name__} failed: {e}")
                continue

        # Choose best result
        if extraction_results:
            best_result = max(extraction_results.values(),
                            key=lambda x: x['quality_score'])

            final_result = best_result['data'].copy()
            final_result['extraction_metadata'] = {
                'strategy_used': best_result['strategy'],
                'quality_score': best_result['quality_score'],
                'strategies_tried': len(extraction_results)
            }

            return final_result

        return {'error': 'No extraction strategy succeeded'}

    def _structured_data_strategy(self, html_content: str, url: str) -> Optional[Dict[str, Any]]:
        """Extract using structured data (JSON-LD, microdata)"""
        extractor = StructuredDataExtractor()
        structured_data = extractor.extract_all_structured_data(html_content)

        if structured_data:
            # Return the most complete item
            best_item = max(structured_data,
                          key=lambda x: len([v for v in x.values() if v]))

            # Normalize the data
            return extractor._extract_article_data(best_item)

        return None

    def _pattern_based_strategy(self, html_content: str, url: str) -> Optional[Dict[str, Any]]:
        """Extract using CSS selector patterns"""
        extractor = PatternBasedExtractor()

        # Try different pattern types
        for pattern_type in ['news_article', 'blog_post']:
            result = extractor.extract_with_patterns(html_content, pattern_type)
            if result and len(result) > 2:  # At least 3 fields extracted
                return result

        return None

    def _heuristic_strategy(self, html_content: str, url: str) -> Optional[Dict[str, Any]]:
        """Extract using heuristic approaches"""
        soup = BeautifulSoup(html_content, 'html.parser')

        # Find largest text block (likely main content)
        text_blocks = []
        for element in soup.find_all(['p', 'div', 'article', 'section']):
            text = element.get_text(strip=True)
            if len(text) > 100:  # Minimum length
                text_blocks.append((element, text))

        if text_blocks:
            # Sort by text length
            text_blocks.sort(key=lambda x: len(x[1]), reverse=True)
            main_element, main_text = text_blocks[0]

            # Try to extract title from nearby headers
            title = None
            for heading in ['h1', 'h2', 'title']:
                title_elem = main_element.find_previous(heading)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    break

            return {
                'title': title,
                'content': main_text[:5000],  # Limit content length
                'extraction_method': 'heuristic'
            }

        return None

    def _fallback_strategy(self, html_content: str, url: str) -> Optional[Dict[str, Any]]:
        """Basic fallback extraction"""
        soup = BeautifulSoup(html_content, 'html.parser')

        title = soup.find('title').text.strip() if soup.find('title') else 'No title'

        # Extract all paragraph text
        paragraphs = soup.find_all('p')
        content = ' '.join([p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20])

        return {
            'title': title,
            'content': content[:2000] if content else 'No content found',
            'extraction_method': 'fallback'
        }

    def _calculate_quality_score(self, data: Dict[str, Any]) -> float:
        """Calculate quality score for extracted data"""
        score = 0.0

        # Required fields
        required_fields = ['title', 'content']
        for field in required_fields:
            if field in data and data[field]:
                score += 0.3

        # Bonus fields
        bonus_fields = ['author', 'date', 'tags', 'description']
        for field in bonus_fields:
            if field in data and data[field]:
                score += 0.1

        # Content quality
        if 'content' in data:
            content = str(data['content'])
            if len(content) > 500:
                score += 0.2
            if len(content) > 1000:
                score += 0.1

        return min(score, 1.0)
```

## Hands-on Exercises

### Exercise 1: Structured Data Extraction
1. Extract JSON-LD data from news websites
2. Parse microdata from product pages
3. Handle different structured data formats
4. Validate extracted data completeness

### Exercise 2: Pattern-Based Extraction
1. Create CSS selector patterns for different content types
2. Implement XPath extraction for complex structures
3. Build pattern learning from examples
4. Test pattern robustness across websites

### Exercise 3: Multi-Strategy Pipeline
1. Implement fallback extraction strategies
2. Create quality scoring for extracted data
3. Build confidence-based result selection
4. Test pipeline reliability with various websites

## Next Steps
- [Storage Options Tutorial](../tutorials/05-storage-options.md)
- [Workshop: Basic Crawler](../workshops/workshop-01-basic-crawler.md)

## Additional Resources
- [CSS Selectors Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [XPath Tutorial](https://www.w3schools.com/xml/xpath_intro.asp)
- [BeautifulSoup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool)
