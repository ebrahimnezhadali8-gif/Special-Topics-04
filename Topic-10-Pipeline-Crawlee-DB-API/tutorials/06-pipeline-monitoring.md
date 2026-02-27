# Tutorial 06: Pipeline Monitoring, Logging, and Observability

## Overview
This tutorial covers comprehensive monitoring and observability for ETL pipelines. You'll learn to implement structured logging, collect metrics, set up health checks, create dashboards, and build alerting systems to ensure pipeline reliability and performance.

## Logging Fundamentals

### Structured Logging Setup

```python
import logging
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import traceback

class StructuredLogger:
    """Structured logger for ETL pipeline operations"""

    def __init__(self, name: str, level: int = logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)

        # Remove existing handlers
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)

        # Add structured handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        self.logger.addHandler(handler)

    def log_operation(self, operation: str, status: str, details: Dict[str, Any] = None,
                     duration: Optional[float] = None, error: Optional[Exception] = None):
        """Log ETL operation with structured data"""
        log_data = {
            'operation': operation,
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }

        if duration is not None:
            log_data['duration_seconds'] = duration

        if error:
            log_data['error'] = {
                'type': type(error).__name__,
                'message': str(error),
                'traceback': traceback.format_exc()
            }

        if status == 'error':
            self.logger.error(json.dumps(log_data))
        elif status == 'warning':
            self.logger.warning(json.dumps(log_data))
        else:
            self.logger.info(json.dumps(log_data))

class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured logging"""

    def format(self, record):
        # Try to parse JSON from message
        try:
            log_data = json.loads(record.getMessage())
            return json.dumps(log_data, indent=2)
        except (json.JSONDecodeError, TypeError):
            # Fall back to standard formatting
            return super().format(record)

# Usage
logger = StructuredLogger('etl_pipeline')

# Log operations
logger.log_operation(
    operation='extract_articles',
    status='success',
    details={'articles_found': 150, 'source': 'techcrunch.com'},
    duration=2.5
)

logger.log_operation(
    operation='transform_data',
    status='error',
    details={'stage': 'validation', 'failed_records': 5},
    error=ValueError("Invalid data format")
)
```

### Log Levels and Categories

```python
class ETLPipelineLogger:
    """Specialized logger for ETL pipeline events"""

    def __init__(self):
        self.logger = StructuredLogger('etl_pipeline')

    def log_crawler_start(self, source_url: str, crawl_id: str):
        """Log crawler startup"""
        self.logger.log_operation(
            operation='crawler_start',
            status='info',
            details={
                'source_url': source_url,
                'crawl_id': crawl_id,
                'event_type': 'crawler_lifecycle'
            }
        )

    def log_crawler_progress(self, crawl_id: str, pages_processed: int,
                           total_pages: int, errors: int):
        """Log crawler progress"""
        progress_percentage = (pages_processed / total_pages) * 100 if total_pages > 0 else 0

        self.logger.log_operation(
            operation='crawler_progress',
            status='info',
            details={
                'crawl_id': crawl_id,
                'pages_processed': pages_processed,
                'total_pages': total_pages,
                'progress_percentage': progress_percentage,
                'errors': errors,
                'event_type': 'crawler_progress'
            }
        )

    def log_data_processing(self, operation: str, records_processed: int,
                          records_failed: int, duration: float):
        """Log data processing operations"""
        success_rate = records_processed / (records_processed + records_failed) * 100

        status = 'success' if records_failed == 0 else 'warning' if records_failed < records_processed * 0.1 else 'error'

        self.logger.log_operation(
            operation=f'process_{operation}',
            status=status,
            details={
                'records_processed': records_processed,
                'records_failed': records_failed,
                'success_rate': success_rate,
                'event_type': 'data_processing'
            },
            duration=duration
        )

    def log_database_operation(self, operation: str, table: str,
                             records_affected: int, duration: float):
        """Log database operations"""
        self.logger.log_operation(
            operation=f'db_{operation}',
            status='success',
            details={
                'table': table,
                'records_affected': records_affected,
                'event_type': 'database_operation'
            },
            duration=duration
        )

    def log_pipeline_error(self, stage: str, error: Exception, context: Dict[str, Any]):
        """Log pipeline errors"""
        self.logger.log_operation(
            operation=f'pipeline_error_{stage}',
            status='error',
            details={
                'stage': stage,
                'context': context,
                'event_type': 'pipeline_error'
            },
            error=error
        )

    def log_pipeline_completion(self, pipeline_id: str, stats: Dict[str, Any], duration: float):
        """Log pipeline completion"""
        status = 'success' if stats.get('errors', 0) == 0 else 'warning'

        self.logger.log_operation(
            operation='pipeline_complete',
            status=status,
            details={
                'pipeline_id': pipeline_id,
                'stats': stats,
                'event_type': 'pipeline_completion'
            },
            duration=duration
        )
```

## Metrics Collection

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram, Gauge, Summary
import time

class ETLMetrics:
    """Prometheus metrics for ETL pipeline monitoring"""

    def __init__(self):
        # Counters for cumulative metrics
        self.records_processed = Counter(
            'etl_records_processed_total',
            'Total number of records processed',
            ['pipeline', 'stage', 'status']
        )

        self.crawler_requests = Counter(
            'etl_crawler_requests_total',
            'Total number of crawler requests',
            ['source', 'status']
        )

        self.database_operations = Counter(
            'etl_database_operations_total',
            'Total number of database operations',
            ['operation', 'table', 'status']
        )

        # Histograms for timing metrics
        self.operation_duration = Histogram(
            'etl_operation_duration_seconds',
            'Duration of ETL operations',
            ['pipeline', 'stage', 'operation']
        )

        self.crawler_request_duration = Histogram(
            'etl_crawler_request_duration_seconds',
            'Duration of crawler requests',
            ['source']
        )

        # Gauges for current state
        self.active_pipelines = Gauge(
            'etl_active_pipelines',
            'Number of currently active pipelines',
            ['pipeline_type']
        )

        self.queue_size = Gauge(
            'etl_queue_size',
            'Current size of processing queues',
            ['queue_name']
        )

        self.memory_usage = Gauge(
            'etl_memory_usage_bytes',
            'Current memory usage',
            ['component']
        )

        # Summary for percentile metrics
        self.pipeline_runtime = Summary(
            'etl_pipeline_runtime_seconds',
            'Total runtime of ETL pipelines',
            ['pipeline_type']
        )

    def record_record_processing(self, pipeline: str, stage: str, status: str, count: int = 1):
        """Record record processing metrics"""
        self.records_processed.labels(pipeline, stage, status).inc(count)

    def record_crawler_request(self, source: str, status: str, duration: float):
        """Record crawler request metrics"""
        self.crawler_requests.labels(source, status).inc()
        self.crawler_request_duration.labels(source).observe(duration)

    def record_database_operation(self, operation: str, table: str, status: str, duration: float):
        """Record database operation metrics"""
        self.database_operations.labels(operation, table, status).inc()
        self.operation_duration.labels('database', table, operation).observe(duration)

    def start_pipeline(self, pipeline_type: str):
        """Mark pipeline as started"""
        self.active_pipelines.labels(pipeline_type).inc()

    def end_pipeline(self, pipeline_type: str, duration: float):
        """Mark pipeline as completed"""
        self.active_pipelines.labels(pipeline_type).dec()
        self.pipeline_runtime.labels(pipeline_type).observe(duration)

    def update_queue_size(self, queue_name: str, size: int):
        """Update queue size metric"""
        self.queue_size.labels(queue_name).set(size)

    def update_memory_usage(self, component: str, usage_bytes: int):
        """Update memory usage metric"""
        self.memory_usage.labels(component).set(usage_bytes)

# Global metrics instance
metrics = ETLMetrics()

class MetricsCollector:
    """Context manager for collecting operation metrics"""

    def __init__(self, operation_type: str, **labels):
        self.operation_type = operation_type
        self.labels = labels
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time

        if exc_type:
            # Operation failed
            metrics.operation_duration.labels(
                pipeline=self.labels.get('pipeline', 'unknown'),
                stage=self.labels.get('stage', 'unknown'),
                operation=self.operation_type
            ).observe(duration)
        else:
            # Operation succeeded
            metrics.operation_duration.labels(
                pipeline=self.labels.get('pipeline', 'unknown'),
                stage=self.labels.get('stage', 'unknown'),
                operation=self.operation_type
            ).observe(duration)

# Usage
with MetricsCollector('data_extraction', pipeline='article_pipeline', stage='extract') as collector:
    # Perform data extraction
    data = extract_articles()
    collector.record_success(len(data))
```

### Custom Metrics Collector

```python
import psutil
import threading
import time
from typing import Dict, Any

class SystemMetricsCollector:
    """Collect system-level metrics"""

    def __init__(self, collection_interval: int = 30):
        self.collection_interval = collection_interval
        self.running = False
        self.thread = None

    def start_collection(self):
        """Start background metrics collection"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self._collect_metrics_loop, daemon=True)
        self.thread.start()

    def stop_collection(self):
        """Stop metrics collection"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)

    def _collect_metrics_loop(self):
        """Background metrics collection loop"""
        while self.running:
            try:
                self._collect_system_metrics()
                self._collect_pipeline_metrics()
            except Exception as e:
                print(f"Error collecting metrics: {e}")

            time.sleep(self.collection_interval)

    def _collect_system_metrics(self):
        """Collect system resource metrics"""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)

        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used = memory.used

        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent

        # Update Prometheus metrics
        metrics.memory_usage.labels('system').set(memory_used)

        # Log high resource usage
        if memory_percent > 90:
            logger.warning(f"High memory usage: {memory_percent}%")

        if cpu_percent > 95:
            logger.warning(f"High CPU usage: {cpu_percent}%")

    def _collect_pipeline_metrics(self):
        """Collect pipeline-specific metrics"""
        # This would integrate with your pipeline components
        # to collect queue sizes, active workers, etc.
        pass

    def get_system_health(self) -> Dict[str, Any]:
        """Get current system health status"""
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        health_status = {
            'cpu_usage_percent': cpu_percent,
            'memory_usage_percent': memory.percent,
            'disk_usage_percent': disk.percent,
            'status': 'healthy'
        }

        # Determine overall health
        if cpu_percent > 95 or memory.percent > 95 or disk.percent > 95:
            health_status['status'] = 'critical'
        elif cpu_percent > 80 or memory.percent > 80 or disk.percent > 80:
            health_status['status'] = 'warning'

        return health_status
```

## Health Checks and Readiness

### Health Check Implementation

```python
from fastapi import FastAPI, HTTPException, status
from typing import Dict, Any
import time
from datetime import datetime, timedelta

class HealthChecker:
    """Health check system for ETL pipeline components"""

    def __init__(self):
        self.components = {}
        self.last_check = {}
        self.check_interval = 30  # seconds

    def register_component(self, name: str, check_function):
        """Register a component health check"""
        self.components[name] = check_function

    def check_component(self, name: str) -> Dict[str, Any]:
        """Check health of a specific component"""
        if name not in self.components:
            return {
                'status': 'unknown',
                'message': f'Component {name} not registered'
            }

        try:
            # Check if we need to run the check
            now = time.time()
            if name in self.last_check:
                time_since_last = now - self.last_check[name]['timestamp']
                if time_since_last < self.check_interval:
                    # Return cached result
                    return self.last_check[name]['result']

            # Run health check
            result = self.components[name]()

            # Cache result
            self.last_check[name] = {
                'timestamp': now,
                'result': result
            }

            return result

        except Exception as e:
            return {
                'status': 'error',
                'message': f'Health check failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }

    def get_overall_health(self) -> Dict[str, Any]:
        """Get overall system health"""
        component_healths = {}
        overall_status = 'healthy'

        for component_name in self.components:
            health = self.check_component(component_name)
            component_healths[component_name] = health

            if health.get('status') in ['error', 'critical']:
                overall_status = 'unhealthy'
            elif health.get('status') == 'warning' and overall_status == 'healthy':
                overall_status = 'degraded'

        return {
            'status': overall_status,
            'timestamp': datetime.now().isoformat(),
            'components': component_healths
        }

# Health check functions
def check_database_health():
    """Check database connectivity and performance"""
    try:
        # Test database connection
        db = get_database_session()
        start_time = time.time()

        # Simple query to test connectivity
        result = db.execute("SELECT 1").fetchone()
        query_time = time.time() - start_time

        db.close()

        if result and query_time < 1.0:  # Query should complete in < 1 second
            return {
                'status': 'healthy',
                'response_time': query_time,
                'message': 'Database connection healthy'
            }
        else:
            return {
                'status': 'warning',
                'response_time': query_time,
                'message': 'Database response slow'
            }

    except Exception as e:
        return {
            'status': 'error',
            'message': f'Database connection failed: {str(e)}'
        }

def check_crawler_health():
    """Check crawler component health"""
    try:
        # Check if crawler process is running
        # Check recent crawler activity
        # Check error rates

        return {
            'status': 'healthy',
            'last_crawl': '2023-12-01T10:00:00Z',
            'message': 'Crawler operating normally'
        }

    except Exception as e:
        return {
            'status': 'error',
            'message': f'Crawler health check failed: {str(e)}'
        }

def check_queue_health():
    """Check processing queue health"""
    try:
        # Check queue size, processing rate, etc.
        queue_size = get_queue_size()

        if queue_size > 1000:
            return {
                'status': 'warning',
                'queue_size': queue_size,
                'message': 'Queue size is high'
            }
        else:
            return {
                'status': 'healthy',
                'queue_size': queue_size,
                'message': 'Queue operating normally'
            }

    except Exception as e:
        return {
            'status': 'error',
            'message': f'Queue health check failed: {str(e)}'
        }

# Global health checker
health_checker = HealthChecker()
health_checker.register_component('database', check_database_health)
health_checker.register_component('crawler', check_crawler_health)
health_checker.register_component('queue', check_queue_health)
```

### FastAPI Health Endpoints

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    overall_health = health_checker.get_overall_health()

    if overall_health['status'] == 'healthy':
        return overall_health
    elif overall_health['status'] == 'degraded':
        # Return warning status
        return overall_health
    else:
        # Return error status
        raise HTTPException(status_code=503, detail=overall_health)

@app.get("/health/{component}")
async def component_health_check(component: str):
    """Health check for specific component"""
    health = health_checker.check_component(component)

    if health['status'] == 'healthy':
        return health
    else:
        raise HTTPException(status_code=503, detail=health)

@app.get("/metrics")
async def prometheus_metrics():
    """Expose Prometheus metrics"""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi.responses import Response

    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

## Alerting and Notification

### Alert Manager

```python
from typing import Dict, List, Any, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import requests

class AlertManager:
    """Alert management system for ETL pipeline issues"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.alerts = []
        self.alert_thresholds = config.get('thresholds', {})

    def check_thresholds(self, metrics: Dict[str, Any]):
        """Check metrics against alert thresholds"""
        alerts = []

        # Check error rate
        error_rate = metrics.get('error_rate', 0)
        if error_rate > self.alert_thresholds.get('max_error_rate', 0.05):
            alerts.append({
                'type': 'error_rate_high',
                'severity': 'critical',
                'message': f'Error rate {error_rate:.2%} exceeds threshold',
                'metrics': metrics
            })

        # Check processing latency
        avg_latency = metrics.get('avg_processing_time', 0)
        if avg_latency > self.alert_thresholds.get('max_processing_time', 300):
            alerts.append({
                'type': 'high_latency',
                'severity': 'warning',
                'message': f'Average processing time {avg_latency:.2f}s exceeds threshold',
                'metrics': metrics
            })

        # Check queue size
        queue_size = metrics.get('queue_size', 0)
        if queue_size > self.alert_thresholds.get('max_queue_size', 10000):
            alerts.append({
                'type': 'queue_overflow',
                'severity': 'critical',
                'message': f'Queue size {queue_size} exceeds threshold',
                'metrics': metrics
            })

        return alerts

    def send_alert(self, alert: Dict[str, Any]):
        """Send alert notification"""
        alert_type = alert['type']
        severity = alert['severity']

        # Skip low-severity alerts unless configured
        if severity == 'info' and not self.config.get('send_info_alerts', False):
            return

        # Send alert via configured channels
        if self.config.get('email_enabled'):
            self._send_email_alert(alert)

        if self.config.get('slack_enabled'):
            self._send_slack_alert(alert)

        if self.config.get('webhook_enabled'):
            self._send_webhook_alert(alert)

        # Store alert for tracking
        self.alerts.append({
            **alert,
            'timestamp': datetime.now().isoformat(),
            'sent': True
        })

    def _send_email_alert(self, alert: Dict[str, Any]):
        """Send alert via email"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.config['email_from']
            msg['To'] = ', '.join(self.config['email_recipients'])
            msg['Subject'] = f"ETL Alert: {alert['type']} ({alert['severity']})"

            body = f"""
ETL Pipeline Alert

Type: {alert['type']}
Severity: {alert['severity']}
Message: {alert['message']}

Details: {json.dumps(alert.get('metrics', {}), indent=2)}

Timestamp: {datetime.now().isoformat()}
            """

            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(self.config['smtp_server'], self.config['smtp_port'])
            if self.config.get('smtp_tls'):
                server.starttls()

            server.login(self.config['smtp_username'], self.config['smtp_password'])
            server.send_message(msg)
            server.quit()

        except Exception as e:
            print(f"Failed to send email alert: {e}")

    def _send_slack_alert(self, alert: Dict[str, Any]):
        """Send alert to Slack"""
        try:
            payload = {
                "channel": self.config['slack_channel'],
                "username": "ETL Monitor",
                "icon_emoji": ":warning:",
                "attachments": [{
                    "color": "danger" if alert['severity'] == 'critical' else "warning",
                    "title": f"ETL Alert: {alert['type']}",
                    "text": alert['message'],
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert['severity'],
                            "short": True
                        },
                        {
                            "title": "Time",
                            "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "short": True
                        }
                    ]
                }]
            }

            requests.post(
                self.config['slack_webhook_url'],
                json=payload,
                timeout=10
            )

        except Exception as e:
            print(f"Failed to send Slack alert: {e}")

    def _send_webhook_alert(self, alert: Dict[str, Any]):
        """Send alert via webhook"""
        try:
            requests.post(
                self.config['webhook_url'],
                json=alert,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
        except Exception as e:
            print(f"Failed to send webhook alert: {e}")

    def get_alert_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent alert history"""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        return [
            alert for alert in self.alerts
            if datetime.fromisoformat(alert['timestamp']) > cutoff_time
        ]
```

## Dashboard and Visualization

### Simple Monitoring Dashboard

```python
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import json

app = FastAPI()

@app.get("/dashboard", response_class=HTMLResponse)
async def monitoring_dashboard():
    """Simple HTML dashboard for monitoring"""

    # Get current metrics
    overall_health = health_checker.get_overall_health()
    system_health = SystemMetricsCollector().get_system_health()
    recent_alerts = alert_manager.get_alert_history(hours=1)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>ETL Pipeline Dashboard</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .status-healthy {{ color: green; }}
            .status-warning {{ color: orange; }}
            .status-error {{ color: red; }}
            .metric {{ background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }}
            .alert {{ border-left: 4px solid #ff6b6b; padding-left: 10px; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <h1>ETL Pipeline Monitoring Dashboard</h1>

        <div class="metric">
            <h2>Overall Health: <span class="status-{overall_health['status']}">{overall_health['status'].upper()}</span></h2>
            <p>Last updated: {overall_health['timestamp']}</p>
        </div>

        <div class="metric">
            <h2>System Health</h2>
            <p>CPU Usage: {system_health['cpu_usage_percent']:.1f}%</p>
            <p>Memory Usage: {system_health['memory_usage_percent']:.1f}%</p>
            <p>Disk Usage: {system_health['disk_usage_percent']:.1f}%</p>
        </div>

        <div class="metric">
            <h2>Component Health</h2>
            {"".join(f"<p>{name}: <span class='status-{health['status']}'>{health['status']}</span></p>" for name, health in overall_health['components'].items())}
        </div>

        <div class="metric">
            <h2>Recent Alerts ({len(recent_alerts)})</h2>
            {"".join(f"<div class='alert'><strong>{alert['type']}</strong> - {alert['message']}</div>" for alert in recent_alerts)}
        </div>

        <script>
            // Auto-refresh every 30 seconds
            setTimeout(() => window.location.reload(), 30000);
        </script>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)

@app.get("/api/metrics")
async def get_metrics_api():
    """API endpoint for metrics data"""
    return {
        "health": health_checker.get_overall_health(),
        "system": SystemMetricsCollector().get_system_health(),
        "alerts": alert_manager.get_alert_history(hours=1)
    }
```

## Hands-on Exercises

### Exercise 1: Logging Implementation
1. Set up structured logging for ETL operations
2. Implement different log levels for various events
3. Create log aggregation and analysis
4. Test logging under different error conditions

### Exercise 2: Metrics Collection
1. Implement Prometheus metrics for pipeline operations
2. Create custom metrics for business logic
3. Set up metrics visualization with Grafana
4. Implement alerting based on metrics thresholds

### Exercise 3: Health Monitoring
1. Implement comprehensive health checks
2. Create readiness and liveness probes
3. Set up automated recovery mechanisms
4. Build monitoring dashboards

## Next Steps
- [Workshop: Crawlee ETL Pipeline](../workshops/workshop-01-crawlee-etl.md)
- [Workshop: Data Processing Pipeline](../workshops/workshop-02-data-processing.md)

## Additional Resources
- [Prometheus Monitoring](https://prometheus.io/docs/introduction/overview/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [ELK Stack](https://www.elastic.co/what-is/elk-stack)
- [Distributed Tracing](https://opentracing.io/)
