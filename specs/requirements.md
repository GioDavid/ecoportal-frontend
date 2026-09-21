# ecoPortal Calendar — Requirements

## Objective

Build a single-page calendar application using React and TypeScript.

The application must:

- Display events in a month view.

- Display events in a week view.

- Allow users to create events.

- Allow users to edit events.

- Allow users to delete events.

Calendar views must be implemented by us. A calendar UI framework such as

FullCalendar must not be used.

## Event model

```ts

interface CalendarEvent {

  id: string;

  type: string;

  name: string;

  startDate: string;

  endDate: string;

}