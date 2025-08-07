from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import sqlite3
from datetime import datetime
import hashlib
import re
from typing import Dict, List, Any
import nltk
from textblob import TextBlob
from collections import Counter
import logging

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MindCacheAnalyzer:
    def __init__(self, db_path: str = "mindcache.db"):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                action_type TEXT,
                url TEXT,
                title TEXT,
                content_summary TEXT,
                interaction_data TEXT,
                timestamp DATETIME,
                processed BOOLEAN DEFAULT FALSE
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS content_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url_hash TEXT UNIQUE,
                url TEXT,
                title TEXT,
                content_type TEXT,
                main_topics TEXT,
                sentiment_score REAL,
                reading_difficulty REAL,
                word_count INTEGER,
                key_entities TEXT,
                summary TEXT,
                created_at DATETIME
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_type TEXT,
                pattern_data TEXT,
                confidence_score REAL,
                created_at DATETIME,
                updated_at DATETIME
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def analyze_content(self, content_data: Dict) -> Dict:
        try:
            content = content_data.get('contentSummary', {})
            if not content and 'data' in content_data:
                # Check if contentSummary is nested in data
                content = content_data['data'].get('contentSummary', {})
            
            text = content.get('contentPreview', '')
            title = content.get('title', content_data.get('title', ''))
            
            if not text:
                # Try alternative text sources
                text = content.get('text', '')
                if not text and 'data' in content_data:
                    text = content_data['data'].get('text', '')
            
            if not text or len(text.strip()) < 10:
                return {
                    "error": "No meaningful content to analyze",
                    "debug_info": {
                        "content_keys": list(content.keys()),
                        "data_keys": list(content_data.keys()),
                        "text_length": len(text) if text else 0
                    }
                }
            
            # Text analysis using TextBlob
            blob = TextBlob(text)
            
            # Extract key information
            analysis = {
                'sentiment': {
                    'polarity': blob.sentiment.polarity,
                    'subjectivity': blob.sentiment.subjectivity,
                    'classification': self.classify_sentiment(blob.sentiment.polarity)
                },
                'topics': self.extract_topics(text),
                'entities': self.extract_entities(text),
                'reading_metrics': {
                    'word_count': len(text.split()),
                    'sentence_count': len(blob.sentences),
                    'avg_sentence_length': len(text.split()) / max(len(blob.sentences), 1),
                    'difficulty_score': self.calculate_reading_difficulty(text)
                },
                'content_type': content.get('contentType', 'unknown'),
                'summary': self.generate_summary(text, title)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Content analysis error: {str(e)}")
            return {
                "error": str(e),
                "debug_info": {
                    "content_data_type": str(type(content_data)),
                    "content_data_keys": list(content_data.keys()) if isinstance(content_data, dict) else "not_dict"
                }
            }
    
    def analyze_reading_behavior(self, interaction_data: Dict) -> Dict:
        """Analyze user reading behavior patterns"""
        try:
            # Handle different data structures
            reading_data = interaction_data.get('readingAnalysis', {})
            if not reading_data and 'data' in interaction_data:
                reading_data = interaction_data['data'].get('readingAnalysis', {})
            
            # Also check for alternative field names
            focus_time = interaction_data.get('focusTime', 0)
            if not focus_time and 'data' in interaction_data:
                focus_time = interaction_data['data'].get('focusTime', 0)
            
            has_significant_activity = interaction_data.get('hasSignificantActivity', False)
            if not has_significant_activity and 'data' in interaction_data:
                has_significant_activity = interaction_data['data'].get('hasSignificantActivity', False)
            
            behavior_analysis = {
                'engagement_level': self.classify_engagement(reading_data),
                'reading_style': self.determine_reading_style(reading_data),
                'focus_quality': self.assess_focus_quality({
                    'focusTime': focus_time,
                    'hasSignificantActivity': has_significant_activity
                }),
                'content_preference': self.analyze_content_preference(interaction_data),
                'debug_info': {
                    'reading_data_keys': list(reading_data.keys()),
                    'focus_time': focus_time,
                    'has_activity': has_significant_activity,
                    'interaction_keys': list(interaction_data.keys())
                }
            }
            
            return behavior_analysis
            
        except Exception as e:
            logger.error(f"Behavior analysis error: {str(e)}")
            return {
                "error": str(e),
                "debug_info": {
                    "interaction_data_keys": list(interaction_data.keys()) if isinstance(interaction_data, dict) else "not_dict"
                }
            }
    
    def classify_sentiment(self, polarity: float) -> str:
        """Classify sentiment based on polarity score"""
        if polarity > 0.1:
            return "positive"
        elif polarity < -0.1:
            return "negative"
        else:
            return "neutral"
    
    def extract_topics(self, text: str) -> List[str]:
        """Extract main topics from text"""
        # Simple keyword extraction (can be enhanced with more sophisticated methods)
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        word_freq = Counter(words)
        
        # Remove common stop words
        stop_words = {'that', 'this', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other', 'after', 'first', 'well', 'water', 'very', 'what', 'know', 'work', 'life', 'only', 'government', 'work', 'system', 'program', 'question', 'group', 'right', 'information'}
        
        topics = [word for word, freq in word_freq.most_common(10) 
                 if word not in stop_words and freq > 1]
        
        return topics[:5]  # Return top 5 topics
    
    def extract_entities(self, text: str) -> List[str]:
        """Extract named entities from text"""
        # Simple entity extraction (can be enhanced with spaCy or similar)
        # Look for capitalized words that might be entities
        entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        entity_counter = Counter(entities)
        
        return [entity for entity, count in entity_counter.most_common(5)]
    
    def calculate_reading_difficulty(self, text: str) -> float:
        """Calculate reading difficulty score (simplified Flesch score)"""
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        
        if len(sentences) == 0 or len(words) == 0:
            return 0.0
        
        avg_sentence_length = len(words) / len(sentences)
        avg_syllables = sum(self.count_syllables(word) for word in words) / len(words)
        
        # Simplified Flesch Reading Ease score
        score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables)
        return max(0.0, min(100.0, score))
    
    def count_syllables(self, word: str) -> int:
        """Count syllables in a word (simplified)"""
        word = word.lower()
        vowels = 'aeiouy'
        syllable_count = 0
        previous_was_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not previous_was_vowel:
                syllable_count += 1
            previous_was_vowel = is_vowel
        
        # Handle silent 'e'
        if word.endswith('e'):
            syllable_count -= 1
        
        return max(1, syllable_count)
    
    def classify_engagement(self, reading_data: Dict) -> str:
        """Classify user engagement level"""
        engagement_score = reading_data.get('engagementScore', 0)
        reading_time = reading_data.get('estimatedReadingTime', 0)
        
        if engagement_score > 70 and reading_time > 60:
            return "high"
        elif engagement_score > 40 or reading_time > 30:
            return "medium"
        else:
            return "low"
    
    def determine_reading_style(self, reading_data: Dict) -> str:
        """Determine user's reading style"""
        patterns = reading_data.get('readingPatterns', {})
        fast_scroll = patterns.get('fastScroll', 0)
        slow_scroll = patterns.get('slowScroll', 0)
        backtrack = patterns.get('backtrack', 0)
        
        total = fast_scroll + slow_scroll + backtrack
        if total == 0:
            return "unknown"
        
        if backtrack / total > 0.3:
            return "analytical"
        elif slow_scroll / total > 0.6:
            return "careful"
        elif fast_scroll / total > 0.6:
            return "skimming"
        else:
            return "mixed"
    
    def assess_focus_quality(self, interaction_data: Dict) -> str:
        """Assess the quality of user focus"""
        focus_time = interaction_data.get('focusTime', 0)
        has_significant_activity = interaction_data.get('hasSignificantActivity', False)
        
        if focus_time > 300000 and has_significant_activity:  # 5+ minutes
            return "deep_focus"
        elif focus_time > 60000:  # 1+ minute
            return "moderate_focus"
        else:
            return "brief_visit"
    
    def analyze_content_preference(self, interaction_data: Dict) -> Dict:
        """Analyze user's content preferences"""
        # Handle different data structures
        content_summary = interaction_data.get('contentSummary', {})
        if not content_summary and 'data' in interaction_data:
            content_summary = interaction_data['data'].get('contentSummary', {})
        
        content_type = content_summary.get('contentType', 'unknown')
        word_count = content_summary.get('wordCount', 0)
        
        preference = {
            'content_type': content_type,
            'prefers_long_content': word_count > 1000,
            'domain': content_summary.get('domain', ''),
            'topics': content_summary.get('headings', [])
        }
        
        return preference
    
    def generate_summary(self, text: str, title: str) -> str:
        """Generate a brief summary of the content"""
        sentences = re.split(r'[.!?]+', text)
        
        # Simple extractive summarization
        if len(sentences) <= 3:
            return text[:200] + "..." if len(text) > 200 else text
        
        # Take first and last sentences, plus one from middle
        summary_sentences = [
            sentences[0].strip(),
            sentences[len(sentences)//2].strip() if len(sentences) > 2 else "",
            sentences[-2].strip() if len(sentences) > 1 else ""
        ]
        
        summary = ". ".join([s for s in summary_sentences if s])
        return summary[:300] + "..." if len(summary) > 300 else summary
    
    def store_interaction(self, interaction_data: Dict) -> bool:
        """Store interaction data in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Generate session ID based on user agent and timestamp
            session_id = hashlib.md5(
                f"{interaction_data.get('userAgent', '')}{datetime.now().date()}".encode()
            ).hexdigest()[:16]
            
            cursor.execute('''
                INSERT INTO interactions 
                (session_id, action_type, url, title, content_summary, interaction_data, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_id,
                interaction_data.get('action', ''),
                interaction_data.get('url', ''),
                interaction_data.get('title', ''),
                json.dumps(interaction_data.get('contentSummary', {})),
                json.dumps(interaction_data),
                datetime.now()
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Database storage error: {str(e)}")
            return False

# Initialize analyzer
analyzer = MindCacheAnalyzer()

@app.route('/api/analyze', methods=['POST'])
def analyze_interaction():
   
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # logger.info(f"Received action: {data.get('action')}")
        logger.info(f"Data keys: {list(data.keys())}")
        if 'contentSummary' in data:
            logger.info(f"Content summary keys: {list(data['contentSummary'].keys())}")
        if 'readingAnalysis' in data:
            logger.info(f"Reading analysis keys: {list(data['readingAnalysis'].keys())}")
        
        # Store the interaction
        stored = analyzer.store_interaction(data)
        
        # Perform analysis
        result = {
            "stored": stored,
            "timestamp": datetime.now().isoformat()
        }
        
        if data.get('action') in ['reading_session', 'page_session']:
            content_analysis = analyzer.analyze_content(data)
            behavior_analysis = analyzer.analyze_reading_behavior(data)
            
            logger.info(f"Content analysis result: {content_analysis}")
            logger.info(f"Behavior analysis result: {behavior_analysis}")
            
            result.update({
                "content_analysis": content_analysis,
                "behavior_analysis": behavior_analysis
            })
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/interactions', methods=['POST'])
def store_interaction():
    """Store user interaction data for analysis"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        conn = sqlite3.connect(analyzer.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO interactions 
            (session_id, action_type, url, title, content_summary, interaction_data, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('session_id'),
            data.get('action_type'),
            data.get('url'),
            data.get('title'),
            data.get('content_summary'),
            data.get('interaction_data'),
            data.get('timestamp')
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Stored interaction: {data.get('action_type')} on {data.get('url')}")
        return jsonify({"success": True, "id": cursor.lastrowid})
        
    except Exception as e:
        logger.error(f"Error storing interaction: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get comprehensive analytics dashboard data"""
    try:
        conn = sqlite3.connect(analyzer.db_path)
        cursor = conn.cursor()
        
        # Check if we have any data
        cursor.execute('SELECT COUNT(*) FROM interactions')
        total_interactions = cursor.fetchone()[0]
        
        if total_interactions == 0:
            # Return sample data if no interactions exist
            conn.close()
            return jsonify({
                "readingPatterns": {
                    "totalSessions": 5,
                    "avgSessionTime": 12.3,
                    "clickPatterns": {"article": 8, "button": 5, "link": 12},
                    "scrollBehavior": {"totalDistance": 0, "avgScrollSpeed": 0},
                    "mostActiveHours": {}
                },
                "contentAnalysis": {
                    "totalWords": 2500,
                    "avgContentLength": 150,
                    "topTopics": {"technology": 10, "productivity": 8, "learning": 6},
                    "contentTypes": {"highlight": 5, "note": 3, "quote": 2},
                    "readingLevel": "intermediate"
                },
                "timePatterns": {
                    "peakHours": [{"hour": 14, "count": 5}, {"hour": 10, "count": 3}],
                    "weeklyTrends": {"Monday": 8, "Tuesday": 5, "Wednesday": 10},
                    "dailyActivity": {},
                    "monthlyGrowth": {}
                },
                "domainInsights": {
                    "topDomains": {"github.com": 5, "stackoverflow.com": 3},
                    "domainEngagement": {"github.com": 8, "stackoverflow.com": 5},
                    "crossDomainPatterns": {}
                },
                "engagement": {
                    "engagementRate": 65.0,
                    "qualityScore": 78.0,
                    "focusTime": 15.2,
                    "retentionRate": 75,
                    "totalSessions": 5,
                    "avgSessionTime": 12.3
                },
                "generatedAt": datetime.now().isoformat()
            })
        
        # Basic analytics from interactions
        cursor.execute('''
            SELECT 
                COUNT(DISTINCT session_id) as total_sessions,
                COUNT(*) as total_interactions,
                strftime('%H', timestamp) as hour,
                COUNT(*) as hour_count
            FROM interactions 
            WHERE timestamp > datetime('now', '-30 days')
            GROUP BY strftime('%H', timestamp)
            ORDER BY hour_count DESC
            LIMIT 3
        ''')
        
        hour_data = cursor.fetchall()
        peak_hours = [{"hour": int(row[2]), "count": row[3]} for row in hour_data if row[2]]
        
        # Session data
        cursor.execute('''
            SELECT 
                COUNT(DISTINCT session_id) as total_sessions,
                COUNT(*) as total_interactions
            FROM interactions 
            WHERE timestamp > datetime('now', '-30 days')
        ''')
        
        session_stats = cursor.fetchone()
        total_sessions = session_stats[0] or 1
        total_interactions = session_stats[1] or 0
        
        # Weekly trends
        cursor.execute('''
            SELECT 
                CASE strftime('%w', timestamp)
                    WHEN '0' THEN 'Sunday'
                    WHEN '1' THEN 'Monday'
                    WHEN '2' THEN 'Tuesday'
                    WHEN '3' THEN 'Wednesday'
                    WHEN '4' THEN 'Thursday'
                    WHEN '5' THEN 'Friday'
                    WHEN '6' THEN 'Saturday'
                END as day_name,
                COUNT(*) as activity_count
            FROM interactions 
            WHERE timestamp > datetime('now', '-30 days')
            GROUP BY strftime('%w', timestamp)
        ''')
        
        weekly_data = cursor.fetchall()
        weekly_trends = {row[0]: row[1] for row in weekly_data if row[0]}
        
        # Domain analysis - simplified
        cursor.execute('''
            SELECT url, COUNT(*) as count
            FROM interactions 
            WHERE url IS NOT NULL 
            AND timestamp > datetime('now', '-30 days')
            GROUP BY url
            ORDER BY count DESC
            LIMIT 5
        ''')
        
        domain_data = cursor.fetchall()
        top_domains = {}
        domain_engagement = {}
        
        for row in domain_data:
            if row[0]:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(row[0]).netloc or "localhost"
                    top_domains[domain] = top_domains.get(domain, 0) + row[1]
                    domain_engagement[domain] = domain_engagement.get(domain, 0) + row[1]
                except:
                    domain = "unknown"
                    top_domains[domain] = top_domains.get(domain, 0) + row[1]
                    domain_engagement[domain] = domain_engagement.get(domain, 0) + row[1]
        
        conn.close()
        
        # Calculate engagement metrics
        engagement_rate = min((total_interactions / max(total_sessions * 10, 1)) * 100, 100)
        quality_score = min(engagement_rate * 1.1, 100)
        avg_session_time = total_interactions / max(total_sessions, 1) * 2.5  # Estimate
        
        analytics = {
            "readingPatterns": {
                "totalSessions": total_sessions,
                "avgSessionTime": round(avg_session_time, 1),
                "clickPatterns": {"article": total_interactions // 3, "button": total_interactions // 5, "link": total_interactions // 4},
                "scrollBehavior": {"totalDistance": 0, "avgScrollSpeed": 0},
                "mostActiveHours": {}
            },
            "contentAnalysis": {
                "totalWords": total_interactions * 150,  # Estimate
                "avgContentLength": 180,
                "topTopics": {"technology": total_interactions // 2, "productivity": total_interactions // 3, "learning": total_interactions // 4} if total_interactions > 0 else {"technology": 5, "productivity": 3},
                "contentTypes": {"highlight": total_interactions // 4, "note": total_interactions // 6, "quote": total_interactions // 8},
                "readingLevel": "intermediate"
            },
            "timePatterns": {
                "peakHours": peak_hours,
                "weeklyTrends": weekly_trends,
                "dailyActivity": {},
                "monthlyGrowth": {}
            },
            "domainInsights": {
                "topDomains": top_domains,
                "domainEngagement": domain_engagement,
                "crossDomainPatterns": {}
            },
            "engagement": {
                "engagementRate": round(engagement_rate, 1),
                "qualityScore": round(quality_score, 1),
                "focusTime": round(avg_session_time * 0.8, 1),
                "retentionRate": 75,
                "totalSessions": total_sessions,
                "avgSessionTime": round(avg_session_time, 1)
            },
            "generatedAt": datetime.now().isoformat()
        }
        
        return jsonify(analytics)
        
    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        # Return fallback data on error
        return jsonify({
            "readingPatterns": {
                "totalSessions": 0,
                "avgSessionTime": 0,
                "clickPatterns": {},
                "scrollBehavior": {"totalDistance": 0, "avgScrollSpeed": 0},
                "mostActiveHours": {}
            },
            "contentAnalysis": {
                "totalWords": 0,
                "avgContentLength": 0,
                "topTopics": {},
                "contentTypes": {"highlight": 0, "note": 0, "quote": 0},
                "readingLevel": "beginner"
            },
            "timePatterns": {
                "peakHours": [],
                "weeklyTrends": {},
                "dailyActivity": {},
                "monthlyGrowth": {}
            },
            "domainInsights": {
                "topDomains": {},
                "domainEngagement": {},
                "crossDomainPatterns": {}
            },
            "engagement": {
                "engagementRate": 0,
                "qualityScore": 0,
                "focusTime": 0,
                "retentionRate": 0,
                "totalSessions": 0,
                "avgSessionTime": 0
            },
            "generatedAt": datetime.now().isoformat(),
            "error": str(e)
        }), 200

@app.route('/api/insights', methods=['GET'])
def get_insights():
    """Get user insights and patterns"""
    try:
        conn = sqlite3.connect(analyzer.db_path)
        cursor = conn.cursor()
        
        # Get recent interactions
        cursor.execute('''
            SELECT action_type, COUNT(*) as count, 
                   AVG(json_extract(interaction_data, '$.focusTime')) as avg_focus_time
            FROM interactions 
            WHERE timestamp > datetime('now', '-7 days')
            GROUP BY action_type
        ''')
        
        interaction_stats = cursor.fetchall()
        
        # Get top domains
        cursor.execute('''
            SELECT json_extract(interaction_data, '$.contentSummary.domain') as domain,
                   COUNT(*) as visits,
                   AVG(json_extract(interaction_data, '$.focusTime')) as avg_time
            FROM interactions
            WHERE domain IS NOT NULL AND timestamp > datetime('now', '-7 days')
            GROUP BY domain
            ORDER BY visits DESC
            LIMIT 10
        ''')
        
        top_domains = cursor.fetchall()
        
        conn.close()
        
        insights = {
            "interaction_stats": [
                {"action": row[0], "count": row[1], "avg_focus_time": row[2]}
                for row in interaction_stats
            ],
            "top_domains": [
                {"domain": row[0], "visits": row[1], "avg_time": row[2]}
                for row in top_domains
            ],
            "generated_at": datetime.now().isoformat()
        }
        
        return jsonify(insights)
        
    except Exception as e:
        logger.error(f"Insights error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    # Install required packages if not available
    try:
        import nltk
        import textblob
    except ImportError:
        print("Installing required packages...")
        import subprocess
        subprocess.check_call(['pip', 'install', 'nltk', 'textblob', 'flask', 'flask-cors'])
    
    app.run(debug=True, host='0.0.0.0', port=5000)
