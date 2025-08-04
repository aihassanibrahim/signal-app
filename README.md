# Signal App

A focus and productivity app that helps you distinguish between signal (important tasks) and noise (distractions).

## Features

- **Signal Tasks**: Add up to 5 important tasks that deserve your focus
- **Focus Timer**: Track time spent on each signal task
- **Noise Capture**: Quickly capture distractions to avoid them
- **Daily Reset**: Start fresh each day with intentional focus
- **Local Storage**: Data persists between sessions
- **Mobile Optimized**: Touch-friendly interface with haptic feedback

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Usage

- **Add Signal Tasks**: Type in the input field and click the + button or press Enter
- **Start Timer**: Click on a signal task to start/stop the focus timer
- **Complete Tasks**: Click the checkbox to mark tasks as complete
- **Capture Noise**: Long press the + button to quickly add distractions to your noise list
- **View Noise**: Expand the noise section to see captured distractions

## Firebase Integration

The app is prepared for Firebase integration. To enable it:

1. Uncomment the Firebase imports in `src/SignalApp.js`
2. Add your Firebase configuration
3. Install Firebase dependencies: `npm install firebase`

## Technologies Used

- React 18
- Tailwind CSS
- Local Storage API
- Web Vibration API (for haptic feedback)

## License

MIT 