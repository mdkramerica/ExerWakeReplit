# Palm Boundary Line Calculation Documentation

## Overview
This document explains how the palm boundary line was calculated for the Kapandji assessment visualization before it was removed from the motion replay canvas.

## MediaPipe Hand Landmarks Used
The calculation relied on three key MediaPipe hand landmarks:
- **Landmark 0**: Wrist (WRIST)
- **Landmark 5**: Index finger MCP joint (INDEX_FINGER_MCP)
- **Landmark 17**: Pinky finger MCP joint (PINKY_MCP)

## Calculation Steps

### 1. Palm Center Calculation
```javascript
const palmCenterX = (indexMcp.x + pinkyMcp.x) / 2;
const palmCenterY = (indexMcp.y + pinkyMcp.y) / 2;
```
- Calculates the midpoint between index and pinky MCP joints
- This represents the approximate center of the palm

### 2. Direction Vector Calculation
```javascript
const dirX = palmCenterX - wrist.x;
const dirY = palmCenterY - wrist.y;
```
- Creates a vector from the wrist to the palm center
- This establishes the general direction of hand extension

### 3. Line Extension
```javascript
const extensionFactor = 1.5;
const beyondPalmX = palmCenterX + dirX * extensionFactor;
const beyondPalmY = palmCenterY + dirY * extensionFactor;
```
- Extends the line beyond the palm center by 50% (factor of 1.5)
- This creates the "distal palmar crease" threshold line

### 4. Canvas Coordinate Conversion
```javascript
const startX = (1 - palmCenterX) * canvas.width;
const startY = palmCenterY * canvas.height;
const endX = (1 - beyondPalmX) * canvas.width;
const endY = beyondPalmY * canvas.height;
```
- Converts normalized MediaPipe coordinates (0-1) to canvas pixels
- Applies horizontal mirroring using `(1 - x)` for natural hand view

## Visual Representation
The line was drawn as:
- **Style**: Dashed line (5px dash, 5px gap)
- **Width**: 3 pixels
- **Color**: Green (#10b981) if level 10 achieved, amber (#f59e0b) otherwise
- **Label**: "Distal Palmar Crease" positioned near the end point

## Purpose in Kapandji Assessment
This line represented the anatomical boundary for Kapandji level 10 scoring:
- Level 10 requires thumb opposition to reach the distal palmar crease
- The visual line helped users understand the target area
- Color coding indicated whether this level was achieved

## Removal Rationale
The line was removed to:
- Simplify the visual display
- Reduce visual clutter during motion replay
- Focus attention on hand landmarks and score indicators
- Eliminate potential confusion about the exact scoring criteria

## Alternative Visualization
Instead of the palm boundary line, the Kapandji assessment now relies on:
- Real-time score overlay showing levels 1-10
- Color-coded achievement indicators
- Detailed breakdown in the assessment results page