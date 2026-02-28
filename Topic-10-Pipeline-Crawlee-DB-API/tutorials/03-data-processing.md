# Tutorial 03: Data Processing and Transformation

## Overview
This tutorial covers data processing techniques in ETL pipelines, including data validation, transformation, cleaning, enrichment, and quality assurance. You'll learn how to build robust data processing components that ensure data integrity and prepare crawled content for storage and API consumption.

## Data Processing Pipeline Stages

### 1. Data Validation

#### Schema Validation
```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
import re

class CrawledArticleValidation(BaseModel):
    url: str = Field(..., min_length=1, max_length=2000)
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=10)
    author: Optional[str] = Field(None, max_length=100)
    published_at: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list, max_items=20)
    source_url: str = Field(..., min_length=1)
    crawled_at: datetime = Field(default_factory=datetime.now)

    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

    @validator('title')
    def clean_title(cls, v):
        # Remove extra whitespace and normalize
        return ' '.join(v.split()).strip()

    @validator('content')
    def validate_content_length(cls, v):
        word_count = len(v.split())
        if word_count < 10:
            raise ValueError('Content must have at least 10 words')
        if word_count > 50000:
            raise ValueError('Content is too long (max 50,000 words)')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        # Remove duplicates and clean tags
        cleaned_tags = []
        seen = set()

        for tag in v:
            clean_tag = tag.lower().strip()
            if clean_tag and clean_tag not in seen and len(clean_tag) <= 50:
                cleaned_tags.append(clean_tag)
                seen.add(clean_tag)

        return cleaned_tags[:20]  # Limit to 20 tags

    @validator('published_at')
    def validate_published_date(cls, v):
        if v and v > datetime.now():
            raise ValueError('Publication date cannot be in the future')
        return v

class DataValidator:
    def __init__(self):
        self.validation_errors = []
        self.valid_records = 0
        self.invalid_records = 0

    def validate_record(self, record: dict) -> tuple[bool, dict, List[str]]:
        """Validate a single record and return (is_valid, cleaned_data, errors)"""
        try:
            # Convert dict to Pydantic model for validation
            validated = CrawledArticleValidation(**record)
            cleaned_data = validated.dict()

            self.valid_records += 1
            return True, cleaned_data, []

        except Exception as e:
            errors = [str(e)]
            self.invalid_records += 1
            self.validation_errors.append({
                'record': record,
                'errors': errors,
                'timestamp': datetime.now()
            })
            return False, {}, errors

    def validate_batch(self, records: List[dict]) -> tuple[List[dict], List[dict]]:
        """Validate a batch of records"""
        valid_records = []
        invalid_records = []

        for record in records:
            is_valid, cleaned_data, errors = self.validate_record(record)

            if is_valid:
                valid_records.append(cleaned_data)
            else:
                invalid_records.append({
                    'original': record,
                    'errors': errors
                })

        return valid_records, invalid_records

    def get_statistics(self) -> dict:
        """Get validation statistics"""
        return {
            'valid_records': self.valid_records,
            'invalid_records': self.invalid_records,
            'total_processed': self.valid_records + self.invalid_records,
            'error_rate': self.invalid_records / max(self.valid_records + self.invalid_records, 1)
        }
```

### 2. Data Cleaning and Normalization

#### Text Processing
```python
import re
from typing import Optional
import html
from urllib.parse import urlparse

class TextProcessor:
    def __init__(self):
        # Common patterns to clean
        self.url_pattern = re.compile(r'https?://\S+')
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b')
        self.extra_whitespace = re.compile(r'\s+')

    def clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        if not text:
            return ""

        # Convert to string if needed
        text = str(text)

        # Decode HTML entities
        text = html.unescape(text)

        # Remove extra whitespace
        text = self.extra_whitespace.sub(' ', text).strip()

        # Remove excessive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text

    def extract_urls(self, text: str) -> List[str]:
        """Extract URLs from text"""
        return self.url_pattern.findall(text)

    def remove_pii(self, text: str) -> str:
        """Remove personally identifiable information"""
        # Remove email addresses
        text = self.email_pattern.sub('[EMAIL]', text)

        # Remove phone numbers
        text = self.phone_pattern.sub('[PHONE]', text)

        return text

    def normalize_quotes(self, text: str) -> str:
        """Normalize different quote types"""
        # Convert smart quotes to regular quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        return text

class ContentProcessor:
    def __init__(self):
        self.text_processor = TextProcessor()

    def process_article_content(self, article: dict) -> dict:
        """Process and clean article content"""
        processed = article.copy()

        # Clean title
        processed['title'] = self.text_processor.clean_text(article.get('title', ''))

        # Clean content
        content = article.get('content', '')
        processed['content'] = self.text_processor.clean_text(content)

        # Remove PII if needed
        if not article.get('contains_pii', False):
            processed['content'] = self.text_processor.remove_pii(processed['content'])

        # Normalize quotes
        processed['content'] = self.text_processor.normalize_quotes(processed['content'])

        # Extract and store URLs separately
        urls = self.text_processor.extract_urls(processed['content'])
        processed['extracted_urls'] = urls

        # Calculate content metrics
        processed['word_count'] = len(processed['content'].split())
        processed['character_count'] = len(processed['content'])

        # Estimate reading time (200 words per minute)
        processed['reading_time_minutes'] = max(1, processed['word_count'] // 200)

        return processed
```

#### Date and Time Processing
```python
from dateutil import parser as date_parser
from datetime import datetime, timezone
import pytz

class DateTimeProcessor:
    def __init__(self):
        self.common_formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%B %d, %Y',
            '%d/%m/%Y',
            '%m/%d/%Y'
        ]

    def parse_flexible_date(self, date_string: str) -> Optional[datetime]:
        """Parse date from various formats"""
        if not date_string:
            return None

        try:
            # Try dateutil parser first (most flexible)
            dt = date_parser.parse(date_string)

            # Ensure timezone awareness
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)

            return dt

        except (ValueError, TypeError):
            # Try manual parsing with common formats
            for fmt in self.common_formats:
                try:
                    dt = datetime.strptime(date_string, fmt)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except ValueError:
                    continue

            return None

    def normalize_timezone(self, dt: datetime) -> datetime:
        """Ensure datetime is in UTC"""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def is_future_date(self, dt: datetime, tolerance_minutes: int = 5) -> bool:
        """Check if date is in the future (with tolerance)"""
        now = datetime.now(timezone.utc)
        return dt > now.replace(second=0, microsecond=0) + timedelta(minutes=tolerance_minutes)

    def validate_publication_date(self, date_string: str) -> Optional[datetime]:
        """Validate and normalize publication date"""
        dt = self.parse_flexible_date(date_string)

        if dt:
            dt = self.normalize_timezone(dt)

            # Check if date is not too far in the future
            if self.is_future_date(dt, tolerance_minutes=60):  # 1 hour tolerance
                return None

            # Check if date is not too old (more than 10 years)
            ten_years_ago = datetime.now(timezone.utc).replace(year=datetime.now().year - 10)
            if dt < ten_years_ago:
                return None

        return dt
```

### 3. Data Enrichment

#### Content Analysis and Tagging
```python
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from collections import Counter
from typing import List, Dict, Set
import re

class ContentEnricher:
    def __init__(self):
        # Download NLTK data (run once)
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')

        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords')

        self.stop_words = set(stopwords.words('english'))

    def extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """Extract important keywords from text"""
        if not text:
            return []

        # Tokenize and clean
        words = word_tokenize(text.lower())
        words = [word for word in words if word.isalnum() and word not in self.stop_words]

        # Count frequencies
        word_freq = Counter(words)

        # Get most common words
        keywords = [word for word, _ in word_freq.most_common(max_keywords)]

        return keywords

    def detect_language(self, text: str) -> str:
        """Simple language detection based on common words"""
        # This is a simplified implementation
        # In production, use libraries like langdetect or fasttext
        english_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'}
        spanish_words = {'el', 'la', 'los', 'las', 'y', 'o', 'pero', 'en', 'sobre', 'a'}

        words = set(word_tokenize(text.lower()))

        english_score = len(words.intersection(english_words))
        spanish_score = len(words.intersection(spanish_words))

        if english_score > spanish_score:
            return 'en'
        elif spanish_score > english_score:
            return 'es'
        else:
            return 'unknown'

    def calculate_text_metrics(self, text: str) -> Dict[str, int]:
        """Calculate various text metrics"""
        sentences = sent_tokenize(text)
        words = word_tokenize(text)

        return {
            'sentence_count': len(sentences),
            'word_count': len(words),
            'character_count': len(text),
            'average_sentence_length': len(words) / max(len(sentences), 1),
            'average_word_length': sum(len(word) for word in words) / max(len(words), 1)
        }

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named entities (simplified)"""
        # This is a very basic implementation
        # In production, use spaCy, NLTK NER, or cloud services

        # Simple email extraction
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)

        # Simple URL extraction
        urls = re.findall(r'https?://\S+', text)

        # Simple phone number extraction
        phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)

        return {
            'emails': list(set(emails)),
            'urls': list(set(urls)),
            'phones': list(set(phones))
        }

    def enrich_article(self, article: dict) -> dict:
        """Enrich article with additional metadata"""
        enriched = article.copy()

        content = article.get('content', '')
        title = article.get('title', '')

        # Extract keywords from title and content
        all_text = f"{title} {content}"
        keywords = self.extract_keywords(all_text)
        enriched['auto_keywords'] = keywords

        # Detect language
        language = self.detect_language(all_text)
        enriched['detected_language'] = language

        # Calculate metrics
        metrics = self.calculate_text_metrics(content)
        enriched['text_metrics'] = metrics

        # Extract entities
        entities = self.extract_entities(content)
        enriched['extracted_entities'] = entities

        # Generate summary if not present
        if not article.get('summary'):
            sentences = sent_tokenize(content)
            if sentences:
                # Simple extractive summarization - take first 2 sentences
                summary = ' '.join(sentences[:2])
                enriched['auto_summary'] = summary[:300] + '...' if len(summary) > 300 else summary

        return enriched
```

#### URL and Domain Analysis
```python
from urllib.parse import urlparse, urljoin
from collections import defaultdict
import tldextract

class URLProcessor:
    def __init__(self):
        pass

    def extract_domain_info(self, url: str) -> Dict[str, str]:
        """Extract domain and subdomain information"""
        parsed = urlparse(url)
        extracted = tldextract.extract(url)

        return {
            'scheme': parsed.scheme,
            'netloc': parsed.netloc,
            'domain': extracted.domain,
            'subdomain': extracted.subdomain,
            'suffix': extracted.suffix,
            'full_domain': f"{extracted.domain}.{extracted.suffix}",
            'path': parsed.path,
            'query': parsed.query
        }

    def normalize_url(self, url: str) -> str:
        """Normalize URL for consistency"""
        if not url:
            return ""

        # Remove common tracking parameters
        tracking_params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

        parsed = urlparse(url)
        query_params = parsed.query.split('&') if parsed.query else []

        # Remove tracking parameters
        clean_params = []
        for param in query_params:
            if '=' in param:
                key = param.split('=')[0]
                if key not in tracking_params:
                    clean_params.append(param)

        # Reconstruct URL
        clean_query = '&'.join(clean_params) if clean_params else ''
        normalized = parsed._replace(query=clean_query)

        return normalized.geturl()

    def categorize_domain(self, domain: str) -> str:
        """Categorize domain type"""
        # Simple domain categorization
        news_domains = {'bbc.com', 'cnn.com', 'nytimes.com', 'reuters.com'}
        tech_domains = {'github.com', 'stackoverflow.com', 'reddit.com'}
        social_domains = {'twitter.com', 'facebook.com', 'linkedin.com'}

        if domain in news_domains:
            return 'news'
        elif domain in tech_domains:
            return 'technology'
        elif domain in social_domains:
            return 'social'
        else:
            return 'general'

    def extract_url_features(self, url: str) -> Dict[str, any]:
        """Extract features from URL for content classification"""
        domain_info = self.extract_domain_info(url)

        features = {
            'domain_category': self.categorize_domain(domain_info['full_domain']),
            'has_subdomain': bool(domain_info['subdomain']),
            'path_depth': len(domain_info['path'].strip('/').split('/')) if domain_info['path'] else 0,
            'has_query': bool(domain_info['query']),
            'is_https': domain_info['scheme'] == 'https'
        }

        return features
```

### 4. Data Quality Assurance

#### Quality Metrics and Validation
```python
from typing import Dict, List, Any
import statistics

class DataQualityAssurance:
    def __init__(self):
        self.quality_thresholds = {
            'min_title_length': 5,
            'max_title_length': 200,
            'min_content_length': 50,
            'max_content_length': 100000,
            'min_reading_time': 1,
            'max_reading_time': 60,
            'required_fields': ['title', 'content', 'url', 'crawled_at']
        }

    def calculate_quality_score(self, article: dict) -> float:
        """Calculate overall quality score (0.0 to 1.0)"""
        score = 0.0
        max_score = 0.0

        # Required fields check (40% of score)
        max_score += 0.4
        required_fields_present = all(article.get(field) for field in self.quality_thresholds['required_fields'])
        if required_fields_present:
            score += 0.4

        # Content length check (20% of score)
        max_score += 0.2
        content_length = len(article.get('content', ''))
        if (self.quality_thresholds['min_content_length'] <= content_length <=
            self.quality_thresholds['max_content_length']):
            score += 0.2

        # Title quality check (15% of score)
        max_score += 0.15
        title = article.get('title', '')
        if (self.quality_thresholds['min_title_length'] <= len(title) <=
            self.quality_thresholds['max_title_length']):
            # Bonus for title case
            if title.istitle():
                score += 0.15
            else:
                score += 0.1

        # Metadata completeness (15% of score)
        max_score += 0.15
        metadata_fields = ['author', 'published_at', 'tags', 'summary']
        metadata_score = sum(1 for field in metadata_fields if article.get(field)) / len(metadata_fields)
        score += 0.15 * metadata_score

        # Reading time check (10% of score)
        max_score += 0.1
        reading_time = article.get('reading_time_minutes', 0)
        if (self.quality_thresholds['min_reading_time'] <= reading_time <=
            self.quality_thresholds['max_reading_time']):
            score += 0.1

        return score / max_score if max_score > 0 else 0.0

    def validate_data_quality(self, articles: List[dict]) -> Dict[str, Any]:
        """Validate quality of a batch of articles"""
        quality_scores = []
        quality_issues = []

        for i, article in enumerate(articles):
            score = self.calculate_quality_score(article)

            if score < 0.7:  # Below 70% quality threshold
                quality_issues.append({
                    'index': i,
                    'score': score,
                    'issues': self.identify_quality_issues(article)
                })

            quality_scores.append(score)

        # Calculate batch statistics
        stats = {
            'total_articles': len(articles),
            'average_quality': statistics.mean(quality_scores) if quality_scores else 0,
            'quality_distribution': {
                'excellent': sum(1 for s in quality_scores if s >= 0.9),
                'good': sum(1 for s in quality_scores if 0.7 <= s < 0.9),
                'poor': sum(1 for s in quality_scores if s < 0.7)
            },
            'quality_issues': quality_issues
        }

        return stats

    def identify_quality_issues(self, article: dict) -> List[str]:
        """Identify specific quality issues"""
        issues = []

        # Check required fields
        for field in self.quality_thresholds['required_fields']:
            if not article.get(field):
                issues.append(f"Missing required field: {field}")

        # Check content quality
        content = article.get('content', '')
        if len(content) < self.quality_thresholds['min_content_length']:
            issues.append(f"Content too short: {len(content)} characters")

        # Check title quality
        title = article.get('title', '')
        if len(title) < self.quality_thresholds['min_title_length']:
            issues.append(f"Title too short: {len(title)} characters")
        elif len(title) > self.quality_thresholds['max_title_length']:
            issues.append(f"Title too long: {len(title)} characters")

        # Check for duplicate content (simplified)
        if content.count(' ') < 10:  # Very few spaces
            issues.append("Content appears to have formatting issues")

        return issues

    def apply_quality_filters(self, articles: List[dict], min_quality: float = 0.6) -> List[dict]:
        """Filter articles by quality threshold"""
        filtered_articles = []
        rejected_articles = []

        for article in articles:
            score = self.calculate_quality_score(article)
            if score >= min_quality:
                article['quality_score'] = score
                filtered_articles.append(article)
            else:
                rejected_articles.append({
                    'article': article,
                    'quality_score': score,
                    'issues': self.identify_quality_issues(article)
                })

        return filtered_articles, rejected_articles
```

## Building the Complete Processing Pipeline

### Integrated Processing Pipeline
```python
from typing import List, Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

class ArticleProcessingPipeline:
    def __init__(self):
        self.validator = DataValidator()
        self.content_processor = ContentProcessor()
        self.date_processor = DateTimeProcessor()
        self.enricher = ContentEnricher()
        self.url_processor = URLProcessor()
        self.quality_assurance = DataQualityAssurance()

    def process_batch(self, raw_articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process a batch of raw articles through the complete pipeline"""
        logger.info(f"Starting processing of {len(raw_articles)} articles")

        # Stage 1: Validation
        valid_articles, invalid_articles = self.validator.validate_batch(raw_articles)
        logger.info(f"Validation: {len(valid_articles)} valid, {len(invalid_articles)} invalid")

        # Stage 2: Data Cleaning and Normalization
        cleaned_articles = []
        for article in valid_articles:
            try:
                # Clean content
                cleaned = self.content_processor.process_article_content(article)

                # Process dates
                if 'published_at' in cleaned:
                    cleaned['published_at'] = self.date_processor.validate_publication_date(
                        cleaned['published_at']
                    )

                # Process URLs
                if 'url' in cleaned:
                    cleaned['url_features'] = self.url_processor.extract_url_features(cleaned['url'])
                    cleaned['url'] = self.url_processor.normalize_url(cleaned['url'])

                cleaned_articles.append(cleaned)

            except Exception as e:
                logger.error(f"Error cleaning article {article.get('url', 'unknown')}: {e}")
                invalid_articles.append({
                    'original': article,
                    'errors': [f"Cleaning error: {str(e)}"]
                })

        # Stage 3: Data Enrichment
        enriched_articles = []
        for article in cleaned_articles:
            try:
                enriched = self.enricher.enrich_article(article)
                enriched_articles.append(enriched)
            except Exception as e:
                logger.error(f"Error enriching article {article.get('url', 'unknown')}: {e}")
                # Still include article but mark as not enriched
                article['enrichment_error'] = str(e)
                enriched_articles.append(article)

        # Stage 4: Quality Assurance
        quality_stats = self.quality_assurance.validate_data_quality(enriched_articles)
        high_quality_articles, low_quality_articles = self.quality_assurance.apply_quality_filters(
            enriched_articles, min_quality=0.6
        )

        logger.info(f"Quality check: {len(high_quality_articles)} passed, {len(low_quality_articles)} failed")

        # Prepare final results
        results = {
            'processed_articles': high_quality_articles,
            'rejected_articles': low_quality_articles + invalid_articles,
            'statistics': {
                'input_count': len(raw_articles),
                'valid_count': len(valid_articles),
                'processed_count': len(cleaned_articles),
                'enriched_count': len(enriched_articles),
                'final_count': len(high_quality_articles),
                'quality_stats': quality_stats,
                'validation_stats': self.validator.get_statistics()
            }
        }

        logger.info(f"Pipeline completed: {results['statistics']['final_count']} articles processed successfully")
        return results

    def process_single_article(self, article: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], List[str]]:
        """Process a single article (useful for real-time processing)"""
        results = self.process_batch([article])

        if results['processed_articles']:
            return True, results['processed_articles'][0], []
        else:
            errors = []
            if results['rejected_articles']:
                errors = results['rejected_articles'][0].get('errors', [])
            return False, {}, errors
```

## Hands-on Exercises

### Exercise 1: Basic Data Validation
1. Create a Pydantic model for article validation
2. Implement custom validators for URLs, content length, and tags
3. Test validation with various invalid inputs
4. Handle validation errors gracefully

### Exercise 2: Text Processing Pipeline
1. Implement text cleaning and normalization functions
2. Add PII removal and HTML entity decoding
3. Create content metrics calculation
4. Test with various types of crawled content

### Exercise 3: Data Enrichment
1. Implement keyword extraction from article content
2. Add automatic language detection
3. Create entity extraction for emails and URLs
4. Build text metrics calculation

## Next Steps
- [Duplicate Handling Tutorial](../tutorials/04-duplicate-handling.md)
- [Workshop: Data Processing](../workshops/workshop-02-data-processing.md)

## Additional Resources
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)
- [Data Cleaning Best Practices](https://towardsdatascience.com/data-cleaning-best-practices-in-python-2d7f3e6c8e4d)
- [Text Processing with Python](https://www.nltk.org/)
- [Data Quality Management](https://www.databricks.com/glossary/data-quality)
