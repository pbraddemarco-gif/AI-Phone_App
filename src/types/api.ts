// Machine Types
export interface MachineStatus {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'down' | 'offline';
  currentProduct?: string;
  currentShift?: string;
}

export interface MachinePerformance {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  goodParts: number;
  totalParts: number;
  scrap: number;
  downtime: number;
  runtime: number;
  goal: number;
}

// Production History Types
export interface ProductionDataPoint {
  timestamp: string;
  hour: number;
  goodParts: number;
  scrap: number;
  downtime: number;
  goal: number;
  status: string;
  manualDowntime?: number;
  changeover?: number;
}

export interface ProductionHistoryResponse {
  data: ProductionDataPoint[];
  totalRecords: number;
  pageSize: number;
  pageNumber: number;
}

// Shift Types
export interface ShiftSchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isCurrentShift: boolean;
}

export interface ShiftConfig {
  currentShift: ShiftSchedule | null;
  lastShift: ShiftSchedule | null;
  schedules: ShiftSchedule[];
}

// Notification/Alert Types
export interface Notification {
  id: string;
  type: 'alert' | 'warning' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationStats {
  unreadCount: number;
  total: number;
}

// API Request Parameters
export interface DateRangeParams {
  start: string;
  end: string;
  dateType?: 'local' | 'utc';
  intervalBase?: 'hour' | 'day' | 'week' | 'month';
}

export interface PaginationParams {
  pageSize?: number;
  pageNumber?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface ProductionHistoryParams extends DateRangeParams, PaginationParams {
  modes?: string[];
  timeBase?: 'hour' | 'shift' | 'day';
  groupBy?: string;
  filter?: string;
  dims?: string[];
}

// Time Range Selection
export type TimeRangeType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface TimeRangeOption {
  type: TimeRangeType;
  label: string;
  hours?: number;
}
