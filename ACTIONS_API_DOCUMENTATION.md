# Actions API Documentation

This document provides comprehensive API endpoint information for implementing the Actions (Task Documents) feature.

## Machine Users

### Get Machine Users

**Endpoint:** `GET api/machines/{machine_id}/users`

Receives a list of users that has access to the machine.

**Parameters:**

- `machine_id` - ID of the machine an action is being created for

---

## User Machines

### Get User Machines

**Endpoint:** `GET api/accounts/{user_id}/machines?filter=ClientId:{client_id}`

Receives a list of machines for a user filtered by client.

**Parameters:**

- `user_id` - ID of the current user
- `client_id` - ID of the client the active machine belongs to

---

## Labels

### Get Client Labels

**Endpoint:** `GET api/clients/{client_id}/tasklabels`

Receives a list of labels that already exist for the client and can be used for action tagging.

**Parameters:**

- `client_id` - ID of the client the active machine belongs to

### Create Client Label

**Endpoint:** `POST api/clients/{client_id}/tasklabels`

Creates a new label for tagging actions for a specific client.

**Parameters:**

- `client_id` - ID of the client the active machine belongs to

---

## Action Types and Categories

### Get Action Types

**Endpoint:** `GET api/taskdocuments/types`

Receives a list of available action types.

**Response:**

- Each type has a `UIJson` field in response that describes UI structure in JSON format

### Get Action Categories

**Endpoint:** `GET api/taskdocuments/categories?documentType={action_type}`

Receives a list of categories supported by a specific action type.

**Parameters:**

- `action_type` - The action type to get categories for

---

## Action Statuses

### Get Action Statuses

**Endpoint:** `GET api/taskdocuments/statuses`

Receives a list of statuses that actions support.

---

## Teams

### Get Client Teams

**Endpoint:** `GET api/clients/{client_id}/teams`

Receives a list of teams for a client that can be used for easier action assignment.

**Parameters:**

- `client_id` - ID of the client

### Create Client Team

**Endpoint:** `POST api/clients/{client_id}/teams`

Creates a new team, so it can be used for easier user assignment to actions.

**Parameters:**

- `client_id` - ID of the client

---

## Media Upload

### Upload Action Media

**Endpoint:** `POST api/media/Task`

Uploads a file for actions. Uploaded file details are provided in the response.

---

## Action Management

### Get Action Details

**Endpoint:** `GET api/taskdocuments/{action_id}`

Receives details for a specific action.

**Parameters:**

- `action_id` - ID of the action

### Update Action

**Endpoint:** `PUT api/taskdocuments/{id}`

Updates a selected action.

**Parameters:**

- `id` - ID of the action to update

---

## Action Statistics

### Get Machine Action Statistics

**Endpoint:** `GET api/machines/{id}/taskdocumentstats?start={start}&end={end}&dateType={dateType}&intervalBase={intervalBase}`

Receives action statistics for a time frame range.

**Parameters:**

- `id` - Machine ID
- `start` - Start date/time
- `end` - End date/time
- `dateType` - Type of date filtering
- `intervalBase` - Base interval for statistics

---

## Action Queries

### Get Machine Actions

**Endpoint:** `GET api/machines/{machine_id}/taskdocuments`

Receives a list of actions for the machine within a defined time frame.

**Query Parameters:**

- `start` - Start date/time
- `end` - End date/time
- `intervalBase` - Interval base (e.g., "day")
- `pageSize` - Number of results per page (e.g., 10)
- `pageNumber` - Page number (e.g., 1)
- `orderBy` - Order by field (e.g., "CreatedDate")
- `ascending` - Sort order (true/false)
- `dateType` - Date type (e.g., "calendar")
- `filter` - Filters to apply

**Filter Examples:**

```
filter=Status:Open;IsActive:true
```

**Important Note on IsActive Filter:**
The `IsActive` filter works differently from normal filters. When set to `true`, the API also returns ALL active actions even if they are out of the datetime range.

**Example:**

```
GET api/machines/{machine_id}/taskdocuments?start={start_datetime}&end={end_datetime}&intervalBase=day&pageSize=10&pageNumber=1&orderBy=CreatedDate&ascending=false&dateType=calendar&filter=Status:Open;IsActive:true
```

---

## Create Action

### Create Machine Action

**Endpoint:** `POST api/machines/{machine_id}/taskdocuments`

Creates a new action for an active machine.

**Parameters:**

- `machine_id` - ID of the machine

**Payload Example:**

```json
{
  "Name": "AR_2025",
  "TypeId": 15,
  "IsActive": true,
  "StatusId": 1,
  "CategoryId": 1,
  "Details": "AR_TEST",
  "LabelIds": [],
  "MediaIds": [],
  "ShiftId": 2172,
  "ThingIds": [707],
  "UserIds": [5],
  "CreatedDate": "2025-12-23T09:34:00",
  "HasEmailNotifications": false
}
```

### Payload Field Descriptions

| Field                   | Type     | Description                                                                                                                                                                   |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Name`                  | string   | Name of the action                                                                                                                                                            |
| `TypeId`                | number   | ID of the action type (from `/taskdocuments/types`)                                                                                                                           |
| `IsActive`              | boolean  | **"Show on Next Shift" flag** - When set to `true`, the action should be always visible in next shifts until the Status is changed to "Close"                                 |
| `StatusId`              | number   | ID of the action status (from `/taskdocuments/statuses`)                                                                                                                      |
| `CategoryId`            | number   | ID of the action category (from `/taskdocuments/categories`)                                                                                                                  |
| `Details`               | string   | Detailed description of the action                                                                                                                                            |
| `LabelIds`              | number[] | Array of label IDs for tagging (from `/clients/{client_id}/tasklabels`)                                                                                                       |
| `MediaIds`              | number[] | Array of uploaded file IDs (from `POST /media/Task`)                                                                                                                          |
| `ShiftId`               | number   | ID of the shift this action is associated with                                                                                                                                |
| `ThingIds`              | number[] | Array of machine/thing IDs this action applies to                                                                                                                             |
| `UserIds`               | number[] | Array of user IDs assigned to this action. **Note:** If a team is selected in the UI, extract the list of user IDs from the team and add them to this array                   |
| `CreatedDate`           | string   | ISO 8601 date/time when the action was created                                                                                                                                |
| `HasEmailNotifications` | boolean  | **"Send Email Notifications" flag** - When set to `true`, all users that own the item or are mentioned (using @ symbol) in the item text will receive notifications via email |

---

## Implementation Notes

1. **Teams vs Individual Users:** When creating an action, if a team is selected in the UI, you need to expand the team into individual user IDs and populate the `UserIds` array.

2. **IsActive Behavior:** The `IsActive` flag (Show on Next Shift) has special behavior:
   - When `true`, the action remains visible in subsequent shifts
   - Action stays visible until the status is changed to "Close"
   - When querying actions with `IsActive:true` filter, ALL active actions are returned regardless of date range

3. **Email Notifications:** The `HasEmailNotifications` flag triggers email notifications to:
   - Users who own the action
   - Users mentioned with @ symbol in the action details/text

4. **Media Upload Flow:**
   1. First upload files using `POST api/media/Task`
   2. Extract media IDs from the upload response
   3. Include these IDs in the `MediaIds` array when creating/updating actions

5. **Dynamic UI Structure:** Action types include a `UIJson` field that defines the UI structure dynamically. This should be used to render appropriate forms for different action types.

---

## Related Services

The following service files in the application handle these API endpoints:

- `src/services/actionService.ts` - Main action/task document operations
- `src/services/machineUserService.ts` - Machine user management
- `src/services/mediaService.ts` - Media upload handling
- `src/services/actionTemplateService.ts` - Action templates and types

---

_Last Updated: December 23, 2025_
