#!/usr/bin/env python3
"""
Setup script for Cursor Admin Dashboard
"""

import os
import sys
import subprocess
from pathlib import Path

def create_env_file():
    """Create a .env file from template if it doesn't exist"""
    env_template = """# Cursor API Configuration
# Get your API key from your Cursor admin dashboard
CURSOR_API_KEY=your_cursor_api_key_here

# Your organization ID (found in your Cursor settings)
CURSOR_ORG_ID=your_organization_id

# Cursor API base URL (default should work for most cases)
CURSOR_API_BASE_URL=https://api.cursor.sh/v1

# Dashboard Configuration
# How often to refresh data (in minutes)
REFRESH_INTERVAL_MINUTES=30

# Maximum number of users to fetch per API request
MAX_USERS_PER_REQUEST=100

# How long to keep data for analysis (in days)
DATA_RETENTION_DAYS=90

# Optional: Database Configuration (if using database instead of files)
# DATABASE_URL=sqlite:///cursor_analytics.db
"""
    
    env_file = Path('.env')
    if not env_file.exists():
        with open('.env', 'w') as f:
            f.write(env_template)
        print("✅ Created .env file template")
        print("⚠️  Please edit .env with your actual Cursor API credentials")
    else:
        print("ℹ️  .env file already exists")

def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    return True

def create_directories():
    """Create necessary directories"""
    directories = ['data', 'exports', 'backend']
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version check passed: {sys.version}")
    return True

def run_setup():
    """Run the complete setup process"""
    print("🚀 Setting up Cursor Admin Dashboard")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return False
    
    # Create directories
    create_directories()
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Create .env file
    create_env_file()
    
    print("\n" + "=" * 50)
    print("✅ Setup complete!")
    print("\nNext steps:")
    print("1. Edit the .env file with your Cursor API credentials")
    print("2. Run the dashboard: streamlit run dashboard.py")
    print("\nFor help getting your API credentials:")
    print("- Contact your Cursor organization admin")
    print("- Check your Cursor admin dashboard")
    
    return True

if __name__ == "__main__":
    success = run_setup()
    sys.exit(0 if success else 1) 