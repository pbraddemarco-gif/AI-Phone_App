# Customer Selection Implementation

## Overview

Implemented a customer selection system that allows users to select and switch between multiple customer accounts (companies and plants) extracted from their JWT authentication token.

## Features

### 1. Initial Customer Selection

- After login, users are directed to the CustomerSelectorScreen
- Displays all available customer accounts from JWT token
- Auto-selects if user has access to only one customer account
- Selected customer is saved to AsyncStorage for persistence

### 2. Customer Switching

- Dropdown button in MachineListScreen header (only shown if user has multiple customers)
- Shows current customer: "CompanyName - PlantName ▼"
- Tap to open modal with all available customers
- Selected customer is highlighted with checkmark
- Switching customer:
  - Saves new selection to AsyncStorage
  - Refreshes machine list
  - Reloads machine statuses

## Implementation Details

### Files Created/Modified

#### New Files

1. **src/services/tokenParser.ts**
   - `decodeJwtToken()` - Decodes JWT payload using base64
   - `extractCustomerAccounts()` - Extracts array of {Id, Name, DisplayName}
   - `getCustomerById()` - Find customer by ID
   - `isTokenExpired()` - Check token expiration

2. **src/services/customerStorage.ts**
   - `saveSelectedCustomer()` - Save to AsyncStorage
   - `getSelectedCustomer()` - Load from AsyncStorage
   - `clearSelectedCustomer()` - Clear selection
   - Storage key: `@selected_customer`

3. **src/screens/CustomerSelectorScreen.tsx**
   - Full screen component for initial customer selection
   - FlatList display of all available customers
   - Auto-selection logic for single customer
   - Navigation to MachineList after selection

#### Modified Files

1. **src/types/auth.ts**
   - Added `CustomerAccount` interface:
     ```typescript
     interface CustomerAccount {
       Id: number;
       Name: string; // Company name
       DisplayName: string; // Plant name
     }
     ```

2. **src/services/authService.ts**
   - Added `getCustomerAccounts()` method
   - Login method logs customer accounts from token

3. **src/types/navigation.ts**
   - Added `CustomerSelector: undefined` to RootStackParamList

4. **src/navigation/RootNavigator.tsx**
   - Added CustomerSelector screen before MachineList
   - Changed initialRouteName to 'CustomerSelector'

5. **src/screens/MachineListScreen.tsx**
   - Added customer dropdown button in header
   - Modal for customer selection
   - State management for selected and available customers
   - Auto-loads customer data on mount
   - Refreshes machine list when customer changes

## User Flow

1. **Login** → User enters credentials
2. **JWT Token Parsing** → Extract customer accounts from token
3. **Customer Selection** →
   - If 1 customer: Auto-select and navigate to MachineList
   - If multiple: Show selection screen
4. **Machine List** →
   - Displays machines for selected customer
   - Dropdown button shows current customer (if multiple available)
5. **Customer Switching** →
   - Tap dropdown button
   - Select different customer from modal
   - Machine list refreshes for new customer

## Data Structure

### JWT Token Claims

The JWT token contains a `CustomerAccounts` claim with an array:

```json
[
  {
    "Id": 123,
    "Name": "Company Name",
    "DisplayName": "Plant Name"
  }
]
```

### AsyncStorage

Selected customer is stored as JSON:

```
Key: "@selected_customer"
Value: {"Id":123,"Name":"Company Name","DisplayName":"Plant Name"}
```

## UI Components

### Customer Selector Screen

- Title: "Select Customer / Plant"
- List of customers with company and plant names
- Selected customer highlighted
- Navigation to MachineList on selection

### Machine List Screen Dropdown

- Button location: Top right header area
- Button text: "CompanyName - PlantName ▼"
- Button style: Light blue background with blue border
- Modal: Centered overlay with customer list
- Selection: Shows checkmark for current customer

## Styling

### Customer Button

- Background: `#DBEAFE` (light blue)
- Border: `#3B82F6` (blue)
- Text color: `#1D4ED8` (dark blue)
- Border radius: 16px
- Font size: 12px (compact for header)

### Modal

- Overlay: Semi-transparent black (50% opacity)
- Content: White card with rounded corners
- Width: 80% of screen
- Max height: 70% of screen
- Shadow and elevation for depth

### Customer List Items

- Default: Light gray background `#F9FAFB`
- Selected: Light blue `#DBEAFE` with blue border
- Checkmark: Blue `#3B82F6`
- Text: Dark gray `#374151`

## Testing Checklist

- [ ] Login with single customer account → Auto-selects and navigates to MachineList
- [ ] Login with multiple customer accounts → Shows CustomerSelectorScreen
- [ ] Select customer → Saves to AsyncStorage and navigates to MachineList
- [ ] Machine list shows dropdown button (only if multiple customers)
- [ ] Dropdown button displays current customer
- [ ] Tap dropdown → Modal appears with customer list
- [ ] Current customer is highlighted in modal
- [ ] Select different customer → Modal closes, machine list refreshes
- [ ] App restart → Selected customer persists from AsyncStorage
- [ ] Customer data loads correctly on mount

## Future Enhancements

- Filter machine list by selected customer ID
- Add customer logo/icon to selector
- Add "Remember selection" toggle
- Add search/filter for large customer lists
- Add customer switching animation
- Persist customer selection per login session
- Add customer info to analytics/logging
