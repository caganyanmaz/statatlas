# StatAtlas

A modern, interactive data visualization website for exploring country statistics with beautiful, flexible charts and maps.

## Features
- Multiple chart types (bubble, bar, etc.)
- Modular, extendable component structure
- Static JSON datasets for fast prototyping
- Built with Next.js, TypeScript, and Tailwind CSS

## Project Structure
```
/src
  /components    # UI components (Dropdown, ChartRenderer, etc.)
  /data          # Static datasets and metadata
  /hooks         # Custom React hooks
  /pages         # Next.js pages
  /styles        # Tailwind CSS
  /utils         # Helper functions
```

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) to view the app.

## Next Steps
- Implement real chart rendering (D3.js, Recharts, etc.)
- Add more datasets and filters
- Connect to a backend or database if needed

---

Inspired by Gapminder, Our World in Data, and other great data viz projects.
