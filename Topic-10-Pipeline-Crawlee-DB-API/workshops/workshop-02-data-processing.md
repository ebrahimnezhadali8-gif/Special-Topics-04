# Workshop 02: Data Processing Pipeline Implementation

## Overview
This workshop focuses on building comprehensive data processing capabilities for the ETL pipeline. You'll implement data validation, transformation, enrichment, and quality assurance systems that ensure crawled content is properly processed before storage.

## Prerequisites
- Completed [ETL Pipeline Workshop](../workshops/workshop-01-crawlee-etl.md)
- Understanding of data processing concepts

## Learning Objectives
By the end of this workshop, you will be able to:
- Implement robust data validation and transformation
- Build data enrichment pipelines
- Create data quality monitoring systems
- Handle complex data processing scenarios
- Optimize processing performance

## Workshop Structure

### Part 1: Advanced Data Validation

#### Step 1: Create Comprehensive Validators

**processors/validators/article_validator.py:**
```python
from pydantic import BaseModel, Field, validator, ValidationError
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, date
import re
import logging

logger = logging.getLogger(__name__)

class ArticleValidationSchema(BaseModel):
    """Pydantic schema for article validation"""
    url: str = Field(..., min_length=1, max_length=2000)
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=10)
    summary: Optional[str] = Field(None, max_length=500)
    author: Optional[str] = Field(None, max_length=255)
    published_at: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list, max_items=20)
    crawled_at: datetime
    source_url: str = Field(..., min_length=1)

    @validator('url')
    def validate_url_format(cls, v):
        """Validate URL format and accessibility"""
        if not re.match(r'^https?://', v):
            raise ValueError('URL must start with http:// or https://')

        # Check for common URL issues
        if 'javascript:' in v or 'mailto:' in v:
            raise ValueError('Invalid URL type')

        # Check URL length
        if len(v) > 2000:
            raise ValueError('URL is too long')

        return v

    @validator('title')
    def clean_and_validate_title(cls, v):
        """Clean and validate article title"""
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')

        # Clean title
        title = ' '.join(v.split()).strip()

        if len(title) < 3:
            raise ValueError('Title is too short')
        if len(title) > 500:
            raise ValueError('Title is too long')

        return title

    @validator('content')
    def validate_content_quality(cls, v):
        """Validate content quality and length"""
        if v is None:
            return None

        if len(v.strip()) < 50:
            raise ValueError('Content is too short for meaningful analysis')

        # Check for excessive repetition
        words = v.lower().split()
        if len(words) > 100:
            # Check if more than 30% of words are the same
            from collections import Counter
            most_common = Counter(words).most_common(1)[0]
            if most_common[1] / len(words) > 0.3:
                raise ValueError('Content appears to have excessive repetition')

        return v

    @validator('published_at')
    def validate_publication_date(cls, v):
        """Validate publication date is reasonable"""
        if v is None:
            return None

        now = datetime.now()
        one_year_ago = now.replace(year=now.year - 1)
        one_month_future = now.replace(month=now.month + 1) if now.month < 12 else now.replace(year=now.year + 1, month=1)

        if v < one_year_ago:
            raise ValueError('Publication date is too old')
        if v > one_month_future:
            raise ValueError('Publication date is too far in the future')

        return v

    @validator('tags')
    def validate_and_clean_tags(cls, v):
        """Validate and clean article tags"""
        if not isinstance(v, list):
            raise ValueError('Tags must be a list')

        cleaned_tags = []
        seen = set()

        for tag in v:
            if not isinstance(tag, str):
                continue

            # Clean tag
            clean_tag = tag.lower().strip()

            # Skip empty tags
            if not clean_tag:
                continue

            # Skip tags that are too long
            if len(clean_tag) > 50:
                continue

            # Skip tags with invalid characters
            if not re.match(r'^[a-zA-Z0-9\s\-_]+$', clean_tag):
                continue

            # Skip duplicates
            if clean_tag in seen:
                continue

            cleaned_tags.append(clean_tag)
            seen.add(clean_tag)

        return cleaned_tags[:20]  # Limit to 20 tags

class BatchValidator:
    """Validate batches of articles with detailed reporting"""

    def __init__(self):
        self.schema = ArticleValidationSchema
        self.stats = {
            'total_processed': 0,
            'valid_articles': 0,
            'invalid_articles': 0,
            'errors_by_field': {},
            'errors_by_type': {}
        }

    def validate_batch(self, articles: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Validate a batch of articles"""
        valid_articles = []
        invalid_articles = []

        for i, article in enumerate(articles):
            self.stats['total_processed'] += 1

            try:
                # Validate using Pydantic
                validated = self.schema(**article)
                cleaned_article = validated.dict()

                valid_articles.append(cleaned_article)
                self.stats['valid_articles'] += 1

            except ValidationError as e:
                # Collect validation errors
                errors = []
                for error in e.errors():
                    field = '.'.join(str(loc) for loc in error['loc'])
                    error_type = error['type']
                    message = error['msg']

                    errors.append({
                        'field': field,
                        'type': error_type,
                        'message': message
                    })

                    # Update error statistics
                    self.stats['errors_by_field'][field] = self.stats['errors_by_field'].get(field, 0) + 1
                    self.stats['errors_by_type'][error_type] = self.stats['errors_by_type'].get(error_type, 0) + 1

                invalid_articles.append({
                    'index': i,
                    'original': article,
                    'errors': errors
                })

                self.stats['invalid_articles'] += 1

                logger.warning(f"Article {i} validation failed: {len(errors)} errors")

        return valid_articles, invalid_articles

    def get_validation_report(self) -> Dict[str, Any]:
        """Generate validation statistics report"""
        total = self.stats['total_processed']
        valid = self.stats['valid_articles']
        invalid = self.stats['invalid_articles']

        return {
            'summary': {
                'total_processed': total,
                'valid_articles': valid,
                'invalid_articles': invalid,
                'validation_rate': valid / total if total > 0 else 0
            },
            'errors': {
                'by_field': self.stats['errors_by_field'],
                'by_type': self.stats['errors_by_type']
            },
            'recommendations': self._generate_recommendations()
        }

    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on error patterns"""
        recommendations = []

        if self.stats['errors_by_field'].get('url', 0) > 0:
            recommendations.append("Review URL validation - some URLs may be malformed")

        if self.stats['errors_by_field'].get('content', 0) > 0:
            recommendations.append("Content validation issues - check minimum length requirements")

        if self.stats['errors_by_field'].get('title', 0) > 0:
            recommendations.append("Title validation issues - ensure titles are meaningful and not empty")

        if self.stats['errors_by_type'].get('value_error.const', 0) > 0:
            recommendations.append("Some fields contain invalid constant values")

        return recommendations

class ContentQualityValidator:
    """Advanced content quality validation"""

    def __init__(self):
        self.min_content_words = 50
        self.max_duplicate_percentage = 0.3
        self.suspicious_patterns = [
            r'\b(buy now|click here|subscribe now)\b',
            r'\b\d{10,}\b',  # Long numbers (potentially phone numbers)
            r'(.)\1{10,}',   # Excessive character repetition
        ]

    def validate_content_quality(self, content: str) -> Tuple[bool, List[str]]:
        """Validate content quality"""
        issues = []

        if not content:
            return False, ["Content is empty"]

        words = content.split()

        # Check word count
        if len(words) < self.min_content_words:
            issues.append(f"Content has only {len(words)} words (minimum {self.min_content_words})")

        # Check for excessive duplicates
        from collections import Counter
        word_counts = Counter(words)
        total_words = len(words)
        duplicate_percentage = sum(count for word, count in word_counts.items() if count > 1) / total_words

        if duplicate_percentage > self.max_duplicate_percentage:
            issues.append(".1f")

        # Check for suspicious patterns
        for pattern in self.suspicious_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                issues.append(f"Content contains suspicious pattern: {pattern}")

        # Check language (basic check)
        english_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'}
        content_lower = content.lower()
        english_word_count = sum(1 for word in english_words if word in content_lower)

        if english_word_count < len(english_words) * 0.3:
            issues.append("Content may not be in English")

        return len(issues) == 0, issues
```

### Part 2: Data Transformation Pipeline

#### Step 2: Create Data Transformers

**processors/transformers/article_transformer.py:**
```python
from typing import Dict, Any, Optional, List
from datetime import datetime
import re
import hashlib
from urllib.parse import urlparse

class ArticleTransformer:
    """Transform raw article data into standardized format"""

    def __init__(self):
        self.url_processor = URLProcessor()
        self.content_processor = ContentProcessor()
        self.metadata_extractor = MetadataExtractor()

    def transform(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Transform a single article"""
        transformed = article.copy()

        # Generate slug from title
        transformed['slug'] = self._generate_slug(article.get('title', ''))

        # Normalize URL
        transformed['url'] = self.url_processor.normalize_url(article['url'])

        # Process content
        if 'content' in article:
            transformed.update(self.content_processor.process_content(article['content']))

        # Extract and normalize metadata
        transformed.update(self.metadata_extractor.extract_metadata(article))

        # Generate content hash for deduplication
        transformed['content_hash'] = self._generate_content_hash(
            article.get('title', ''),
            article.get('content', ''),
            article.get('url', '')
        )

        # Add processing timestamp
        transformed['processed_at'] = datetime.now()

        return transformed

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title"""
        if not title:
            return f"article-{int(datetime.now().timestamp())}"

        # Clean title
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[\s_-]+', '-', slug)
        slug = slug.strip('-')

        # Ensure minimum length
        if len(slug) < 3:
            slug += f"-{int(datetime.now().timestamp())}"

        return slug[:100]  # Limit length

    def _generate_content_hash(self, title: str, content: str, url: str) -> str:
        """Generate hash for content deduplication"""
        content_to_hash = f"{title or ''}|{content or ''}|{url or ''}".lower().strip()
        return hashlib.md5(content_to_hash.encode('utf-8')).hexdigest()

class URLProcessor:
    """Process and normalize URLs"""

    def __init__(self):
        self.tracking_params = {
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', 'session_id', 'ref'
        }

    def normalize_url(self, url: str) -> str:
        """Normalize URL for consistency"""
        if not url:
            return ""

        try:
            parsed = urlparse(url)

            # Normalize scheme
            scheme = parsed.scheme.lower()
            if scheme == 'http' and self._should_be_https(url):
                scheme = 'https'

            # Normalize netloc
            netloc = parsed.netloc.lower()
            if netloc.startswith('www.'):
                netloc = netloc[4:]

            # Clean query parameters
            query_params = []
            if parsed.query:
                for param in parsed.query.split('&'):
                    if '=' in param:
                        key = param.split('=')[0]
                        if key not in self.tracking_params:
                            query_params.append(param)

            query = '&'.join(query_params) if query_params else ''

            # Normalize path
            path = parsed.path
            if len(path) > 1 and path.endswith('/'):
                path = path.rstrip('/')

            # Reconstruct URL
            normalized = f"{scheme}://{netloc}{path}"
            if query:
                normalized += f"?{query}"

            return normalized

        except Exception:
            return url

    def _should_be_https(self, url: str) -> bool:
        """Determine if URL should be HTTPS"""
        # Simple heuristic - most modern sites use HTTPS
        return 'localhost' not in url and '127.0.0.1' not in url

    def extract_domain_info(self, url: str) -> Dict[str, str]:
        """Extract domain information from URL"""
        try:
            parsed = urlparse(url)
            domain_parts = parsed.netloc.split('.')

            return {
                'scheme': parsed.scheme,
                'domain': '.'.join(domain_parts[-2:]) if len(domain_parts) >= 2 else parsed.netloc,
                'subdomain': '.'.join(domain_parts[:-2]) if len(domain_parts) > 2 else '',
                'path': parsed.path,
                'query': parsed.query
            }
        except Exception:
            return {}

class ContentProcessor:
    """Process and analyze article content"""

    def __init__(self):
        self.reading_speed_wpm = 200  # Average reading speed

    def process_content(self, content: str) -> Dict[str, Any]:
        """Process article content and extract metrics"""
        if not content:
            return {
                'word_count': 0,
                'character_count': 0,
                'reading_time_minutes': 0,
                'language': 'unknown'
            }

        # Basic metrics
        word_count = len(content.split())
        character_count = len(content)

        # Estimate reading time
        reading_time = max(1, word_count // self.reading_speed_wpm)

        # Simple language detection
        language = self._detect_language(content)

        # Extract summary if content is long
        summary = self._extract_summary(content) if word_count > 100 else None

        return {
            'word_count': word_count,
            'character_count': character_count,
            'reading_time_minutes': reading_time,
            'language': language,
            'auto_summary': summary
        }

    def _detect_language(self, text: str) -> str:
        """Simple language detection"""
        # Very basic implementation - in production use a proper library
        text_lower = text.lower()

        # Check for common words in different languages
        english_indicators = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to']
        spanish_indicators = ['el', 'la', 'los', 'las', 'y', 'o', 'pero', 'en']
        french_indicators = ['le', 'la', 'les', 'et', 'ou', 'mais', 'dans']

        english_score = sum(1 for word in english_indicators if word in text_lower)
        spanish_score = sum(1 for word in spanish_indicators if word in text_lower)
        french_score = sum(1 for word in french_indicators if word in text_lower)

        max_score = max(english_score, spanish_score, french_score)

        if max_score == 0:
            return 'unknown'
        elif english_score == max_score:
            return 'en'
        elif spanish_score == max_score:
            return 'es'
        else:
            return 'fr'

    def _extract_summary(self, content: str, max_sentences: int = 2) -> str:
        """Extract a simple summary from content"""
        # Split into sentences
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]

        # Take first few sentences
        summary_sentences = sentences[:max_sentences]

        return '. '.join(summary_sentences) + '.'

class MetadataExtractor:
    """Extract and normalize metadata from articles"""

    def extract_metadata(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Extract normalized metadata"""
        metadata = {}

        # Process published date
        published_at = self._normalize_date(article.get('published_at'))
        if published_at:
            metadata['published_at'] = published_at

        # Process author
        author = article.get('author')
        if author:
            metadata['author'] = self._clean_author_name(author)

        # Process tags
        tags = article.get('tags', [])
        if isinstance(tags, list):
            metadata['tags'] = [tag.lower().strip() for tag in tags if tag]

        # Add source information
        metadata['source_domain'] = self._extract_domain(article.get('url', ''))

        # Add content type detection
        metadata['content_type'] = self._detect_content_type(article)

        return metadata

    def _normalize_date(self, date_str: Any) -> Optional[datetime]:
        """Normalize date from various formats"""
        if not date_str:
            return None

        if isinstance(date_str, datetime):
            return date_str

        if isinstance(date_str, str):
            # Try common date formats
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%d',
                '%B %d, %Y',
                '%d/%m/%Y',
                '%m/%d/%Y'
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue

        return None

    def _clean_author_name(self, author: str) -> str:
        """Clean and normalize author name"""
        if not author:
            return ""

        # Remove common prefixes/suffixes
        author = re.sub(r'^(by|author):\s*', '', author, flags=re.IGNORECASE)

        # Clean whitespace
        author = ' '.join(author.split())

        # Capitalize properly
        return author.title()

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except Exception:
            return ""

    def _detect_content_type(self, article: Dict[str, Any]) -> str:
        """Detect content type based on content analysis"""
        content = article.get('content', '').lower()
        title = article.get('title', '').lower()

        # Check for tutorial indicators
        tutorial_indicators = ['tutorial', 'guide', 'how to', 'step by step']
        if any(indicator in title or indicator in content for indicator in tutorial_indicators):
            return 'tutorial'

        # Check for news indicators
        news_indicators = ['breaking', 'news', 'update', 'announced']
        if any(indicator in title for indicator in news_indicators):
            return 'news'

        # Default to article
        return 'article'
```

### Part 3: Data Enrichment Pipeline

#### Step 3: Create Enrichment Processors

**processors/enrichers/content_enricher.py:**
```python
from typing import Dict, Any, List, Optional
import requests
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ContentEnricher:
    """Enrich article content with additional data"""

    def __init__(self):
        self.enrichment_services = {
            'sentiment': SentimentAnalyzer(),
            'keywords': KeywordExtractor(),
            'entities': EntityExtractor(),
            'categories': CategoryClassifier()
        }

    def enrich_article(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich article with additional metadata"""
        enriched = article.copy()
        enrichment_data = {}

        try:
            content = article.get('content', '')
            title = article.get('title', '')

            if content:
                # Perform enrichment
                for service_name, service in self.enrichment_services.items():
                    try:
                        result = service.process(content, title)
                        if result:
                            enrichment_data[service_name] = result
                    except Exception as e:
                        logger.warning(f"Enrichment service {service_name} failed: {e}")

            # Add enrichment metadata
            if enrichment_data:
                enriched['enrichment'] = enrichment_data
                enriched['enriched_at'] = datetime.now()

        except Exception as e:
            logger.error(f"Article enrichment failed: {e}")

        return enriched

class SentimentAnalyzer:
    """Analyze sentiment of article content"""

    def process(self, content: str, title: str) -> Optional[Dict[str, Any]]:
        """Analyze sentiment - simplified implementation"""
        # In production, use libraries like TextBlob, VADER, or cloud services

        text = f"{title} {content}".lower()

        # Simple rule-based sentiment analysis
        positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic']
        negative_words = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointing']

        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)

        total_words = len(text.split())

        if positive_count + negative_count == 0:
            sentiment = 'neutral'
            confidence = 0.5
        else:
            if positive_count > negative_count:
                sentiment = 'positive'
                confidence = positive_count / (positive_count + negative_count)
            elif negative_count > positive_count:
                sentiment = 'negative'
                confidence = negative_count / (positive_count + negative_count)
            else:
                sentiment = 'neutral'
                confidence = 0.5

        return {
            'sentiment': sentiment,
            'confidence': confidence,
            'positive_words': positive_count,
            'negative_words': negative_count
        }

class KeywordExtractor:
    """Extract important keywords from content"""

    def __init__(self):
        # Common stop words
        self.stop_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
            'with', 'by', 'an', 'a', 'is', 'are', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could'
        }

    def process(self, content: str, title: str, max_keywords: int = 10) -> Optional[List[str]]:
        """Extract keywords - simplified implementation"""
        # In production, use libraries like NLTK, spaCy, or cloud services

        # Combine title and content
        text = f"{title} {content}"

        # Simple keyword extraction
        words = text.lower().split()
        words = [word.strip('.,!?;:()[]{}') for word in words]
        words = [word for word in words if len(word) > 2 and word not in self.stop_words]

        # Count word frequencies
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1

        # Sort by frequency
        sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)

        # Return top keywords
        keywords = [word for word, count in sorted_words[:max_keywords]]

        return keywords if keywords else None

class EntityExtractor:
    """Extract named entities from content"""

    def process(self, content: str, title: str) -> Optional[Dict[str, List[str]]]:
        """Extract entities - simplified implementation"""
        # In production, use libraries like spaCy, NLTK, or cloud services

        text = f"{title} {content}"

        entities = {
            'emails': self._extract_emails(text),
            'urls': self._extract_urls(text),
            'phones': self._extract_phones(text),
            'dates': self._extract_dates(text)
        }

        # Only return if we found entities
        total_entities = sum(len(entity_list) for entity_list in entities.values())
        return entities if total_entities > 0 else None

    def _extract_emails(self, text: str) -> List[str]:
        """Extract email addresses"""
        import re
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return re.findall(email_pattern, text)

    def _extract_urls(self, text: str) -> List[str]:
        """Extract URLs"""
        import re
        url_pattern = r'https?://[^\s<>"]+|www\.[^\s<>"]+'
        urls = re.findall(url_pattern, text)
        return list(set(urls))  # Remove duplicates

    def _extract_phones(self, text: str) -> List[str]:
        """Extract phone numbers"""
        import re
        phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
        return re.findall(phone_pattern, text)

    def _extract_dates(self, text: str) -> List[str]:
        """Extract dates - simplified"""
        import re
        date_patterns = [
            r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',  # MM/DD/YYYY
            r'\b\d{1,2}-\d{1,2}-\d{2,4}\b',   # MM-DD-YYYY
            r'\b\w+ \d{1,2}, \d{4}\b',        # Month DD, YYYY
        ]

        dates = []
        for pattern in date_patterns:
            dates.extend(re.findall(pattern, text))

        return list(set(dates))  # Remove duplicates

class CategoryClassifier:
    """Classify articles into categories"""

    def __init__(self):
        self.categories = {
            'technology': ['software', 'hardware', 'programming', 'ai', 'machine learning', 'data science'],
            'business': ['finance', 'marketing', 'startup', 'entrepreneurship', 'economy'],
            'science': ['research', 'physics', 'chemistry', 'biology', 'space'],
            'health': ['medical', 'fitness', 'nutrition', 'disease', 'healthcare'],
            'sports': ['football', 'basketball', 'soccer', 'tennis', 'olympics']
        }

    def process(self, content: str, title: str) -> Optional[List[Dict[str, Any]]]:
        """Classify content into categories"""
        text = f"{title} {content}".lower()

        category_scores = {}

        for category, keywords in self.categories.items():
            score = 0
            for keyword in keywords:
                if keyword in text:
                    score += 1

            if score > 0:
                category_scores[category] = score

        if not category_scores:
            return None

        # Sort by score
        sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)

        # Return top categories with confidence
        results = []
        max_score = max(category_scores.values())

        for category, score in sorted_categories[:3]:  # Top 3
            confidence = score / max_score if max_score > 0 else 0
            results.append({
                'category': category,
                'confidence': confidence,
                'matches': score
            })

        return results if results else None
```

### Part 4: Quality Assurance Pipeline

#### Step 4: Create Quality Assurance System

**processors/quality/data_quality_assurance.py:**
```python
from typing import Dict, Any, List, Tuple
import statistics
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class DataQualityAssurance:
    """Ensure data quality throughout the pipeline"""

    def __init__(self):
        self.quality_thresholds = {
            'min_title_length': 10,
            'max_title_length': 200,
            'min_content_length': 100,
            'max_content_length': 100000,
            'min_reading_time': 2,
            'max_reading_time': 45,
            'required_fields': ['title', 'content', 'url', 'crawled_at'],
            'max_tags': 15,
            'max_days_old': 365 * 2,  # 2 years
            'min_days_future': 1  # 1 day
        }

    def assess_quality(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall quality of an article"""
        quality_score = 0
        max_score = 100
        issues = []

        # Required fields check (20 points)
        required_fields_present = all(article.get(field) for field in self.quality_thresholds['required_fields'])
        if required_fields_present:
            quality_score += 20
        else:
            missing_fields = [field for field in self.quality_thresholds['required_fields'] if not article.get(field)]
            issues.append(f"Missing required fields: {missing_fields}")

        # Title quality (15 points)
        title = article.get('title', '')
        if self.quality_thresholds['min_title_length'] <= len(title) <= self.quality_thresholds['max_title_length']:
            quality_score += 15
            if title.istitle():  # Properly capitalized
                quality_score += 5
        else:
            issues.append("Title length inappropriate")

        # Content quality (25 points)
        content = article.get('content', '')
        word_count = len(content.split())

        if self.quality_thresholds['min_content_length'] <= len(content) <= self.quality_thresholds['max_content_length']:
            quality_score += 15
        else:
            issues.append("Content length inappropriate")

        if word_count >= 100:
            quality_score += 10
        else:
            issues.append("Content too short")

        # Reading time check (10 points)
        reading_time = article.get('reading_time_minutes', 0)
        if self.quality_thresholds['min_reading_time'] <= reading_time <= self.quality_thresholds['max_reading_time']:
            quality_score += 10
        else:
            issues.append("Reading time inappropriate")

        # Metadata completeness (15 points)
        metadata_fields = ['author', 'published_at', 'tags', 'summary']
        metadata_score = sum(1 for field in metadata_fields if article.get(field))
        quality_score += (metadata_score / len(metadata_fields)) * 15

        # Date validation (10 points)
        published_at = article.get('published_at')
        if published_at:
            now = datetime.now()
            days_old = (now - published_at).days if isinstance(published_at, datetime) else 0

            if days_old <= self.quality_thresholds['max_days_old']:
                quality_score += 10
            elif days_old <= self.quality_thresholds['max_days_old'] * 2:
                quality_score += 5
                issues.append("Article is quite old")
        else:
            issues.append("Missing publication date")

        # Tag quality (5 points)
        tags = article.get('tags', [])
        if len(tags) <= self.quality_thresholds['max_tags'] and len(tags) > 0:
            quality_score += 5
        elif len(tags) == 0:
            issues.append("No tags provided")

        return {
            'quality_score': quality_score,
            'max_score': max_score,
            'quality_percentage': (quality_score / max_score) * 100,
            'issues': issues,
            'grade': self._calculate_grade(quality_score)
        }

    def _calculate_grade(self, score: int) -> str:
        """Calculate quality grade"""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'

    def filter_by_quality(self, articles: List[Dict[str, Any]], min_quality: float = 70.0) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Filter articles by quality threshold"""
        passed = []
        failed = []

        for article in articles:
            quality_assessment = self.assess_quality(article)
            article_copy = article.copy()
            article_copy['quality_assessment'] = quality_assessment

            if quality_assessment['quality_percentage'] >= min_quality:
                passed.append(article_copy)
            else:
                failed.append(article_copy)

        return passed, failed

    def generate_quality_report(self, articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate comprehensive quality report"""
        if not articles:
            return {'error': 'No articles to analyze'}

        quality_scores = []
        grade_distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0}
        common_issues = {}

        for article in articles:
            assessment = self.assess_quality(article)
            quality_scores.append(assessment['quality_score'])
            grade_distribution[assessment['grade']] += 1

            for issue in assessment['issues']:
                common_issues[issue] = common_issues.get(issue, 0) + 1

        # Sort common issues
        sorted_issues = sorted(common_issues.items(), key=lambda x: x[1], reverse=True)

        return {
            'summary': {
                'total_articles': len(articles),
                'average_quality': statistics.mean(quality_scores) if quality_scores else 0,
                'median_quality': statistics.median(quality_scores) if quality_scores else 0,
                'min_quality': min(quality_scores) if quality_scores else 0,
                'max_quality': max(quality_scores) if quality_scores else 0
            },
            'grade_distribution': grade_distribution,
            'common_issues': sorted_issues[:10],  # Top 10 issues
            'quality_distribution': {
                'excellent': sum(1 for score in quality_scores if score >= 90),
                'good': sum(1 for score in quality_scores if 80 <= score < 90),
                'fair': sum(1 for score in quality_scores if 70 <= score < 80),
                'poor': sum(1 for score in quality_scores if score < 70)
            }
        }
```

## Integration and Testing

### Complete Processing Pipeline

```python
from processors.validators.article_validator import BatchValidator, ContentQualityValidator
from processors.transformers.article_transformer import ArticleTransformer
from processors.enrichers.content_enricher import ContentEnricher
from processors.quality.data_quality_assurance import DataQualityAssurance
import logging

logger = logging.getLogger(__name__)

class CompleteDataProcessingPipeline:
    """Complete data processing pipeline"""

    def __init__(self):
        self.validator = BatchValidator()
        self.quality_validator = ContentQualityValidator()
        self.transformer = ArticleTransformer()
        self.enricher = ContentEnricher()
        self.quality_assurance = DataQualityAssurance()

    async def process_batch(self, raw_articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process a complete batch through all pipeline stages"""
        start_time = datetime.now()
        stats = {
            'input_count': len(raw_articles),
            'validation_passed': 0,
            'quality_passed': 0,
            'transformed': 0,
            'enriched': 0,
            'final_quality_passed': 0
        }

        # Stage 1: Schema Validation
        logger.info(f"Starting schema validation for {len(raw_articles)} articles")
        valid_articles, invalid_articles = self.validator.validate_batch(raw_articles)
        stats['validation_passed'] = len(valid_articles)

        if not valid_articles:
            return self._create_result(stats, [], invalid_articles, start_time)

        # Stage 2: Content Quality Validation
        logger.info(f"Starting quality validation for {len(valid_articles)} articles")
        quality_passed = []
        quality_failed = []

        for article in valid_articles:
            content = article.get('content', '')
            is_quality, issues = self.quality_validator.validate_content_quality(content)

            if is_quality:
                quality_passed.append(article)
            else:
                quality_failed.append({
                    'article': article,
                    'quality_issues': issues
                })

        stats['quality_passed'] = len(quality_passed)
        all_invalid = invalid_articles + quality_failed

        if not quality_passed:
            return self._create_result(stats, [], all_invalid, start_time)

        # Stage 3: Transformation
        logger.info(f"Starting transformation for {len(quality_passed)} articles")
        transformed_articles = []

        for article in quality_passed:
            try:
                transformed = self.transformer.transform(article)
                transformed_articles.append(transformed)
            except Exception as e:
                logger.error(f"Transformation failed for article: {e}")
                all_invalid.append({'article': article, 'error': f'Transformation failed: {e}'})

        stats['transformed'] = len(transformed_articles)

        # Stage 4: Enrichment
        logger.info(f"Starting enrichment for {len(transformed_articles)} articles")
        enriched_articles = []

        for article in transformed_articles:
            try:
                enriched = self.enricher.enrich_article(article)
                enriched_articles.append(enriched)
            except Exception as e:
                logger.warning(f"Enrichment failed for article: {e}")
                # Still include article even if enrichment fails
                enriched_articles.append(article)

        stats['enriched'] = len(enriched_articles)

        # Stage 5: Final Quality Assurance
        logger.info(f"Starting final quality assurance for {len(enriched_articles)} articles")
        final_passed, final_failed = self.quality_assurance.filter_by_quality(
            enriched_articles, min_quality=60.0
        )

        stats['final_quality_passed'] = len(final_passed)
        all_invalid.extend(final_failed)

        # Generate quality report
        quality_report = self.quality_assurance.generate_quality_report(enriched_articles)

        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()

        result = {
            'success': True,
            'processed_articles': final_passed,
            'rejected_articles': all_invalid,
            'statistics': stats,
            'quality_report': quality_report,
            'processing_time_seconds': processing_time,
            'processing_rate': len(final_passed) / processing_time if processing_time > 0 else 0
        }

        logger.info(f"Pipeline completed: {len(final_passed)} articles processed in {processing_time:.2f}s")
        return result

    def _create_result(self, stats: Dict, processed: List, rejected: List, start_time: datetime) -> Dict:
        """Create result dictionary"""
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()

        return {
            'success': len(processed) > 0,
            'processed_articles': processed,
            'rejected_articles': rejected,
            'statistics': stats,
            'processing_time_seconds': processing_time
        }
```

## Testing the Processing Pipeline

### Unit Tests

```python
import pytest
from processors.validators.article_validator import BatchValidator
from processors.transformers.article_transformer import ArticleTransformer

class TestDataProcessing:
    def test_article_validation(self):
        """Test article validation"""
        validator = BatchValidator()

        valid_article = {
            'url': 'https://example.com/article1',
            'title': 'Valid Article Title',
            'content': 'This is valid content that meets the minimum requirements for validation.',
            'crawled_at': '2023-12-01T10:00:00Z'
        }

        invalid_article = {
            'url': 'invalid-url',
            'title': '',
            'content': 'Too short',
            'crawled_at': '2023-12-01T10:00:00Z'
        }

        valid, invalid = validator.validate_batch([valid_article, invalid_article])

        assert len(valid) == 1
        assert len(invalid) == 1
        assert invalid[0]['errors'][0]['field'] == 'title'

    def test_article_transformation(self):
        """Test article transformation"""
        transformer = ArticleTransformer()

        raw_article = {
            'url': 'https://example.com/test?utm_source=newsletter',
            'title': 'Test Article!',
            'content': 'This is test content for transformation.',
            'published_at': '2023-12-01T10:00:00Z'
        }

        transformed = transformer.transform(raw_article)

        assert transformed['url'] == 'https://example.com/test'  # UTM removed
        assert transformed['slug'] == 'test-article'  # Generated slug
        assert 'word_count' in transformed
        assert 'reading_time_minutes' in transformed
```

## Hands-on Exercises

### Exercise 1: Custom Validation Rules
1. Create custom validation for specific content types (news, tutorials, blogs)
2. Implement domain-specific validation rules
3. Add custom error messages and suggestions
4. Test validation with various content types

### Exercise 2: Advanced Transformation
1. Implement content summarization using extractive methods
2. Add automatic tag generation based on content analysis
3. Create content categorization using machine learning
4. Implement content deduplication at the transformation stage

### Exercise 3: Quality Monitoring
1. Set up quality monitoring dashboards
2. Implement alerting for quality degradation
3. Create quality improvement workflows
4. Monitor quality metrics over time

## Next Steps
- [Duplicate Handling Tutorial](../tutorials/04-duplicate-handling.md)
- [Workshop: Search API Implementation](../workshops/workshop-03-search-api.md)

## Additional Resources
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)
- [Data Validation Best Practices](https://docs.python.org/3/library/stdtypes.html)
- [ETL Pipeline Patterns](https://martinfowler.com/articles/evodb.html)
- [Data Quality Management](https://www.databricks.com/glossary/data-quality)
