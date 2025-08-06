# MindCache AI Backend

This is the AI-powered backend for the MindCache browser extension that provides intelligent analysis of web browsing behavior and content consumption patterns.

## Features

- **Content Analysis**: NLP-powered analysis of web content including sentiment analysis, topic extraction, and reading difficulty assessment
- **Behavior Analysis**: User reading patterns, engagement levels, and browsing behavior insights
- **Smart Filtering**: Intelligent filtering of meaningful interactions vs. noise
- **AI Insights**: Machine learning-based insights about user preferences and habits

## Quick Setup

### Windows

1. Run the setup script:

```bash
cd backend
setup.bat
```

### Manual Setup

1. **Install Python 3.8+** from [python.org](https://python.org)

2. **Create virtual environment**:

```bash
python -m venv venv
```

3. **Activate virtual environment**:

```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

4. **Install dependencies**:

```bash
pip install -r requirements.txt
```

5. **Download NLTK data**:

```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```

## Running the Server

```bash
python app.py
```

The server will start at `http://localhost:5000`

## API Endpoints

### POST /api/analyze

Analyze incoming interaction data from the extension.

**Request Body:**

```json
{
  "action": "reading_session",
  "url": "https://example.com",
  "title": "Example Article",
  "contentSummary": {
    "title": "Example Article",
    "contentPreview": "Article content...",
    "wordCount": 500,
    "contentType": "article"
  },
  "readingAnalysis": {
    "engagementScore": 75,
    "estimatedReadingTime": 120
  }
}
```

**Response:**

```json
{
  "stored": true,
  "content_analysis": {
    "sentiment": {
      "polarity": 0.3,
      "classification": "positive"
    },
    "topics": ["technology", "artificial", "intelligence"],
    "reading_metrics": {
      "word_count": 500,
      "difficulty_score": 65.2
    }
  },
  "behavior_analysis": {
    "engagement_level": "high",
    "reading_style": "careful",
    "focus_quality": "deep_focus"
  }
}
```

### GET /api/insights

Get aggregated user insights and patterns.

**Response:**

```json
{
  "interaction_stats": [
    { "action": "reading_session", "count": 45, "avg_focus_time": 180000 }
  ],
  "top_domains": [{ "domain": "example.com", "visits": 12, "avg_time": 240000 }]
}
```

### GET /api/health

Health check endpoint.

## Database Schema

The backend uses SQLite with the following tables:

- **interactions**: Raw interaction data from the extension
- **content_analysis**: Analyzed content with topics, sentiment, etc.
- **user_patterns**: Identified user behavior patterns

## AI Analysis Features

### Content Analysis

- **Sentiment Analysis**: Determines emotional tone of content
- **Topic Extraction**: Identifies main themes and subjects
- **Entity Recognition**: Extracts people, places, organizations
- **Reading Difficulty**: Calculates complexity score
- **Content Classification**: Categorizes content type

### Behavior Analysis

- **Engagement Scoring**: Measures how engaged user is with content
- **Reading Style**: Identifies patterns (skimming, careful, analytical)
- **Focus Quality**: Assesses depth of attention
- **Content Preferences**: Learns what types of content user prefers

## Configuration

You can configure the backend by modifying these settings in `app.py`:

```python
# Database configuration
DB_PATH = "mindcache.db"

# Server configuration
HOST = "0.0.0.0"
PORT = 5000
DEBUG = True

# Analysis thresholds
MIN_READING_TIME = 30  # seconds
MIN_CONTENT_LENGTH = 100  # characters
```

## Extension Integration

The extension automatically sends meaningful interactions to the backend when:

- User has a reading session (3+ seconds on page)
- User makes meaningful clicks (content links, buttons)
- User selects text for copying/highlighting
- User completes a browsing session

The backend URL is configured in the extension's `background.js`:

```javascript
const BACKEND_CONFIG = {
  url: "http://localhost:5000/api/analyze",
  enabled: true,
  timeout: 5000,
};
```

## Security & Privacy

- All data is stored locally in SQLite database
- No data is sent to external services
- Sensitive form data (passwords, etc.) is automatically filtered
- User can disable backend integration in extension settings

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure virtual environment is activated
2. **Port conflicts**: Change PORT in app.py if 5000 is in use
3. **Extension can't connect**: Check that server is running and firewall allows local connections
4. **NLTK errors**: Run `python -c "import nltk; nltk.download('all')"` to download all NLTK data

### Logs

The server logs are displayed in the console. For more detailed logging, set:

```python
logging.basicConfig(level=logging.DEBUG)
```

## Development

To extend the AI analysis capabilities:

1. **Add new analysis methods** in `MindCacheAnalyzer` class
2. **Create new API endpoints** in the Flask app
3. **Update extension** to send additional data types
4. **Modify database schema** for new data storage needs

## Dependencies

- **Flask**: Web framework
- **Flask-CORS**: Cross-origin resource sharing
- **NLTK**: Natural language processing
- **TextBlob**: Simplified text processing
- **SQLite3**: Database (built into Python)
- **Pandas**: Data manipulation (optional, for advanced analytics)
- **Scikit-learn**: Machine learning (optional, for pattern recognition)

## License

This project is part of the MindCache extension and follows the same license terms.
