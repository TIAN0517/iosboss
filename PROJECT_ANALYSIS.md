# Project Analysis Report

Generated: 2026/1/21 上午8:43:09

## Summary

- **Total API Routes**: 178
- **Active API Routes**: 82
- **Duplicate API Routes**: 96
- **Total Components**: 73
- **System Files**: 83699
- **System Size**: 2.56 GB

## Available Tools

- unified-launcher.js - Smart service launcher
- start-unified.bat - Unified startup script
- scan-api-simple.js - API inventory tool
- API_ROUTES_INVENTORY.md - API documentation

## Recommendations

### HIGH - Code Duplication
**Issue**: Found 96 duplicate API routes
**Recommendation**: Remove duplicate API directories (api_backup, api_old)
**Impact**: High - Reduces code maintenance burden

### LOW - Performance
**Issue**: node_modules directory is 1253.8MB
**Recommendation**: Consider using .gitignore for node_modules
**Impact**: Low - Improves repository size

## Usage Guide

### Quick Start
1. Run the unified launcher: `npm run dev`
2. Or use the batch script: `start-unified.bat`

### Service Management
- **Monitor Services**: Check logs/unified-launcher.log
- **View API Inventory**: See API_ROUTES_INVENTORY.md
- **Restart Services**: Run unified-launcher.js again

