import type { ConnectorResult } from "../../../../types.ts";
import { MicrosoftClient } from "../client.ts";

export const calendarActions = {
  async listEvents(client: MicrosoftClient, params?: {
    $top?: number;
    $skip?: number;
    $filter?: string;
    $orderby?: string;
    $select?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/me/events", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getEvent(client: MicrosoftClient, id: string): Promise<ConnectorResult> {
    try {
      const event = await client.get<any>(`/me/events/${id}`);
      return { success: true, data: event };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createEvent(client: MicrosoftClient, event: {
    subject: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: { displayName: string };
    attendees?: Array<{ emailAddress: { address: string; name?: string }; type: "required" | "optional" }>;
    body?: { contentType: "text" | "html"; content: string };
    isOnlineMeeting?: boolean;
    onlineMeetingProvider?: "teamsForBusiness";
  }): Promise<ConnectorResult> {
    try {
      const created = await client.post<any>("/me/events", event);
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateEvent(client: MicrosoftClient, id: string, event: Partial<{
    subject: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location: { displayName: string };
    attendees: Array<{ emailAddress: { address: string; name?: string }; type: "required" | "optional" }>;
    body: { contentType: "text" | "html"; content: string };
  }>): Promise<ConnectorResult> {
    try {
      const updated = await client.patch<any>(`/me/events/${id}`, event);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteEvent(client: MicrosoftClient, id: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/me/events/${id}`);
      return { success: true, data: { deleted: true, eventId: id } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listCalendars(client: MicrosoftClient): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/me/calendars");
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getCalendar(client: MicrosoftClient, calendarId: string): Promise<ConnectorResult> {
    try {
      const calendar = await client.get<any>(`/me/calendars/${calendarId}`);
      return { success: true, data: calendar };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createCalendar(client: MicrosoftClient, name: string, color?: { theme: string }): Promise<ConnectorResult> {
    try {
      const calendar = await client.post<any>("/me/calendars", { name, color });
      return { success: true, data: calendar };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getSchedule(client: MicrosoftClient, schedules: string[], startTime: string, endTime: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/me/calendar/getSchedule", {
        schedules,
        startTime: { dateTime: startTime, timeZone: "UTC" },
        endTime: { dateTime: endTime, timeZone: "UTC" },
        availabilityViewInterval: 30,
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default calendarActions;