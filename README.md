# Cursor Admin Dashboard

A comprehensive admin dashboard for monitoring and analyzing Cursor usage across your organization. Since Cursor doesn't provide native analytics, this tool fills that gap by offering detailed insights into user activity, feature usage, spending patterns, and model utilization.

## Features

### 📊 Core Analytics
- **User Overview**: Real user names extracted from email addresses, activity levels, and engagement metrics
- **Usage Metrics**: Sessions, requests, tokens, and feature-specific usage tracking
- **Trends Analysis**: Daily and weekly usage patterns with time-series visualizations
- **Export Functionality**: CSV, JSON, and Excel export capabilities for further analysis

### 💳 Premium Requests Analysis (NEW!)
- **Request Type Segregation**: Breakdown of Subscription vs Usage-based vs API Key requests
- **User Premium Usage**: Identify which users are consuming premium (usage-based) requests
- **Cost Distribution**: Visual analysis of request types and their proportional usage
- **Top Premium Users**: Rankings of users by premium request consumption

### 💸 Individual User Spending (NEW!)
- **Per-User Cost Analysis**: Detailed spending breakdown by individual team members
- **Token Cost Tracking**: Input/output tokens and associated costs per user
- **Spending Distribution**: Histograms and statistics showing spending patterns across the team
- **Top Spenders Identification**: Clear visibility into which users generate the most costs
- **Overall Budget Tracking**: Organization-wide spending summaries

### 🤖 Model Usage Analytics (NEW!)
- **Model Popularity**: Which AI models (GPT-4, Claude, etc.) are most frequently used
- **User Model Preferences**: Individual user preferences and model switching patterns
- **Cost per Model**: Financial analysis of different model usage and their associated costs
- **Performance Metrics**: Model performance indicators including Max Mode usage
- **Auto vs Manual Selection**: Analysis of model selection patterns

## Architecture

```
cursor-dashboard/
├── backend/
│   ├── cursor_api.py      # Cursor Admin API client
│   ├── data_processor.py  # Data processing and analytics
│   └── storage.py         # Data storage and caching
├── dashboard.py           # Main Streamlit application
├── config.py             # Configuration management
└── requirements.txt      # Dependencies
```

## Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API Access**
   Create a `.env` file:
   ```env
   CURSOR_API_KEY=key_your_actual_api_key_here
   CURSOR_ORG_ID=your_organization_id
   CURSOR_API_BASE_URL=https://api.cursor.com
   ```

3. **Run Dashboard**
   ```bash
   streamlit run dashboard.py --server.port 8502
   ```

4. **Access Dashboard**
   Open http://localhost:8502 in your browser

## Data Sources

The dashboard integrates with multiple Cursor Admin API endpoints:

- **`/teams/daily-usage-data`**: User activity, model usage, and premium request data
- **`/teams/filtered-usage-events`**: Detailed spending and token usage information  
- **`/teams/spending-data`**: Organization-wide cost breakdowns
- **`/teams/team-members`**: User roster and basic information

## New Segregation Features

### Premium Requests Segregation
Based on the `subscriptionIncludedReqs`, `usageBasedReqs`, and `apiKeyReqs` fields from daily usage data:
- Visual breakdown of request types
- Per-user premium usage patterns
- Cost implications of usage-based requests

### Individual User Spending
Extracted from usage events data with token cost analysis:
- Real-time spending tracking per user
- Token consumption patterns
- Cost efficiency metrics

### Model Usage Analytics
Comprehensive analysis of AI model utilization:
- Daily model preferences from usage data
- Detailed cost analysis from usage events
- Model performance and efficiency metrics

## Performance Optimizations

- **Efficient Data Loading**: Batch API calls instead of individual user requests
- **Smart Caching**: Configurable cache duration to balance freshness and performance
- **Real Name Extraction**: Automatic parsing of display names from email addresses
- **Background Processing**: Asynchronous data fetching for better user experience

## API Rate Limiting

The dashboard implements efficient data fetching strategies:
- Bulk data collection from daily usage and events endpoints
- Minimal individual API calls
- Intelligent caching to reduce API load

## Troubleshooting

### Common Issues

1. **No team members found**: Dashboard automatically falls back to extracting users from usage data
2. **Long loading times**: Enable caching and consider adjusting refresh intervals
3. **Missing spending data**: Ensure your API key has access to financial data
4. **Model data not appearing**: Check that usage events are being properly fetched

### Performance Tips

- Set appropriate cache duration in config (default: 30 minutes)
- Use the refresh button sparingly to avoid API rate limits
- Export data for offline analysis when needed

## Contributing

This tool is designed to evolve with your team's analytics needs. Consider extending it with:
- Custom metric definitions
- Additional visualization types  
- Integration with other tools (Slack, email reporting)
- Advanced forecasting and budgeting features

## License

MIT License - feel free to adapt for your organization's needs. 