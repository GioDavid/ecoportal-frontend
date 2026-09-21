# ecoPortal Calendar — Technical Plan

## Technology choices

- React with TypeScript.

- Vite as the SPA build tool.

- MUI for accessible UI primitives and styling.

- Zustand for event state and localStorage persistence.

- date-fns for date calculations and formatting.

- Vitest and React Testing Library for unit and component tests.

- Playwright for the critical end-to-end workflow.

A calendar rendering library must not be used.

## Architectural principles

- Domain logic must not depend on React.

- Calendar calculations must be implemented as pure functions.

- Components must consume a normalized event model.

- State mutations must be performed through explicit actions.

- Data persistence must remain separate from calendar rendering.

- Feature components must not import the original JSON directly.

## Project structure

```text

src/

├── app/

│   └── theme.ts

├── components/

│   └── shared components

├── data/

│   └── events.json

├── domain/

│   ├── event.ts

│   ├── event-validation.ts

│   └── calendar.ts

├── features/

│   ├── calendar/

│   │   ├── MonthView.tsx

│   │   ├── WeekView.tsx

│   │   └── EventItem.tsx

│   └── events/

│       ├── EventDialog.tsx

│       └── DeleteEventDialog.tsx

├── store/

│   └── event-store.ts

├── test/

│   └── setup.ts

├── App.tsx

└── main.tsx