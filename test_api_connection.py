#!/usr/bin/env python3
"""
Test script to verify Cursor API credentials and connection
"""

import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append('backend')

from cursor_api import CursorAPIClient
from config import Config

def test_api_connection():
    """Test the API connection and credentials"""
    print("🔍 Testing Cursor API Connection...")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Check if environment variables are loaded
    print("📋 Environment Variables Check:")
    print(f"   CURSOR_API_KEY: {'✅ Set' if Config.CURSOR_API_KEY else '❌ Missing'}")
    print(f"   CURSOR_ORG_ID: {'✅ Set' if Config.CURSOR_ORG_ID else '❌ Optional'}")
    print(f"   CURSOR_API_BASE_URL: {Config.CURSOR_API_BASE_URL}")
    
    if not Config.CURSOR_API_KEY:
        print("\n❌ Missing required API credentials!")
        print("Please check your .env file contains:")
        print("   CURSOR_API_KEY=your_actual_api_key")
        return False
    
    try:
        # Initialize API client
        print(f"\n🔗 Initializing API client...")
        api_client = CursorAPIClient(
            api_key=Config.CURSOR_API_KEY,
            org_id=Config.CURSOR_ORG_ID,
            base_url=Config.CURSOR_API_BASE_URL
        )
        
        # Test team members endpoint
        print("👥 Testing team members endpoint...")
        members = api_client.get_team_members()
        print(f"   ✅ Found {len(members)} team members")
        
        if members:
            print("   📋 Sample members:")
            for i, member in enumerate(members[:3], 1):
                print(f"      {i}. {member.get('name', 'Unknown')} ({member.get('email', 'No email')})")
        
        # Test daily usage data
        print("\n📊 Testing daily usage data...")
        daily_usage = api_client.get_daily_usage_data()
        print(f"   ✅ Daily usage data retrieved")
        data_points = daily_usage.get('data', [])
        print(f"   📈 Data points available: {len(data_points)}")
        
        if data_points:
            print(f"   📅 Date range: {data_points[0].get('date', 'Unknown')} to {data_points[-1].get('date', 'Unknown')}")
        
        # Test usage events
        print("\n📋 Testing usage events...")
        usage_events = api_client.get_usage_events(page_size=5)
        print(f"   ✅ Usage events retrieved")
        events = usage_events.get('usageEvents', [])
        print(f"   📊 Events available: {len(events)}")
        print(f"   📊 Total events count: {usage_events.get('totalUsageEventsCount', 0)}")
        
        # Test spending data
        print("\n💰 Testing spending data...")
        spending_data = api_client.get_spending_data()
        print(f"   ✅ Spending data retrieved")
        total_spent = spending_data.get('totalSpent', 0)
        print(f"   💵 Total spent: ${total_spent:.2f}")
        
        # Test organization info (derived from team members)
        print("\n🏢 Testing organization info...")
        org_info = api_client.get_organization_info()
        print(f"   ✅ Organization: {org_info.get('name', 'Unknown')}")
        print(f"   ✅ Organization ID: {org_info.get('id', 'Unknown')}")
        print(f"   ✅ Plan: {org_info.get('plan', 'Unknown')}")
        print(f"   ✅ User count: {org_info.get('user_count', 0)}")
        
        print("\n🎉 All API tests passed! Your credentials are working correctly.")
        print("\n📊 Available data:")
        print(f"   • Team members: {len(members)}")
        print(f"   • Daily usage data points: {len(data_points)}")
        print(f"   • Total usage events: {usage_events.get('totalUsageEventsCount', 0)}")
        print(f"   • Total spending: ${total_spent:.2f}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ API test failed: {str(e)}")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Verify your API key is correct")
        print("   2. Check if you have admin access to your Cursor team")
        print("   3. Ensure the API base URL is accessible")
        print("   4. Check your internet connection")
        return False

if __name__ == "__main__":
    test_api_connection() 