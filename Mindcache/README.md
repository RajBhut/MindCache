# MindCache - Web Interaction Tracker

A browser extension that tracks and summarizes your web browsing interactions to help you understand your digital habits.

## Features

- **Real-time Interaction Tracking**: Monitors clicks, scrolls, page visits, form submissions, and text selections
- **Automatic Summaries**: Generates periodic summaries of your browsing patterns
- **Visual Dashboard**: Clean interface showing statistics and insights
- **Data Export/Import**: Backup and restore your interaction data
- **Privacy-Focused**: All data is stored locally in your browser

## Installation

1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build:extension`
4. Load the extension in your browser:
   - Chrome: Go to `chrome://extensions/`, enable Developer mode, click "Load unpacked" and select the `dist` folder
   - Firefox: Go to `about:debugging`, click "This Firefox", click "Load Temporary Add-on" and select the `manifest.json` in the `dist` folder

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build extension files
npm run build:extension
```

## Usage

1. Install the extension in your browser
2. Click the MindCache icon in your browser toolbar
3. Browse the web normally - your interactions will be tracked automatically
4. View your data through the extension popup:
   - **Dashboard**: Overview of your browsing activity
   - **Interactions**: Detailed list of tracked interactions
   - **Summaries**: Automatically generated activity summaries
   - **Settings**: Configure tracking preferences and manage data

## Privacy

- All data is stored locally in your browser using the Chrome Storage API
- No data is sent to external servers
- You can export, import, or clear your data at any time
- Tracking can be disabled in settings

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- Zustand (state management)
- Chrome Extension APIs
- Lucide React (icons)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
