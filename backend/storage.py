import json
import csv
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import pandas as pd
import logging
from config import Config

logger = logging.getLogger(__name__)

class DataStorage:
    """Handle data storage, caching, and export operations"""
    
    def __init__(self):
        self.ensure_directories()
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        os.makedirs(Config.DATA_DIR, exist_ok=True)
        os.makedirs(Config.EXPORTS_DIR, exist_ok=True)
    
    def save_users_data(self, users_data: List[Dict[str, Any]]) -> bool:
        """Save users data to file"""
        try:
            with open(Config.USERS_FILE, 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'users': users_data
                }, f, indent=2)
            logger.info(f"Saved {len(users_data)} users to {Config.USERS_FILE}")
            return True
        except Exception as e:
            logger.error(f"Failed to save users data: {e}")
            return False
    
    def load_users_data(self) -> Optional[List[Dict[str, Any]]]:
        """Load users data from file"""
        try:
            if not os.path.exists(Config.USERS_FILE):
                return None
            
            with open(Config.USERS_FILE, 'r') as f:
                data = json.load(f)
                return data.get('users', [])
        except Exception as e:
            logger.error(f"Failed to load users data: {e}")
            return None
    
    def save_usage_data(self, usage_data: Dict[str, Dict[str, Any]]) -> bool:
        """Save usage data to file"""
        try:
            with open(Config.USAGE_FILE, 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'usage': usage_data
                }, f, indent=2)
            logger.info(f"Saved usage data for {len(usage_data)} users to {Config.USAGE_FILE}")
            return True
        except Exception as e:
            logger.error(f"Failed to save usage data: {e}")
            return False
    
    def load_usage_data(self) -> Optional[Dict[str, Dict[str, Any]]]:
        """Load usage data from file"""
        try:
            if not os.path.exists(Config.USAGE_FILE):
                return None
            
            with open(Config.USAGE_FILE, 'r') as f:
                data = json.load(f)
                return data.get('usage', {})
        except Exception as e:
            logger.error(f"Failed to load usage data: {e}")
            return None
    
    def save_cache(self, cache_data: Dict[str, Any]) -> bool:
        """Save general cache data"""
        try:
            existing_cache = self.load_cache() or {}
            existing_cache.update(cache_data)
            existing_cache['last_updated'] = datetime.now().isoformat()
            
            with open(Config.CACHE_FILE, 'w') as f:
                json.dump(existing_cache, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")
            return False
    
    def load_cache(self) -> Optional[Dict[str, Any]]:
        """Load cache data"""
        try:
            if not os.path.exists(Config.CACHE_FILE):
                return None
            
            with open(Config.CACHE_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load cache: {e}")
            return None
    
    def is_cache_valid(self, max_age_minutes: int = None) -> bool:
        """Check if cache is still valid"""
        max_age = max_age_minutes or Config.REFRESH_INTERVAL_MINUTES
        cache = self.load_cache()
        
        if not cache or 'last_updated' not in cache:
            return False
        
        try:
            last_updated = datetime.fromisoformat(cache['last_updated'])
            age = datetime.now() - last_updated
            return age.total_seconds() / 60 <= max_age
        except Exception:
            return False
    
    def export_to_csv(self, dataframe: pd.DataFrame, filename: str, include_timestamp: bool = True) -> str:
        """Export DataFrame to CSV file"""
        try:
            if include_timestamp:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                base_name = filename.rsplit('.', 1)[0]
                extension = filename.rsplit('.', 1)[1] if '.' in filename else 'csv'
                filename = f"{base_name}_{timestamp}.{extension}"
            
            file_path = os.path.join(Config.EXPORTS_DIR, filename)
            dataframe.to_csv(file_path, index=False)
            
            logger.info(f"Exported data to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to export CSV: {e}")
            raise
    
    def export_to_excel(self, data_dict: Dict[str, pd.DataFrame], filename: str, include_timestamp: bool = True) -> str:
        """Export multiple DataFrames to Excel file with sheets"""
        try:
            if include_timestamp:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                base_name = filename.rsplit('.', 1)[0]
                filename = f"{base_name}_{timestamp}.xlsx"
            
            file_path = os.path.join(Config.EXPORTS_DIR, filename)
            
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                for sheet_name, df in data_dict.items():
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            logger.info(f"Exported data to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to export Excel: {e}")
            raise
    
    def export_to_json(self, data: Dict[str, Any], filename: str, include_timestamp: bool = True) -> str:
        """Export data to JSON file"""
        try:
            if include_timestamp:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                base_name = filename.rsplit('.', 1)[0]
                filename = f"{base_name}_{timestamp}.json"
            
            file_path = os.path.join(Config.EXPORTS_DIR, filename)
            
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)  # default=str handles datetime objects
            
            logger.info(f"Exported data to {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Failed to export JSON: {e}")
            raise
    
    def create_comprehensive_report(self, users_df: pd.DataFrame, usage_df: pd.DataFrame, 
                                  analytics_data: Dict[str, Any], trends_df: pd.DataFrame = None) -> str:
        """Create a comprehensive Excel report with multiple sheets"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"cursor_usage_report_{timestamp}.xlsx"
            file_path = os.path.join(Config.EXPORTS_DIR, filename)
            
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                # Users overview
                if not users_df.empty:
                    users_df.to_excel(writer, sheet_name='Users', index=False)
                
                # Usage metrics
                if not usage_df.empty:
                    usage_df.to_excel(writer, sheet_name='Usage_Metrics', index=False)
                
                # Top users by various metrics
                if not usage_df.empty:
                    top_users_sessions = usage_df.nlargest(20, 'total_sessions')[
                        ['user_id', 'total_sessions', 'total_requests', 'total_tokens']
                    ]
                    top_users_sessions.to_excel(writer, sheet_name='Top_Users_Sessions', index=False)
                    
                    top_users_requests = usage_df.nlargest(20, 'total_requests')[
                        ['user_id', 'total_sessions', 'total_requests', 'total_tokens']
                    ]
                    top_users_requests.to_excel(writer, sheet_name='Top_Users_Requests', index=False)
                
                # Feature usage analysis
                if analytics_data and 'feature_analysis' in analytics_data:
                    feature_data = analytics_data['feature_analysis']
                    if 'total_usage' in feature_data:
                        feature_df = pd.DataFrame([
                            {'feature': k, 'total_usage': v}
                            for k, v in feature_data['total_usage'].items()
                        ])
                        feature_df.to_excel(writer, sheet_name='Feature_Usage', index=False)
                
                # User segmentation
                if analytics_data and 'user_segmentation' in analytics_data:
                    seg_data = analytics_data['user_segmentation']
                    seg_df = pd.DataFrame([
                        {
                            'segment': k,
                            'count': v['count'],
                            'percentage': v['percentage'],
                            'avg_sessions': v['avg_sessions'],
                            'avg_requests': v['avg_requests']
                        }
                        for k, v in seg_data.items()
                    ])
                    seg_df.to_excel(writer, sheet_name='User_Segments', index=False)
                
                # Trends data
                if trends_df is not None and not trends_df.empty:
                    trends_df.to_excel(writer, sheet_name='Daily_Trends', index=False)
                
                # Summary statistics
                summary_data = {
                    'metric': [],
                    'value': []
                }
                
                if not usage_df.empty:
                    summary_data['metric'].extend([
                        'Total Users',
                        'Total Sessions',
                        'Total Requests',
                        'Total Tokens',
                        'Avg Sessions per User',
                        'Avg Requests per User'
                    ])
                    summary_data['value'].extend([
                        len(usage_df),
                        usage_df['total_sessions'].sum(),
                        usage_df['total_requests'].sum(),
                        usage_df['total_tokens'].sum(),
                        round(usage_df['total_sessions'].mean(), 2),
                        round(usage_df['total_requests'].mean(), 2)
                    ])
                
                summary_df = pd.DataFrame(summary_data)
                summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            logger.info(f"Created comprehensive report: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Failed to create comprehensive report: {e}")
            raise
    
    def get_export_files(self) -> List[Dict[str, Any]]:
        """Get list of available export files"""
        try:
            files = []
            
            if not os.path.exists(Config.EXPORTS_DIR):
                return files
            
            for filename in os.listdir(Config.EXPORTS_DIR):
                file_path = os.path.join(Config.EXPORTS_DIR, filename)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    files.append({
                        'filename': filename,
                        'size': stat.st_size,
                        'created': datetime.fromtimestamp(stat.st_ctime),
                        'modified': datetime.fromtimestamp(stat.st_mtime),
                        'path': file_path
                    })
            
            # Sort by modification time, newest first
            files.sort(key=lambda x: x['modified'], reverse=True)
            return files
            
        except Exception as e:
            logger.error(f"Failed to get export files: {e}")
            return []
    
    def cleanup_old_exports(self, days_to_keep: int = 30):
        """Clean up old export files"""
        try:
            if not os.path.exists(Config.EXPORTS_DIR):
                return
            
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            deleted_count = 0
            
            for filename in os.listdir(Config.EXPORTS_DIR):
                file_path = os.path.join(Config.EXPORTS_DIR, filename)
                if os.path.isfile(file_path):
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                    if file_time < cutoff_date:
                        os.remove(file_path)
                        deleted_count += 1
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old export files")
                
        except Exception as e:
            logger.error(f"Failed to cleanup old exports: {e}")
    
    def get_data_freshness(self) -> Dict[str, Any]:
        """Get information about data freshness"""
        freshness = {}
        
        # Check users data
        if os.path.exists(Config.USERS_FILE):
            stat = os.stat(Config.USERS_FILE)
            freshness['users_data'] = {
                'exists': True,
                'last_modified': datetime.fromtimestamp(stat.st_mtime),
                'age_minutes': (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).total_seconds() / 60
            }
        else:
            freshness['users_data'] = {'exists': False}
        
        # Check usage data
        if os.path.exists(Config.USAGE_FILE):
            stat = os.stat(Config.USAGE_FILE)
            freshness['usage_data'] = {
                'exists': True,
                'last_modified': datetime.fromtimestamp(stat.st_mtime),
                'age_minutes': (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).total_seconds() / 60
            }
        else:
            freshness['usage_data'] = {'exists': False}
        
        # Check cache
        freshness['cache_valid'] = self.is_cache_valid()
        
        return freshness 