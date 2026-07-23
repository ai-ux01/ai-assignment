# Support Ticket Management System - Frontend

A modern, full-featured Next.js frontend for the Support Ticket Management System.

## Features

✨ **Dashboard**
- Real-time statistics (total, open, in progress, resolved, closed tickets)
- Advanced filtering by status and priority
- Full-text search across tickets
- Responsive grid layout with beautiful cards

🎫 **Ticket Management**
- Create new tickets with validation
- View detailed ticket information
- Update ticket status (open → in progress → resolved → closed)
- Assign tickets to team members
- Add comments with author attribution

🎨 **User Experience**
- Modern gradient design with Tailwind CSS
- Smooth transitions and hover effects
- Responsive design for mobile/tablet/desktop
- Type-safe with TypeScript
- Real-time updates

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch API with type-safe wrappers

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:3000`

## Getting Started

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
The `.env.local` file is already configured to point to `http://localhost:3000/api/v1`

3. **Start development server**:
```bash
npm run dev
```

4. **Open in browser**:
Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout with fonts and metadata
│   ├── page.tsx             # Home page with ticket list
│   └── tickets/
│       └── [id]/
│           └── page.tsx     # Individual ticket detail page
├── components/
│   ├── TicketCard.tsx       # Ticket card component for list view
│   └── CreateTicketDialog.tsx # Modal for creating new tickets
├── lib/
│   ├── api.ts               # API client with all endpoints
│   └── utils.ts             # Utility functions (formatting, colors, etc.)
├── types/
│   └── ticket.ts            # TypeScript interfaces for tickets
└── public/                  # Static assets
```

## API Integration

The frontend integrates with all 9 REST API endpoints:

- `GET /api/v1/tickets` - List all tickets
- `GET /api/v1/tickets/:id` - Get ticket details
- `POST /api/v1/tickets` - Create new ticket
- `PATCH /api/v1/tickets/:id` - Update ticket
- `PATCH /api/v1/tickets/:id/assignee` - Assign ticket
- `PATCH /api/v1/tickets/:id/state` - Transition state
- `POST /api/v1/tickets/:id/comments` - Add comment
- `GET /api/v1/tickets/search` - Search tickets
- `GET /api/v1/tickets/filter` - Filter by status

## Available Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features Overview

### Dashboard
- Statistics cards showing ticket counts by status
- Search bar for full-text search
- Filter dropdowns for status and priority
- Create new ticket button
- Ticket cards with hover effects and status badges

### Ticket Details
- Complete ticket information display
- Status transition dropdown
- Assign ticket functionality
- Comment thread with timestamps
- Add new comments form
- Back navigation to dashboard

### Create Ticket
- Modal dialog with form validation
- Required fields: title, description, priority, reporter
- Optional fields: category
- Character limits matching API constraints
- Error handling and success feedback

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API base URL (default: http://localhost:3000/api/v1)

## Development Tips

1. **Hot Reload**: Changes to code automatically refresh the browser
2. **Type Safety**: TypeScript catches errors at compile time
3. **API Errors**: Check browser console for detailed error messages
4. **CORS**: Ensure backend has CORS enabled for http://localhost:3001

## Production Build

```bash
npm run build
npm run start
```

The optimized production build will be available at http://localhost:3000.

## Troubleshooting

**API connection errors**: 
- Ensure backend is running on port 3000
- Check CORS configuration in backend
- Verify `.env.local` has correct API_URL

**Port already in use**:
```bash
lsof -ti:3001 | xargs kill -9
```

**Build errors**:
```bash
rm -rf .next node_modules
npm install
npm run build
```

## License

ISC
