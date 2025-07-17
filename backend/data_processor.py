import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import json
import logging
from config import Config, FEATURE_CATEGORIES

logger = logging.getLogger(__name__)

class DataProcessor:
    """Process and analyze Cursor usage data"""
    
    def __init__(self):
        self.users_df = None
        self.usage_df = None
        self.analytics_data = None
        self.spending_df = None
        self.model_usage_df = None
        self.premium_requests_df = None
    
    def process_users_data(self, users_data: List[Dict[str, Any]]) -> pd.DataFrame:
        """Process raw user data into a structured DataFrame"""
        try:
            df = pd.DataFrame(users_data)
            
            if df.empty:
                return pd.DataFrame()
            
            # Ensure required columns exist with defaults
            current_time = datetime.now()
            
            # Handle missing created_at
            if 'created_at' not in df.columns:
                df['created_at'] = (current_time - timedelta(days=90)).isoformat()
            
            # Handle missing last_active  
            if 'last_active' not in df.columns:
                df['last_active'] = (current_time - timedelta(days=1)).isoformat()
            
            # Convert date columns
            date_columns = ['created_at', 'last_active']
            for col in date_columns:
                if col in df.columns:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                    # Fill any NaT values with defaults
                    if col == 'created_at':
                        df[col] = df[col].fillna(current_time - timedelta(days=90))
                    elif col == 'last_active':
                        df[col] = df[col].fillna(current_time - timedelta(days=1))
            
            # Add computed columns
            if 'created_at' in df.columns and df['created_at'].notna().any():
                df['days_since_created'] = (datetime.now() - df['created_at']).dt.days
            else:
                df['days_since_created'] = 90  # Default
                
            if 'last_active' in df.columns and df['last_active'].notna().any():
                df['days_since_active'] = (datetime.now() - df['last_active']).dt.days
            else:
                df['days_since_active'] = 1  # Default
            
            # Categorize users by activity
            df['activity_level'] = df['days_since_active'].apply(self._categorize_activity)
            
            self.users_df = df
            return df
            
        except Exception as e:
            logger.error(f"Error processing users data: {e}")
            # Return a basic DataFrame if processing fails
            if users_data:
                return pd.DataFrame(users_data)
            return pd.DataFrame()
    
    def process_usage_data(self, usage_data: Dict[str, Dict[str, Any]]) -> pd.DataFrame:
        """Process user usage data into analysis-ready format"""
        try:
            processed_data = []
            
            for user_id, data in usage_data.items():
                if not data or 'metrics' not in data:
                    continue
                
                metrics = data['metrics']
                
                # Flatten the metrics data
                row = {
                    'user_id': user_id,
                    'total_sessions': metrics.get('total_sessions', 0),
                    'total_requests': metrics.get('total_requests', 0),
                    'total_tokens': metrics.get('total_tokens', 0),
                    'unique_days_active': metrics.get('unique_days_active', 0),
                    'avg_session_duration': metrics.get('avg_session_duration', 0),
                }
                
                # Add feature usage data
                feature_usage = metrics.get('feature_usage', {})
                for feature, count in feature_usage.items():
                    row[f'feature_{feature}'] = count
                
                # Calculate derived metrics
                row['requests_per_session'] = (
                    row['total_requests'] / row['total_sessions'] 
                    if row['total_sessions'] > 0 else 0
                )
                row['tokens_per_request'] = (
                    row['total_tokens'] / row['total_requests'] 
                    if row['total_requests'] > 0 else 0
                )
                row['activity_score'] = self._calculate_activity_score(row)
                
                processed_data.append(row)
            
            df = pd.DataFrame(processed_data)
            
            if not df.empty:
                # Add percentile rankings
                numeric_cols = ['total_sessions', 'total_requests', 'total_tokens', 'activity_score']
                for col in numeric_cols:
                    if col in df.columns:
                        df[f'{col}_percentile'] = df[col].rank(pct=True) * 100
            
            self.usage_df = df
            return df
            
        except Exception as e:
            logger.error(f"Error processing usage data: {e}")
            return pd.DataFrame()
    
    def process_daily_usage_data(self, daily_usage_data: Dict[str, Any]) -> pd.DataFrame:
        """Process daily usage data to extract premium requests, model usage, and other metrics"""
        try:
            data = daily_usage_data.get('data', [])
            if not data:
                return pd.DataFrame()
            
            df = pd.DataFrame(data)
            
            # Convert timestamp to datetime
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'], unit='ms', errors='coerce')
            
            # Premium Requests Processing - handle missing columns
            for col, default in [
                ('subscriptionIncludedReqs', 0), ('usageBasedReqs', 0), ('apiKeyReqs', 0),
                ('chatRequests', 0), ('composerRequests', 0), ('totalAccepts', 0), 
                ('totalApplies', 1), ('totalTabsAccepted', 0), ('totalTabsShown', 1)
            ]:
                if col not in df.columns:
                    df[col] = default
                else:
                    df[col] = df[col].fillna(default)
            
            # String columns
            for col, default in [
                ('mostUsedModel', 'unknown'), ('applyMostUsedExtension', '.unknown'), 
                ('tabMostUsedExtension', '.unknown'), ('email', 'unknown@email.com')
            ]:
                if col not in df.columns:
                    df[col] = default
                else:
                    df[col] = df[col].fillna(default)
            
            # Calculate derived metrics
            df['subscription_requests'] = df['subscriptionIncludedReqs']
            df['usage_based_requests'] = df['usageBasedReqs']
            df['api_key_requests'] = df['apiKeyReqs']
            df['total_premium_requests'] = df['subscription_requests'] + df['usage_based_requests'] + df['api_key_requests']
            df['primary_model'] = df['mostUsedModel']
            df['primary_apply_extension'] = df['applyMostUsedExtension']
            df['primary_tab_extension'] = df['tabMostUsedExtension']
            df['total_requests'] = df['chatRequests'] + df['composerRequests']
            
            # Productivity score with safe division
            df['productivity_score'] = (
                (df['totalAccepts'] / df['totalApplies'].replace(0, 1)) * 
                (df['totalTabsAccepted'] / df['totalTabsShown'].replace(0, 1))
            )
            
            return df
            
        except Exception as e:
            logger.error(f"Error processing daily usage data: {e}")
            return pd.DataFrame()
    
    def process_usage_events_data(self, usage_events_data: Dict[str, Any]) -> pd.DataFrame:
        """Process usage events to extract spending and detailed model usage"""
        try:
            events = usage_events_data.get('usageEvents', [])
            if not events:
                return pd.DataFrame()
            
            df = pd.DataFrame(events)
            
            # Convert timestamp
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'].astype(str).str[:10], unit='s', errors='coerce')
            
            # Process spending information
            df['cost_cents'] = 0
            df['input_tokens'] = 0
            df['output_tokens'] = 0
            df['cache_write_tokens'] = 0
            df['cache_read_tokens'] = 0
            
            # Extract token usage details
            for idx, row in df.iterrows():
                token_usage = row.get('tokenUsage', {})
                if isinstance(token_usage, dict):
                    df.at[idx, 'cost_cents'] = token_usage.get('totalCents', 0)
                    df.at[idx, 'input_tokens'] = token_usage.get('inputTokens', 0)
                    df.at[idx, 'output_tokens'] = token_usage.get('outputTokens', 0)
                    df.at[idx, 'cache_write_tokens'] = token_usage.get('cacheWriteTokens', 0)
                    df.at[idx, 'cache_read_tokens'] = token_usage.get('cacheReadTokens', 0)
            
            # Request classification
            df['request_type'] = df.get('kindLabel', 'Unknown')
            df['is_premium'] = df['request_type'] == 'Usage-based'
            df['is_subscription'] = df['request_type'] == 'Included in Business'
            
            # Model processing
            df['model_used'] = df.get('model', 'unknown')
            df['is_max_mode'] = df.get('maxMode', False)
            
            return df
            
        except Exception as e:
            logger.error(f"Error processing usage events data: {e}")
            return pd.DataFrame()
    
    def process_spending_data(self, spending_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process spending data to extract cost breakdown"""
        try:
            total_spent = spending_data.get('totalSpent', 0)
            currency = spending_data.get('currency', 'USD')
            breakdown = spending_data.get('breakdown', {})
            
            return {
                'total_spent': total_spent,
                'currency': currency,
                'usage_based_cost': breakdown.get('usageBased', 0),
                'subscription_cost': breakdown.get('subscription', 0),
                'period': spending_data.get('period', {})
            }
            
        except Exception as e:
            logger.error(f"Error processing spending data: {e}")
            return {}
    
    def get_premium_requests_analysis(self, daily_usage_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze premium vs subscription requests"""
        try:
            if daily_usage_df.empty:
                return {}
            
            # Group by user email
            user_premium_analysis = daily_usage_df.groupby('email').agg({
                'subscription_requests': 'sum',
                'usage_based_requests': 'sum', 
                'api_key_requests': 'sum',
                'total_premium_requests': 'sum'
            }).reset_index()
            
            # Calculate percentages
            total_subscription = user_premium_analysis['subscription_requests'].sum()
            total_usage_based = user_premium_analysis['usage_based_requests'].sum()
            total_api_key = user_premium_analysis['api_key_requests'].sum()
            total_all = total_subscription + total_usage_based + total_api_key
            
            # Overall breakdown
            breakdown = {
                'subscription_requests': {
                    'count': int(total_subscription),
                    'percentage': (total_subscription / total_all * 100) if total_all > 0 else 0
                },
                'usage_based_requests': {
                    'count': int(total_usage_based),
                    'percentage': (total_usage_based / total_all * 100) if total_all > 0 else 0
                },
                'api_key_requests': {
                    'count': int(total_api_key),
                    'percentage': (total_api_key / total_all * 100) if total_all > 0 else 0
                }
            }
            
            # Top users by usage-based requests (premium users)
            top_premium_users = user_premium_analysis.nlargest(10, 'usage_based_requests')[
                ['email', 'usage_based_requests', 'subscription_requests']
            ].to_dict('records')
            
            return {
                'overall_breakdown': breakdown,
                'user_analysis': user_premium_analysis.to_dict('records'),
                'top_premium_users': top_premium_users,
                'total_requests': int(total_all)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing premium requests: {e}")
            return {}
    
    def get_individual_spending_analysis(self, usage_events_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze spending by individual users"""
        try:
            if usage_events_df.empty:
                return {}
            
            # Group by user email
            user_spending = usage_events_df.groupby('userEmail').agg({
                'cost_cents': 'sum',
                'input_tokens': 'sum',
                'output_tokens': 'sum',
                'cache_write_tokens': 'sum',
                'cache_read_tokens': 'sum',
                'is_premium': 'sum',
                'is_subscription': 'sum'
            }).reset_index()
            
            # Convert cents to dollars
            user_spending['cost_dollars'] = user_spending['cost_cents'] / 100
            user_spending['total_tokens'] = (
                user_spending['input_tokens'] + 
                user_spending['output_tokens'] + 
                user_spending['cache_write_tokens'] + 
                user_spending['cache_read_tokens']
            )
            
            # Calculate cost per token
            user_spending['cost_per_1k_tokens'] = (
                user_spending['cost_dollars'] / (user_spending['total_tokens'] / 1000)
            ).fillna(0)
            
            # Sort by spending
            user_spending = user_spending.sort_values('cost_dollars', ascending=False)
            
            # Summary statistics
            total_spending = user_spending['cost_dollars'].sum()
            avg_spending = user_spending['cost_dollars'].mean()
            median_spending = user_spending['cost_dollars'].median()
            
            return {
                'user_spending': user_spending.to_dict('records'),
                'top_spenders': user_spending.head(10).to_dict('records'),
                'summary': {
                    'total_spending': total_spending,
                    'average_spending_per_user': avg_spending,
                    'median_spending_per_user': median_spending,
                    'total_users': len(user_spending)
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing individual spending: {e}")
            return {}
    
    def get_model_usage_analysis(self, daily_usage_df: pd.DataFrame, usage_events_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze model usage patterns"""
        try:
            analysis = {}
            
            # Daily usage model analysis
            if not daily_usage_df.empty:
                model_daily_usage = daily_usage_df.groupby(['email', 'primary_model']).size().reset_index(name='days_used')
                model_popularity = daily_usage_df['primary_model'].value_counts().to_dict()
                
                analysis['daily_model_usage'] = {
                    'model_popularity': model_popularity,
                    'user_model_preferences': model_daily_usage.to_dict('records')
                }
            
            # Usage events model analysis (more detailed)
            if not usage_events_df.empty:
                model_events = usage_events_df.groupby(['userEmail', 'model_used']).agg({
                    'cost_cents': 'sum',
                    'input_tokens': 'sum',
                    'output_tokens': 'sum',
                    'is_max_mode': 'sum'
                }).reset_index()
                
                model_events['cost_dollars'] = model_events['cost_cents'] / 100
                
                # Model cost analysis
                model_costs = usage_events_df.groupby('model_used').agg({
                    'cost_cents': ['sum', 'mean', 'count'],
                    'input_tokens': 'sum',
                    'output_tokens': 'sum'
                }).round(4)
                
                model_costs.columns = ['total_cost_cents', 'avg_cost_cents', 'request_count', 'total_input_tokens', 'total_output_tokens']
                model_costs['total_cost_dollars'] = model_costs['total_cost_cents'] / 100
                model_costs['avg_cost_dollars'] = model_costs['avg_cost_cents'] / 100
                
                analysis['detailed_model_usage'] = {
                    'user_model_costs': model_events.to_dict('records'),
                    'model_cost_breakdown': model_costs.reset_index().to_dict('records'),
                    'model_performance': {
                        'most_expensive': model_costs.loc[model_costs['total_cost_dollars'].idxmax()].to_dict() if len(model_costs) > 0 else {},
                        'most_used': model_costs.loc[model_costs['request_count'].idxmax()].to_dict() if len(model_costs) > 0 else {},
                        'highest_avg_cost': model_costs.loc[model_costs['avg_cost_dollars'].idxmax()].to_dict() if len(model_costs) > 0 else {}
                    }
                }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing model usage: {e}")
            return {}
    
    def get_top_users(self, metric: str = 'total_requests', top_n: int = 10) -> pd.DataFrame:
        """Get top N users by specified metric"""
        if self.usage_df is None or self.usage_df.empty:
            return pd.DataFrame()
        
        if metric not in self.usage_df.columns:
            logger.warning(f"Metric {metric} not found in usage data")
            return pd.DataFrame()
        
        top_users = self.usage_df.nlargest(top_n, metric)[['user_id', metric]]
        
        # Join with user info if available
        if self.users_df is not None and not self.users_df.empty:
            top_users = top_users.merge(
                self.users_df[['id', 'name', 'email']], 
                left_on='user_id', 
                right_on='id', 
                how='left'
            ).drop('id', axis=1)
        
        return top_users
    
    def get_usage_trends(self, daily_data: List[Dict[str, Any]], metric: str = 'requests') -> pd.DataFrame:
        """Process daily usage data for trend analysis"""
        try:
            df = pd.DataFrame(daily_data)
            
            if df.empty:
                return pd.DataFrame()
            
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date')
            
            # Calculate moving averages
            df[f'{metric}_7day_avg'] = df[metric].rolling(window=7, min_periods=1).mean()
            df[f'{metric}_trend'] = df[metric].pct_change().fillna(0)
            
            # Add day of week and other time features
            df['day_of_week'] = df['date'].dt.day_name()
            df['week_number'] = df['date'].dt.isocalendar().week
            df['month'] = df['date'].dt.month
            
            return df
            
        except Exception as e:
            logger.error(f"Error processing trends data: {e}")
            return pd.DataFrame()
    
    def analyze_feature_usage(self) -> Dict[str, Any]:
        """Analyze feature usage patterns across users"""
        if self.usage_df is None or self.usage_df.empty:
            return {}
        
        feature_cols = [col for col in self.usage_df.columns if col.startswith('feature_')]
        
        if not feature_cols:
            return {}
        
        analysis = {}
        
        # Total usage by feature
        feature_totals = {}
        for col in feature_cols:
            feature_name = col.replace('feature_', '')
            feature_totals[feature_name] = self.usage_df[col].sum()
        
        analysis['total_usage'] = feature_totals
        
        # Most popular features
        analysis['top_features'] = sorted(
            feature_totals.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]
        
        # Feature adoption rate (% of users who used each feature)
        adoption_rates = {}
        total_users = len(self.usage_df)
        
        for col in feature_cols:
            feature_name = col.replace('feature_', '')
            users_with_feature = (self.usage_df[col] > 0).sum()
            adoption_rates[feature_name] = (users_with_feature / total_users) * 100
        
        analysis['adoption_rates'] = adoption_rates
        
        # Average usage per active user
        avg_usage = {}
        for col in feature_cols:
            feature_name = col.replace('feature_', '')
            active_users = self.usage_df[self.usage_df[col] > 0]
            if len(active_users) > 0:
                avg_usage[feature_name] = active_users[col].mean()
            else:
                avg_usage[feature_name] = 0
        
        analysis['avg_usage_per_active_user'] = avg_usage
        
        return analysis
    
    def get_user_segmentation(self) -> Dict[str, Any]:
        """Segment users based on usage patterns"""
        if self.usage_df is None or self.usage_df.empty:
            return {}
        
        # Define segments based on activity score percentiles
        df = self.usage_df.copy()
        
        # Create segments
        df['segment'] = pd.cut(
            df['activity_score_percentile'], 
            bins=[0, 25, 50, 75, 100], 
            labels=['Low Activity', 'Medium Activity', 'High Activity', 'Power Users'],
            include_lowest=True
        )
        
        segmentation = {}
        
        for segment in df['segment'].cat.categories:
            segment_data = df[df['segment'] == segment]
            
            segmentation[segment] = {
                'count': len(segment_data),
                'percentage': (len(segment_data) / len(df)) * 100,
                'avg_sessions': segment_data['total_sessions'].mean(),
                'avg_requests': segment_data['total_requests'].mean(),
                'avg_tokens': segment_data['total_tokens'].mean(),
                'top_features': self._get_segment_top_features(segment_data)
            }
        
        return segmentation
    
    def calculate_growth_metrics(self, current_data: Dict, previous_data: Dict = None) -> Dict[str, Any]:
        """Calculate growth and change metrics"""
        metrics = {}
        
        if not previous_data:
            # If no previous data, return current metrics as baseline
            return {
                'total_users': len(self.users_df) if self.users_df is not None else 0,
                'active_users': len(self.usage_df) if self.usage_df is not None else 0,
                'total_requests': self.usage_df['total_requests'].sum() if self.usage_df is not None else 0,
                'growth_rate': 0,
                'user_retention': 0
            }
        
        # Calculate growth rates
        current_users = len(self.users_df) if self.users_df is not None else 0
        previous_users = previous_data.get('total_users', 0)
        
        if previous_users > 0:
            user_growth = ((current_users - previous_users) / previous_users) * 100
        else:
            user_growth = 0
        
        current_requests = self.usage_df['total_requests'].sum() if self.usage_df is not None else 0
        previous_requests = previous_data.get('total_requests', 0)
        
        if previous_requests > 0:
            request_growth = ((current_requests - previous_requests) / previous_requests) * 100
        else:
            request_growth = 0
        
        metrics = {
            'user_growth_rate': user_growth,
            'request_growth_rate': request_growth,
            'current_total_users': current_users,
            'current_total_requests': current_requests,
            'previous_total_users': previous_users,
            'previous_total_requests': previous_requests
        }
        
        return metrics
    
    def _categorize_activity(self, days_since_active: int) -> str:
        """Categorize user activity level based on days since last active"""
        if days_since_active <= 1:
            return 'Very Active'
        elif days_since_active <= 7:
            return 'Active'
        elif days_since_active <= 30:
            return 'Moderately Active'
        else:
            return 'Inactive'
    
    def _calculate_activity_score(self, user_data: Dict) -> float:
        """Calculate a composite activity score for a user"""
        # Weighted scoring based on different metrics
        weights = {
            'sessions': 0.2,
            'requests': 0.3,
            'tokens': 0.2,
            'days_active': 0.2,
            'avg_duration': 0.1
        }
        
        # Normalize metrics (simple min-max approach)
        normalized_sessions = min(user_data['total_sessions'] / 100, 1.0)
        normalized_requests = min(user_data['total_requests'] / 1000, 1.0)
        normalized_tokens = min(user_data['total_tokens'] / 100000, 1.0)
        normalized_days = min(user_data['unique_days_active'] / 30, 1.0)
        normalized_duration = min(user_data['avg_session_duration'] / 300, 1.0)
        
        score = (
            normalized_sessions * weights['sessions'] +
            normalized_requests * weights['requests'] +
            normalized_tokens * weights['tokens'] +
            normalized_days * weights['days_active'] +
            normalized_duration * weights['avg_duration']
        ) * 100
        
        return round(score, 2)
    
    def _get_segment_top_features(self, segment_data: pd.DataFrame) -> List[Tuple[str, float]]:
        """Get top features for a user segment"""
        feature_cols = [col for col in segment_data.columns if col.startswith('feature_')]
        
        feature_usage = {}
        for col in feature_cols:
            feature_name = col.replace('feature_', '')
            feature_usage[feature_name] = segment_data[col].mean()
        
        return sorted(feature_usage.items(), key=lambda x: x[1], reverse=True)[:3]
    
    def export_summary_stats(self) -> Dict[str, Any]:
        """Export comprehensive summary statistics"""
        if self.usage_df is None or self.usage_df.empty:
            return {}
        
        stats = {
            'total_users': len(self.usage_df),
            'total_sessions': self.usage_df['total_sessions'].sum(),
            'total_requests': self.usage_df['total_requests'].sum(),
            'total_tokens': self.usage_df['total_tokens'].sum(),
            'avg_sessions_per_user': self.usage_df['total_sessions'].mean(),
            'avg_requests_per_user': self.usage_df['total_requests'].mean(),
            'avg_tokens_per_user': self.usage_df['total_tokens'].mean(),
            'median_activity_score': self.usage_df['activity_score'].median(),
            'feature_analysis': self.analyze_feature_usage(),
            'user_segmentation': self.get_user_segmentation()
        }
        
        return stats 