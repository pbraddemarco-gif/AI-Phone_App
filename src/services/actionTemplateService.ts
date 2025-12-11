import { authApiClient } from './apiClient';

export interface ActionTemplateField {
  Default: string;
  Display: string;
  DisplayName: string;
  FieldName: string;
  Mandatory: string;
  Modify: string;
  Name: string;
  Order: number;
  UIGroup: string;
}

export interface ActionTemplateRaw {
  Id: number;
  Name: string;
  DisplayName: string;
  Description?: string | null;
  UIJson: string;
}

export interface ParsedActionTemplate extends ActionTemplateRaw {
  fields: ActionTemplateField[];
}

export interface ActionTemplateSummary {
  Id: number;
  Name: string;
  DisplayName: string;
  Description?: string | null;
}

export interface ActionCategory {
  Id: number;
  Name: string;
  DisplayName: string;
  Description?: string | null;
}

const TEMPLATE_ENDPOINT = '/taskdocuments/types';

function parseFieldsFromUIJson(raw: string): ActionTemplateField[] {
  try {
    const parsed = JSON.parse(raw);
    const firstKey = Object.keys(parsed)[0];
    if (!firstKey) return [];
    const arr = parsed[firstKey];
    if (Array.isArray(arr)) {
      return arr.map((f) => ({ ...f }));
    }
    return [];
  } catch (err) {
    console.error('Failed to parse UIJson', err);
    return [];
  }
}

export async function fetchActionTemplates(): Promise<ParsedActionTemplate[]> {
  const response = await authApiClient.get<ActionTemplateRaw[]>(TEMPLATE_ENDPOINT);
  const data = response.data || [];
  return data.map((item) => ({
    ...item,
    fields: parseFieldsFromUIJson(item.UIJson),
  }));
}

export async function fetchActionTemplateSummaries(): Promise<ActionTemplateSummary[]> {
  const response = await authApiClient.get<ActionTemplateRaw[]>(TEMPLATE_ENDPOINT);
  const data = response.data || [];
  return data.map((item) => ({
    Id: item.Id,
    Name: item.Name,
    DisplayName: item.DisplayName,
    Description: item.Description,
  }));
}

export async function fetchActionTemplateDetails(id: number): Promise<ParsedActionTemplate | null> {
  const response = await authApiClient.get<ActionTemplateRaw[]>(TEMPLATE_ENDPOINT);
  const data = response.data || [];
  const match = data.find((item) => item.Id === id);
  if (!match) return null;
  return {
    ...match,
    fields: parseFieldsFromUIJson(match.UIJson),
  };
}

export async function fetchActionCategories(documentType: string): Promise<ActionCategory[]> {
  const response = await authApiClient.get<ActionCategory[]>(
    `/taskdocuments/categories?documentType=${encodeURIComponent(documentType)}`
  );
  return response.data || [];
}
