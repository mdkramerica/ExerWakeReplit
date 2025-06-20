# Access Code Testing Guide

## Current Available Test Codes

The following 6-digit access codes are confirmed working in the database:

- **111111** - Test User (first time, no injury type selected)
- **123456** - Patient User1 (returning user with Trigger Finger)
- **234567** - Test Patient2
- **345678** - Test Patient3  
- **456789** - Test Patient4
- **567890** - Test Patient5
- **678901** - Test Patient6

## Testing Steps

1. Navigate to the landing page
2. Enter any of the above 6-digit codes
3. Click "Continue"
4. First-time users will be redirected to injury selection
5. Returning users go directly to assessment list

## Backend Verification

The API endpoint works correctly as confirmed by:
```bash
curl -X POST http://localhost:5000/api/users/verify-code \
  -H "Content-Type: application/json" \
  -d '{"code":"111111"}'
```

Response:
```json
{
  "user": {
    "id": 3,
    "code": "111111", 
    "injuryType": null,
    "isFirstTime": true
  },
  "isFirstTime": true,
  "hasInjuryType": false
}
```

## Frontend Fix Applied

Updated the `apiRequest` function in `client/src/lib/queryClient.ts` to properly handle the POST request with JSON body for access code verification.

## Debug Information

Added console logging to track:
- API request details (method, URL, data)
- Response status codes
- Error messages for troubleshooting

The access code system should now work correctly with proper error handling and user feedback.