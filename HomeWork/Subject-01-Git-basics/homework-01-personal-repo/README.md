# Calendar Events API

A calendar events management system built with NestJS and TypeORM, backed by PostgreSQL.  
This API lets you create, update, delete, list, search, and detect conflicts for calendar events. It is designed to be simple, extensible, and production-ready with sensible defaults.

## Features
- Create, read, update, delete (CRUD) operations for events
- Search events by keyword (case-insensitive)
- List events by range: day, week, or month
- Detect overlapping/conflicting events for a given day
- Input validation and clear error responses
- Timezone-aware ISO date handling (expects ISO 8601 dates)
- Easily configurable PostgreSQL connection (env or ormconfig.json)
- Ready for local development and production builds

## Project setup (Prerequisites)
- Node.js 16+ (recommended: 18+)
- npm or yarn
- PostgreSQL 12+ (or compatible)
- (Optional) Docker & docker-compose to run Postgres quickly

## Environment
You can provide DB connection options in an `ormconfig.json` file or via environment variables. Example `.env`:

```bash
# .env
NODE_ENV=development
PORT=3000

DATABASE_HOST=#HOST_DB
DATABASE_PORT=#PORT_DB
DATABASE_USER=postgres
DATABASE_PASSWORD=#PASSWORD_DB
DATABASE_NAME=calendar_db
```

If you use TypeOrmModule configuration in code, make sure it reads the same environment variables or adjust accordingly.

## Installation

```bash
# Install dependencies
npm install
# or
yarn install
```

## Running the project

```bash
# development
npm run start

# watch mode (auto-restart on file changes)
npm run start:dev

# build for production
npm run build
npm run start:prod
```

Common npm scripts (check package.json):
- `start` — run compiled app
- `start:dev` — run in development with hot-reload
- `build` — compile TypeScript
- `test` / `test:watch` — run unit tests (if configured)

## Database

- Create a PostgreSQL database and supply credentials via `.env` or `ormconfig.json`.
- If you want to run Postgres with Docker quickly:

```bash
docker run --name calendar-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=calendar_db -p 5432:5432 -d postgres:14
```

- Run migrations or let TypeORM synchronize (only recommended for development):
  - Synchronize option: set `synchronize: true` in TypeORM config (development only).
  - For production, use migrations and proper backup practices.

## API Overview

All endpoints send/receive JSON.

Base path: `/events`

Common data model (Event)
- id: string | number (auto-generated)
- title: string (required)
- description: string (optional)
- start: ISO 8601 datetime or date string (required)
- end: ISO 8601 datetime or date string (required)
- createdAt, updatedAt (managed by server)

Validation rules
- `start` must be before `end`
- Dates must be ISO format (e.g., `2026-02-22` or `2026-02-22T09:00:00Z`)
- All requests and responses are JSON

### 1) Add Event
- Method: POST
- URL: /events
- Body example:

```json
{
  "title": "Team Meeting",
  "description": "Weekly sync",
  "start": "2026-03-01T09:00:00Z",
  "end": "2026-03-01T10:00:00Z"
}
```

curl:
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"title":"Team Meeting","start":"2026-03-01T09:00:00Z","end":"2026-03-01T10:00:00Z"}'
```

### 2) Update Event
- Method: PUT
- URL: /events/:id
- Body: include only fields to update (title, description, start, end)

Example:
```bash
PUT /events/123
{ "title": "Updated Meeting" }
```

### 3) Remove Event
- Method: DELETE
- URL: /events/:id
(or if your API supports deletion by date range:)
- DELETE /events?start=<ISO-date>

Example:
```bash
curl -X DELETE http://localhost:3000/events/123
```

### 4) List Events
- Method: GET
- URL: /events?range=<day|week|month>&date=<YYYY-MM-DD>&month=<YYYY-MM>
- Parameters:
  - `range` — required: `day`, `week`, or `month`
  - `date` — required when `range=day` or `week`; format `YYYY-MM-DD`
  - `month` — required when `range=month`; format `YYYY-MM`
  - Optional pagination params (if implemented): `page`, `limit`

Examples:
- Day: `/events?range=day&date=2026-03-01`
- Week: `/events?range=week&date=2026-03-01`
- Month: `/events?range=month&month=2026-03`

### 5) Search Events
- Method: GET
- URL: /events/search?q=<keyword>
- Example: `/events/search?q=meeting`  
Search is case-insensitive and matches title and description.

### 6) Conflicts (Overlapping Events)
- Method: GET
- URL: /events/conflict?date=<YYYY-MM-DD>
- Returns groups of events that overlap on the given day.

Example response:
```json
[
  {
    "groupId": 1,
    "events": [
      { "id": 12, "title": "A", "start":"2026-03-01T09:00:00Z", "end":"2026-03-01T10:00:00Z" },
      { "id": 13, "title": "B", "start":"2026-03-01T09:30:00Z", "end":"2026-03-01T11:00:00Z" }
    ]
  }
]
```

## Error handling
- The API returns standard HTTP status codes (400 for bad requests, 404 for not found, 500 for server errors).
- Validation errors include a descriptive message about which field failed.

## Testing
- If tests exist in the repo:
```bash
npm run test
npm run test:e2e
```
- For manual testing, use tools like Postman, Insomnia, or curl.

## Contributing
Contributions are welcome. Suggested workflow:
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and add tests
4. Open a pull request describing the change

Please ensure code follows repository linting and formatting rules (e.g., Prettier / ESLint) if configured.

## Deployment notes
- Use environment variables for DB credentials and port.
- Do not enable TypeORM `synchronize: true` in production.
- Use migrations and a managed Postgres instance or a hosted DB (RDS, Heroku Postgres, DigitalOcean DB, etc.)

## License
Suggested: MIT License

```
MIT License

Copyright (c) 2026 <https://github.com/ebrahimnezhadali8-gif>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights...
```

## Acknowledgements
- Built with NestJS and TypeORM
- PostgreSQL for persistence
- Inspired by common calendar app patterns

## Contact
If you have questions, open an issue or contact the repository owner.

