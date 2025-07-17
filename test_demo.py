#!/usr/bin/env python3
"""
Demo/test script for Cursor Admin Dashboard
This script demonstrates the dashboard functionality using mock data
"""

import sys
import os
import json
from datetime import datetime, timedelta
import pandas as pd

# Add backend to path
sys.path.append('backend')

from data_processor import DataProcessor
from storage import DataStorage
from config import Config

def generate_demo_data():
    """Generate comprehensive demo data for testing"""
    print("Generating demo data...")
    
    # Generate users data
    users_data = []
    for i in range(20):
        user = {
            'id': f'demo_user_{i+1}',
            'email': f'user{i+1}@company.com',
            'name': f'Demo User {i+1}',
            'role': ['developer', 'admin', 'viewer'][i % 3],
            'status': 'active' if i < 18 else 'inactive',
            'created_at': (datetime.now() - timedelta(days=30 + i*10)).isoformat(),
            'last_active': (datetime.now() - timedelta(days=i)).isoformat(),
            'subscription_type': ['pro', 'team', 'enterprise'][i % 3]
        }
        users_data.append(user)
    
    # Generate usage data
    usage_data = {}
    for user in users_data:
        user_id = user['id']
        
        # Vary usage based on user index for realistic distribution
        base_activity = 100 - (int(user_id.split('_')[-1]) * 3)
        
        usage_data[user_id] = {
            'user_id': user_id,
            'period': {
                'start': (datetime.now() - timedelta(days=30)).isoformat(),
                'end': datetime.now().isoformat()
            },
            'metrics': {
                'total_sessions': max(10, base_activity + random_variance(30)),
                'total_requests': max(50, (base_activity * 10) + random_variance(200)),
                'total_tokens': max(1000, (base_activity * 100) + random_variance(5000)),
                'unique_days_active': max(5, min(30, base_activity // 5)),
                'avg_session_duration': max(15, 60 + random_variance(30)),
                'feature_usage': {
                    'code_completion': max(10, base_activity * 2 + random_variance(50)),
                    'chat': max(5, base_activity // 2 + random_variance(20)),
                    'diff': max(1, base_activity // 5 + random_variance(10)),
                    'search': max(10, base_activity + random_variance(30)),
                    'refactor': max(1, base_activity // 10 + random_variance(5)),
                    'debug': max(2, base_activity // 3 + random_variance(10))
                }
            }
        }
    
    return users_data, usage_data

def random_variance(base_value):
    """Add random variance to a base value"""
    import random
    return random.randint(-base_value//4, base_value//4)

def test_data_processing():
    """Test data processing functionality"""
    print("\n=== Testing Data Processing ===")
    
    # Generate demo data
    users_data, usage_data = generate_demo_data()
    
    # Initialize processor
    processor = DataProcessor()
    
    # Process data
    users_df = processor.process_users_data(users_data)
    usage_df = processor.process_usage_data(usage_data)
    
    print(f"✅ Processed {len(users_df)} users")
    print(f"✅ Processed {len(usage_df)} usage records")
    
    # Test analytics
    feature_analysis = processor.analyze_feature_usage()
    segmentation = processor.get_user_segmentation()
    top_users = processor.get_top_users('total_requests', 5)
    
    print(f"✅ Generated feature analysis with {len(feature_analysis.get('total_usage', {}))} features")
    print(f"✅ Generated user segmentation with {len(segmentation)} segments")
    print(f"✅ Generated top users list with {len(top_users)} entries")
    
    return users_df, usage_df, processor

def test_storage():
    """Test storage functionality"""
    print("\n=== Testing Storage ===")
    
    storage = DataStorage()
    users_data, usage_data = generate_demo_data()
    
    # Test saving
    users_saved = storage.save_users_data(users_data)
    usage_saved = storage.save_usage_data(usage_data)
    
    print(f"✅ Users data saved: {users_saved}")
    print(f"✅ Usage data saved: {usage_saved}")
    
    # Test loading
    loaded_users = storage.load_users_data()
    loaded_usage = storage.load_usage_data()
    
    print(f"✅ Loaded {len(loaded_users) if loaded_users else 0} users")
    print(f"✅ Loaded {len(loaded_usage) if loaded_usage else 0} usage records")
    
    # Test cache
    cache_data = {'test': 'data', 'timestamp': datetime.now().isoformat()}
    cache_saved = storage.save_cache(cache_data)
    cache_valid = storage.is_cache_valid()
    
    print(f"✅ Cache saved: {cache_saved}")
    print(f"✅ Cache valid: {cache_valid}")
    
    return storage

def test_export():
    """Test export functionality"""
    print("\n=== Testing Export ===")
    
    users_df, usage_df, processor = test_data_processing()
    storage = DataStorage()
    
    try:
        # Test CSV export
        csv_file = storage.export_to_csv(usage_df, 'demo_usage.csv')
        print(f"✅ CSV export successful: {csv_file}")
        
        # Test Excel export with multiple sheets
        export_data = {
            'Users': users_df,
            'Usage': usage_df,
        }
        excel_file = storage.export_to_excel(export_data, 'demo_report.xlsx')
        print(f"✅ Excel export successful: {excel_file}")
        
        # Test comprehensive report
        analytics_data = processor.export_summary_stats()
        report_file = storage.create_comprehensive_report(
            users_df, usage_df, analytics_data
        )
        print(f"✅ Comprehensive report: {report_file}")
        
        # Test JSON export
        json_data = {
            'users': users_df.to_dict('records'),
            'usage_summary': analytics_data,
            'exported_at': datetime.now().isoformat()
        }
        json_file = storage.export_to_json(json_data, 'demo_data.json')
        print(f"✅ JSON export successful: {json_file}")
        
    except Exception as e:
        print(f"❌ Export failed: {e}")
        return False
    
    return True

def test_configuration():
    """Test configuration loading"""
    print("\n=== Testing Configuration ===")
    
    try:
        print(f"✅ Data directory: {Config.DATA_DIR}")
        print(f"✅ Exports directory: {Config.EXPORTS_DIR}")
        print(f"✅ Refresh interval: {Config.REFRESH_INTERVAL_MINUTES} minutes")
        print(f"✅ Max users per request: {Config.MAX_USERS_PER_REQUEST}")
        print(f"✅ API timeout: {Config.API_TIMEOUT} seconds")
        
        # Test validation (will fail without proper .env, which is expected)
        try:
            Config.validate()
            print("✅ Configuration validation passed")
        except ValueError as e:
            print(f"ℹ️  Configuration validation failed (expected without .env): {e}")
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False
    
    return True

def run_dashboard_demo():
    """Simulate running the dashboard with demo data"""
    print("\n=== Dashboard Demo Simulation ===")
    
    try:
        # Generate and save demo data
        users_data, usage_data = generate_demo_data()
        storage = DataStorage()
        
        # Save demo data as if it came from API
        storage.save_users_data(users_data)
        storage.save_usage_data(usage_data)
        
        # Process data
        processor = DataProcessor()
        users_df = processor.process_users_data(users_data)
        usage_df = processor.process_usage_data(usage_data)
        
        # Generate analytics
        analytics = processor.export_summary_stats()
        
        print("📊 Dashboard would show:")
        print(f"  - {len(users_df)} total users")
        print(f"  - {usage_df['total_sessions'].sum()} total sessions")
        print(f"  - {usage_df['total_requests'].sum()} total requests")
        print(f"  - {usage_df['total_tokens'].sum()} total tokens")
        
        if 'feature_analysis' in analytics:
            top_features = analytics['feature_analysis'].get('top_features', [])[:3]
            print(f"  - Top features: {[f[0] for f in top_features]}")
        
        if 'user_segmentation' in analytics:
            segments = list(analytics['user_segmentation'].keys())
            print(f"  - User segments: {segments}")
        
        print("✅ Dashboard simulation completed successfully")
        
    except Exception as e:
        print(f"❌ Dashboard simulation failed: {e}")
        return False
    
    return True

def show_file_structure():
    """Show the current file structure"""
    print("\n=== Project Structure ===")
    
    def print_tree(path, prefix="", max_depth=3, current_depth=0):
        if current_depth >= max_depth:
            return
        
        try:
            items = sorted(os.listdir(path))
            for i, item in enumerate(items):
                if item.startswith('.'):
                    continue
                    
                item_path = os.path.join(path, item)
                is_last = i == len(items) - 1
                current_prefix = "└── " if is_last else "├── "
                print(f"{prefix}{current_prefix}{item}")
                
                if os.path.isdir(item_path) and not item.startswith('.'):
                    next_prefix = prefix + ("    " if is_last else "│   ")
                    print_tree(item_path, next_prefix, max_depth, current_depth + 1)
        except PermissionError:
            pass
    
    print("cursor-dashboard/")
    print_tree(".", "", max_depth=2)

def main():
    """Run all tests"""
    print("🚀 Cursor Dashboard Demo & Test Suite")
    print("=" * 50)
    
    # Show project structure
    show_file_structure()
    
    # Run tests
    tests = [
        ("Configuration", test_configuration),
        ("Data Processing", test_data_processing),
        ("Storage", test_storage),
        ("Export", test_export),
        ("Dashboard Demo", run_dashboard_demo)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            if test_name == "Data Processing":
                # Store result for other tests
                results[test_name] = test_func()
            else:
                results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Results Summary:")
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! The dashboard is ready to use.")
        print("\nNext steps:")
        print("1. Add your Cursor API credentials to .env file")
        print("2. Run: streamlit run dashboard.py")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 