import type { ConnectorResult } from "../../../../types.ts";
import { GoogleClient } from "../client.ts";

export const calendarActions = {
  async listEvents(client: GoogleClient, calendarId: string = "primary", params?: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: "startTime" | "updated";
    pageToken?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getEvent(client: GoogleClient, calendarId: string, eventId: string): Promise<ConnectorResult> {
    try {
      const event = await client.get<any>(`/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`);
      return { success: true, data: event };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createEvent(client: GoogleClient, calendarId: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const event = await client.post<any>(`/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, data);
      return { success: true, data: event };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateEvent(client: GoogleClient, calendarId: string, eventId: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const event = await client.put<any>(`/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, data);
      return { success: true, data: event };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async patchEvent(client: GoogleClient, calendarId: string, eventId: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const event = await client.patch<any>(`/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, data);
      return { success: true, data: event };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteEvent(client: GoogleClient, calendarId: string, eventId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`);
      return { success: true, data: { deleted: true, eventId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listCalendars(client: GoogleClient): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/calendar/v3/users/me/calendarList");
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getCalendar(client: GoogleClient, calendarId: string): Promise<ConnectorResult> {
    try {
      const calendar = await client.get<any>(`/calendar/v3/calendars/${encodeURIComponent(calendarId)}`);
      return { success: true, data: calendar };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createCalendar(client: GoogleClient, data: { summary: string; timeZone?: string; description?: string }): Promise<ConnectorResult> {
    try {
      const calendar = await client.post<any>("/calendar/v3/calendars", data);
      return { success: true, data: calendar };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default calendarActions;