# Tutorial 03: Persian Content Extraction and Text Processing

## Overview
This tutorial focuses on extracting and processing Persian (Farsi) content from websites. You'll learn about Persian text encoding, right-to-left rendering, character normalization, and specialized techniques for handling Persian websites and content.

## Understanding Persian Text

### Persian Language Characteristics

Persian (Farsi) has unique characteristics that affect web scraping:

- **Right-to-Left (RTL) Writing**: Text flows from right to left
- **Arabic Script**: Uses Arabic characters with additional Persian letters
- **Contextual Shaping**: Characters change shape based on position
- **Special Characters**: Includes Arabic digits, Persian-specific letters
- **Encoding Issues**: Often mixed encodings on Persian websites

**Persian Alphabet:**
```
ا ب پ ت ث ج چ ح خ د ذ ر ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن و ه ی
```

### Character Encoding Issues

```python
# Common encoding problems in Persian websites
encoding_issues = {
    'windows-1256': 'Windows Arabic (common in older Persian sites)',
    'utf-8': 'Modern standard encoding',
    'iso-8859-6': 'ISO Arabic encoding',
    'mixed_encodings': 'Multiple encodings on same page'
}

# Detection and conversion
def detect_encoding(content: bytes) -> str:
    """Detect text encoding"""
    import chardet

    result = chardet.detect(content)
    return result['encoding']

def convert_to_utf8(content: bytes, encoding: str = None) -> str:
    """Convert content to UTF-8"""
    if not encoding:
        encoding = detect_encoding(content)

    try:
        return content.decode(encoding)
    except UnicodeDecodeError:
        # Fallback to latin-1 which can handle any byte sequence
        return content.decode('latin-1')
```

## Persian Text Processing

### Basic Persian Text Handling

```python
import re
from typing import List, Set

class PersianTextProcessor:
    """Process and normalize Persian text"""

    def __init__(self):
        # Persian character ranges
        self.persian_chars = r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]'
        self.arabic_chars = r'[\u0600-\u06FF]'

        # Persian punctuation
        self.persian_punctuations = '،؛؟«»'
        self.all_punctuations = self.persian_punctuations + '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'

        # Persian numbers (Arabic-Indic digits)
        self.persian_digits = '۰۱۲۳۴۵۶۷۸۹'
        self.arabic_digits = '٠١٢٣٤٥٦٧٨٩'

    def is_persian_text(self, text: str) -> bool:
        """Check if text contains significant Persian content"""
        persian_chars = len(re.findall(self.persian_chars, text))
        total_chars = len(re.sub(r'\s+', '', text))

        if total_chars == 0:
            return False

        # Consider text Persian if >30% characters are Persian
        return (persian_chars / total_chars) > 0.3

    def normalize_persian_text(self, text: str) -> str:
        """Normalize Persian text"""
        if not text:
            return ""

        # Convert Arabic digits to Persian digits
        text = self._convert_digits_to_persian(text)

        # Normalize Arabic characters
        text = self._normalize_arabic_characters(text)

        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        # Fix common Persian typography issues
        text = self._fix_persian_typography(text)

        return text

    def _convert_digits_to_persian(self, text: str) -> str:
        """Convert Arabic-Indic and Western digits to Persian digits"""
        # Convert Arabic-Indic to Persian
        for i, arabic_digit in enumerate(self.arabic_digits):
            text = text.replace(arabic_digit, self.persian_digits[i])

        # Convert Western digits to Persian
        western_digits = '0123456789'
        for i, western_digit in enumerate(western_digits):
            text = text.replace(western_digit, self.persian_digits[i])

        return text

    def _normalize_arabic_characters(self, text: str) -> str:
        """Normalize different forms of Arabic characters"""
        # Common normalizations
        normalizations = {
            'ك': 'ک',  # Arabic Kaf to Persian Ke
            'ي': 'ی',  # Arabic Ye to Persian Ye
            'ى': 'ی',  # Alef Maksura to Persian Ye
            'ة': 'ه',  # Ta Marbuta to He
            'أ': 'ا',  # Hamza on Alef to Alef
            'إ': 'ا',  # Hamza under Alef to Alef
            'آ': 'ا',  # Alef with Madda to Alef
        }

        for old_char, new_char in normalizations.items():
            text = text.replace(old_char, new_char)

        return text

    def _fix_persian_typography(self, text: str) -> str:
        """Fix common Persian typography issues"""
        # Add space before Persian punctuation if missing
        for punct in self.persian_punctuations:
            # Add space before punctuation if not preceded by space or start
            text = re.sub(rf'([^{self.all_punctuations}\s]){re.escape(punct)}', rf'\1 {punct}', text)

        # Remove space after Persian punctuation at sentence end
        text = re.sub(r'([' + re.escape(self.persian_punctuations) + r'])\s+', r'\1', text)

        # Fix multiple spaces
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    def extract_persian_words(self, text: str) -> List[str]:
        """Extract Persian words from text"""
        # Find sequences of Persian characters
        persian_words = re.findall(rf'{self.persian_chars}+', text)

        # Filter out very short words (likely noise)
        persian_words = [word for word in persian_words if len(word) >= 2]

        return persian_words

    def get_text_statistics(self, text: str) -> dict:
        """Get statistics about Persian text"""
        persian_chars = len(re.findall(self.persian_chars, text))
        persian_words = len(self.extract_persian_words(text))
        sentences = len(re.findall(r'[.!؟]+', text))

        return {
            'total_characters': len(text),
            'persian_characters': persian_chars,
            'persian_percentage': persian_chars / len(text) if text else 0,
            'persian_words': persian_words,
            'sentences': sentences,
            'average_word_length': persian_words / persian_words if persian_words else 0
        }
```

### Persian-Specific HTML Parsing

```python
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Optional

class PersianHTMLParser:
    """Parse HTML with Persian content handling"""

    def __init__(self):
        self.text_processor = PersianTextProcessor()

    def extract_persian_content(self, html_content: str) -> Dict[str, any]:
        """Extract Persian content from HTML"""
        soup = BeautifulSoup(html_content, 'html.parser')

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        content = {
            'title': self._extract_title(soup),
            'meta_description': self._extract_meta_description(soup),
            'main_content': self._extract_main_content(soup),
            'headings': self._extract_headings(soup),
            'links': self._extract_links(soup),
            'language': self._detect_language(soup),
            'text_statistics': {}
        }

        # Combine all text for statistics
        all_text = ' '.join([
            content['title'] or '',
            content['meta_description'] or '',
            content['main_content'] or '',
            ' '.join(content['headings'])
        ])

        content['text_statistics'] = self.text_processor.get_text_statistics(all_text)

        return content

    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page title with Persian support"""
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text().strip()
            return self.text_processor.normalize_persian_text(title)
        return None

    def _extract_meta_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract meta description"""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return self.text_processor.normalize_persian_text(meta_desc['content'])
        return None

    def _extract_main_content(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract main content from various possible containers"""
        content_selectors = [
            'main',
            '[class*="content"]',
            '[class*="post"]',
            '[class*="article"]',
            '[id*="content"]',
            '[id*="post"]',
            '[id*="article"]',
            'article',
            '.entry-content',
            '.post-content'
        ]

        for selector in content_selectors:
            elements = soup.select(selector)
            if elements:
                # Get the largest content block
                content_texts = []
                for element in elements:
                    text = element.get_text(separator=' ', strip=True)
                    if len(text) > 100:  # Minimum content length
                        content_texts.append(text)

                if content_texts:
                    # Return the longest content
                    main_content = max(content_texts, key=len)
                    return self.text_processor.normalize_persian_text(main_content)

        # Fallback: extract from body
        body = soup.find('body')
        if body:
            text = body.get_text(separator=' ', strip=True)
            return self.text_processor.normalize_persian_text(text)

        return None

    def _extract_headings(self, soup: BeautifulSoup) -> List[str]:
        """Extract headings (h1-h6)"""
        headings = []
        for i in range(1, 7):
            h_tags = soup.find_all(f'h{i}')
            for h_tag in h_tags:
                heading_text = h_tag.get_text().strip()
                if heading_text:
                    headings.append(self.text_processor.normalize_persian_text(heading_text))

        return headings

    def _extract_links(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract links with Persian text"""
        links = []
        for a_tag in soup.find_all('a', href=True):
            link_text = a_tag.get_text().strip()
            href = a_tag['href']

            if link_text and self.text_processor.is_persian_text(link_text):
                links.append({
                    'text': self.text_processor.normalize_persian_text(link_text),
                    'url': href
                })

        return links

    def _detect_language(self, soup: BeautifulSoup) -> str:
        """Detect page language"""
        # Check HTML lang attribute
        html_tag = soup.find('html')
        if html_tag and html_tag.get('lang'):
            lang = html_tag['lang'].lower()
            if 'fa' in lang or 'per' in lang:
                return 'fa'

        # Check meta language
        meta_lang = soup.find('meta', attrs={'http-equiv': 'content-language'})
        if meta_lang and meta_lang.get('content'):
            content = meta_lang['content'].lower()
            if 'fa' in content or 'per' in content:
                return 'fa'

        # Detect from content
        body = soup.find('body')
        if body:
            text = body.get_text()
            if self.text_processor.is_persian_text(text):
                return 'fa'

        return 'unknown'
```

## Advanced Persian Text Analysis

### Persian Stop Words and Tokenization

```python
class PersianTextAnalyzer:
    """Advanced analysis of Persian text"""

    def __init__(self):
        # Persian stop words (common words to filter out)
        self.stop_words = {
            'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'برای', 'است',
            'آن', 'یک', 'خود', 'هم', 'تا', 'کرد', 'بر', 'بود', 'می', 'دار',
            'من', 'ما', 'آنها', 'او', 'شما', 'آنچه', 'همه', 'هر', 'چه', 'اگر'
        }

        # Persian text processor
        self.text_processor = PersianTextProcessor()

    def tokenize_persian_text(self, text: str) -> List[str]:
        """Tokenize Persian text into words"""
        # Normalize text first
        normalized = self.text_processor.normalize_persian_text(text)

        # Split on whitespace and punctuation
        tokens = re.findall(r'[' + self.text_processor.persian_chars + r']+', normalized)

        # Filter out stop words and very short tokens
        filtered_tokens = [
            token for token in tokens
            if len(token) >= 2 and token not in self.stop_words
        ]

        return filtered_tokens

    def extract_keywords(self, text: str, max_keywords: int = 10) -> List[Dict[str, any]]:
        """Extract important keywords from Persian text"""
        tokens = self.tokenize_persian_text(text)

        if not tokens:
            return []

        # Count word frequencies
        word_freq = {}
        for token in tokens:
            word_freq[token] = word_freq.get(token, 0) + 1

        # Calculate term frequency
        total_words = len(tokens)
        keywords = []

        for word, count in word_freq.items():
            tf = count / total_words

            # Simple scoring (can be enhanced with TF-IDF)
            score = tf * len(word)  # Prefer longer, more frequent words

            keywords.append({
                'word': word,
                'frequency': count,
                'tf_score': tf,
                'combined_score': score
            })

        # Sort by combined score
        keywords.sort(key=lambda x: x['combined_score'], reverse=True)

        return keywords[:max_keywords]

    def detect_persian_named_entities(self, text: str) -> List[Dict[str, any]]:
        """Simple Persian named entity detection"""
        # This is a simplified implementation
        # For production, use libraries like hazm or spacy with Persian models

        tokens = self.tokenize_persian_text(text)

        entities = []

        # Simple heuristics for Persian names
        # (In production, use proper NER models)
        persian_name_indicators = [
            'دکتر', 'آقای', 'خانم', 'مهندس', 'استاد', 'دکترا'
        ]

        i = 0
        while i < len(tokens) - 1:
            current_token = tokens[i]
            next_token = tokens[i + 1]

            # Check for title + name pattern
            if current_token in persian_name_indicators and len(next_token) > 2:
                entities.append({
                    'text': f'{current_token} {next_token}',
                    'type': 'PERSON',
                    'start': text.find(f'{current_token} {next_token}'),
                    'confidence': 0.8
                })
                i += 2
            else:
                i += 1

        return entities

    def analyze_sentiment(self, text: str) -> Dict[str, any]:
        """Simple Persian sentiment analysis"""
        # Simplified sentiment analysis
        # For production, use trained models

        positive_words = {
            'خوب', 'عالی', 'عالیه', 'شگفت', 'زیبا', 'عاشق', 'دوست', 'محبوب',
            'راضی', 'خوشحال', 'شاد', 'ممنون', 'سپاسگزار'
        }

        negative_words = {
            'بد', 'وحشتناک', 'زشت', 'نفرت', 'دشمن', 'ناراضی', 'ناخوش',
            'غمناک', 'افسرده', 'ناامید', 'متاسف'
        }

        tokens = self.tokenize_persian_text(text)

        positive_count = sum(1 for token in tokens if token in positive_words)
        negative_count = sum(1 for token in tokens if token in negative_words)

        total_sentiment_words = positive_count + negative_count

        if total_sentiment_words == 0:
            sentiment = 'neutral'
            confidence = 0.5
        elif positive_count > negative_count:
            sentiment = 'positive'
            confidence = positive_count / total_sentiment_words
        else:
            sentiment = 'negative'
            confidence = negative_count / total_sentiment_words

        return {
            'sentiment': sentiment,
            'confidence': confidence,
            'positive_words': positive_count,
            'negative_words': negative_count,
            'total_words': len(tokens)
        }

    def get_readability_score(self, text: str) -> Dict[str, any]:
        """Calculate Persian text readability"""
        sentences = re.split(r'[.!؟]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        words = self.tokenize_persian_text(text)
        total_sentences = len(sentences)
        total_words = len(words)

        if total_sentences == 0 or total_words == 0:
            return {'readability': 'unknown', 'score': 0}

        # Average sentence length
        avg_sentence_length = total_words / total_sentences

        # Average word length
        avg_word_length = sum(len(word) for word in words) / total_words

        # Simple readability score (lower is easier to read)
        readability_score = avg_sentence_length * 0.4 + avg_word_length * 0.6

        if readability_score < 10:
            level = 'easy'
        elif readability_score < 15:
            level = 'medium'
        else:
            level = 'difficult'

        return {
            'readability': level,
            'score': readability_score,
            'avg_sentence_length': avg_sentence_length,
            'avg_word_length': avg_word_length,
            'total_sentences': total_sentences,
            'total_words': total_words
        }
```

## Crawlee Integration for Persian Content

### Persian Content Crawler

```python
from crawlee import BeautifulSoupCrawler
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class PersianContentCrawler:
    """Crawler specialized for Persian content extraction"""

    def __init__(self):
        self.html_parser = PersianHTMLParser()
        self.text_analyzer = PersianTextAnalyzer()

        self.crawler = BeautifulSoupCrawler(
            max_concurrency=2,  # Respectful crawling
            max_request_retries=2,
            request_timeout=30
        )

        self._setup_handlers()

    def _setup_handlers(self):
        """Setup crawler handlers for Persian content"""

        @self.crawler.router.default_handler
        async def persian_content_handler(context):
            """Handle Persian content extraction"""
            try:
                html_content = context.http_response.text

                # Parse Persian content
                content_data = self.html_parser.extract_persian_content(html_content)

                # Additional analysis if content is Persian
                if content_data.get('language') == 'fa' and content_data.get('main_content'):
                    # Perform text analysis
                    analysis = self._analyze_persian_content(content_data['main_content'])

                    # Merge analysis results
                    content_data.update(analysis)

                # Add metadata
                content_data.update({
                    'url': context.request.url,
                    'crawled_at': context.request.loaded_at.isoformat(),
                    'status_code': context.http_response.status_code,
                    'response_time': context.request.loaded_at.timestamp() - context.request.created_at.timestamp()
                })

                # Store results
                await context.push_data(content_data)

                logger.info(f"Extracted Persian content: {content_data.get('title', 'No title')[:50]}...")

            except Exception as e:
                logger.error(f"Error processing Persian content from {context.request.url}: {e}")

    def _analyze_persian_content(self, content: str) -> Dict[str, Any]:
        """Analyze Persian content"""
        analysis = {}

        try:
            # Extract keywords
            keywords = self.text_analyzer.extract_keywords(content, max_keywords=10)
            analysis['keywords'] = keywords

            # Sentiment analysis
            sentiment = self.text_analyzer.analyze_sentiment(content)
            analysis['sentiment'] = sentiment

            # Readability analysis
            readability = self.text_analyzer.get_readability_score(content)
            analysis['readability'] = readability

            # Named entity extraction
            entities = self.text_analyzer.detect_persian_named_entities(content)
            analysis['named_entities'] = entities

        except Exception as e:
            logger.warning(f"Content analysis failed: {e}")
            analysis['analysis_error'] = str(e)

        return analysis

    async def crawl_persian_websites(self, urls: List[str], max_pages: int = 50) -> List[Dict[str, Any]]:
        """Crawl Persian websites"""
        logger.info(f"Starting Persian content crawl of {len(urls)} URLs")

        # Add Persian user agent
        @self.crawler.pre_navigation_hooks.append
        async def set_persian_headers(context):
            context.request.headers.update({
                'User-Agent': 'PersianContentCrawler/1.0',
                'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
                'Accept-Charset': 'utf-8'
            })

        await self.crawler.run(urls[:max_pages])

        # Get results
        dataset = await Dataset.open()
        results = await dataset.get_data()

        persian_results = [r for r in results if r.get('language') == 'fa']

        logger.info(f"Crawled {len(results)} pages, found {len(persian_results)} with Persian content")

        return persian_results
```

## Handling Persian Website Challenges

### RTL Layout and CSS Issues

```python
class PersianWebsiteHandler:
    """Handle Persian website specific challenges"""

    def __init__(self):
        self.rtl_indicators = [
            'direction: rtl',
            'dir="rtl"',
            'text-align: right',
            'fa-ir', 'fa-af', 'fa'
        ]

    def is_rtl_website(self, html_content: str) -> bool:
        """Check if website uses RTL layout"""
        html_lower = html_content.lower()

        for indicator in self.rtl_indicators:
            if indicator in html_lower:
                return True

        return False

    def extract_rtl_content(self, soup: BeautifulSoup) -> Dict[str, any]:
        """Extract content considering RTL layout"""
        content = {}

        # RTL websites often have content in specific containers
        rtl_selectors = [
            '[dir="rtl"]',
            '.rtl',
            '.persian',
            '.farsi',
            '[class*="rtl"]'
        ]

        rtl_content = []
        for selector in rtl_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text(separator=' ', strip=True)
                if text:
                    rtl_content.append(text)

        if rtl_content:
            content['rtl_content'] = ' '.join(rtl_content)

        return content

    def fix_encoding_issues(self, text: str) -> str:
        """Fix common Persian encoding issues"""
        # Handle Windows-1256 to UTF-8 issues
        fixes = {
            'ي': 'ی',  # Arabic ye to Persian ye
            'ك': 'ک',  # Arabic kaf to Persian ke
            'ى': 'ی',  # Alef maksura to Persian ye
            'ة': 'ه',  # Ta marbuta to he
        }

        for old_char, new_char in fixes.items():
            text = text.replace(old_char, new_char)

        return text
```

### Persian Date and Number Handling

```python
import jdatetime
from typing import Optional
import re

class PersianDateTimeHandler:
    """Handle Persian dates and times"""

    def __init__(self):
        # Persian month names
        self.persian_months = {
            'فروردین': 1, 'اردیبهشت': 2, 'خرداد': 3,
            'تیر': 4, 'مرداد': 5, 'شهریور': 6,
            'مهر': 7, 'آبان': 8, 'آذر': 9,
            'دی': 10, 'بهمن': 11, 'اسفند': 12
        }

    def parse_persian_date(self, date_string: str) -> Optional[str]:
        """Parse Persian date string to ISO format"""
        try:
            # Handle Jalali calendar dates
            # Example: "۱۵ خرداد ۱۴۰۲" (15 Khordad 1402)

            # Extract numbers and month names
            parts = date_string.split()

            day = None
            month = None
            year = None

            for part in parts:
                # Check if it's a number (Persian digits)
                persian_num = self._persian_to_western_digits(part)
                if persian_num.isdigit():
                    num = int(persian_num)
                    if not day and num <= 31:
                        day = num
                    elif not year and num > 1300:  # Persian calendar years
                        year = num
                elif part in self.persian_months:
                    month = self.persian_months[part]

            if day and month and year:
                # Convert to Gregorian
                jalali_date = jdatetime.date(year, month, day)
                gregorian_date = jalali_date.togregorian()

                return gregorian_date.isoformat()

        except Exception:
            pass

        return None

    def _persian_to_western_digits(self, text: str) -> str:
        """Convert Persian digits to Western digits"""
        persian_digits = '۰۱۲۳۴۵۶۷۸۹'
        western_digits = '0123456789'

        for persian, western in zip(persian_digits, western_digits):
            text = text.replace(persian, western)

        return text

    def format_persian_date(self, iso_date: str) -> str:
        """Format ISO date to Persian format"""
        try:
            from datetime import date
            gregorian = date.fromisoformat(iso_date)
            jalali = jdatetime.date.fromgregorian(date=gregorian)

            month_names = list(self.persian_months.keys())
            month_name = month_names[jalali.month - 1]

            return f"{jalali.day} {month_name} {jalali.year}"

        except Exception:
            return iso_date
```

## Hands-on Exercises

### Exercise 1: Persian Text Processing
1. Create a Persian text normalizer
2. Implement digit conversion (Arabic-Indic to Persian)
3. Build a Persian word tokenizer
4. Test with sample Persian content

### Exercise 2: Persian HTML Parsing
1. Parse Persian websites with BeautifulSoup
2. Extract Persian content from various layouts
3. Handle RTL text properly
4. Detect Persian language automatically

### Exercise 3: Persian Content Analysis
1. Implement Persian keyword extraction
2. Build sentiment analysis for Persian text
3. Create readability scoring
4. Test with real Persian websites

## Next Steps
- [Data Extraction Patterns Tutorial](../tutorials/04-data-extraction-patterns.md)
- [Workshop: Persian Website Crawler](../workshops/workshop-02-persian-website-crawler.md)

## Additional Resources
- [Persian Language Processing](https://github.com/sobhe/hazm)
- [Jalali Calendar Library](https://github.com/slashmili/python-jalali)
- [Persian Text Encoding](https://en.wikipedia.org/wiki/Persian_alphabet)
- [RTL Text Handling](https://www.w3.org/International/questions/qa-html-dir)
