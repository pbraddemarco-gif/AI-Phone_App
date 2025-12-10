/**
 * Production Order Types
 */

export interface ProductionOrder {
  ProductionOrderTypeId: number;
  ProductionOrderStatusId: number;
  Created: string;
  Scheduled: string;
  Ended: string;
  LastUpdated: string;
  Id: number;
  MachineId: number;
  ShiftScheduleId: number;
  ProductionOrderId: string;
  Status: string;
  ExternalStatus: string;
  Volume: number;
  ActualQuantity: number;
}

export interface ProductionOrdersResponse {
  Ascending: boolean;
  OrderBy: string;
  TotalItems: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  Items: ProductionOrder[];
}
