#!/usr/bin/env python3
"""
Command-line interface for Cursor Admin Dashboard
Useful for testing API connectivity and data fetching
"""

import argparse
import sys
import json
from datetime import datetime
import logging

# Add backend to path
sys.path.append('backend')

from data_service import CursorDataService
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def test_connection():
    """Test API connection"""
    print("Testing Cursor API connection...")
    
    try:
        service = CursorDataService()
        result = service.check_api_connection()
        
        if result['status'] == 'success':
            print(f"✅ Connection successful!")
            print(f"Organization: {result['organization'].get('name', 'Unknown')}")
            print(f"Plan: {result['organization'].get('plan', 'Unknown')}")
            print(f"User Count: {result['organization'].get('user_count', 'Unknown')}")
        else:
            print(f"❌ Connection failed: {result['message']}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing connection: {e}")
        return False
    
    return True

def fetch_users():
    """Fetch and display users data"""
    print("Fetching users data...")
    
    try:
        service = CursorDataService()
        if not service.initialize_api_client():
            print("❌ Failed to initialize API client")
            return False
        
        users_data = service._fetch_users_data()
        if not users_data:
            print("❌ No users data retrieved")
            return False
        
        print(f"✅ Found {len(users_data)} users")
        
        # Display first few users
        for i, user in enumerate(users_data[:5]):
            print(f"  {i+1}. {user.get('name', 'Unknown')} ({user.get('email', 'No email')})")
        
        if len(users_data) > 5:
            print(f"  ... and {len(users_data) - 5} more users")
            
    except Exception as e:
        print(f"❌ Error fetching users: {e}")
        return False
    
    return True

def fetch_usage_sample():
    """Fetch usage data for a sample of users"""
    print("Fetching sample usage data...")
    
    try:
        service = CursorDataService()
        if not service.initialize_api_client():
            print("❌ Failed to initialize API client")
            return False
        
        # Get a few users first
        users_data = service._fetch_users_data()
        if not users_data:
            print("❌ No users data retrieved")
            return False
        
        # Get usage for first 3 users
        sample_users = users_data[:3]
        print(f"Getting usage data for {len(sample_users)} sample users...")
        
        for user in sample_users:
            user_id = user['id']
            print(f"  Fetching usage for {user.get('name', user_id)}...")
            
            usage_data = service.api_client.get_user_usage(user_id)
            if usage_data and 'metrics' in usage_data:
                metrics = usage_data['metrics']
                print(f"    Sessions: {metrics.get('total_sessions', 0)}")
                print(f"    Requests: {metrics.get('total_requests', 0)}")
                print(f"    Tokens: {metrics.get('total_tokens', 0)}")
            else:
                print(f"    No usage data available")
        
        print("✅ Sample usage data retrieved")
        
    except Exception as e:
        print(f"❌ Error fetching usage data: {e}")
        return False
    
    return True

def run_full_sync():
    """Run a full data synchronization"""
    print("Starting full data synchronization...")
    
    try:
        service = CursorDataService()
        result = service.fetch_all_data(force_refresh=True)
        
        if result['status'] == 'success':
            print("✅ Full sync completed successfully!")
            print(f"Users processed: {result.get('users_count', 0)}")
            print(f"Usage records: {result.get('usage_count', 0)}")
            print(f"Last refresh: {result.get('last_refresh', 'Unknown')}")
        else:
            print(f"❌ Sync failed: {result['message']}")
            return False
            
    except Exception as e:
        print(f"❌ Error during sync: {e}")
        return False
    
    return True

def show_status():
    """Show current data status"""
    print("Checking data status...")
    
    try:
        service = CursorDataService()
        status = service.get_data_status()
        
        print(f"API Client: {'✅' if status['api_client_initialized'] else '❌'}")
        print(f"Users Data: {'✅' if status['users_data_loaded'] else '❌'}")
        print(f"Usage Data: {'✅' if status['usage_data_loaded'] else '❌'}")
        print(f"Cache Valid: {'✅' if status['cache_valid'] else '❌'}")
        print(f"Health: {status['health']}")
        
        if status['last_refresh']:
            print(f"Last Refresh: {status['last_refresh']}")
        
        freshness = status.get('data_freshness', {})
        if freshness.get('usage_data', {}).get('exists'):
            age_minutes = freshness['usage_data']['age_minutes']
            print(f"Data Age: {age_minutes:.1f} minutes")
            
    except Exception as e:
        print(f"❌ Error checking status: {e}")
        return False
    
    return True

def export_data(format='excel'):
    """Export data to file"""
    print(f"Exporting data in {format} format...")
    
    try:
        service = CursorDataService()
        
        # Make sure we have data
        dashboard_data = service.get_dashboard_data()
        if dashboard_data['status'] != 'success':
            print(f"❌ No data available: {dashboard_data['message']}")
            return False
        
        file_path = service.export_report(format)
        print(f"✅ Data exported to: {file_path}")
        
    except Exception as e:
        print(f"❌ Export failed: {e}")
        return False
    
    return True

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description='Cursor Admin Dashboard CLI')
    parser.add_argument('command', choices=[
        'test', 'users', 'usage', 'sync', 'status', 'export'
    ], help='Command to run')
    parser.add_argument('--format', choices=['excel', 'json'], 
                       default='excel', help='Export format (for export command)')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("Please check your .env file and ensure API credentials are set")
        return 1
    
    # Run the requested command
    success = False
    
    if args.command == 'test':
        success = test_connection()
    elif args.command == 'users':
        success = fetch_users()
    elif args.command == 'usage':
        success = fetch_usage_sample()
    elif args.command == 'sync':
        success = run_full_sync()
    elif args.command == 'status':
        success = show_status()
    elif args.command == 'export':
        success = export_data(args.format)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 