import type { ConnectorResult } from "../../../../types.ts";
import { GoogleClient } from "../client.ts";

export const sheetsActions = {
  async getSpreadsheet(client: GoogleClient, spreadsheetId: string, params?: {
    ranges?: string;
    includeGridData?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const spreadsheet = await client.get<any>(`/sheets/v4/spreadsheets/${spreadsheetId}`, params);
      return { success: true, data: spreadsheet };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getValues(client: GoogleClient, spreadsheetId: string, range: string, params?: {
    majorDimension?: "ROWS" | "COLUMNS";
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateValues(client: GoogleClient, spreadsheetId: string, range: string, data: {
    values: unknown[][];
    majorDimension?: "ROWS" | "COLUMNS";
  }, valueInputOption: "RAW" | "USER_ENTERED" = "USER_ENTERED"): Promise<ConnectorResult> {
    try {
      const result = await client.put<any>(
        `/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        data,
        { valueInputOption }
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async appendValues(client: GoogleClient, spreadsheetId: string, range: string, data: {
    values: unknown[][];
    majorDimension?: "ROWS" | "COLUMNS";
  }, options?: {
    valueInputOption?: "RAW" | "USER_ENTERED";
    insertDataOption?: "OVERWRITE" | "INSERT_ROWS";
  }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(
        `/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
        data,
        options
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async clearValues(client: GoogleClient, spreadsheetId: string, range: string): Promise<ConnectorResult> {
    try {
      await client.post<any>(`/sheets/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {});
      return { success: true, data: { cleared: true, range } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async batchGetValues(client: GoogleClient, spreadsheetId: string, ranges: string[], params?: {
    majorDimension?: "ROWS" | "COLUMNS";
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(
        `/sheets/v4/spreadsheets/${spreadsheetId}/values:batchGet`,
        { ranges: ranges.join(","), ...params }
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async batchUpdateValues(client: GoogleClient, spreadsheetId: string, data: {
    valueInputOption: "RAW" | "USER_ENTERED";
    data: Array<{
      range: string;
      majorDimension?: "ROWS" | "COLUMNS";
      values: unknown[][];
    }>;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(
        `/sheets/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        data
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createSpreadsheet(client: GoogleClient, data: {
    properties?: { title: string; locale?: string; timeZone?: string };
    sheets?: Array<{ properties: { title: string; gridProperties?: { rowCount?: number; columnCount?: number } } }>;
  }): Promise<ConnectorResult> {
    try {
      const spreadsheet = await client.post<any>("/sheets/v4/spreadsheets", data);
      return { success: true, data: spreadsheet };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default sheetsActions;