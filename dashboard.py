import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import asyncio
from datetime import datetime, timedelta
import logging
import sys
import os

# Add backend to path
sys.path.append('backend')

from cursor_api import CursorAPIClient
from data_processor import DataProcessor
from storage import DataStorage
from config import Config, DASHBOARD_CONFIG, COLORS, FEATURE_CATEGORIES

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Streamlit page
st.set_page_config(**DASHBOARD_CONFIG)

class CursorDashboard:
    """Main dashboard class for Cursor usage analytics"""
    
    def __init__(self):
        self.api_client = None
        self.data_processor = DataProcessor()
        self.storage = DataStorage()
        self.initialize_session_state()
    
    def initialize_session_state(self):
        """Initialize Streamlit session state variables"""
        if 'data_loaded' not in st.session_state:
            st.session_state.data_loaded = False
        if 'users_data' not in st.session_state:
            st.session_state.users_data = None
        if 'usage_data' not in st.session_state:
            st.session_state.usage_data = None
        if 'analytics_data' not in st.session_state:
            st.session_state.analytics_data = None
        if 'last_refresh' not in st.session_state:
            st.session_state.last_refresh = None
        if 'daily_usage_df' not in st.session_state:
            st.session_state.daily_usage_df = None
        if 'usage_events_df' not in st.session_state:
            st.session_state.usage_events_df = None
        if 'spending_data' not in st.session_state:
            st.session_state.spending_data = None
    
    def validate_config(self):
        """Validate configuration and show setup instructions if needed"""
        try:
            Config.validate()
            return True
        except ValueError as e:
            st.error(f"Configuration Error: {str(e)}")
            st.markdown("""
            ### Setup Instructions
            
            1. Create a `.env` file in the project root with your Cursor API credentials:
            ```
            CURSOR_API_KEY=your_api_key_here
            CURSOR_ORG_ID=your_organization_id
            CURSOR_API_BASE_URL=https://api.cursor.sh/v1
            ```
            
            2. Make sure you have admin access to your Cursor organization
            
            3. Restart the dashboard after updating the configuration
            """)
            return False
    
    def setup_api_client(self):
        """Setup the API client with error handling"""
        try:
            self.api_client = CursorAPIClient(
                api_key=Config.CURSOR_API_KEY,
                org_id=Config.CURSOR_ORG_ID,
                base_url=Config.CURSOR_API_BASE_URL
            )
            return True
        except Exception as e:
            st.error(f"Failed to initialize API client: {e}")
            return False
    
    @st.cache_data(ttl=Config.REFRESH_INTERVAL_MINUTES * 60)
    def load_data(_self, force_refresh=False):
        """Load data from API or cache"""
        try:
            # Check if we should use cached data
            if not force_refresh and _self.storage.is_cache_valid():
                st.info("Using cached data. Click 'Refresh Data' to fetch latest.")
                users_data = _self.storage.load_users_data()
                usage_data = _self.storage.load_usage_data()
                
                if users_data is not None and usage_data is not None:
                    return users_data, usage_data
            
            # Fetch fresh data from API
            with st.spinner("Fetching data from Cursor API..."):
                if not _self.api_client:
                    if not _self.setup_api_client():
                        return None, None
                
                # Get organization info
                org_info = _self.api_client.get_organization_info()
                st.success(f"Connected to organization: {org_info.get('name', 'Unknown')}")
                
                # Get all users
                users_data = _self.api_client.get_all_users()
                st.info(f"Found {len(users_data)} users")
                
                # Initialize usage data
                usage_data = {}
                
                # Get usage data for all users if we have users
                if users_data:
                    user_ids = [user['id'] for user in users_data]
                    
                    progress_bar = st.progress(0)
                    
                    for i, user_id in enumerate(user_ids):
                        usage_data[user_id] = _self.api_client.get_user_usage(user_id)
                        progress_bar.progress((i + 1) / len(user_ids))
                    
                    progress_bar.empty()
                    st.success(f"Loaded usage data for {len(usage_data)} users")
                    
                else:
                    # If no team members, try to get usage data from usage events and daily usage
                    st.info("No team members found, extracting users from usage data...")
                    
                    # Get daily usage data - collect all data efficiently
                    with st.spinner("Loading daily usage data..."):
                        daily_usage = _self.api_client.get_daily_usage_data()
                        daily_data = daily_usage.get('data', [])
                        st.session_state.daily_usage_df = _self.data_processor.process_daily_usage_data(daily_usage)
                    
                    # Get usage events for spending analysis
                    with st.spinner("Loading usage events data..."):
                        usage_events = _self.api_client.get_usage_events(page_size=1000)
                        events = usage_events.get('usageEvents', [])
                        st.session_state.usage_events_df = _self.data_processor.process_usage_events_data(usage_events)
                    
                    # Get spending data
                    with st.spinner("Loading spending data..."):
                        spending_data = _self.api_client.get_spending_data()
                        st.session_state.spending_data = _self.data_processor.process_spending_data(spending_data)
                    
                    # Extract user emails from both sources
                    user_emails = set()
                    user_email_to_data = {}
                    
                    # From daily usage data (primary source) - collect all data per user
                    for day in daily_data:
                        if day.get('email'):
                            email = day.get('email')
                            user_emails.add(email)
                            if email not in user_email_to_data:
                                user_email_to_data[email] = {
                                    'daily_data': [],
                                    'total_requests': 0,
                                    'total_chat_requests': 0,
                                    'total_composer_requests': 0,
                                    'is_active': False,
                                    'last_seen': None
                                }
                            
                            user_email_to_data[email]['daily_data'].append(day)
                            user_email_to_data[email]['total_requests'] += day.get('chatRequests', 0) + day.get('composerRequests', 0)
                            user_email_to_data[email]['total_chat_requests'] += day.get('chatRequests', 0)
                            user_email_to_data[email]['total_composer_requests'] += day.get('composerRequests', 0)
                            if day.get('isActive'):
                                user_email_to_data[email]['is_active'] = True
                            
                            # Convert timestamp to datetime for last seen
                            if day.get('date'):
                                day_date = datetime.fromtimestamp(day.get('date') / 1000)
                                if not user_email_to_data[email]['last_seen'] or day_date > user_email_to_data[email]['last_seen']:
                                    user_email_to_data[email]['last_seen'] = day_date
                    
                    # From usage events (secondary source for missing users)
                    for event in events:
                        if event.get('userEmail'):
                            user_emails.add(event.get('userEmail'))
                    
                    st.info(f"Extracted {len(user_emails)} unique users from usage data")
                    
                    if user_emails:
                        current_time = datetime.now()
                        
                        # Convert to users_data format
                        users_data = []
                        for email in user_emails:
                            # Extract real name from email
                            name_part = email.split('@')[0] if '@' in email else email
                            
                            # Convert dots and underscores to spaces and title case
                            if '.' in name_part:
                                display_name = ' '.join(word.capitalize() for word in name_part.split('.'))
                            elif '_' in name_part:
                                display_name = ' '.join(word.capitalize() for word in name_part.split('_'))
                            else:
                                display_name = name_part.capitalize()
                            
                            # Get last seen date
                            user_data = user_email_to_data.get(email, {})
                            last_seen = user_data.get('last_seen') or (current_time - timedelta(days=7))
                            
                            # Determine activity status based on last 7 days
                            is_active = (current_time - last_seen).days <= 7 if user_data.get('is_active') else False
                            
                            users_data.append({
                                'id': email,
                                'name': display_name,
                                'email': email,
                                'status': 'active' if is_active else 'inactive',
                                'last_active': last_seen.isoformat(),
                                'created_at': (current_time - timedelta(days=30)).isoformat(),
                                'activity_level': 'high' if user_data.get('total_requests', 0) > 100 else 'medium' if user_data.get('total_requests', 0) > 20 else 'low'
                            })
                        
                        # Process usage data efficiently from collected information
                        progress_bar = st.progress(0)
                        
                        for i, email in enumerate(user_emails):
                            user_data = user_email_to_data.get(email, {})
                            
                            usage_data[email] = {
                                'user_id': email,
                                'period': {
                                    'start': (current_time - timedelta(days=30)).isoformat(),
                                    'end': current_time.isoformat()
                                },
                                'metrics': {
                                    'total_sessions': len(user_data.get('daily_data', [])),
                                    'total_requests': user_data.get('total_requests', 0),
                                    'total_tokens': user_data.get('total_requests', 0) * 1000,  # Estimate
                                    'unique_days_active': len([d for d in user_data.get('daily_data', []) if d.get('isActive')]),
                                    'avg_session_duration': 120,  # Default
                                    'feature_usage': {
                                        'chat': user_data.get('total_chat_requests', 0),
                                        'composer': user_data.get('total_composer_requests', 0),
                                        'code_completion': user_data.get('total_requests', 0),
                                        'diff': 0,
                                        'search': 0,
                                        'refactor': 0,
                                        'debug': 0
                                    }
                                },
                                'daily_breakdown': [
                                    {
                                        'date': datetime.fromtimestamp(day.get('date', 0) / 1000).strftime('%Y-%m-%d'),
                                        'total_requests': day.get('chatRequests', 0) + day.get('composerRequests', 0),
                                        'chat_requests': day.get('chatRequests', 0),
                                        'composer_requests': day.get('composerRequests', 0),
                                        'total_tokens': (day.get('chatRequests', 0) + day.get('composerRequests', 0)) * 1000
                                    }
                                    for day in user_data.get('daily_data', [])
                                ]
                            }
                            
                            progress_bar.progress((i + 1) / len(user_emails))
                        
                        progress_bar.empty()
                        st.success(f"Successfully processed {len(user_emails)} users with real names and usage data")
                    else:
                        st.warning("No user data found in daily usage or events")
                
                # Save to cache
                _self.storage.save_users_data(users_data)
                _self.storage.save_usage_data(usage_data)
                
                return users_data, usage_data
                
        except Exception as e:
            st.error(f"Error loading data: {e}")
            logger.error(f"Data loading error: {e}")
            return None, None
    
    def render_sidebar(self):
        """Render the sidebar with controls and filters"""
        st.sidebar.title("🎛️ Controls")
        
        # Data refresh controls
        st.sidebar.subheader("Data Management")
        
        col1, col2 = st.sidebar.columns(2)
        
        with col1:
            if st.button("🔄 Refresh Data", help="Fetch latest data from API"):
                st.session_state.data_loaded = False
                st.rerun()
        
        with col2:
            if st.button("📁 Export Data", help="Export current data"):
                self.export_data()
        
        # Show data freshness
        freshness = self.storage.get_data_freshness()
        if freshness.get('usage_data', {}).get('exists'):
            age_minutes = freshness['usage_data']['age_minutes']
            if age_minutes < 60:
                st.sidebar.info(f"Data age: {age_minutes:.0f} minutes")
            else:
                st.sidebar.info(f"Data age: {age_minutes/60:.1f} hours")
        
        # Filters
        st.sidebar.subheader("Filters")
        
        # Date range filter
        date_range = st.sidebar.date_input(
            "Date Range",
            value=(datetime.now() - timedelta(days=30), datetime.now()),
            help="Filter data by date range"
        )
        
        # User activity filter
        activity_filter = st.sidebar.selectbox(
            "User Activity Level",
            ["All", "Very Active", "Active", "Moderately Active", "Inactive"]
        )
        
        # Metrics to show
        st.sidebar.subheader("Display Options")
        
        show_percentiles = st.sidebar.checkbox("Show Percentiles", value=True)
        show_trends = st.sidebar.checkbox("Show Trends", value=True)
        show_feature_breakdown = st.sidebar.checkbox("Show Feature Breakdown", value=True)
        
        return {
            'date_range': date_range,
            'activity_filter': activity_filter,
            'show_percentiles': show_percentiles,
            'show_trends': show_trends,
            'show_feature_breakdown': show_feature_breakdown
        }
    
    def render_overview_metrics(self, usage_df, users_df):
        """Render the overview metrics cards"""
        if usage_df.empty:
            st.warning("No usage data available")
            return
        
        # Calculate key metrics
        total_users = len(usage_df)
        total_sessions = usage_df['total_sessions'].sum()
        total_requests = usage_df['total_requests'].sum()
        total_tokens = usage_df['total_tokens'].sum()
        avg_session_duration = usage_df['avg_session_duration'].mean()
        
        # Display metrics in columns
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.metric(
                label="👥 Total Users",
                value=f"{total_users:,}",
                help="Total number of users with usage data"
            )
        
        with col2:
            st.metric(
                label="🎯 Total Sessions",
                value=f"{total_sessions:,}",
                help="Total number of user sessions"
            )
        
        with col3:
            st.metric(
                label="📊 Total Requests",
                value=f"{total_requests:,}",
                help="Total number of API requests"
            )
        
        with col4:
            st.metric(
                label="🔤 Total Tokens",
                value=f"{total_tokens:,}",
                help="Total number of tokens processed"
            )
        
        with col5:
            st.metric(
                label="⏱️ Avg Session (min)",
                value=f"{avg_session_duration:.1f}",
                help="Average session duration in minutes"
            )
    
    def render_top_users_chart(self, usage_df, metric='total_requests', top_n=10):
        """Render top users chart"""
        if usage_df.empty:
            return
        
        top_users = usage_df.nlargest(top_n, metric)
        
        fig = px.bar(
            top_users,
            x='user_id',
            y=metric,
            title=f"Top {top_n} Users by {metric.replace('_', ' ').title()}",
            color=metric,
            color_continuous_scale='Blues'
        )
        
        fig.update_layout(
            height=Config.DEFAULT_CHART_HEIGHT,
            xaxis_title="User ID",
            yaxis_title=metric.replace('_', ' ').title(),
            showlegend=False
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def render_usage_trends_chart(self, org_usage_data):
        """Render usage trends over time"""
        if not org_usage_data or 'daily_breakdown' not in org_usage_data:
            st.warning("No trend data available")
            return
        
        trends_df = self.data_processor.get_usage_trends(
            org_usage_data['daily_breakdown']
        )
        
        if trends_df.empty:
            return
        
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Daily Requests', 'Daily Sessions', 'Daily Tokens', 'Active Users'),
            specs=[[{"secondary_y": False}, {"secondary_y": False}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # Daily requests
        fig.add_trace(
            go.Scatter(x=trends_df['date'], y=trends_df['requests'], 
                      mode='lines+markers', name='Requests'),
            row=1, col=1
        )
        
        # Daily sessions
        fig.add_trace(
            go.Scatter(x=trends_df['date'], y=trends_df['sessions'], 
                      mode='lines+markers', name='Sessions'),
            row=1, col=2
        )
        
        # Daily tokens
        fig.add_trace(
            go.Scatter(x=trends_df['date'], y=trends_df['tokens'], 
                      mode='lines+markers', name='Tokens'),
            row=2, col=1
        )
        
        # Active users
        if 'unique_users' in trends_df.columns:
            fig.add_trace(
                go.Scatter(x=trends_df['date'], y=trends_df['unique_users'], 
                          mode='lines+markers', name='Active Users'),
                row=2, col=2
            )
        
        fig.update_layout(
            height=600,
            title_text="Usage Trends Over Time",
            showlegend=False
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def render_feature_usage_chart(self, usage_df):
        """Render feature usage breakdown"""
        if usage_df.empty:
            return
        
        feature_analysis = self.data_processor.analyze_feature_usage()
        
        if not feature_analysis or 'total_usage' not in feature_analysis:
            st.warning("No feature usage data available")
            return
        
        # Feature usage pie chart
        features = list(feature_analysis['total_usage'].keys())
        values = list(feature_analysis['total_usage'].values())
        
        fig = px.pie(
            values=values,
            names=features,
            title="Feature Usage Distribution"
        )
        
        fig.update_layout(height=Config.DEFAULT_CHART_HEIGHT)
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Feature adoption rates
        if 'adoption_rates' in feature_analysis:
            st.subheader("Feature Adoption Rates")
            
            adoption_df = pd.DataFrame([
                {'Feature': k, 'Adoption Rate (%)': v}
                for k, v in feature_analysis['adoption_rates'].items()
            ]).sort_values('Adoption Rate (%)', ascending=False)
            
            fig = px.bar(
                adoption_df,
                x='Feature',
                y='Adoption Rate (%)',
                title="Feature Adoption Rates",
                color='Adoption Rate (%)',
                color_continuous_scale='Greens'
            )
            
            fig.update_layout(height=Config.DEFAULT_CHART_HEIGHT)
            st.plotly_chart(fig, use_container_width=True)
    
    def render_user_segmentation(self, usage_df):
        """Render user segmentation analysis"""
        if usage_df.empty:
            return
        
        segmentation = self.data_processor.get_user_segmentation()
        
        if not segmentation:
            st.warning("No segmentation data available")
            return
        
        st.subheader("User Segmentation")
        
        # Segmentation overview
        seg_df = pd.DataFrame([
            {
                'Segment': k,
                'Count': v['count'],
                'Percentage': f"{v['percentage']:.1f}%",
                'Avg Sessions': f"{v['avg_sessions']:.1f}",
                'Avg Requests': f"{v['avg_requests']:.1f}"
            }
            for k, v in segmentation.items()
        ])
        
        st.dataframe(seg_df, use_container_width=True)
        
        # Segment distribution pie chart
        fig = px.pie(
            values=[v['count'] for v in segmentation.values()],
            names=list(segmentation.keys()),
            title="User Distribution by Activity Level"
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def render_premium_requests_analysis(self):
        """Render premium requests segregation analysis"""
        st.header("💳 Premium Requests Analysis")
        
        if 'daily_usage_df' in st.session_state and not st.session_state.daily_usage_df.empty:
            daily_df = st.session_state.daily_usage_df
            
            # Calculate overall breakdown
            total_subscription = daily_df['subscription_requests'].sum()
            total_usage_based = daily_df['usage_based_requests'].sum()
            total_api_key = daily_df['api_key_requests'].sum()
            total_all = total_subscription + total_usage_based + total_api_key
            
            # Overview metrics
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("📊 Subscription Requests", f"{total_subscription:,}", 
                         f"{(total_subscription/total_all*100):.1f}%" if total_all > 0 else "0%")
            with col2:
                st.metric("💰 Usage-Based Requests", f"{total_usage_based:,}",
                         f"{(total_usage_based/total_all*100):.1f}%" if total_all > 0 else "0%")
            with col3:
                st.metric("🔑 API Key Requests", f"{total_api_key:,}",
                         f"{(total_api_key/total_all*100):.1f}%" if total_all > 0 else "0%")
            with col4:
                st.metric("📈 Total Requests", f"{total_all:,}")
            
            # Charts
            col1, col2 = st.columns(2)
            
            with col1:
                # Pie chart of request types
                if total_all > 0:
                    fig_pie = px.pie(
                        values=[total_subscription, total_usage_based, total_api_key],
                        names=['Subscription', 'Usage-Based', 'API Key'],
                        title="Request Type Distribution",
                        color_discrete_sequence=['#1f77b4', '#ff7f0e', '#2ca02c']
                    )
                    st.plotly_chart(fig_pie, use_container_width=True)
            
            with col2:
                # Top users by usage-based requests
                user_premium = daily_df.groupby('email').agg({
                    'usage_based_requests': 'sum',
                    'subscription_requests': 'sum'
                }).reset_index().sort_values('usage_based_requests', ascending=False).head(10)
                
                if not user_premium.empty:
                    fig_bar = px.bar(
                        user_premium, 
                        x='email', 
                        y=['usage_based_requests', 'subscription_requests'],
                        title="Top Users by Premium Requests",
                        labels={'value': 'Requests', 'email': 'User'}
                    )
                    fig_bar.update_xaxis(tickangle=45)
                    st.plotly_chart(fig_bar, use_container_width=True)
        else:
            st.info("No premium requests data available")
    
    def render_individual_spending_analysis(self):
        """Render individual user spending analysis"""
        st.header("💸 Individual User Spending")
        
        if 'usage_events_df' in st.session_state and not st.session_state.usage_events_df.empty:
            events_df = st.session_state.usage_events_df
            
            # Calculate spending by user
            user_spending = events_df.groupby('userEmail').agg({
                'cost_cents': 'sum',
                'input_tokens': 'sum',
                'output_tokens': 'sum',
                'model_used': 'count'  # Number of requests
            }).reset_index()
            
            user_spending['cost_dollars'] = user_spending['cost_cents'] / 100
            user_spending['total_tokens'] = user_spending['input_tokens'] + user_spending['output_tokens']
            user_spending = user_spending.sort_values('cost_dollars', ascending=False)
            
            # Summary metrics
            total_spending = user_spending['cost_dollars'].sum()
            avg_spending = user_spending['cost_dollars'].mean()
            median_spending = user_spending['cost_dollars'].median()
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("💰 Total Spending", f"${total_spending:.2f}")
            with col2:
                st.metric("📊 Average per User", f"${avg_spending:.2f}")
            with col3:
                st.metric("📈 Median per User", f"${median_spending:.2f}")
            with col4:
                st.metric("👥 Total Users", len(user_spending))
            
            # Charts
            col1, col2 = st.columns(2)
            
            with col1:
                # Top spenders
                top_spenders = user_spending.head(10)
                fig_spenders = px.bar(
                    top_spenders,
                    x='userEmail',
                    y='cost_dollars',
                    title="Top 10 Spenders",
                    labels={'cost_dollars': 'Spending ($)', 'userEmail': 'User'}
                )
                fig_spenders.update_xaxis(tickangle=45)
                st.plotly_chart(fig_spenders, use_container_width=True)
            
            with col2:
                # Spending distribution
                fig_hist = px.histogram(
                    user_spending,
                    x='cost_dollars',
                    nbins=20,
                    title="Spending Distribution",
                    labels={'cost_dollars': 'Spending ($)', 'count': 'Number of Users'}
                )
                st.plotly_chart(fig_hist, use_container_width=True)
            
            # Detailed table
            with st.expander("📋 Detailed User Spending", expanded=False):
                st.dataframe(
                    user_spending[['userEmail', 'cost_dollars', 'total_tokens', 'model_used']].rename(columns={
                        'userEmail': 'User Email',
                        'cost_dollars': 'Spending ($)',
                        'total_tokens': 'Total Tokens',
                        'model_used': 'Requests'
                    }),
                    use_container_width=True
                )
        
        # Overall spending data
        if 'spending_data' in st.session_state and st.session_state.spending_data:
            spending = st.session_state.spending_data
            st.subheader("📊 Overall Spending Breakdown")
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("💳 Total Spent", f"${spending.get('total_spent', 0):.2f}")
                st.metric("💰 Usage-Based Cost", f"${spending.get('usage_based_cost', 0):.2f}")
            with col2:
                st.metric("📅 Subscription Cost", f"${spending.get('subscription_cost', 0):.2f}")
                st.metric("💱 Currency", spending.get('currency', 'USD'))
    
    def render_model_usage_analysis(self):
        """Render model usage analytics"""
        st.header("🤖 Model Usage Analytics")
        
        if 'daily_usage_df' in st.session_state and not st.session_state.daily_usage_df.empty:
            daily_df = st.session_state.daily_usage_df
            
            # Model popularity from daily usage
            model_popularity = daily_df['primary_model'].value_counts()
            
            col1, col2 = st.columns(2)
            
            with col1:
                # Model popularity pie chart
                if not model_popularity.empty:
                    fig_models = px.pie(
                        values=model_popularity.values,
                        names=model_popularity.index,
                        title="Model Popularity (Daily Usage)"
                    )
                    st.plotly_chart(fig_models, use_container_width=True)
            
            with col2:
                # Model usage by user
                user_models = daily_df.groupby(['email', 'primary_model']).size().reset_index(name='days_used')
                top_user_models = user_models.groupby('email')['days_used'].sum().reset_index().sort_values('days_used', ascending=False).head(10)
                
                if not top_user_models.empty:
                    fig_user_models = px.bar(
                        top_user_models,
                        x='email',
                        y='days_used',
                        title="Top Users by Model Usage Days",
                        labels={'days_used': 'Days Used', 'email': 'User'}
                    )
                    fig_user_models.update_xaxis(tickangle=45)
                    st.plotly_chart(fig_user_models, use_container_width=True)
        
        # Detailed model analysis from usage events
        if 'usage_events_df' in st.session_state and not st.session_state.usage_events_df.empty:
            events_df = st.session_state.usage_events_df
            
            st.subheader("🔍 Detailed Model Analysis")
            
            # Model cost and usage analysis
            model_analysis = events_df.groupby('model_used').agg({
                'cost_cents': ['sum', 'mean', 'count'],
                'input_tokens': 'sum',
                'output_tokens': 'sum',
                'is_max_mode': 'sum'
            }).round(2)
            
            model_analysis.columns = ['Total Cost (¢)', 'Avg Cost (¢)', 'Requests', 'Input Tokens', 'Output Tokens', 'Max Mode Usage']
            model_analysis['Total Cost ($)'] = model_analysis['Total Cost (¢)'] / 100
            model_analysis['Avg Cost ($)'] = model_analysis['Avg Cost (¢)'] / 100
            
            # Display model performance metrics
            col1, col2, col3 = st.columns(3)
            
            if not model_analysis.empty:
                most_expensive = model_analysis.loc[model_analysis['Total Cost ($)'].idxmax()]
                most_used = model_analysis.loc[model_analysis['Requests'].idxmax()]
                highest_avg = model_analysis.loc[model_analysis['Avg Cost ($)'].idxmax()]
                
                with col1:
                    st.metric("💰 Most Expensive Model", most_expensive.name, f"${most_expensive['Total Cost ($)']:.2f}")
                with col2:
                    st.metric("📊 Most Used Model", most_used.name, f"{most_used['Requests']} requests")
                with col3:
                    st.metric("💸 Highest Avg Cost", highest_avg.name, f"${highest_avg['Avg Cost ($)']:.4f}")
            
            # Model comparison table
            with st.expander("📋 Model Comparison Table", expanded=False):
                st.dataframe(
                    model_analysis.reset_index().rename(columns={'model_used': 'Model'}),
                    use_container_width=True
                )
    
    def export_data(self):
        """Handle data export functionality"""
        if not st.session_state.data_loaded:
            st.error("No data to export. Please load data first.")
            return
        
        try:
            # Get current data
            users_df = self.data_processor.users_df
            usage_df = self.data_processor.usage_df
            analytics_data = self.data_processor.export_summary_stats()
            
            # Create comprehensive report
            file_path = self.storage.create_comprehensive_report(
                users_df, usage_df, analytics_data
            )
            
            st.success(f"Data exported successfully to: {file_path}")
            
            # Show download button
            with open(file_path, 'rb') as f:
                st.download_button(
                    label="📥 Download Report",
                    data=f.read(),
                    file_name=os.path.basename(file_path),
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                
        except Exception as e:
            st.error(f"Export failed: {e}")
    
    def run(self):
        """Main application loop"""
        st.title("📊 Cursor Admin Dashboard")
        st.markdown("Monitor and analyze Cursor usage across your organization")
        
        # Validate configuration
        if not self.validate_config():
            return
        
        # Render sidebar
        filters = self.render_sidebar()
        
        # Load data
        if not st.session_state.data_loaded:
            users_data, usage_data = self.load_data()
            
            if users_data and usage_data:
                # Process data
                users_df = self.data_processor.process_users_data(users_data)
                usage_df = self.data_processor.process_usage_data(usage_data)
                
                # Store in session state
                st.session_state.users_data = users_df
                st.session_state.usage_data = usage_df
                st.session_state.data_loaded = True
                st.session_state.last_refresh = datetime.now()
            else:
                st.error("Failed to load data. Please check your API configuration.")
                return
        
        # Get data from session state
        users_df = st.session_state.users_data
        usage_df = st.session_state.usage_data
        
        if users_df is None or usage_df is None or usage_df.empty:
            st.error("No data available. Please refresh to try again.")
            return
        
        # Apply filters
        if filters['activity_filter'] != "All" and 'activity_level' in users_df.columns:
            filtered_users = users_df[users_df['activity_level'] == filters['activity_filter']]
            usage_df = usage_df[usage_df['user_id'].isin(filtered_users['id'])]
        
        # Render main dashboard components
        st.markdown("---")
        
        # Overview metrics
        st.header("📈 Overview")
        self.render_overview_metrics(usage_df, users_df)
        
        st.markdown("---")
        
        # Charts section
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("🏆 Top Users")
            metric_choice = st.selectbox(
                "Rank by:",
                ["total_requests", "total_sessions", "total_tokens", "activity_score"],
                format_func=lambda x: x.replace('_', ' ').title()
            )
            self.render_top_users_chart(usage_df, metric_choice)
        
        with col2:
            if filters['show_feature_breakdown']:
                st.subheader("🎯 Feature Usage")
                self.render_feature_usage_chart(usage_df)
        
        # Trends section
        if filters['show_trends']:
            st.markdown("---")
            st.header("📊 Usage Trends")
            
            # Get org usage for trends
            if self.api_client:
                org_usage = self.api_client.get_organization_usage()
                self.render_usage_trends_chart(org_usage)
        
        # User segmentation
        st.markdown("---")
        st.header("👥 User Analysis")
        self.render_user_segmentation(usage_df)

        # Premium Requests Analysis
        self.render_premium_requests_analysis()

        # Individual User Spending Analysis
        self.render_individual_spending_analysis()

        # Model Usage Analytics
        self.render_model_usage_analysis()
        
        # Detailed data tables
        with st.expander("📋 Detailed Data Tables", expanded=False):
            tab1, tab2 = st.tabs(["Users", "Usage Metrics"])
            
            with tab1:
                st.subheader("Users Overview")
                if not users_df.empty:
                    st.dataframe(users_df, use_container_width=True)
            
            with tab2:
                st.subheader("Usage Metrics")
                if not usage_df.empty:
                    st.dataframe(usage_df, use_container_width=True)

# Run the dashboard
if __name__ == "__main__":
    dashboard = CursorDashboard()
    dashboard.run() 