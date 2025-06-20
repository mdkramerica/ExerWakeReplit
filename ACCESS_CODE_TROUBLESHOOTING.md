# Access Code Troubleshooting Guide

## Issue Resolution
The "invalid code" notification was caused by missing database schema fields that the authentication system expected.

## Root Cause
The `users` table was missing essential fields:
- `first_name`
- `last_name` 
- `email`
- `is_active`

## Fix Applied
1. **Database Schema Update**: Added missing columns to users table
2. **Data Migration**: Updated existing users with default values
3. **Test Data**: Added valid 6-digit access codes for testing

## Valid Test Access Codes
The following 6-digit codes are now available for testing:
- `123456` - Existing user
- `234567` - Test Patient 2
- `345678` - Test Patient 3  
- `456789` - Test Patient 4
- `567890` - Test Patient 5
- `678901` - Test Patient 6

## How Access Codes Work
1. User enters 6-digit code on landing page
2. System validates code exists in database
3. If code exists, user is authenticated and redirected
4. If first-time user, redirected to injury selection
5. Otherwise, redirected to assessment list

## Authentication Flow
```
Landing Page → Enter Code → Validate → 
  ↓
First Time? → Injury Selection → Assessment List
  ↓
Returning User → Assessment List
```

## Code Format Validation
- Must be exactly 6 digits
- Only numeric characters allowed
- Automatically strips non-numeric input
- Real-time validation on form submission

## Error Handling
- Invalid format: "Access code must be exactly 6 digits"
- Code not found: "Invalid Code - Please check your 6-digit access code and try again"
- Network errors: Generic error handling with retry capability

## Database Structure
```sql
users table:
- id (primary key)
- code (unique 6-digit string)
- first_name
- last_name  
- email
- injury_type
- created_at
- is_first_time (boolean)
- is_active (boolean)
```

The access code system is now fully functional and properly validated.