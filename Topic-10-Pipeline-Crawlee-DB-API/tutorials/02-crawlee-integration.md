# Tutorial 02: Crawlee Integration with ETL Pipelines

## Overview
This tutorial covers integrating Crawlee web scraping framework with ETL pipelines. You'll learn how to build scalable web scraping solutions that feed data into processing pipelines, handle rate limiting, manage crawl sessions, and ensure data quality in production environments.

## Crawlee Fundamentals

### What is Crawlee?

Crawlee is a web scraping and browser automation library for Node.js that helps you build reliable crawlers. It provides:

- **Request Routing**: Handle different types of pages
- **Auto-scaling**: Automatically manage concurrency
- **Error Handling**: Built-in retry mechanisms
- **Data Storage**: Multiple storage backends
- **Browser Automation**: Puppeteer/Playwright integration

### Basic Crawlee Architecture

```javascript
import { CheerioCrawler, Dataset } from 'crawlee';

const crawler = new CheerioCrawler({
    // Configure the crawler
    maxRequestsPerCrawl: 100,
    maxConcurrency: 10,

    // Handle each page
    async requestHandler({ $, request, enqueueLinks }) {
        // Extract data
        const title = $('title').text();
        const links = $('a[href]');

        // Store data
        await Dataset.pushData({
            url: request.url,
            title: title,
            crawledAt: new Date().toISOString()
        });

        // Enqueue more links
        await enqueueLinks();
    },
});

await crawler.run(['https://example.com']);
```

## Integrating Crawlee with ETL Pipelines

### 1. ETL-Aware Crawler Design

#### Data Extraction Layer
```javascript
import { CheerioCrawler, Dataset, RequestQueue } from 'crawlee';
import { ETLExtractor } from './etl/extractor.js';

class ETLIntegratedCrawler {
    constructor(etlExtractor) {
        this.etlExtractor = etlExtractor;
        this.crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 1000,
            maxConcurrency: 5,
            requestHandler: this.handleRequest.bind(this),
            failedRequestHandler: this.handleFailedRequest.bind(this),
        });
    }

    async handleRequest({ $, request, enqueueLinks, log }) {
        try {
            // Extract structured data
            const rawData = this.extractPageData($, request);

            // Pass to ETL pipeline
            await this.etlExtractor.process(rawData);

            // Continue crawling
            await this.enqueueRelevantLinks($, enqueueLinks);

            log.info(`Processed ${request.url}`);

        } catch (error) {
            log.error(`Failed to process ${request.url}: ${error.message}`);
            throw error;
        }
    }

    extractPageData($, request) {
        return {
            url: request.url,
            title: $('title').text().trim(),
            content: $('article, .content, .post').text().trim(),
            author: this.extractAuthor($),
            publishedAt: this.extractPublishedDate($),
            tags: this.extractTags($),
            metadata: {
                crawledAt: new Date().toISOString(),
                contentType: $('meta[property="og:type"]').attr('content'),
                description: $('meta[name="description"]').attr('content'),
            }
        };
    }

    async handleFailedRequest({ request, error, log }) {
        // Log failed requests for ETL error handling
        await this.etlExtractor.handleFailedRequest({
            url: request.url,
            error: error.message,
            retryCount: request.retryCount,
            timestamp: new Date().toISOString()
        });

        log.warning(`Request failed: ${request.url} - ${error.message}`);
    }
}
```

#### ETL Extractor Interface
```javascript
class ETLExtractor {
    constructor(etlPipeline) {
        this.etlPipeline = etlPipeline;
        this.batchSize = 10;
        this.batch = [];
    }

    async process(rawData) {
        // Add to batch
        this.batch.push(rawData);

        // Process batch when full
        if (this.batch.length >= this.batchSize) {
            await this.flushBatch();
        }
    }

    async flushBatch() {
        if (this.batch.length === 0) return;

        try {
            // Send batch to ETL pipeline
            await this.etlPipeline.ingestBatch(this.batch);
            this.batch = [];
        } catch (error) {
            console.error('Failed to process batch:', error);
            // Could implement retry logic here
        }
    }

    async handleFailedRequest(failedRequestData) {
        // Send failed requests to error handling pipeline
        await this.etlPipeline.handleError(failedRequestData);
    }

    async finalize() {
        // Flush remaining items
        await this.flushBatch();
    }
}
```

### 2. Rate Limiting and Politeness

#### Respectful Crawling Configuration
```javascript
import { CheerioCrawler } from 'crawlee';

const crawler = new CheerioCrawler({
    // Rate limiting
    maxConcurrency: 2,  // Limit concurrent requests
    maxRequestsPerCrawl: 100,

    // Request configuration
    requestHandlerTimeoutSecs: 30,
    ignoreSslErrors: false,

    // Politeness settings
    additionalMimeTypes: ['application/json'],
    downloadDelayMs: 1000,  // 1 second delay between requests

    // User agent rotation
    preNavigationHooks: [
        async ({ request }) => {
            // Rotate user agents
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            ];
            request.userData.userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        }
    ],

    // Handle different response types
    requestHandler: async ({ $, request, json, response }) => {
        if (response.headers['content-type']?.includes('application/json')) {
            // Handle JSON API responses
            await handleJsonResponse(json, request);
        } else {
            // Handle HTML responses
            await handleHtmlResponse($, request);
        }
    }
});
```

#### Domain-Specific Rate Limiting
```javascript
class PoliteCrawler {
    constructor() {
        this.domainLimits = {
            'example.com': { requestsPerMinute: 10, delayMs: 6000 },
            'news-site.com': { requestsPerMinute: 5, delayMs: 12000 },
            'default': { requestsPerMinute: 2, delayMs: 30000 }
        };

        this.lastRequestTime = new Map();
    }

    getDomainConfig(url) {
        const domain = new URL(url).hostname;
        return this.domainLimits[domain] || this.domainLimits.default;
    }

    async waitForNextRequest(url) {
        const config = this.getDomainConfig(url);
        const now = Date.now();
        const lastTime = this.lastRequestTime.get(url) || 0;
        const timeSinceLastRequest = now - lastTime;

        if (timeSinceLastRequest < config.delayMs) {
            const waitTime = config.delayMs - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime.set(url, Date.now());
    }

    async makeRequest(url) {
        await this.waitForNextRequest(url);
        // Make actual request
        return fetch(url);
    }
}
```

### 3. Session Management and State Persistence

#### Crawl Session Tracking
```javascript
import { CheerioCrawler, Dataset, KeyValueStore } from 'crawlee';

class StatefulCrawler {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.sessionStore = await KeyValueStore.open(`session-${sessionId}`);
        this.stats = {
            startedAt: new Date().toISOString(),
            urlsProcessed: 0,
            dataExtracted: 0,
            errors: 0
        };
    }

    async initialize() {
        // Load existing session state
        const savedStats = await this.sessionStore.getValue('stats');
        if (savedStats) {
            this.stats = { ...this.stats, ...savedStats };
        }
    }

    async updateStats(updates) {
        Object.assign(this.stats, updates);
        this.stats.updatedAt = new Date().toISOString();
        await this.sessionStore.setValue('stats', this.stats);
    }

    async createCrawler() {
        const crawler = new CheerioCrawler({
            requestHandler: async ({ $, request }) => {
                try {
                    // Process page
                    const data = this.extractData($, request);

                    // Store extracted data
                    await Dataset.pushData({
                        sessionId: this.sessionId,
                        ...data
                    });

                    // Update stats
                    await this.updateStats({
                        urlsProcessed: this.stats.urlsProcessed + 1,
                        dataExtracted: this.stats.dataExtracted + 1
                    });

                } catch (error) {
                    await this.updateStats({
                        errors: this.stats.errors + 1
                    });
                    throw error;
                }
            },

            failedRequestHandler: async ({ request, error }) => {
                await this.updateStats({
                    errors: this.stats.errors + 1
                });

                // Store failed request for retry
                await Dataset.pushData({
                    sessionId: this.sessionId,
                    type: 'failed_request',
                    url: request.url,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        return crawler;
    }

    async finalize() {
        // Save final statistics
        this.stats.completedAt = new Date().toISOString();
        await this.sessionStore.setValue('final_stats', this.stats);

        // Close session store
        await this.sessionStore.drop();
    }
}
```

### 4. Error Handling and Recovery

#### Robust Error Handling
```javascript
class ResilientCrawler {
    constructor() {
        this.maxRetries = 3;
        this.retryDelays = [1000, 5000, 30000]; // Progressive backoff
        this.failedRequests = new Map();
    }

    async crawlWithRetry(urls) {
        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 1000,
            requestHandler: this.handleRequest.bind(this),
            failedRequestHandler: this.handleFailure.bind(this),
        });

        // Initial crawl
        await crawler.run(urls);

        // Retry failed requests
        await this.retryFailedRequests(crawler);
    }

    async handleRequest({ $, request, enqueueLinks }) {
        try {
            const data = this.extractData($, request);
            await this.etlPipeline.process(data);

            // Clear from failed requests if it was retried
            this.failedRequests.delete(request.url);

        } catch (error) {
            console.error(`Processing failed for ${request.url}:`, error);
            throw error;
        }
    }

    async handleFailure({ request, error }) {
        const failureCount = this.failedRequests.get(request.url) || 0;

        if (failureCount < this.maxRetries) {
            this.failedRequests.set(request.url, failureCount + 1);
            console.log(`Request failed (${failureCount + 1}/${this.maxRetries}): ${request.url}`);
        } else {
            // Permanent failure - log and skip
            await this.logPermanentFailure(request, error);
        }
    }

    async retryFailedRequests(crawler) {
        const retryUrls = Array.from(this.failedRequests.entries())
            .filter(([_, count]) => count < this.maxRetries)
            .map(([url, _]) => url);

        if (retryUrls.length > 0) {
            console.log(`Retrying ${retryUrls.length} failed requests`);
            await crawler.run(retryUrls);
        }
    }

    async logPermanentFailure(request, error) {
        // Send to ETL error pipeline
        await this.etlPipeline.handlePermanentFailure({
            url: request.url,
            error: error.message,
            finalFailure: true,
            timestamp: new Date().toISOString()
        });
    }
}
```

### 5. Data Quality and Validation

#### Content Validation
```javascript
class QualityAssuredCrawler {
    constructor() {
        this.qualityChecks = {
            minimumContentLength: 100,
            requiredFields: ['title', 'content'],
            maximumDuplicatePercentage: 0.1
        };
        this.processedContent = new Set();
    }

    validateExtractedData(data) {
        const errors = [];

        // Check required fields
        for (const field of this.qualityChecks.requiredFields) {
            if (!data[field] || data[field].trim().length === 0) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Check content length
        if (data.content && data.content.length < this.qualityChecks.minimumContentLength) {
            errors.push(`Content too short: ${data.content.length} characters`);
        }

        // Check for duplicates
        const contentHash = this.generateContentHash(data);
        if (this.processedContent.has(contentHash)) {
            errors.push('Duplicate content detected');
        }

        // Domain-specific validations
        if (data.url.includes('news-site.com')) {
            if (!data.publishedAt) {
                errors.push('News articles must have publication date');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            hash: contentHash
        };
    }

    generateContentHash(data) {
        const content = `${data.title || ''}${data.content || ''}`.toLowerCase().trim();
        return require('crypto').createHash('md5').update(content).digest('hex');
    }

    async processWithQualityCheck(data) {
        const validation = this.validateExtractedData(data);

        if (validation.isValid) {
            // Mark as processed
            this.processedContent.add(validation.hash);

            // Send to ETL pipeline
            await this.etlPipeline.process(data);
        } else {
            // Send to quality issues pipeline
            await this.etlPipeline.handleQualityIssue({
                data: data,
                validationErrors: validation.errors,
                timestamp: new Date().toISOString()
            });
        }
    }
}
```

## Integrating with Python ETL Pipeline

### 1. Cross-Language Communication

#### HTTP API Bridge
```javascript
// crawlee/exporter.js
const express = require('express');
const app = express();

app.use(express.json());

class HttpETLBridge {
    constructor(pythonApiUrl = 'http://localhost:8000') {
        this.pythonApiUrl = pythonApiUrl;
    }

    async sendBatchToETL(batchData) {
        try {
            const response = await fetch(`${this.pythonApiUrl}/etl/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'crawlee',
                    data: batchData,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`ETL API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to send data to ETL pipeline:', error);
            throw error;
        }
    }
}
```

#### Message Queue Integration
```javascript
// crawlee/queue_producer.js
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

class QueueETLBridge {
    constructor(queueUrl) {
        this.sqsClient = new SQSClient({ region: process.env.AWS_REGION });
        this.queueUrl = queueUrl;
    }

    async sendToETL(data) {
        const command = new SendMessageCommand({
            QueueUrl: this.queueUrl,
            MessageBody: JSON.stringify({
                source: 'crawlee',
                type: 'crawled_data',
                data: data,
                timestamp: new Date().toISOString()
            })
        });

        try {
            const result = await this.sqsClient.send(command);
            console.log(`Sent data to ETL queue: ${result.MessageId}`);
            return result;
        } catch (error) {
            console.error('Failed to send to ETL queue:', error);
            throw error;
        }
    }
}
```

### 2. Configuration Management

#### Environment-Based Configuration
```javascript
// crawlee/config.js
const config = {
    development: {
        maxConcurrency: 2,
        maxRequestsPerCrawl: 50,
        downloadDelayMs: 2000,
        etlEndpoint: 'http://localhost:8000/etl/ingest'
    },
    production: {
        maxConcurrency: 10,
        maxRequestsPerCrawl: 10000,
        downloadDelayMs: 500,
        etlEndpoint: process.env.ETL_ENDPOINT
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
```

## Performance Optimization

### 1. Concurrent Processing
```javascript
class OptimizedCrawler {
    constructor() {
        this.crawler = new CheerioCrawler({
            maxConcurrency: 5,  // Adjust based on target site
            maxRequestsPerCrawl: 1000,

            // Use request queue for better control
            useSessionPool: true,
            sessionPoolOptions: {
                maxPoolSize: 100,
                sessionOptions: {
                    maxUsageCount: 50,
                    maxAgeSecs: 3600
                }
            }
        });
    }

    async crawlOptimized(urls) {
        // Pre-warm connections
        await this.warmupConnections(urls.slice(0, 5));

        // Start crawling
        await this.crawler.run(urls);
    }

    async warmupConnections(sampleUrls) {
        // Make initial requests to establish connections
        const promises = sampleUrls.map(url =>
            fetch(url, { method: 'HEAD' }).catch(() => null)
        );
        await Promise.all(promises);
    }
}
```

### 2. Memory Management
```javascript
class MemoryEfficientCrawler {
    constructor() {
        this.batchSize = 50;
        this.pendingBatch = [];
    }

    async processWithMemoryManagement({ $, request }) {
        const data = this.extractData($, request);
        this.pendingBatch.push(data);

        // Process batch when full
        if (this.pendingBatch.length >= this.batchSize) {
            await this.flushBatch();
        }
    }

    async flushBatch() {
        if (this.pendingBatch.length === 0) return;

        try {
            await this.etlPipeline.processBatch(this.pendingBatch);
            this.pendingBatch = [];  // Clear memory
        } catch (error) {
            console.error('Batch processing failed:', error);
            // Keep batch for retry
        }
    }

    async finalize() {
        // Flush remaining items
        await this.flushBatch();
    }
}
```

## Monitoring and Debugging

### 1. Crawler Metrics
```javascript
class MonitoredCrawler {
    constructor() {
        this.metrics = {
            requestsTotal: 0,
            requestsSuccessful: 0,
            requestsFailed: 0,
            dataExtracted: 0,
            averageResponseTime: 0,
            startTime: Date.now()
        };
    }

    updateMetrics(success, responseTime, dataCount) {
        this.metrics.requestsTotal++;

        if (success) {
            this.metrics.requestsSuccessful++;
            this.metrics.dataExtracted += dataCount;
        } else {
            this.metrics.requestsFailed++;
        }

        // Update average response time
        const totalTime = Date.now() - this.metrics.startTime;
        const totalRequests = this.metrics.requestsTotal;
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }

    getMetrics() {
        const uptime = Date.now() - this.metrics.startTime;
        return {
            ...this.metrics,
            uptime,
            successRate: this.metrics.requestsSuccessful / Math.max(this.metrics.requestsTotal, 1)
        };
    }

    async logMetrics() {
        const metrics = this.getMetrics();
        console.log('Crawler Metrics:', JSON.stringify(metrics, null, 2));
    }
}
```

## Best Practices

### 1. Respectful Crawling
- Always check robots.txt
- Implement appropriate delays
- Limit concurrent requests
- Handle rate limiting gracefully
- Identify your crawler

### 2. Error Resilience
- Implement retry logic with backoff
- Handle network timeouts
- Deal with anti-bot measures
- Log failures for analysis
- Have fallback strategies

### 3. Data Quality
- Validate extracted data
- Handle missing or malformed content
- Deduplicate content
- Clean and normalize data
- Monitor data quality metrics

### 4. Scalability
- Use request queues
- Implement batch processing
- Monitor resource usage
- Scale horizontally when needed
- Cache frequently accessed data

## Hands-on Exercises

### Exercise 1: Basic Crawlee ETL Integration
1. Set up a Crawlee crawler that extracts article data
2. Create an ETL extractor class to process the data
3. Implement basic error handling and logging
4. Test the complete extraction pipeline

### Exercise 2: Rate Limiting and Politeness
1. Implement domain-specific rate limiting
2. Add user agent rotation
3. Configure appropriate delays between requests
4. Test with different target websites

### Exercise 3: Error Handling and Recovery
1. Add comprehensive error handling for network issues
2. Implement retry logic with exponential backoff
3. Create dead letter queue for failed requests
4. Test error recovery scenarios

## Next Steps
- [Data Processing Tutorial](../tutorials/03-data-processing.md)
- [Workshop: Crawlee ETL Pipeline](../workshops/workshop-01-crawlee-etl.md)

## Additional Resources
- [Crawlee Documentation](https://crawlee.dev/)
- [Web Scraping Best Practices](https://blog.apify.com/web-scraping-legality/)
- [ETL Pipeline Patterns](https://martinfowler.com/articles/evodb.html)
- [Rate Limiting Strategies](https://cloud.google.com/apis/docs/rate-limiting)
