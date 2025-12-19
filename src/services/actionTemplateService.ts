import { authApiClient } from './apiClient';
import { getCurrentUsername } from './tokenStorage';
import { getDevToken } from './tokenStorage';
import axios from 'axios';

const DEV_API_BASE_URL = 'https://dev1.automationintellect.com/api';

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
    if (__DEV__) console.debug('Failed to parse UIJson', err);
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

/**
 * Submit action data
 * For testuserapp, this uses the dev token and posts to dev server
 * For other users, this uses the normal token and production server
 */
export async function submitAction(
  machineId: number,
  templateId: number,
  formData: Record<string, any>
): Promise<{ success: boolean; message?: string }> {
  try {
    const username = await getCurrentUsername();
    const isTestUser = username?.toLowerCase().includes('testuserapp');

    if (isTestUser) {
      // Use dev token and dev server for testuserapp
      const devToken = await getDevToken();
      if (!devToken) {
        throw new Error('Dev token not available for testuserapp');
      }

      const response = await axios.post(
        `${DEV_API_BASE_URL}/taskdocuments`,
        {
          MachineId: machineId,
          DocumentTypeId: templateId,
          ...formData,
        },
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (__DEV__) {
        console.debug('✅ Action submitted to dev server:', response.data);
      }

      return { success: true, message: 'Action saved to development server' };
    } else {
      // Use normal token and production server for regular users
      const response = await authApiClient.post('/taskdocuments', {
        MachineId: machineId,
        DocumentTypeId: templateId,
        ...formData,
      });

      if (__DEV__) {
        console.debug('✅ Action submitted to production server:', response.data);
      }

      return { success: true, message: 'Action saved successfully' };
    }
  } catch (error) {
    if (__DEV__) {
      console.debug('❌ Failed to submit action:', error);
    }

    let message = 'Failed to save action';
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.message || error.message || message;
    }

    return { success: false, message };
  }
}
