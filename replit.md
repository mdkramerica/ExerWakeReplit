# ExerAI - Hand Assessment Platform

## Overview

This is a comprehensive hand rehabilitation assessment platform that combines real-time motion tracking with clinical analytics. The system uses MediaPipe for hand/pose tracking to perform precise biomechanical assessments including TAM (Total Active Motion), Kapandji scoring, and wrist flexion/extension measurements.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript and Vite bundler
- **Component Library**: Radix UI with Tailwind CSS
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Motion Tracking**: MediaPipe Holistic v0.5.1675471629 with CDN fallback strategy

### Backend Architecture
- **Node.js/Express** server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage Fallback**: File-based storage (`data/storage.json`) for development
- **API Design**: RESTful endpoints with role-based authentication

### Database Strategy
- **Development**: File storage with automatic migration capability
- **Production**: PostgreSQL with shared database across instances
- **Migration**: Automated migration system preserves all assessment data

## Key Components

### Patient Assessment System
1. **Hand Motion Tracking**: Real-time MediaPipe integration with confidence-based filtering
2. **Assessment Types**:
   - TAM: Finger-specific ROM measurements (MCP, PIP, DIP angles)
   - Kapandji: Thumb opposition scoring (10-point scale)
   - Wrist: Flexion/extension angles using elbow-referenced vectors
3. **Quality Scoring**: Multi-factor assessment including landmark detection, hand presence, and tracking stability

### Clinical Dashboard
1. **Role-Based Access**: Clinicians, researchers, and administrators
2. **Patient Management**: De-identified patient tracking with PHI-free design
3. **Analytics Suite**: Longitudinal analysis, predictive modeling, and outcome tracking
4. **Study Management**: Multi-cohort research with enrollment tracking

### Data Processing
1. **Motion Replay**: Frame-by-frame visualization with interactive controls
2. **ROM Calculations**: Precise 3D vector mathematics for angle measurements
3. **Confidence Filtering**: Removes unreliable tracking data (70% threshold)
4. **Results Visualization**: Real-time charts and clinical interpretation

## Data Flow

### Assessment Workflow
1. **Patient Access**: 6-digit access codes for secure entry
2. **Assessment Selection**: Injury-specific test battery
3. **Motion Capture**: 10-second recordings with MediaPipe tracking
4. **Real-time Processing**: Confidence filtering and ROM calculations
5. **Results Storage**: PostgreSQL with motion replay data preservation
6. **Clinical Review**: Dashboard analytics and progress tracking

### Authentication Flow
- **Patients**: Access code verification (6-digit numeric)
- **Clinical Staff**: Username/password with role-based permissions
- **Session Management**: Token-based authentication with automatic logout

## External Dependencies

### Core Technologies
- **@mediapipe/holistic**: Hand and pose landmark detection
- **@neondatabase/serverless**: PostgreSQL database driver
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components

### Media Processing
- **MediaPipe CDN**: Primary loading strategy with fallback
- **Camera Utils**: Video capture and processing
- **Drawing Utils**: Canvas rendering for motion visualization

## Deployment Strategy

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required for production)
- **USE_DATABASE**: Force database mode (optional, auto-detected in production)
- **NODE_ENV**: Environment detection for storage strategy selection

### Production Deployment
1. **Database Migration**: Automatic PostgreSQL setup with demo data
2. **MediaPipe Loading**: CDN-first strategy prevents deployment failures
3. **Asset Management**: Static file serving with proper caching headers
4. **Error Handling**: Graceful degradation for tracking failures

### Development Setup
1. **File Storage**: Local JSON storage for rapid development
2. **Hot Reload**: Vite development server with HMR
3. **Database Testing**: Optional PostgreSQL with migration tools

## Recent Changes

### June 24, 2025 - Patient Logout System & TAM Visibility-Based Temporal Validation
- **Implemented universal patient logout functionality across all patient pages**
- **Created PatientHeader component with logout button and patient identification**
- **Added session cleanup and redirection to login page on logout**
- **Consistent navigation experience with patient code display and logout access**
- **Enhanced temporal validation with visibility-based decision logic**
- **System now preserves legitimate high ROM values for clearly visible fingers**
- **Bypasses temporal filtering when fingers are visible in ≥80% of frames**
- **Maintains protection against tracking artifacts for occluded fingers**
- Frame-to-frame validation applied selectively based on finger visibility assessment
- MediaPipe visibility scores used to distinguish genuine ROM from tracking errors
- Quality scoring differentiates between bypassed (1.0) and validated (0.3-0.9) measurements
- Enhanced logging documents visibility assessment and validation decisions
- Successfully completed PostgreSQL database migration for production deployment

### June 24, 2025 - Database Migration & Production Deployment Ready
- Completed full PostgreSQL database migration from file-based storage
- Migrated all 9 users, 27 user assessments, and 3 clinical users successfully
- System automatically detects and uses database storage when DATABASE_URL is available
- Production deployment now functional - user access codes work in deployed environment
- Preserved all motion tracking data and assessment history during migration
- Verified data integrity across all user records and assessment results

### June 23, 2025 - Motion Replay Enhancements & Session Maximum Fixes
- Fixed flexion/extension classification bug in wrist assessments
- Corrected motion replay canvas positioning and visibility
- Adjusted wrist motion replay playback speed for consistency
- Removed duplicate angle labels on motion replay canvas
- Improved angle calculation accuracy using cross product method
- Fixed session maximum calculation to use real motion data instead of incorrect stored values
- Synchronized canvas display with calculation engine to eliminate timing lag
- Enhanced wrist results calculator to prioritize motion data over potentially incorrect database values
- Added Kapandji score display to patient history entries (supports both kapandjiScore and totalActiveRom fields)
- Fixed wrist flexion/extension consistency between history display and view details using centralized calculator
- Enhanced wrist assessment history with Total ROM card alongside flexion/extension values
- Updated wrist "View Details" button to match "View Results" styling and routing
- Removed assessment overview data cards for cleaner interface layout
- Added red highlighting for low TAM finger ROM values (threshold: <225°) in assessment history

## User Preferences

Preferred communication style: Simple, everyday language.
Patient interface navigation: Consistent logout functionality accessible from all patient pages.