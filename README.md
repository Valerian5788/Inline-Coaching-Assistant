# Hockey Coaching Assistant

A comprehensive web-based hockey coaching application built with React, TypeScript, and modern web technologies. This application provides coaches with tools to manage teams, track game statistics, design drills, plan practices, and analyze performance data.

## 🏒 Features

### Team & Season Management
- **Team Creation & Management**: Create and manage hockey teams with complete roster information
- **Season Organization**: Organize games into seasons (regular, tournament, playoffs) with automatic game counts
- **Player Management**: Track player information including jersey numbers, positions, and personal details

### Game Management & Live Tracking
- **Game Scheduling**: Create and manage games with flexible period configurations
- **Live Shot Tracking**: Real-time shot tracking with ice position mapping and result recording
- **Quick Stats**: Instant access to game statistics and shooting percentages
- **Score Management**: Track home/away scores with overtime support
- **Game Presets**: Pre-configured game settings for senior and junior games

### Training & Development
- **Drill Designer**: Interactive drill creation tool with tactical drawing capabilities
- **Practice Planner**: Comprehensive practice session planning with drill integration
- **Tactical Drawings**: Draw plays and strategies with an advanced canvas system
- **Drill Library**: Categorized drill storage with tagging and search functionality

### Analytics & Reporting
- **Performance Analytics**: Season-wide statistics including win/loss records, shooting percentages
- **Shot Analysis**: Detailed shot tracking by zone and period
- **Form Tracking**: Recent team performance visualization
- **Game History**: Complete game archive with searchable history

### Modern Interface
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Progressive Web App**: Can be installed as a native app on mobile devices
- **Real-time Dashboard**: Live updating dashboard with key metrics and recent activity
- **Intuitive Navigation**: Clean, coach-friendly interface with quick actions

## 🛠 Technology Stack

### Frontend Framework
- **React 19.1.1** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and development server
- **React Router DOM 7.8.1** - Client-side routing

### UI & Styling
- **Tailwind CSS 4.1.12** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **Class Variance Authority** - Component variant management
- **Responsive Design** - Mobile-first approach

### Data Management
- **Zustand 5.0.7** - Lightweight state management
- **Dexie 4.2.0** - IndexedDB wrapper for offline-first data storage
- **Local Storage** - Persistent data without server dependency

### Data Visualization
- **Recharts 3.1.2** - React charting library for analytics
- **HTML2Canvas 1.4.1** - Screenshot and export capabilities

### Development Tools
- **ESLint** - Code linting with React-specific rules
- **TypeScript ESLint** - TypeScript-aware linting
- **PostCSS** - CSS processing and optimization
- **Vite PWA Plugin** - Progressive Web App capabilities

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or pnpm package manager

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd hockey-coaching-app

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:5173`

### Building for Production
```bash
# Build the application
npm run build
# or
pnpm build

# Preview the production build
npm run preview
# or
pnpm preview
```

## 📱 Usage

### Initial Setup
1. **Create a Team**: Start by creating your hockey team with basic information
2. **Add Players**: Populate your roster with player details and positions
3. **Create a Season**: Set up a season to organize your games
4. **Start Tracking**: Begin creating games and tracking performance

### Core Workflows

#### Game Management
- Create games using quick actions or detailed forms
- Use game presets for consistent period/timing configurations
- Track live shots during games with zone-based positioning
- Record goals against and game events
- Archive completed games for historical analysis

#### Training Management
- Design custom drills using the visual drill designer
- Create practice plans with multiple drill sequences
- Save and categorize drills for future use
- Share tactical drawings with players

#### Analytics
- View season statistics on the dashboard
- Analyze shooting patterns by ice zone
- Track team form over recent games
- Export game data and visualizations

## 🎯 Key Components

### Database Schema (IndexedDB via Dexie)
- **Teams**: Team information and settings
- **Players**: Roster management with positions and numbers
- **Seasons**: Season organization and status tracking
- **Games**: Game details, scores, and configurations  
- **Shots**: Shot tracking with position and result data
- **Goals Against**: Opposition scoring tracking
- **Game Events**: Timeline of game occurrences
- **Drills**: Custom drill library with canvas data
- **Practice Plans**: Structured practice sessions
- **Tactical Drawings**: Game situation illustrations
- **Game Presets**: Reusable game configurations

### State Management
- **Zustand Store**: Centralized application state
- **Local Storage Persistence**: Automatic state preservation
- **Real-time Updates**: Live data synchronization across components

## 🔧 Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── stores/             # Zustand state management
├── db/                 # Database configuration and helpers
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
└── contexts/           # React contexts
```

### Key Design Patterns
- **Component-based Architecture**: Modular, reusable components
- **Custom Hooks**: Shared logic extraction
- **TypeScript First**: Full type safety throughout the application
- **Offline First**: Local data storage with IndexedDB
- **Progressive Enhancement**: Works without internet connection

## 🎨 Features for Coaches

### Dashboard Overview
- Time-based greetings and current date display
- Quick action buttons for common tasks
- Season statistics and team performance metrics
- Recent activity feed with game results
- Today's game schedule and completed games

### Advanced Tools
- **Shot Heatmaps**: Visual representation of shooting patterns
- **Player Performance Tracking**: Individual and team statistics
- **Game Comparison**: Side-by-side game analysis
- **Export Capabilities**: Generate reports and share data
- **Offline Support**: Full functionality without internet

## 📊 Analytics Capabilities

### Game Statistics
- Goals, assists, and shot tracking
- Shooting percentage calculations
- Period-by-period breakdowns
- Zone-based shot analysis

### Season Analytics
- Win/loss/tie records
- Season progression tracking
- Player development metrics
- Team performance trends

### Visual Reports
- Charts and graphs for performance data
- Exportable game summaries
- Shot location heatmaps
- Progress tracking visualizations

## 🔒 Data Privacy

- **Local Storage Only**: All data stored locally on device
- **No Server Communication**: Completely offline-first architecture
- **Export Control**: Users control their own data exports
- **GDPR Compliant**: No personal data transmitted externally

## 🌟 Future Enhancements

- Multi-team tournament management
- Advanced video analysis integration
- Team communication features
- Cloud synchronization options
- Mobile app versions (iOS/Android)
- Integration with external hockey databases

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

---

**Hockey Coaching Assistant** - Empowering coaches with modern tools for team management, game analysis, and player development.