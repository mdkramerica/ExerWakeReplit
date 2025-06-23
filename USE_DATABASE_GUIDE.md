# Database Migration Guide

## Current State
The system uses file-based storage (`data/storage.json`) which is NOT suitable for production deployment with multiple users.

## Why Migration is Needed
- **File storage**: Each deployed instance has separate data
- **PostgreSQL**: Shared database across all instances
- **Consistency**: All users see the same data regardless of system

## Migration Steps

### 1. Run Database Migration
```bash
npx tsx server/migrate-to-db.ts
```

### 2. Enable Database Mode
Set environment variable:
```bash
export USE_DATABASE=true
```

### 3. For Production Deployment
The system will automatically use PostgreSQL when `NODE_ENV=production`

## Data Consistency
- **Before**: Each deployment = separate data
- **After**: All deployments = shared PostgreSQL database
- **Result**: Consistent assessment history across all users and systems

## Current Data Preserved
All existing assessment data (9 assessments for DEMO01, etc.) will be migrated to PostgreSQL while maintaining:
- User assessment histories
- ROM calculations
- Quality scores
- Timestamps
- All detailed metrics

## Verification
After migration, verify data consistency by:
1. Checking assessment history from multiple systems
2. Confirming ROM data matches original values
3. Testing new assessments save consistently