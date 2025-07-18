# Hand Assessment Compliance Portal

A streamlined patient assessment platform focused on compliance tracking and data collection.

## Test Users

The following test users are available in the database:

1. **Access Code: 123456**
   - Injury Type: Wrist Fracture
   - Status: First time user

2. **Access Code: 694685**
   - Injury Type: Not set
   - Status: First time user

## Running the Application

### Option 1: Manual Terminal Commands
1. Open a terminal in Replit
2. Navigate to the compliance portal: `cd hand-assessment-compliance-portal`
3. Run the development server: `npm run dev`
4. Access the portal at: http://localhost:5000

### Option 2: Using the Helper Script
1. Open a terminal in Replit
2. From the root directory, run: `node run-compliance-portal.js`
3. Access the portal at: http://localhost:5000

**Important:** The compliance portal runs as a separate application. You cannot run both the original app and compliance portal simultaneously on port 5000.

## Features

- Patient login with 6-digit access codes
- 5 core assessments: TAM, Kapandji, Wrist Flexion/Extension, Wrist Deviation, DASH Survey
- Admin dashboard for compliance tracking
- Patient dashboard showing available assessments
- Database connected with test data

## Next Steps

The application is ready for:
1. MediaPipe motion tracking integration
2. Assessment page development
3. Motion capture functionality
4. Results visualization