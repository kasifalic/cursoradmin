import os
from dotenv import load_dotenv
from datetime import timedelta

# Load environment variables
load_dotenv()

class Config:
    """Configuration settings for Cursor Dashboard"""
    
    # API Configuration
    CURSOR_API_KEY = os.getenv('CURSOR_API_KEY')
    CURSOR_ORG_ID = os.getenv('CURSOR_ORG_ID')
    CURSOR_API_BASE_URL = os.getenv('CURSOR_API_BASE_URL', 'https://api.cursor.com')
    
    # Dashboard Settings
    REFRESH_INTERVAL_MINUTES = int(os.getenv('REFRESH_INTERVAL_MINUTES', 30))
    MAX_USERS_PER_REQUEST = int(os.getenv('MAX_USERS_PER_REQUEST', 100))
    DATA_RETENTION_DAYS = int(os.getenv('DATA_RETENTION_DAYS', 90))
    
    # File Paths
    DATA_DIR = 'data'
    EXPORTS_DIR = 'exports'
    CACHE_FILE = os.path.join(DATA_DIR, 'cache.json')
    USERS_FILE = os.path.join(DATA_DIR, 'users.json')
    USAGE_FILE = os.path.join(DATA_DIR, 'usage.json')
    
    # API Settings
    API_TIMEOUT = 30
    RATE_LIMIT_DELAY = 1  # seconds between API calls
    MAX_RETRIES = 3
    
    # Chart Settings
    DEFAULT_CHART_HEIGHT = 400
    DEFAULT_CHART_WIDTH = 800
    CHART_THEME = 'plotly_white'
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.CURSOR_API_KEY:
            raise ValueError("CURSOR_API_KEY is required")
        return True

# Streamlit configuration
DASHBOARD_CONFIG = {
    'page_title': 'Amagi Cursor AI Dashboard',
    'page_icon': '📊',
    'layout': 'wide',
    'initial_sidebar_state': 'expanded',
    'menu_items': {
        'Get Help': 'https://github.com/yourusername/cursor-dashboard',
        'Report a bug': 'https://github.com/yourusername/cursor-dashboard/issues',
        'About': 'Cursor Admin Dashboard - Analytics for your Cursor usage'
    }
}

# Chart color schemes
COLORS = {
    'primary': '#1f77b4',
    'secondary': '#ff7f0e',
    'success': '#2ca02c',
    'danger': '#d62728',
    'warning': '#ff7f0e',
    'info': '#17a2b8',
    'light': '#f8f9fa',
    'dark': '#343a40'
}

# Feature categories for analysis
FEATURE_CATEGORIES = {
    'code_completion': 'Code Completion',
    'chat': 'AI Chat',
    'diff': 'Code Diff',
    'search': 'Code Search',
    'refactor': 'Refactoring',
    'debug': 'Debugging',
    'terminal': 'Terminal',
    'files': 'File Operations'
} 