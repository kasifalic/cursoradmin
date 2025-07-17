# Amagi Cursor AI Dashboard

A comprehensive analytics dashboard for monitoring Cursor AI usage across your organization. Since Cursor doesn't provide native analytics, this dashboard fills that gap by connecting to Cursor's API to provide detailed insights into user activity, feature usage, and trends.

## Features

### Core Analytics
- **User Activity Monitoring**: Track individual user sessions, requests, and engagement
- **Feature Usage Analysis**: Understand which Cursor features are most popular
- **Usage Trends**: Visualize usage patterns over time
- **Team Analytics**: Get organization-wide insights and metrics

### Advanced Segregation Features
- **Premium Requests Analysis**: Segregate Usage-based vs Subscription-included requests
- **Individual User Spending**: Track per-user costs and token consumption
- **Model Usage Analytics**: Analyze AI model popularity and costs (GPT-4, Claude, etc.)

### Data Export & Visualization
- Export data in CSV, JSON, and Excel formats
- Interactive charts and visualizations
- Real-time data refresh capabilities
- Comprehensive filtering and search options

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