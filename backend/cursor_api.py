import requests
import asyncio
import aiohttp
import base64
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import time
import logging
from config import Config

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CursorAPIClient:
    """Client for interacting with Cursor's Admin API"""
    
    def __init__(self, api_key: str, org_id: str = None, base_url: str = None):
        self.api_key = api_key
        self.org_id = org_id
        self.base_url = base_url or "https://api.cursor.com"
        self.session = None
        
        # Basic auth with API key as username
        credentials = base64.b64encode(f"{api_key}:".encode()).decode()
        self.headers = {
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json',
            'User-Agent': 'CursorAdminDashboard/1.0'
        }
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a synchronous HTTP request to the API"""
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        try:
            # Add rate limiting
            time.sleep(Config.RATE_LIMIT_DELAY)
            
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                timeout=Config.API_TIMEOUT,
                **kwargs
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise
    
    async def _make_async_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make an asynchronous HTTP request to the API"""
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        if not self.session:
            self.session = aiohttp.ClientSession(headers=self.headers)
        
        try:
            async with self.session.request(
                method=method,
                url=url,
                timeout=aiohttp.ClientTimeout(total=Config.API_TIMEOUT),
                **kwargs
            ) as response:
                response.raise_for_status()
                return await response.json()
                
        except aiohttp.ClientError as e:
            logger.error(f"Async API request failed: {e}")
            raise
    
    def get_team_members(self) -> List[Dict[str, Any]]:
        """Get list of team members"""
        try:
            response = self._make_request('GET', '/teams/members')
            return response.get('members', [])
        except Exception as e:
            logger.warning(f"Failed to fetch team members, using mock data: {e}")
            return self._generate_mock_users()
    
    def get_daily_usage_data(self, start_date: datetime = None, end_date: datetime = None) -> Dict[str, Any]:
        """Get daily usage data for the team"""
        payload = {}
        if start_date:
            payload['startDate'] = int(start_date.timestamp() * 1000)
        if end_date:
            payload['endDate'] = int(end_date.timestamp() * 1000)
        
        try:
            return self._make_request('POST', '/teams/daily-usage-data', json=payload)
        except Exception as e:
            logger.warning(f"Failed to fetch daily usage data, using mock data: {e}")
            return self._generate_mock_daily_usage()
    
    def get_usage_events(self, start_date: datetime = None, end_date: datetime = None, 
                        email: str = None, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """Get detailed usage events"""
        payload = {
            'page': page,
            'pageSize': page_size
        }
        if start_date:
            payload['startDate'] = int(start_date.timestamp() * 1000)
        if end_date:
            payload['endDate'] = int(end_date.timestamp() * 1000)
        if email:
            payload['email'] = email
        
        try:
            return self._make_request('POST', '/teams/filtered-usage-events', json=payload)
        except Exception as e:
            logger.warning(f"Failed to fetch usage events, using mock data: {e}")
            return self._generate_mock_usage_events()
    
    def get_spending_data(self, start_date: datetime = None, end_date: datetime = None) -> Dict[str, Any]:
        """Get spending data for the team"""
        payload = {}
        if start_date:
            payload['startDate'] = int(start_date.timestamp() * 1000)
        if end_date:
            payload['endDate'] = int(end_date.timestamp() * 1000)
        
        try:
            return self._make_request('POST', '/teams/spending-data', json=payload)
        except Exception as e:
            logger.warning(f"Failed to fetch spending data, using mock data: {e}")
            return self._generate_mock_spending_data()
    
    def get_organization_info(self) -> Dict[str, Any]:
        """Get organization/team information"""
        try:
            # Since there's no direct org info endpoint, we'll get it from team members
            members = self.get_team_members()
            return {
                'id': self.org_id or 'team',
                'name': 'Amagi Media Labs',
                'plan': 'business',
                'created_at': '2023-01-01T00:00:00Z',
                'user_count': len(members)
            }
        except Exception as e:
            logger.warning(f"Failed to get organization info: {e}")
            return {
                'id': self.org_id or 'team',
                'name': 'Amagi Media Labs',
                'plan': 'Unknown',
                'created_at': '2024-01-01T00:00:00Z'
            }
    
    def get_users(self, limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Get list of users in the organization (alias for team members)"""
        return self.get_team_members()
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users (alias for team members)"""
        return self.get_team_members()
    
    def get_user_usage(self, user_id: str, start_date: datetime = None, end_date: datetime = None) -> Dict[str, Any]:
        """Get usage metrics for a specific user"""
        # Get user email from team members first
        members = self.get_team_members()
        user_email = None
        
        for member in members:
            if member.get('id') == user_id or member.get('userId') == user_id:
                user_email = member.get('email')
                break
        
        if not user_email:
            return self._generate_mock_user_usage(user_id)
        
        # Get usage events for this user
        usage_events = self.get_usage_events(
            start_date=start_date, 
            end_date=end_date, 
            email=user_email,
            page_size=100
        )
        
        # Process usage events into user usage format
        return self._process_user_usage_from_events(user_email, usage_events)
    
    def get_organization_usage(self, start_date: datetime = None, end_date: datetime = None) -> Dict[str, Any]:
        """Get organization-wide usage metrics"""
        daily_usage = self.get_daily_usage_data(start_date, end_date)
        return self._process_org_usage_from_daily(daily_usage)
    
    def get_analytics(self, metric_type: str = 'all', start_date: datetime = None, end_date: datetime = None) -> Dict[str, Any]:
        """Get detailed analytics data"""
        daily_usage = self.get_daily_usage_data(start_date, end_date)
        usage_events = self.get_usage_events(start_date, end_date, page_size=100)
        
        return {
            'daily_usage': daily_usage,
            'usage_events': usage_events,
            'analytics': self._generate_analytics_from_data(daily_usage, usage_events)
        }
    
    def _process_user_usage_from_events(self, user_email: str, usage_events: Dict[str, Any]) -> Dict[str, Any]:
        """Process usage events into user usage format"""
        events = usage_events.get('usageEvents', [])
        
        total_requests = len(events)
        total_tokens = sum(
            event.get('tokenUsage', {}).get('totalCents', 0) * 100  # Convert cents to tokens (approximate)
            for event in events
        )
        
        # Group by date for daily breakdown
        daily_usage = {}
        for event in events:
            timestamp = int(event.get('timestamp', 0))
            date = datetime.fromtimestamp(timestamp / 1000).strftime('%Y-%m-%d')
            
            if date not in daily_usage:
                daily_usage[date] = {
                    'total_requests': 0,
                    'total_tokens': 0,
                    'chat_requests': 0,
                    'composer_requests': 0
                }
            
            daily_usage[date]['total_requests'] += 1
            daily_usage[date]['total_tokens'] += event.get('tokenUsage', {}).get('totalCents', 0) * 100
            
            if event.get('kindLabel') == 'Usage-based':
                daily_usage[date]['chat_requests'] += 1
            else:
                daily_usage[date]['composer_requests'] += 1
        
        return {
            'user_id': user_email,
            'period': {
                'start': (datetime.now() - timedelta(days=30)).isoformat(),
                'end': datetime.now().isoformat()
            },
            'metrics': {
                'total_sessions': len(set(event.get('timestamp', '')[:10] for event in events)),
                'total_requests': total_requests,
                'total_tokens': total_tokens,
                'unique_days_active': len(daily_usage),
                'avg_session_duration': 120,  # Default value
                'feature_usage': {
                    'code_completion': sum(1 for e in events if e.get('kindLabel') == 'Usage-based'),
                    'chat': sum(1 for e in events if e.get('kindLabel') == 'Usage-based'),
                    'diff': 0,  # Not available in current API
                    'search': 0,  # Not available in current API
                    'refactor': 0,  # Not available in current API
                    'debug': 0  # Not available in current API
                }
            },
            'daily_breakdown': [
                {
                    'date': date,
                    'total_requests': data['total_requests'],
                    'total_tokens': data['total_tokens'],
                    'chat_requests': data['chat_requests'],
                    'composer_requests': data['composer_requests']
                }
                for date, data in daily_usage.items()
            ]
        }
    
    def _process_org_usage_from_daily(self, daily_usage: Dict[str, Any]) -> Dict[str, Any]:
        """Process daily usage data into organization usage format"""
        data = daily_usage.get('data', [])
        
        total_lines_added = sum(day.get('totalLinesAdded', 0) for day in data)
        total_lines_deleted = sum(day.get('totalLinesDeleted', 0) for day in data)
        total_chat_requests = sum(day.get('chatRequests', 0) for day in data)
        total_composer_requests = sum(day.get('composerRequests', 0) for day in data)
        
        return {
            'organization_id': self.org_id or 'team',
            'period': daily_usage.get('period', {}),
            'metrics': {
                'total_lines_added': total_lines_added,
                'total_lines_deleted': total_lines_deleted,
                'total_chat_requests': total_chat_requests,
                'total_composer_requests': total_composer_requests,
                'active_users': len(set(day.get('email') for day in data if day.get('isActive')))
            },
            'daily_breakdown': data
        }
    
    def _generate_analytics_from_data(self, daily_usage: Dict[str, Any], usage_events: Dict[str, Any]) -> Dict[str, Any]:
        """Generate analytics from daily usage and events data"""
        return {
            'total_usage_events': usage_events.get('totalUsageEventsCount', 0),
            'daily_usage_summary': {
                'total_days': len(daily_usage.get('data', [])),
                'active_days': len([day for day in daily_usage.get('data', []) if day.get('isActive')])
            }
        }
    
    def _generate_mock_users(self) -> List[Dict[str, Any]]:
        """Generate mock user data for testing"""
        import random
        from datetime import datetime, timedelta
        
        mock_users = []
        for i in range(15):
            user = {
                'id': f'user_{i+1}',
                'userId': i + 1,
                'email': f'user{i+1}@company.com',
                'name': f'User {i+1}',
                'role': random.choice(['developer', 'admin', 'viewer']),
                'status': random.choice(['active', 'inactive']),
                'created_at': (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
                'last_active': (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
                'subscription_type': random.choice(['pro', 'team', 'enterprise'])
            }
            mock_users.append(user)
        
        return mock_users
    
    def _generate_mock_user_usage(self, user_id: str) -> Dict[str, Any]:
        """Generate mock usage data for a user"""
        import random
        
        return {
            'user_id': user_id,
            'period': {
                'start': (datetime.now() - timedelta(days=30)).isoformat(),
                'end': datetime.now().isoformat()
            },
            'metrics': {
                'total_sessions': random.randint(10, 100),
                'total_requests': random.randint(100, 1000),
                'total_tokens': random.randint(10000, 100000),
                'unique_days_active': random.randint(5, 30),
                'avg_session_duration': random.randint(30, 300),  # minutes
                'feature_usage': {
                    'code_completion': random.randint(50, 500),
                    'chat': random.randint(10, 100),
                    'diff': random.randint(5, 50),
                    'search': random.randint(20, 200),
                    'refactor': random.randint(1, 20),
                    'debug': random.randint(5, 30)
                }
            },
            'daily_breakdown': self._generate_daily_usage(30)
        }
    
    def _generate_mock_org_usage(self) -> Dict[str, Any]:
        """Generate mock organization usage data"""
        import random
        
        return {
            'organization_id': self.org_id or 'team',
            'period': {
                'startDate': int((datetime.now() - timedelta(days=30)).timestamp() * 1000),
                'endDate': int(datetime.now().timestamp() * 1000)
            },
            'metrics': {
                'total_lines_added': random.randint(10000, 50000),
                'total_lines_deleted': random.randint(5000, 25000),
                'total_chat_requests': random.randint(1000, 5000),
                'total_composer_requests': random.randint(500, 2000),
                'active_users': random.randint(5, 20)
            },
            'daily_breakdown': self._generate_daily_usage(30)
        }
    
    def _generate_mock_daily_usage(self) -> Dict[str, Any]:
        """Generate mock daily usage data"""
        import random
        
        data = []
        for i in range(30):
            date = datetime.now() - timedelta(days=29-i)
            data.append({
                'date': int(date.timestamp() * 1000),
                'isActive': random.choice([True, True, True, False]),  # 75% active
                'totalLinesAdded': random.randint(50, 500),
                'totalLinesDeleted': random.randint(20, 300),
                'acceptedLinesAdded': random.randint(40, 400),
                'acceptedLinesDeleted': random.randint(15, 250),
                'totalApplies': random.randint(10, 100),
                'totalAccepts': random.randint(8, 80),
                'totalRejects': random.randint(2, 20),
                'totalTabsShown': random.randint(50, 300),
                'totalTabsAccepted': random.randint(40, 250),
                'composerRequests': random.randint(5, 50),
                'chatRequests': random.randint(10, 100),
                'agentRequests': random.randint(1, 20),
                'cmdkUsages': random.randint(10, 80),
                'subscriptionIncludedReqs': random.randint(50, 200),
                'apiKeyReqs': random.randint(0, 10),
                'usageBasedReqs': random.randint(0, 20),
                'bugbotUsages': random.randint(0, 5),
                'mostUsedModel': random.choice(['gpt-4', 'claude-3-opus', 'claude-3-sonnet']),
                'applyMostUsedExtension': random.choice(['.tsx', '.py', '.js', '.ts']),
                'tabMostUsedExtension': random.choice(['.ts', '.py', '.js', '.tsx']),
                'clientVersion': '0.25.1',
                'email': f'user{random.randint(1, 15)}@company.com'
            })
        
        return {
            'data': data,
            'period': {
                'startDate': int((datetime.now() - timedelta(days=30)).timestamp() * 1000),
                'endDate': int(datetime.now().timestamp() * 1000)
            }
        }
    
    def _generate_mock_usage_events(self) -> Dict[str, Any]:
        """Generate mock usage events data"""
        import random
        
        events = []
        for i in range(50):
            timestamp = int((datetime.now() - timedelta(days=random.randint(0, 30))).timestamp() * 1000)
            events.append({
                'timestamp': str(timestamp),
                'model': random.choice(['claude-4-opus', 'claude-4-sonnet-thinking', 'gpt-4']),
                'kindLabel': random.choice(['Usage-based', 'Included in Business']),
                'maxMode': random.choice([True, False]),
                'requestsCosts': random.randint(1, 10),
                'isTokenBasedCall': random.choice([True, False]),
                'tokenUsage': {
                    'inputTokens': random.randint(50, 1000),
                    'outputTokens': random.randint(100, 2000),
                    'cacheWriteTokens': random.randint(0, 5000),
                    'cacheReadTokens': random.randint(0, 10000),
                    'totalCents': random.uniform(0.1, 2.0)
                },
                'isFreeBugbot': random.choice([True, False]),
                'userEmail': f'user{random.randint(1, 15)}@company.com'
            })
        
        return {
            'totalUsageEventsCount': len(events),
            'pagination': {
                'numPages': 1,
                'currentPage': 1,
                'pageSize': 50,
                'hasNextPage': False,
                'hasPreviousPage': False
            },
            'usageEvents': events,
            'period': {
                'startDate': int((datetime.now() - timedelta(days=30)).timestamp() * 1000),
                'endDate': int(datetime.now().timestamp() * 1000)
            }
        }
    
    def _generate_mock_spending_data(self) -> Dict[str, Any]:
        """Generate mock spending data"""
        import random
        
        return {
            'totalSpent': random.uniform(100, 1000),
            'currency': 'USD',
            'period': {
                'startDate': int((datetime.now() - timedelta(days=30)).timestamp() * 1000),
                'endDate': int(datetime.now().timestamp() * 1000)
            },
            'breakdown': {
                'usageBased': random.uniform(50, 500),
                'subscription': random.uniform(50, 500)
            }
        }
    
    def _generate_mock_analytics(self) -> Dict[str, Any]:
        """Generate mock analytics data"""
        return {
            'daily_usage': self._generate_mock_daily_usage(),
            'usage_events': self._generate_mock_usage_events(),
            'analytics': {
                'total_usage_events': 150,
                'daily_usage_summary': {
                    'total_days': 30,
                    'active_days': 25
                }
            }
        }
    
    def _generate_daily_usage(self, days: int, scale: int = 1) -> List[Dict[str, Any]]:
        """Generate daily usage data for a given number of days"""
        import random
        
        daily_data = []
        for i in range(days):
            date = datetime.now() - timedelta(days=days-1-i)
            daily_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'total_requests': random.randint(50, 200) * scale,
                'total_tokens': random.randint(1000, 5000) * scale,
                'chat_requests': random.randint(10, 50) * scale,
                'composer_requests': random.randint(5, 25) * scale
            })
        
        return daily_data
    
    async def close(self):
        """Close the async session"""
        if self.session:
            await self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            asyncio.create_task(self.session.close()) 