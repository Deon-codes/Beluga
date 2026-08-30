SONAR-AI Frontend

1. Project Overview

Build a modern, professional web interface for SONAR-AI, an AI-powered marine sonar analysis platform designed to help analysts process large volumes of side-scan sonar survey data and identify potentially suspicious underwater objects such as debris.

The frontend should communicate the following workflow:

Survey → Sonar Data → AI Processing → Object Detection → Analyst Review → Report

The application is intended for an SIH project/internal evaluation, so the UI should look polished, technically credible, and demo-ready.

2. Primary Goal

Build a visually impressive but professional dashboard for marine survey monitoring.

The design should feel:

Modern

Premium

Technical

Marine/ocean-inspired

Clean

Data-driven

Professional enough for a government/research environment

Important design constraint

DO NOT make the interface boring.

However, also DO NOT make it funky, childish, overly colorful, or gaming-like.

The visual direction should be:

Modern defense/research technology dashboard + marine intelligence platform

Use visual hierarchy, subtle animations, glass effects where appropriate, maps, status indicators, cards, charts, hover interactions, and clean typography to make the interface attractive.

3. Technology Stack

Use:

React

Vite

JavaScript

Tailwind CSS

React Router

Lucide React for icons

Leaflet / React Leaflet for maps

Recharts where charts are useful

Do not introduce unnecessary libraries.

Keep the code modular and maintainable.

4. Application Modes

The application MUST support two visual modes:

Light Mode

Light, clean interface with:

White/off-white surfaces

Deep navy text

Blue/cyan accents

Soft borders

Subtle shadows

Clear data visualization

Dark Mode

Dark professional interface with:

Deep navy/charcoal background

Slightly lighter cards

White/light-gray text

Cyan/blue accents

Red/orange indicators for warnings and high-risk detections

Subtle glow effects only where appropriate

The dark mode should feel like a sophisticated marine intelligence/control-room interface.

Theme requirements

Add a theme toggle in the top navigation.

Persist the selected theme using localStorage.

The entire application must respond to the theme.

Avoid hardcoded colors scattered throughout components.

Define reusable theme tokens/classes where practical.

5. Main Navigation

The application currently has exactly 5 primary sections:

Dashboard

Survey History

New Survey

Detections

Reports

Suggested sidebar:

SONAR-AI
────────────────────

◉ Dashboard
◷ Survey History
＋ New Survey
◎ Detections
▣ Reports

────────────────────

Settings
Theme Toggle
User Profile

The sidebar should remain visually consistent across the application.

On smaller screens, collapse the sidebar into a responsive navigation.

6. Overall Application Layout

Use a persistent application shell:

┌──────────────────────────────────────────────────────────────┐
│ SONAR-AI                              Theme   Notifications │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│   SIDEBAR      │              PAGE CONTENT                   │
│                │                                             │
│ Dashboard      │                                             │
│ History        │                                             │
│ New Survey     │                                             │
│ Detections     │                                             │
│ Reports        │                                             │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘

The dashboard is the first page shown.

7. DASHBOARD

The dashboard is the most important page for the first version.

It should provide an immediate overview of marine survey activity and detected objects.

Dashboard layout

Recommended structure:

┌────────────────────────────────────────────────────────────────────┐
│ Dashboard                                      Live Monitoring ●   │
│ Marine Survey Intelligence Overview                                │
├────────────┬────────────┬────────────┬─────────────────────────────┤
│ Surveys    │ Objects    │ High Risk  │ Surveys Processing          │
│ Processed  │ Detected   │ Detections │                             │
├────────────┴────────────┴────────────┴─────────────────────────────┤
│                                                                    │
│                        INDIA MAP                                   │
│                                                                    │
│       Ship ●                         ● Survey Location             │
│                                                                    │
│             ● Debris                                            │
│                                                                    │
│                         ●                                         │
│                                                                    │
│                           ●                                       │
│                                                                    │
├───────────────────────────────────────┬────────────────────────────┤
│                                       │                            │
│                                       │ Recent Detections          │
│                                       │                            │
│                                       ├────────────────────────────┤
│                                       │                            │
│                                       │ Recent Surveys              │
│                                       │                            │
└───────────────────────────────────────┴────────────────────────────┘

8. Dashboard KPI Cards

At the top of the dashboard show four cards:

1. Surveys Processed

Example:

24

Surveys Processed
↑ 12% this month

2. Objects Detected

Example:

137

Objects Detected
Across all surveys

3. High Risk Detections

Example:

18

High Risk Detections
Requires review

4. Surveys Processing

Example:

3

Surveys Processing
Live

Use appropriate icons.

Cards should have subtle hover effects.

Do not overdo gradients.

9. India Map — Main Dashboard Feature

The center of the dashboard MUST contain an interactive map of India.

Use Leaflet / React Leaflet.

The map should initially focus on India and nearby surrounding waters.

It should look like a marine survey monitoring map rather than a generic Google Maps screen.

Map requirements

Show:

A. Ships

Display simulated ships moving along survey routes.

Ships can be represented by a small ship icon or custom marker.

The simulation should be frontend-only for now.

Ships should:

Move slowly along predefined routes

Have a subtle movement animation

Display a tooltip/popup when clicked

Show ship name/ID

Show current survey status

Example:

INS Surveyor-01
Status: Active Survey
Speed: 7.2 knots
Mission: Coastal Survey

Use mock data.

10. Survey Location Markers

There are two types of survey locations.

A. Completed / Processed Survey

Show completed survey locations as:

solid red dots

Example:

●

Clicking the dot should open a popup:

Survey #024

Status
✓ Survey Processed

Objects Detected
12

High Risk
3

Date
29 Aug 2026

[View Survey]

The popup should be attractive and compact.

B. Survey Scheduled / Yet To Be Processed

Show these locations as:

blinking red dots

Example:

◉

Use a subtle pulse/blink animation.

Clicking the marker should open:

Survey #025

Status
● Survey Processing

Location
Arabian Sea

Started
30 Aug 2026

Progress
68%

[View Survey]

Do not make the blinking effect annoying.

The animation should be subtle and professional.

11. Debris Detection Markers

When debris or suspicious objects have been detected during a survey, display the detection location as a red dot.

Clicking the red detection marker should show:

Detection #D-102

Classification
Possible Debris

Confidence
94.7%

Risk
HIGH

Survey
#024

[View Detection]

Different detections can use slightly different visual treatments based on risk.

Suggested:

High risk → red

Medium risk → orange

Low risk → yellow/green

The default debris visualization should remain red because this is the primary alert color.

12. Map Simulation

For the first version, the map does NOT need a backend.

Create mock data such as:

const ships = [
  {
    id: "INS-01",
    name: "Surveyor Alpha",
    status: "Active Survey",
    route: [...]
  },
  ...
];

And:

const surveyLocations = [
  {
    id: "SUR-024",
    lat: ...,
    lng: ...,
    status: "processed"
  },
  {
    id: "SUR-025",
    lat: ...,
    lng: ...,
    status: "processing"
  }
];

And:

const detections = [
  {
    id: "D-102",
    lat: ...,
    lng: ...,
    type: "Possible Debris",
    confidence: 0.947,
    risk: "High"
  }
];

Keep all mock data in a separate file.

13. Dashboard — Recent Detections

Place a recent detections panel beside/below the map depending on screen size.

Example:

Recent Detections

D-102
Possible Debris
94.7%     HIGH
2 min ago

D-101
Unknown Object
91.2%     HIGH
18 min ago

D-099
Debris
82.4%     MEDIUM
42 min ago

Clicking an item should open the relevant detection details.

Use clear risk badges.

14. Dashboard — Recent Surveys

Show recent survey activity.

Example:

Recent Surveys

SUR-024
Arabian Sea
12 objects detected
✓ Processed

SUR-023
Bay of Bengal
8 objects detected
✓ Processed

SUR-025
Arabian Sea
Processing 68%
● Processing

Each item should be clickable.

15. DASHBOARD INTERACTIONS

The dashboard should have useful interactions:

Hover over KPI cards

Hover over map markers

Click map markers

Click recent detections

Click recent surveys

Navigate to survey details

Toggle map layers if useful

Theme switching

Subtle loading animations

Avoid excessive animations.

16. SURVEY HISTORY PAGE

Purpose:

Allow the analyst to view all previous and currently processed surveys.

Create a clean data table.

Example:

Survey History

[ Search surveys... ]     [ Status ▼ ] [ Date ▼ ]

┌────────┬──────────────┬───────────┬───────────┬───────────┐
│ ID     │ Location     │ Date      │ Detections│ Status    │
├────────┼──────────────┼───────────┼───────────┼───────────┤
│ SUR024 │ Arabian Sea  │ 29 Aug    │ 12        │ Processed │
│ SUR023 │ Bay Bengal   │ 28 Aug    │ 8         │ Processed │
│ SUR022 │ Arabian Sea  │ 27 Aug    │ 17        │ Processed │
│ SUR025 │ Arabian Sea  │ 30 Aug    │ --        │ Processing│
└────────┴──────────────┴───────────┴───────────┴───────────┘

Features:

Search

Filter by status

Sort by date

View survey

Pagination if necessary

Statuses:

Processed

Processing

Failed

Pending

17. NEW SURVEY PAGE

This page starts a new marine survey analysis.

Create a professional upload interface.

Example:

New Marine Survey

Survey Information

Survey Name
[____________________________]

Survey Location
[____________________________]

Survey Date
[____________________________]


Upload Sonar Data

┌─────────────────────────────────────────┐
│                                         │
│              Upload Files               │
│                                         │
│        Drag & drop files here           │
│             or Browse                   │
│                                         │
│     PNG / JPG / TIFF / CSV / SONAR      │
│                                         │
└─────────────────────────────────────────┘

                            [Start Analysis]

After upload:

survey_file.tiff
██████████████████░░ 82%
Upload complete

The first version can simulate upload/processing.

Eventually this will connect to the backend.

18. NEW SURVEY FLOW

The frontend flow should be:

New Survey
    ↓
Enter survey information
    ↓
Upload sonar data
    ↓
Validate file
    ↓
Start Analysis
    ↓
Processing screen/state
    ↓
Analysis results

The processing experience should feel polished.

Show stages:

✓ File uploaded
✓ Data validation
✓ Sonar preprocessing
● AI object detection
○ Object classification
○ Generating results

19. DETECTIONS PAGE

The Detections page should provide a centralized view of all AI detections.

Layout:

Detections

[ Search detection... ]

[ All ] [ High Risk ] [ Medium ] [ Low ]

┌───────┬───────────────┬────────────┬──────────┬───────────┐
│ ID    │ Classification│ Confidence │ Risk     │ Status    │
├───────┼───────────────┼────────────┼──────────┼───────────┤
│ D-102 │ Debris        │ 94.7%      │ HIGH     │ Review    │
│ D-101 │ Unknown       │ 91.2%      │ HIGH     │ Verified  │
│ D-099 │ Debris        │ 82.4%      │ MEDIUM   │ Review    │
└───────┴───────────────┴────────────┴──────────┴───────────┘

Clicking a detection should open a detail panel/modal.

20. DETECTION DETAIL PANEL

Show:

Detection #D-102

Classification
Possible Debris

Confidence
94.7%

Risk Level
HIGH

Survey
SUR-024

Coordinates
18.9234° N
72.8215° E

Detected At
14:32:18

Object Size
2.4m × 1.8m

────────────────────────────

[ View Sonar Crop ]

Analyst Review

[ Confirm ]
[ Reject ]
[ Needs Review ]

Include analyst verification status.

Possible statuses:

AI Detected

Verified

Rejected

Needs Review

This feature is important because the platform should support human-in-the-loop analysis.

21. REPORTS PAGE

The Reports page should provide generated survey reports.

Example:

Reports

[ Search reports... ]

┌────────────┬──────────────┬──────────────┬─────────────┐
│ Survey     │ Date         │ Detections   │ Report      │
├────────────┼──────────────┼──────────────┼─────────────┤
│ SUR-024    │ 29 Aug 2026  │ 12            │ Available   │
│ SUR-023    │ 28 Aug 2026  │ 8             │ Available   │
│ SUR-022    │ 27 Aug 2026  │ 17            │ Available   │
└────────────┴──────────────┴──────────────┴─────────────┘

Each report can have:

[View]
[Download]

For now, the report can be a frontend mock/preview.

Later it will connect to backend report generation.

22. REPORT PREVIEW

Create a professional report preview containing:

SONAR-AI
Marine Survey Analysis Report

Survey ID: SUR-024
Location: Arabian Sea
Date: 29 Aug 2026

──────────────────────────

Survey Summary

Objects Detected       12
High Risk              3
Medium Risk            6
Low Risk               3

──────────────────────────

Detection Summary

Detection #D-102
Possible Debris
Confidence: 94.7%
Risk: HIGH

...

──────────────────────────

Analyst Verification
Verified: 8
Pending Review: 4

Include a sonar image/map snapshot if available.

23. COMPONENT ARCHITECTURE

Do NOT put everything inside individual page files.

Create reusable components.

Recommended structure:

src/
│
├── assets/
│
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   └── Layout.jsx
│   │
│   ├── dashboard/
│   │   ├── StatCard.jsx
│   │   ├── IndiaMap.jsx
│   │   ├── ShipMarker.jsx
│   │   ├── SurveyMarker.jsx
│   │   ├── DetectionMarker.jsx
│   │   ├── RecentDetections.jsx
│   │   └── RecentSurveys.jsx
│   │
│   ├── surveys/
│   │   ├── SurveyTable.jsx
│   │   ├── UploadBox.jsx
│   │   └── SurveyStatusBadge.jsx
│   │
│   ├── detections/
│   │   ├── DetectionTable.jsx
│   │   ├── DetectionCard.jsx
│   │   ├── DetectionDetail.jsx
│   │   ├── RiskBadge.jsx
│   │   └── ConfidenceBar.jsx
│   │
│   └── reports/
│       ├── ReportTable.jsx
│       └── ReportPreview.jsx
│
├── pages/
│   ├── Dashboard.jsx
│   ├── SurveyHistory.jsx
│   ├── NewSurvey.jsx
│   ├── Detections.jsx
│   └── Reports.jsx
│
├── data/
│   └── mockData.js
│
├── services/
│   └── api.js
│
├── hooks/
│   └── useTheme.js
│
├── App.jsx
├── main.jsx
└── index.css

24. DATA ARCHITECTURE

For now, use mock data.

Create:

src/data/mockData.js

Keep:

surveys

detections

ships

map locations

statistics

reports

in this file.

Do NOT hardcode mock data directly inside UI components.

Example:

export const surveys = [...]
export const detections = [...]
export const ships = [...]
export const dashboardStats = [...]

25. BACKEND-READY ARCHITECTURE

The frontend will eventually receive data from the backend.

Keep API logic separate:

components
      ↓
pages
      ↓
services/api.js
      ↓
backend API

Do not scatter fetch calls throughout components.

For now, api.js can contain placeholder functions such as:

uploadSurvey()
getSurveys()
getSurvey()
getDetections()
getReports()

26. DESIGN SYSTEM

Use a consistent design system.

Colors

Primary:

Deep navy

Ocean blue

Cyan

Alert:

Red = high risk / critical

Orange = medium risk

Yellow/green = low risk

Avoid using too many unrelated colors.

Typography

Use a modern sans-serif font.

Recommended:

Inter

Geist

Manrope

Use clear hierarchy:

Page Title
Section Heading
Card Title
Body
Metadata

27. VISUAL STYLE

Use:

Rounded cards, but not excessively rounded

Thin borders

Subtle shadows

Soft gradients

Glassmorphism sparingly

Subtle glow around active/high-priority states

Clean icons

Consistent spacing

Avoid:

Huge gradients everywhere

Neon cyberpunk styling

Excessive glassmorphism

Excessive animation

Cartoon illustrations

Random decorative elements

The interface should look like a serious marine intelligence/research platform.

28. ANIMATIONS

Use animations purposefully.

Good:

Page transitions

Card hover

Marker pulse

Ship movement

Loading progress

Skeleton loading

Button feedback

Modal transitions

Avoid:

Constant movement everywhere

Excessive bouncing

Distracting transitions

The blinking survey markers should be noticeable but subtle.

29. RESPONSIVENESS

The primary target is desktop/laptop because this is an analyst dashboard.

However, make the interface responsive.

Desktop:

Sidebar + full dashboard

Tablet:

Collapsed sidebar

Small screens:

Top navigation / drawer

The India map should resize correctly.

30. ACCESSIBILITY

Use:

Semantic HTML

Proper button elements

Keyboard-accessible controls

Accessible labels

Sufficient contrast

Tooltips where icons alone are used

Do not rely only on color to communicate status.

For example:

HIGH ●

instead of only a red color.

31. MOCK SIMULATION REQUIREMENTS

Since there is no backend yet, simulate:

Ships

Ships should move along predefined routes.

Processing

Processing percentage can gradually increase.

Survey status

Some surveys should be:

Processed

Processing

Pending

Detection updates

Recent detection timestamps can be simulated.

Make the simulation deterministic enough that the demo is reliable.

Do not use random behavior that could make the demo inconsistent.

32. ROUTES

Use React Router.

Routes:

/dashboard
/history
/new-survey
/detections
/reports

The default route / should redirect to /dashboard.

33. IMPORTANT UX FLOW

The main demo flow should be:

Dashboard
    ↓
Click "New Survey"
    ↓
Upload Survey
    ↓
Start Analysis
    ↓
Processing
    ↓
Return to Dashboard / History
    ↓
View Detection
    ↓
Review Detection
    ↓
View Report

The UI should feel like one connected application, not five separate pages.

34. Development Order

Build in this exact order.

Phase 1 — Foundation

Create React + Vite project

Install dependencies

Configure Tailwind

Create folder structure

Create Layout

Create Navbar

Create Sidebar

Configure React Router

Phase 2 — Theme

Implement light theme

Implement dark theme

Add theme toggle

Persist theme with localStorage

Phase 3 — Dashboard

Build KPI cards

Build India map

Add ship markers

Add ship movement simulation

Add processed survey markers

Add blinking processing survey markers

Add detection markers

Add marker popups

Add Recent Detections

Add Recent Surveys

Phase 4 — Survey History

Build survey table

Add search

Add filtering

Add sorting

Add survey details interaction

Phase 5 — New Survey

Build survey form

Build upload component

Add simulated upload

Add processing state

Add navigation after processing

Phase 6 — Detections

Build detection table

Add filters

Add search

Build detection detail panel

Add confidence visualization

Add risk badges

Add analyst verification

Phase 7 — Reports

Build report table

Build report preview

Add view/download placeholders

Phase 8 — Polish

Responsive design

Loading states

Empty states

Error states

Hover states

Transitions

Accessibility

Full end-to-end testing

35. IMPORTANT CODING RULES

Copilot MUST:

Use reusable components

Avoid duplicated UI code

Keep mock data separate

Keep API logic separate

Use React Router

Use clean state management

Use meaningful component names

Keep components reasonably small

Avoid unnecessary dependencies

Avoid hardcoded repeated values

Avoid putting the entire application in App.jsx

Do not rewrite working components unnecessarily.

36. FIRST VERSION SCOPE

For the first implementation, prioritize:

MUST WORK

Dashboard

Light/dark mode

India map

Simulated ships

Processed survey markers

Blinking processing markers

Detection markers

Marker popups

KPI cards

Recent detections

Recent surveys

Survey history

New survey upload UI

Detections page

Reports page

Navigation

CAN BE MOCKED

AI processing

Backend

File upload API

Report generation

Detection classification

Ship telemetry

The frontend must be structured so these can later be replaced by real backend functionality.

37. FINAL DESIGN INTENT

The finished interface should make a judge immediately understand:

SONAR-AI monitors marine surveys, tracks survey activity, identifies suspicious objects from sonar data, helps analysts review detections, and generates survey reports.

The most visually important element should be the India marine survey map on the Dashboard.

The application should feel:

"Government/research-grade technology platform"

rather than:

"Student project dashboard."

Prioritize polish, clarity, interaction quality, and a coherent visual identity.

38. START BUILDING

Start by implementing:

Project setup

Application shell

Sidebar

Navbar

Routing

Light/dark theme

Dashboard

India map

Mock ship simulation

Survey markers

Detection markers

Recent activity panels

Do NOT start implementing backend integration.

Do NOT create unnecessary pages beyond the five specified sections.

Do NOT add extra features unless they directly improve the marine survey monitoring workflow.

Build the foundation cleanly so additional AI/sonar functionality can be integrated later.

Eco-Optimized Cleanup Route Feature

Overview

After the sonar survey image is uploaded and the AI detects marine debris, the system should provide an Eco-Optimized Cleanup Route.

The purpose of this feature is not to simulate the physical movement of a ship or underwater vehicle. Instead, it should visually demonstrate how the system evaluates possible cleanup routes between detected debris locations and selects an efficient route.

The feature should connect:

Sonar Image → AI Detection → Debris Locations → Route Optimization → Cleanup Route → Distance & CO₂ Estimate

User Flow

1. Upload Survey

The user uploads a sonar image/survey.

The system should show:

Survey upload completed

Image processing status

Number of detected debris objects

Example:

Survey #024

✓ Sonar image uploaded
✓ Image processed
✓ Debris detected

7 potential debris locations identified

After detection, provide:

[ Optimize Cleanup Route ]

2. Display Detected Debris

Once detections are available, show them on a map or coordinate-based 2D workspace.

Example:

             🔴 D3

       🟠 D2          🔴 D5


   🔴 D1                   🟢 D6


             🚢 START

Each debris marker should have:

Detection ID

Classification, if available

Confidence

Priority/risk level

Location/coordinates, if available

Priority Colors

🔴 High priority

🟠 Medium priority

🟢 Low priority

The same color convention should be used throughout the application.

3. Route Optimization Simulation

When the user clicks Optimize Cleanup Route, show a short visual optimization sequence.

The system can display several candidate routes and compare them.

Example:

Calculating optimal cleanup sequence...

Testing possible routes...

Route A
START → D1 → D2 → D3 → D5 → D6
Distance: 9.4 km

Route B
START → D1 → D3 → D5 → D2 → D6
Distance: 11.2 km

Route C
START → D2 → D1 → D5 → D3 → D6
Distance: 8.1 km

Route D
START → D1 → D2 → D5 → D3 → D6
Distance: 7.2 km ✓

Visual Behavior

The map should:

Display the detected debris.

Draw a candidate route.

Display its distance/score.

Move to the next candidate route.

Compare the candidates.

Highlight the selected route.

Clearly indicate that the selected route is the recommended route.

This should be a lightweight UI animation, not a physical simulation.

4. Display the Optimal Route

After optimization, highlight the recommended route prominently.

Example:

             🔴 D3
                ↑
                │
       🟠 D2 ───┘
       ↑
       │
   🔴 D1
       ↑
       │
      🚢 START

Display a summary panel:

OPTIMAL ROUTE FOUND

Total Distance       7.2 km
Estimated Time       42 min
Estimated CO₂        3.8 kg

Distance Saved       2.2 km
CO₂ Reduction        23.4%

Use the primary application accent color (teal/cyan) to highlight the recommended route.

5. Optimization Objective

The feature should preferably be called:

Eco-Optimized Cleanup Route

rather than simply "Shortest Path".

The long-term objective can consider:

Route Score =
Distance
+ Estimated Fuel Consumption
+ Debris Priority
+ Operational Constraints

For the initial implementation, the team can start with:

Priority + Distance

and later extend the optimization logic if the backend supports it.

The UI may provide an option such as:

Optimization Objective

● Priority + Distance
○ Minimum Distance
○ Minimum CO₂

If the backend does not yet support multiple objectives, keep the selector visually prepared but implement only the supported option.

6. CO₂ / Emission Estimation

The route results should communicate the sustainability benefit.

The system should compare the selected route against an appropriate baseline route.

Example:

Recommended Route
7.2 km
Estimated CO₂: 3.8 kg

Baseline Route
9.4 km
Estimated CO₂: 4.9 kg

Estimated Reduction
23.4%

Important

Do not present the CO₂ value as a real-world measurement unless the backend has the required fuel/emission model and input data.

If the values are simulated/demo values, clearly label them as:

Estimated / Simulated

7. Real-World Coordinate Consideration

A sonar image alone does not necessarily provide real-world geographic coordinates.

For actual route planning, the system ideally needs:

GPS/georeferencing metadata

Survey track information

Sonar position information

Geographic coordinates associated with detections

Therefore:

Sonar Image
     ↓
AI Debris Detection
     ↓
Detection Coordinates
     ↓
Map
     ↓
Route Optimization
     ↓
Distance + CO₂ Estimate

If the available SIH dataset contains only images, the frontend can demonstrate the route optimization using simulated coordinates/a coordinate grid.

In that case, the UI should make it clear that the route is a simulation/demo and not an actual navigational route.

Frontend Requirements

Main Components

Suggested React components:

EcoRouteOptimizer
├── DetectionMap
├── DebrisMarker
├── RouteLayer
├── RouteCandidatePanel
├── OptimizationProgress
├── RouteComparison
├── OptimalRouteSummary
└── EmissionSummary

These names are suggestions and can be changed to match the project's existing architecture.

States

The UI should support at least these states:

Initial

No route generated

[ Optimize Cleanup Route ]

Optimizing

Finding the most efficient cleanup route...

Analyzing candidate routes...
██████████████░░░░░░ 72%

Results

Optimal Route Found ✓

7.2 km
42 min
3.8 kg CO₂ estimated

Error

If route optimization fails:

Unable to generate cleanup route.

Please verify that debris locations are available.

[ Try Again ]

Animation Guidelines

The animation should be:

Smooth

Short

Easy to understand

Optional/skippable

Functional rather than decorative

Avoid:

3D ship simulation

Realistic ocean physics

Complex underwater environments

Long animations

Excessive visual effects

The goal is to demonstrate the route optimization process, not physical ocean or ship dynamics.

UI/UX Guidelines

The interface should feel like a professional marine research/analysis application.

Recommended visual style

Dark navy default theme

Optional light theme

Teal/cyan primary accent

Neutral panels

High readability

Consistent spacing

Minimal animations

Clear status indicators

Semantic colors

High priority      Red
Medium priority    Amber/Orange
Low priority       Green
Selected route     Teal/Cyan
Error              Red
Success            Green

Do not use priority colors for decorative purposes.

Integration With Existing Workflow

This feature should NOT become a separate unrelated simulation page.

It should be integrated into the survey-analysis workflow:

UPLOAD SURVEY
      ↓
AI ANALYSIS
      ↓
DEBRIS DETECTION
      ↓
DETECTION LOCATIONS
      ↓
ECO-OPTIMIZED CLEANUP ROUTE
      ↓
DISTANCE + CO₂ ESTIMATE
      ↓
CLEANUP PLAN
      ↓
REPORT

The user should be able to move from detection results directly into route optimization.

Demo Scenario

For the SIH demonstration:

Upload a sonar image.

Show AI detection results.

Display detected debris locations.

Click Optimize Cleanup Route.

Show the system evaluating candidate routes.

Highlight the optimal route.

Display:

Total distance

Estimated travel time

Estimated CO₂

Distance saved

Estimated CO₂ reduction

Allow the user to view the final cleanup plan.

This creates a clear story:

The AI doesn't just detect debris. It converts those detections into an actionable and more environmentally efficient cleanup plan.

Important Implementation Principle

Do not build a separate ship simulator.

The "simulation" in this feature is the visual simulation of route optimization.

The focus should remain on:

Detection → Location → Optimization → Cleanup Planning → Sustainability

This keeps the feature directly aligned with the project's actual problem statement while still giving the final demo a visually engaging simulation component.