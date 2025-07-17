import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from cursor_api import CursorAPIClient
from data_processor import DataProcessor
from storage import DataStorage
from config import Config

logger = logging.getLogger(__name__)

class CursorDataService:
    """Main service class that orchestrates data fetching, processing, and storage"""
    
    def __init__(self, api_key: str = None, org_id: str = None, base_url: str = None):
        # Use provided values or fall back to config
        self.api_key = api_key or Config.CURSOR_API_KEY
        self.org_id = org_id or Config.CURSOR_ORG_ID
        self.base_url = base_url or Config.CURSOR_API_BASE_URL
        
        # Initialize components
        self.api_client = None
        self.data_processor = DataProcessor()
        self.storage = DataStorage()
        
        # Track data state
        self.last_refresh = None
        self.users_df = None
        self.usage_df = None
        self.analytics_data = None
    
    def initialize_api_client(self) -> bool:
        """Initialize the API client"""
        try:
            self.api_client = CursorAPIClient(
                api_key=self.api_key,
                org_id=self.org_id,
                base_url=self.base_url
            )
            logger.info("API client initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize API client: {e}")
            return False
    
    def check_api_connection(self) -> Dict[str, Any]:
        """Test API connection and return organization info"""
        if not self.api_client:
            if not self.initialize_api_client():
                return {'status': 'error', 'message': 'Failed to initialize API client'}
        
        try:
            org_info = self.api_client.get_organization_info()
            return {
                'status': 'success',
                'organization': org_info,
                'message': f"Connected to {org_info.get('name', 'Unknown Organization')}"
            }
        except Exception as e:
            logger.error(f"API connection test failed: {e}")
            return {'status': 'error', 'message': f'Connection failed: {str(e)}'}
    
    def fetch_all_data(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetch all data from the API or cache"""
        try:
            # Check if we should use cached data
            if not force_refresh and self.storage.is_cache_valid():
                logger.info("Using cached data")
                return self._load_cached_data()
            
            # Fetch fresh data
            logger.info("Fetching fresh data from API")
            if not self.api_client:
                if not self.initialize_api_client():
                    return {'status': 'error', 'message': 'Failed to initialize API client'}
            
            # Fetch users
            users_data = self._fetch_users_data()
            if not users_data:
                return {'status': 'error', 'message': 'Failed to fetch users data'}
            
            # Fetch usage data
            usage_data = self._fetch_usage_data(users_data)
            if not usage_data:
                return {'status': 'error', 'message': 'Failed to fetch usage data'}
            
            # Fetch organization analytics
            org_analytics = self._fetch_organization_analytics()
            
            # Process the data
            result = self._process_and_store_data(users_data, usage_data, org_analytics)
            
            if result['status'] == 'success':
                self.last_refresh = datetime.now()
                logger.info("Data refresh completed successfully")
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching data: {e}")
            return {'status': 'error', 'message': f'Data fetch failed: {str(e)}'}
    
    def _fetch_users_data(self) -> Optional[List[Dict[str, Any]]]:
        """Fetch all users data"""
        try:
            users_data = self.api_client.get_all_users()
            logger.info(f"Fetched {len(users_data)} users")
            return users_data
        except Exception as e:
            logger.error(f"Failed to fetch users: {e}")
            return None
    
    def _fetch_usage_data(self, users_data: List[Dict[str, Any]]) -> Optional[Dict[str, Dict[str, Any]]]:
        """Fetch usage data for all users"""
        try:
            user_ids = [user['id'] for user in users_data]
            logger.info(f"Fetching usage data for {len(user_ids)} users")
            
            # Use async bulk fetch for better performance
            usage_data = asyncio.run(self._async_fetch_usage_data(user_ids))
            
            logger.info(f"Fetched usage data for {len(usage_data)} users")
            return usage_data
            
        except Exception as e:
            logger.error(f"Failed to fetch usage data: {e}")
            return None
    
    async def _async_fetch_usage_data(self, user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Asynchronously fetch usage data for multiple users"""
        try:
            return await self.api_client.get_bulk_user_usage(user_ids)
        except Exception as e:
            logger.error(f"Async usage fetch failed: {e}")
            # Fall back to synchronous method
            usage_data = {}
            for user_id in user_ids:
                try:
                    usage_data[user_id] = self.api_client.get_user_usage(user_id)
                except Exception as user_error:
                    logger.warning(f"Failed to get usage for user {user_id}: {user_error}")
            return usage_data
    
    def _fetch_organization_analytics(self) -> Optional[Dict[str, Any]]:
        """Fetch organization-level analytics"""
        try:
            org_usage = self.api_client.get_organization_usage()
            analytics = self.api_client.get_analytics()
            
            return {
                'organization_usage': org_usage,
                'analytics': analytics
            }
        except Exception as e:
            logger.error(f"Failed to fetch organization analytics: {e}")
            return None
    
    def _process_and_store_data(self, users_data: List[Dict[str, Any]], 
                               usage_data: Dict[str, Dict[str, Any]], 
                               org_analytics: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process and store the fetched data"""
        try:
            # Process users data
            self.users_df = self.data_processor.process_users_data(users_data)
            
            # Process usage data
            self.usage_df = self.data_processor.process_usage_data(usage_data)
            
            # Generate analytics
            self.analytics_data = self.data_processor.export_summary_stats()
            
            # Add organization analytics if available
            if org_analytics:
                self.analytics_data['organization_analytics'] = org_analytics
            
            # Store data to files
            self.storage.save_users_data(users_data)
            self.storage.save_usage_data(usage_data)
            
            # Cache processed data
            cache_data = {
                'processed_at': datetime.now().isoformat(),
                'user_count': len(self.users_df) if self.users_df is not None else 0,
                'usage_count': len(self.usage_df) if self.usage_df is not None else 0
            }
            self.storage.save_cache(cache_data)
            
            return {
                'status': 'success',
                'message': 'Data processed and stored successfully',
                'users_count': len(self.users_df) if self.users_df is not None else 0,
                'usage_count': len(self.usage_df) if self.usage_df is not None else 0,
                'last_refresh': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing and storing data: {e}")
            return {'status': 'error', 'message': f'Processing failed: {str(e)}'}
    
    def _load_cached_data(self) -> Dict[str, Any]:
        """Load and process cached data"""
        try:
            # Load raw data from storage
            users_data = self.storage.load_users_data()
            usage_data = self.storage.load_usage_data()
            
            if not users_data or not usage_data:
                return {'status': 'error', 'message': 'No cached data available'}
            
            # Process the data
            self.users_df = self.data_processor.process_users_data(users_data)
            self.usage_df = self.data_processor.process_usage_data(usage_data)
            self.analytics_data = self.data_processor.export_summary_stats()
            
            cache_info = self.storage.load_cache()
            last_update = cache_info.get('last_updated') if cache_info else None
            
            return {
                'status': 'success',
                'message': 'Cached data loaded successfully',
                'users_count': len(self.users_df) if self.users_df is not None else 0,
                'usage_count': len(self.usage_df) if self.usage_df is not None else 0,
                'from_cache': True,
                'last_refresh': last_update
            }
            
        except Exception as e:
            logger.error(f"Error loading cached data: {e}")
            return {'status': 'error', 'message': f'Cache load failed: {str(e)}'}
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get all data needed for the dashboard"""
        if self.users_df is None or self.usage_df is None:
            # Try to load cached data first
            result = self._load_cached_data()
            if result['status'] != 'success':
                return result
        
        try:
            dashboard_data = {
                'status': 'success',
                'users_df': self.users_df,
                'usage_df': self.usage_df,
                'analytics_data': self.analytics_data,
                'summary_stats': {
                    'total_users': len(self.users_df) if self.users_df is not None else 0,
                    'total_sessions': self.usage_df['total_sessions'].sum() if self.usage_df is not None else 0,
                    'total_requests': self.usage_df['total_requests'].sum() if self.usage_df is not None else 0,
                    'total_tokens': self.usage_df['total_tokens'].sum() if self.usage_df is not None else 0,
                },
                'last_refresh': self.last_refresh.isoformat() if self.last_refresh else None,
                'data_freshness': self.storage.get_data_freshness()
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error preparing dashboard data: {e}")
            return {'status': 'error', 'message': f'Dashboard data preparation failed: {str(e)}'}
    
    def get_top_users(self, metric: str = 'total_requests', top_n: int = 10) -> pd.DataFrame:
        """Get top users by specified metric"""
        return self.data_processor.get_top_users(metric, top_n)
    
    def get_user_segmentation(self) -> Dict[str, Any]:
        """Get user segmentation analysis"""
        return self.data_processor.get_user_segmentation()
    
    def get_feature_analysis(self) -> Dict[str, Any]:
        """Get feature usage analysis"""
        return self.data_processor.analyze_feature_usage()
    
    def get_trends_data(self) -> Optional[pd.DataFrame]:
        """Get trends data if available"""
        if not self.api_client:
            return None
        
        try:
            org_usage = self.api_client.get_organization_usage()
            if org_usage and 'daily_breakdown' in org_usage:
                return self.data_processor.get_usage_trends(org_usage['daily_breakdown'])
            return None
        except Exception as e:
            logger.error(f"Error getting trends data: {e}")
            return None
    
    def export_report(self, format: str = 'excel') -> str:
        """Export comprehensive report"""
        try:
            if format.lower() == 'excel':
                return self.storage.create_comprehensive_report(
                    self.users_df or pd.DataFrame(),
                    self.usage_df or pd.DataFrame(),
                    self.analytics_data or {},
                    self.get_trends_data()
                )
            elif format.lower() == 'json':
                export_data = {
                    'users': self.users_df.to_dict('records') if self.users_df is not None else [],
                    'usage': self.usage_df.to_dict('records') if self.usage_df is not None else [],
                    'analytics': self.analytics_data or {},
                    'exported_at': datetime.now().isoformat()
                }
                return self.storage.export_to_json(export_data, 'cursor_data_export.json')
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise
    
    def get_export_files(self) -> List[Dict[str, Any]]:
        """Get list of available export files"""
        return self.storage.get_export_files()
    
    def cleanup_old_data(self, days_to_keep: int = 30):
        """Clean up old cached and export data"""
        try:
            self.storage.cleanup_old_exports(days_to_keep)
            logger.info(f"Cleaned up data older than {days_to_keep} days")
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
    
    def get_data_status(self) -> Dict[str, Any]:
        """Get current data status and health"""
        freshness = self.storage.get_data_freshness()
        
        status = {
            'api_client_initialized': self.api_client is not None,
            'users_data_loaded': self.users_df is not None and not self.users_df.empty,
            'usage_data_loaded': self.usage_df is not None and not self.usage_df.empty,
            'last_refresh': self.last_refresh.isoformat() if self.last_refresh else None,
            'cache_valid': freshness.get('cache_valid', False),
            'data_freshness': freshness
        }
        
        # Determine overall health
        if status['users_data_loaded'] and status['usage_data_loaded']:
            if status['cache_valid']:
                status['health'] = 'good'
            else:
                status['health'] = 'stale'
        else:
            status['health'] = 'no_data'
        
        return status 