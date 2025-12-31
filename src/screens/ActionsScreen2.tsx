import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Switch,
  InteractionManager,
  Platform,
  BackHandler,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import {
  fetchActionTemplateSummaries,
  fetchActionTemplateDetails,
  ActionTemplateSummary,
  ParsedActionTemplate,
  ActionTemplateField,
  fetchActionCategories,
  ActionCategory,
} from '../services/actionTemplateService';
import {
  fetchActionStatuses,
  ActionStatus,
  fetchActionLabels,
  ActionLabel,
  saveAction,
  updateAction,
  fetchActionDetails,
  ActionPayload,
} from '../services/actionService';
import { uploadTaskMedia } from '../services/mediaService';
import { getCurrentUsername } from '../services/tokenStorage';
import { MachineInventoryItem } from '../services/machineInventoryService';
import { getUsersForMachine, MachineUser } from '../services/machineUserService';
import { getShiftSchedule } from '../services/shiftScheduleService';
import { getSelectedCustomer } from '../services/customerStorage';
import { saveActions2State, loadActions2State } from '../services/uiStateStorage';
import { CustomerAccount } from '../types/auth';

export type ActionsScreen2Props = NativeStackScreenProps<RootStackParamList, 'Actions2'>;

type UploadAttachment = {
  key: string;
  uri: string;
  name: string;
  type?: string | null;
  source: 'file' | 'camera' | 'gallery';
  uploading?: boolean;
  uploaded?: boolean;
  remoteUrl?: string;
  previewUrl?: string;
  mediaId?: number;
  error?: string;
};

type FormValue = string | number | boolean | UploadAttachment[];

// Field type helpers
function isBooleanField(field: ActionTemplateField): boolean {
  const defaultVal = (field.Default || '').toString().toLowerCase();
  if (defaultVal === 'true' || defaultVal === 'false') return true;
  return field.FieldName?.toLowerCase().startsWith('is');
}

function isStatusField(field: ActionTemplateField): boolean {
  return field.FieldName === 'StatusId';
}

function isCategoryField(field: ActionTemplateField): boolean {
  return field.FieldName === 'CategoryId';
}

function isTypeIdField(field: ActionTemplateField): boolean {
  return field.FieldName === 'TypeId';
}

function isCreatedByField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('created by') || fieldName.includes('createdby') || fieldName === 'userid'
  );
}

function isDateCreatedField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('date created') ||
    fieldName.includes('datecreated') ||
    fieldName === 'createddate' ||
    (display.includes('created') && display.includes('date'))
  );
}

function isDateDueField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('date due') ||
    display.includes('due date') ||
    fieldName.includes('duedate') ||
    fieldName === 'duedate' ||
    (display.includes('due') && display.includes('date'))
  );
}

function isMachinesField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('related to machines') ||
    display.includes('machine') ||
    fieldName.includes('thingids') ||
    fieldName === 'thingids'
  );
}

function isUsersField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('related to users') ||
    display.includes('related to accounts') ||
    (display.includes('users') && !display.includes('created by')) ||
    fieldName.includes('userids') ||
    fieldName === 'userids'
  );
}

function isShiftField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();

  // Exclude "Show on Next shift" - that's a boolean field
  if (display.includes('show on next shift') || fieldName.includes('showonnextshift')) {
    return false;
  }

  return (
    display.includes('related to shift') ||
    display === 'shift' ||
    display.endsWith(' shift') ||
    fieldName.includes('shiftid') ||
    fieldName === 'shiftid'
  );
}

function isLabelField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return display.includes('label') || fieldName.includes('labelids') || fieldName === 'labelids';
}

function isAssignedToField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('assigned to') ||
    display === 'assignee' ||
    fieldName.includes('assigneeid') ||
    fieldName === 'assigneeid'
  );
}

function isUploadFileField(field: ActionTemplateField): boolean {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('upload') ||
    display.includes('file') ||
    display.includes('attachment') ||
    fieldName.includes('mediaids') ||
    fieldName === 'mediaids'
  );
}

export default function ActionsScreen2({ navigation, route }: ActionsScreen2Props) {
  const theme = useAppTheme();

  // Template state
  const [templates, setTemplates] = useState<ActionTemplateSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ParsedActionTemplate | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Debug: Track template state changes
  useEffect(() => {
    console.log('🎯🎯🎯 selectedTemplate STATE CHANGED to:', selectedTemplate?.Name || 'null');
    if (selectedTemplate) {
      console.log('  Template ID:', selectedTemplate.Id);
      console.log('  Template fields count:', selectedTemplate.fields?.length);
    }
  }, [selectedTemplate]);

  // Debug: Track template state changes
  useEffect(() => {
    console.log('🎯🎯🎯 selectedTemplate changed to:', selectedTemplate?.Name || 'null');
    if (selectedTemplate) {
      console.log('  Template ID:', selectedTemplate.Id);
      console.log('  Template fields:', selectedTemplate.fields?.length);
    }
  }, [selectedTemplate]);

  // Template details loading
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<ActionCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Statuses state
  const [statuses, setStatuses] = useState<ActionStatus[]>([]);

  // Labels state
  const [labels, setLabels] = useState<ActionLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Record<string, FormValue>>({});
  const [actionName, setActionName] = useState<string>('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);

  // Machines state
  const [selectedMachines, setSelectedMachines] = useState<MachineInventoryItem[]>([]);

  // Users state
  const [selectedUsers, setSelectedUsers] = useState<MachineUser[]>([]);

  // Assigned users state (multiple users for "Assigned to" field)
  const [assignedUsers, setAssignedUsers] = useState<MachineUser[]>([]);

  // Shifts state
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsError, setShiftsError] = useState<string | null>(null);
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | undefined>(undefined);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<string | null>(null);

  // Ref to track if we've processed the params
  const processedParamsRef = useRef<string | null>(null);

  // Refs for scroll position preservation
  const scrollViewRef = useRef<ScrollView>(null);
  const savedScrollPosition = useRef<number>(0);
  const isReturningFromPicker = useRef<boolean>(false);
  const scrollRestoredRef = useRef<boolean>(false);
  const scrollRestoreAttemptsRef = useRef<number>(0);

  // Debug helper
  const logScroll = useCallback((msg: string, ...args: any[]) => {
    console.log(`🧭 [Scroll] ${msg}`, ...args);
  }, []);

  const restoreScrollIfNeeded = useCallback(() => {
    if (!isReturningFromPicker.current) {
      return;
    }
    const target = savedScrollPosition.current;
    logScroll(
      'Request to restore. targetY=%d, attempt=%d, restored=%s',
      target,
      scrollRestoreAttemptsRef.current,
      String(scrollRestoredRef.current)
    );
    InteractionManager.runAfterInteractions(() => {
      const attemptRestore = () => {
        if (!isReturningFromPicker.current) return;
        scrollRestoreAttemptsRef.current += 1;
        const attempt = scrollRestoreAttemptsRef.current;
        if (scrollViewRef.current) {
          logScroll('Attempt #%d scrollTo(y=%d)', attempt, target);
          try {
            scrollViewRef.current.scrollTo({ y: target, animated: false });
            scrollRestoredRef.current = true;
          } catch (e) {
            logScroll('scrollTo threw on attempt #%d: %o', attempt, e);
          }
        } else {
          logScroll('No scrollViewRef on attempt #%d', attempt);
        }
        // Retry a few times in case layout changes again
        if (attempt < 5 && isReturningFromPicker.current) {
          setTimeout(attemptRestore, 120);
        } else {
          // Done trying; clear flag
          isReturningFromPicker.current = false;
          logScroll('Restore done. attempts=%d, finalY=%d', attempt, target);
        }
      };
      // slight delay to let layout settle
      setTimeout(attemptRestore, 80);
    });
  }, [logScroll]);

  // Debug: Track component lifecycle
  useEffect(() => {
    console.log('🚀🚀🚀 ActionsScreen2 MOUNTED');
    return () => {
      console.log('💀💀💀 ActionsScreen2 UNMOUNTING');
    };
  }, []);

  // Override hardware back: if we came from ActionList, go back there; else MachineList
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const cameFromActionList = route.params?.fromActionList === true;
      if (__DEV__)
        console.debug(
          '🔙 Hardware back on Actions2 (fromActionList=%s)',
          String(cameFromActionList)
        );
      if (cameFromActionList) {
        navigation.navigate('ActionList');
      } else {
        navigation.navigate('MachineList');
      }
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [navigation, isEditMode]);

  // NOTE: Avoid preventing native removals; intercepting beforeRemove on native-stack can desync
  // native/JS state and trigger "screen removed natively" errors. Hardware back is handled above.

  // Debug: Track assigned users changes
  useEffect(() => {
    console.log(
      '👥 Assigned users changed:',
      assignedUsers.length > 0
        ? assignedUsers.map((u) => `${u.Name || u.Username} (ID: ${u.Id})`).join(', ')
        : 'none'
    );
  }, [assignedUsers]);

  // Load templates and customer on mount
  useEffect(() => {
    // Check if we're in edit mode
    if (route.params?.actionId && route.params?.actionData) {
      setIsEditMode(true);
      setEditingActionId(route.params.actionId);

      // First, populate with basic data from list
      const actionData = route.params.actionData;
      if (__DEV__) console.debug('📝 Edit mode: Loading action data', actionData);

      setActionName(actionData.Name || '');
      setFormData((prev) => ({
        ...prev,
        Details: actionData.Details || '',
        Description: actionData.Description || '',
        StatusId: actionData.StatusId,
        CategoryId: actionData.CategoryId,
        AssigneeId: actionData.AssigneeId,
        IsActive: actionData.IsActive !== false,
        ShiftId: actionData.ShiftId,
        LabelIds: actionData.LabelIds || [],
        DueDate: actionData.DueDate ? new Date(actionData.DueDate).toISOString() : '',
      }));

      // Set machine if available
      if (actionData.MachineId && actionData.MachineName) {
        setSelectedMachines([
          {
            MachineId: actionData.MachineId,
            MachineName: actionData.MachineName,
          } as MachineInventoryItem,
        ]);
      }

      // Fetch full action details from API to get all fields (TypeId, custom fields, etc.)
      fetchActionDetails(route.params.actionId)
        .then((fullData) => {
          if (fullData) {
            if (__DEV__) console.debug('📝 Loaded full action details from API:', fullData);

            setActionName(fullData.Name || '');

            // Merge API data, filtering to only include FormValue-compatible types
            const formDataUpdates: Record<string, FormValue> = {
              Details: fullData.Details || '',
              Description: fullData.Description || '',
              StatusId: fullData.StatusId || '',
              CategoryId: fullData.CategoryId || '',
              AssigneeId: fullData.AssigneeId || '',
              IsActive: fullData.IsActive !== false,
              ShiftId: fullData.ShiftId || '',
              DueDate: fullData.DueDate
                ? typeof fullData.DueDate === 'string'
                  ? fullData.DueDate
                  : new Date(fullData.DueDate).toISOString()
                : '',
              Priority: fullData.Priority || '',
              UserId: fullData.UserId || '',
              CreatedDate: fullData.CreatedDate || '',
              TypeId: fullData.TypeId,
              MinutesLost: fullData.MinutesLost || '',
              HasEmailNotifications: fullData.HasEmailNotifications || false,
              CustomData1: fullData.CustomData1 || '',
              CustomData2: fullData.CustomData2 || '',
              CustomData3: fullData.CustomData3 || '',
              CustomData4: fullData.CustomData4 || '',
              CustomData5: fullData.CustomData5 || '',
              CustomData6: fullData.CustomData6 || '',
              CustomData7: fullData.CustomData7 || '',
              CustomData8: fullData.CustomData8 || '',
              CustomData9: fullData.CustomData9 || '',
              CustomData10: fullData.CustomData10 || '',
            };

            setFormData((prev) => ({
              ...prev,
              ...formDataUpdates,
            }));
          }
        })
        .catch(() => {
          if (__DEV__) console.debug('⚠️ Failed to load full action details');
          // Continue with partial data from list
        });
    }

    // Try to restore any saved state snapshot before loading data
    const snap = loadActions2State();
    if (snap && !isEditMode) {
      setFormData(snap.formData || {});
      setActionName(snap.actionName || '');
      setSelectedUsers(snap.selectedUsers || []);
      setAssignedUsers(snap.assignedUser ? [snap.assignedUser] : []);
      if (__DEV__) console.debug('♻️ Restored Actions2 state snapshot on mount');
    }
    loadTemplates();
    loadStatuses();
    loadCustomerAndMachines();
  }, []);

  // Load labels when customer is available
  useEffect(() => {
    // Use ParentId (client ID) not Id (plant ID) - e.g., ParentId=29, Id=500
    if (selectedCustomer?.ParentId) {
      loadLabels(selectedCustomer.ParentId);
    }
  }, [selectedCustomer]);

  // Load template when in edit mode and templates are available
  useEffect(() => {
    if (isEditMode && route.params?.actionData && templates.length > 0 && !selectedTemplate) {
      const actionData = route.params.actionData;
      const templateId = actionData.Type?.Id || actionData.TypeId;

      if (templateId) {
        const template = templates.find((t) => t.Id === templateId);
        if (template) {
          if (__DEV__) console.debug('📝 Auto-selecting template for edit mode:', template.Name);
          handleSelectTemplate(template, true);
        }
      }
    }
  }, [isEditMode, templates, selectedTemplate, route.params?.actionData]);

  // Load assigned user and related users when in edit mode and machine is available
  useEffect(() => {
    const loadUsersForEdit = async () => {
      if (!isEditMode || !route.params?.actionData) return;

      const actionData = route.params.actionData;
      const assigneeId = actionData.AssigneeId;
      const createdByUserId = actionData.UserId || actionData.PrimaryUserId;
      const relatedUserIds = actionData.UserIds || [];
      const machineId = actionData.MachineId || selectedMachines[0]?.MachineId;

      if (machineId && (assigneeId || createdByUserId || relatedUserIds.length > 0)) {
        try {
          const users = await getUsersForMachine(machineId);

          // Set assigned user if available
          if (assigneeId && assignedUsers.length === 0) {
            const assignedUser = users?.find((u) => u.Id === assigneeId);
            if (assignedUser) {
              if (__DEV__) console.debug('📝 Loaded assigned user:', assignedUser);
              setAssignedUsers([assignedUser]);
            }
          }

          // Set related users if available
          if (relatedUserIds.length > 0 && selectedUsers.length === 0) {
            const relatedUsers = relatedUserIds
              .map((userId: number) => users?.find((u) => u.Id === userId))
              .filter(Boolean);
            if (relatedUsers.length > 0) {
              if (__DEV__) console.debug('📝 Loaded related users:', relatedUsers);
              setSelectedUsers(relatedUsers);
            }
          }

          // Set created by username if available
          if (createdByUserId) {
            const createdByUser = users?.find((u) => u.Id === createdByUserId);
            const username =
              createdByUser?.Username ||
              createdByUser?.Name ||
              createdByUser?.DisplayName ||
              actionData.CreatedByName ||
              'Unknown';

            if (__DEV__)
              console.debug('📝 Setting UserId field:', createdByUserId, 'username:', username);

            setFormData((prev) => ({
              ...prev,
              UserId: username,
            }));
          }
        } catch (e: any) {
          if (__DEV__) console.debug('Failed to load users for edit:', e?.message);
        }
      }
    };

    loadUsersForEdit();
  }, [
    isEditMode,
    route.params?.actionData,
    selectedMachines,
    assignedUsers.length,
    selectedUsers.length,
  ]);

  // Handle machine selections from ActionMachinePicker
  useFocusEffect(
    useCallback(() => {
      console.log('\n🔍🔍🔍 useFocusEffect triggered');
      console.log('📦 route.params:', JSON.stringify(route.params || {}, null, 2));
      console.log(
        '🎯 selectedTemplate BEFORE:',
        selectedTemplate?.Name || 'null',
        selectedTemplate ? `(ID: ${selectedTemplate.Id})` : ''
      );
      console.log('📚 Available templates:', templates.length);

      // If a picker passed back a saved scroll position, mark returning and set it
      if (route.params?.returnScrollY !== undefined && route.params?.returnScrollY !== null) {
        const rsy = Number(route.params.returnScrollY) || 0;
        savedScrollPosition.current = rsy;
        isReturningFromPicker.current = true;
        scrollRestoredRef.current = false;
        scrollRestoreAttemptsRef.current = 0;
        logScroll('Detected returnScrollY=%d from params, enabling restore', rsy);
        // Clear the param so it doesn't re-trigger next focus
        try {
          navigation.setParams({ returnScrollY: undefined });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // no-op
        }
      }

      // ALWAYS check if we need to restore the template (independent of machine params)
      const selectedTemplateIdParam = route.params?.selectedTemplateId;
      if (selectedTemplateIdParam && !selectedTemplate && templates.length > 0) {
        console.log('🔄 Need to restore template. Looking for ID:', selectedTemplateIdParam);
        const template = templates.find((t) => t.Id === selectedTemplateIdParam);
        if (template) {
          console.log('✅ Found template to restore:', template.Name);
          // Pass true to preserve machine/user/shift selections during restoration
          handleSelectTemplate(template, true);
        } else {
          console.log('❌ Template not found in available templates');
          console.log('   Available IDs:', templates.map((t) => t.Id).join(', '));
        }
      }

      // Handle machine selections
      if (route.params?.selectedMachines) {
        const selections = route.params.selectedMachines;
        const paramsKey = JSON.stringify(selections);

        console.log('✅ Found selectedMachines in params');
        console.log(
          '🔑 New paramsKey vs current:',
          paramsKey === processedParamsRef.current ? 'SAME' : 'DIFFERENT'
        );

        // Only process if we haven't seen these params before
        if (processedParamsRef.current !== paramsKey) {
          console.log('🆕 Processing new machine selections...');
          processedParamsRef.current = paramsKey;

          // Convert from LinkedMachine format to MachineInventoryItem format
          const machineItems: MachineInventoryItem[] = selections.map((sel: any) => ({
            MachineId: sel.machineId,
            MachineName: sel.name,
            DisplayName: sel.name,
          }));
          console.log('🔧 Setting', machineItems.length, 'machines');
          setSelectedMachines(machineItems);
          // Clear the params after processing
          navigation.setParams({ selectedMachines: undefined } as any);
        } else {
          console.log('⏭️ Machine params already processed, skipping');
        }
      }

      // Handle user selections (support both legacy selectedUsers and explicit buckets)
      const selectedUsersParam = (route.params as any)?.selectedUsers;
      const relatedUsersParam = (route.params as any)?.relatedUsers;
      const assignedUsersParam = (route.params as any)?.assignedUsers;
      if (selectedUsersParam || relatedUsersParam || assignedUsersParam) {
        const userSelections = assignedUsersParam || relatedUsersParam || selectedUsersParam;
        const fieldName = (route.params as any)?.fieldName;
        const selectionType =
          ((route.params as any)?.selectionType as 'assigned' | 'related' | undefined) ||
          (assignedUsersParam ? 'assigned' : relatedUsersParam ? 'related' : undefined);

        console.log(
          '👥 Found selectedUsers in params:',
          (userSelections || []).length,
          'users',
          fieldName ? `for field: ${fieldName}` : '',
          selectionType ? `(type: ${selectionType})` : ''
        );

        // Prefer explicit selectionType over heuristic field checks
        if (selectionType === 'assigned') {
          const userItems: MachineUser[] = userSelections.map((sel: any) => ({
            Id: sel.userId,
            Username: sel.username,
            Name: sel.name,
          }));
          console.log(
            '🔧 Setting assigned users (explicit):',
            userItems.map((u) => u.Name || u.Username).join(', '),
            'IDs:',
            userItems.map((u) => u.Id).join(', ')
          );
          setAssignedUsers(userItems);
          if (fieldName) {
            setFormData((prev) => ({ ...prev, [fieldName]: userItems.map((u) => u.Id).join(',') }));
          }
          navigation.setParams({
            selectedUsers: undefined,
            relatedUsers: undefined,
            assignedUsers: undefined,
            fieldName: undefined,
            selectionType: undefined,
          } as any);
        } else if (selectionType === 'related') {
          const userItems: MachineUser[] = userSelections.map((sel: any) => ({
            Id: sel.userId,
            Username: sel.username,
            Name: sel.name,
          }));
          console.log('🔧 Setting', userItems.length, 'related users (explicit)');
          setSelectedUsers(userItems);
          navigation.setParams({
            selectedUsers: undefined,
            relatedUsers: undefined,
            assignedUsers: undefined,
            fieldName: undefined,
            selectionType: undefined,
          } as any);
        } else if (fieldName) {
          const dummyField: ActionTemplateField = {
            FieldName: fieldName as string,
            DisplayName: '',
            Name: '',
            Default: '',
            Modify: 'Y',
            Order: 0,
            UIGroup: '',
            Mandatory: 'N',
            Display: 'Y',
          };
          const isAssigned = isAssignedToField(dummyField);
          const isRelatedUsers = isUsersField(dummyField);
          console.log(
            `🔍 Field "${fieldName}" - isAssigned: ${isAssigned}, isRelatedUsers: ${isRelatedUsers}`
          );

          if (isAssigned) {
            // Multiple users for assigned to field
            const userItems: MachineUser[] = userSelections.map((sel: any) => ({
              Id: sel.userId,
              Username: sel.username,
              Name: sel.name,
            }));
            console.log(
              '🔧 Setting assigned users:',
              userItems.map((u) => u.Name || u.Username).join(', '),
              'IDs:',
              userItems.map((u) => u.Id).join(', ')
            );
            setAssignedUsers(userItems);
            // Update form data with user IDs (as comma-separated or array depending on API)
            setFormData((prev) => ({ ...prev, [fieldName]: userItems.map((u) => u.Id).join(',') }));
          } else if (isRelatedUsers) {
            // Multiple users for related users field
            const userItems: MachineUser[] = userSelections.map((sel: any) => ({
              Id: sel.userId,
              Username: sel.username,
              Name: sel.name,
            }));
            console.log('🔧 Setting', userItems.length, 'related users');
            setSelectedUsers(userItems);
          }
          // Clear the params after processing
          navigation.setParams({
            selectedUsers: undefined,
            relatedUsers: undefined,
            assignedUsers: undefined,
            fieldName: undefined,
            selectionType: undefined,
          } as any);
        }
      }

      console.log('🎯 selectedTemplate AFTER:', selectedTemplate?.Name || 'null');

      // Restore scroll position if returning from a picker
      if (isReturningFromPicker.current) {
        logScroll(
          'Focused with return flag set. savedY=%d detailsLoading=%s',
          savedScrollPosition.current,
          String(detailsLoading)
        );
        scrollRestoreAttemptsRef.current = 0;
        scrollRestoredRef.current = false;
        if (!detailsLoading) {
          restoreScrollIfNeeded();
        } else {
          logScroll('Deferring restore until detailsLoading=false');
        }
      }
    }, [
      route.params?.selectedMachines,
      route.params?.selectedUsers,
      route.params?.selectedTemplateId,
      templates,
      selectedTemplate,
    ])
  );

  const loadCustomerAndMachines = async () => {
    try {
      const customer = await getSelectedCustomer();
      setSelectedCustomer(customer);
    } catch (e: any) {
      console.error('❌ Failed to load customer:', e);
    }
  };

  const loadShiftsForMachine = async (machineId: number) => {
    setShiftsLoading(true);
    setShiftsError(null);
    try {
      const response = await getShiftSchedule(machineId, 'current');
      const shiftItems = response.Items || [];
      setShifts(shiftItems);
      console.log('✅ Loaded shifts:', shiftItems.length);

      // Ensure ShiftId in formData matches the selected machine's shifts
      const availableIds = shiftItems
        .map((s) => s.ShiftId || s.Id)
        .filter((n) => Number.isFinite(n));
      setFormData((prev) => {
        const current = prev.ShiftId as any;
        const currentNum = typeof current === 'number' ? current : Number(current);
        if (currentNum && availableIds.includes(currentNum)) {
          return prev; // keep existing valid ShiftId
        }
        // If invalid or missing, prefer first available shift or clear
        const nextId = availableIds.length > 0 ? availableIds[0] : undefined;
        return { ...prev, ShiftId: nextId };
      });
    } catch (e: any) {
      console.error('❌ Failed to load shifts:', e);
      setShiftsError(e?.message || 'Failed to load shifts');
    } finally {
      setShiftsLoading(false);
    }
  };

  // Load shifts when machines are selected
  useEffect(() => {
    if (selectedMachines.length > 0) {
      const firstMachine = selectedMachines[0];
      loadShiftsForMachine(firstMachine.MachineId);
    } else {
      setShifts([]);
    }
  }, [selectedMachines]);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const data = await fetchActionTemplateSummaries();
      setTemplates(data);
      console.log('✅ Loaded templates:', data.length);
    } catch (e: any) {
      console.error('❌ Failed to load templates:', e);
      setTemplatesError(e?.message || 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadStatuses = async () => {
    try {
      const data = await fetchActionStatuses();
      setStatuses(data);
      console.log('✅ Loaded statuses:', data);
    } catch (e: any) {
      console.error('❌ Failed to load statuses:', e);
    }
  };

  const loadLabels = async (clientId: number) => {
    setLabelsLoading(true);
    setLabelsError(null);
    try {
      const data = await fetchActionLabels(clientId);
      setLabels(data);
      console.log('✅ Loaded labels:', data.length);
    } catch (e: any) {
      console.error('❌ Failed to load labels:', e);
      setLabelsError(e?.message || 'Failed to load labels');
    } finally {
      setLabelsLoading(false);
    }
  };

  const handleSelectTemplate = async (
    template: ActionTemplateSummary,
    preserveSelections = false
  ) => {
    console.log('\n📋📋📋 handleSelectTemplate called');
    console.log('  Template:', template.Name, '(ID:', template.Id, ')');
    console.log('  preserveSelections:', preserveSelections);
    console.log('  Current selectedTemplate before:', selectedTemplate?.Name || 'null');

    // Clear all fields when selecting a new template
    setDetailsLoading(true);
    setDetailsError(null);
    if (preserveSelections) {
      console.log('  Restoration path: preserving UI (not nulling template or clearing form)');
      // Clear only the templateId param so this apply happens once
      try {
        navigation.setParams({ selectedTemplateId: undefined });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // no-op
      }
    } else {
      console.log('  Fresh selection: clearing UI and state for new template');
      setSelectedTemplate(null);
      setFormData({});
      setActionName('');
      // Clear route params for fresh selection to avoid re-application
      try {
        navigation.setParams({
          selectedMachines: undefined,
          selectedUsers: undefined,
          selectedTemplateId: undefined,
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // no-op
      }
      // Reset the processed params ref
      processedParamsRef.current = null;
    }

    // Only clear selections if this is a fresh user selection (not a restoration)
    if (!preserveSelections) {
      console.log('  Clearing machine, user, assigned users, and shift selections...');
      setSelectedMachines([]);
      setSelectedUsers([]);
      setAssignedUsers([]);
      setShifts([]);

      // Clear route params to prevent them from being re-applied
      console.log('  Clearing route params...');
      navigation.setParams({
        selectedMachines: undefined,
        selectedUsers: undefined,
        selectedTemplateId: undefined,
        fieldName: undefined,
      } as any);

      // Reset the processed params ref
      processedParamsRef.current = null;
    } else {
      console.log('  Preserving existing machine, user, and shift selections');
    }

    try {
      console.log('  Fetching template details...');
      const details = await fetchActionTemplateDetails(template.Id);
      if (!details) {
        throw new Error('Template details not found');
      }

      console.log('✅ Loaded template details with', details.fields.length, 'fields');
      console.log(
        'Fields:',
        details.fields.map((f) => f.DisplayName || f.FieldName)
      );

      console.log('  Calling setSelectedTemplate with details...');
      setSelectedTemplate(details);
      // If returning from picker, try to restore after template details land
      if (isReturningFromPicker.current && !scrollRestoredRef.current) {
        logScroll('Post setSelectedTemplate: triggering restore');
        setTimeout(() => restoreScrollIfNeeded(), 50);
      }
      console.log('  setSelectedTemplate called');

      // Get current username for Created by field
      const currentUser = await getCurrentUsername();

      // Initialize form with defaults
      const initialFormData: Record<string, FormValue> = {};
      details.fields.forEach((field) => {
        if (field.Display === 'Y') {
          if (isBooleanField(field)) {
            const def = (field.Default || '').toString().toLowerCase();
            initialFormData[field.FieldName] = def === 'true';
          } else if (isStatusField(field)) {
            // Default to Open status
            const openStatus = statuses.find(
              (s) => s.Name?.toLowerCase() === 'open' || s.DisplayName?.toLowerCase() === 'open'
            );
            initialFormData[field.FieldName] = openStatus?.Id || '';
          } else if (isCategoryField(field)) {
            initialFormData[field.FieldName] = '';
          } else if (isLabelField(field)) {
            initialFormData[field.FieldName] = '';
          } else if (isCreatedByField(field)) {
            // Auto-fill with current username
            initialFormData[field.FieldName] = currentUser || '';
          } else if (isDateCreatedField(field)) {
            // Auto-fill with current date/time in ISO format
            initialFormData[field.FieldName] = new Date().toISOString();
          } else if (isDateDueField(field)) {
            // Initialize as empty, user will select via date picker
            initialFormData[field.FieldName] = '';
          } else if (isMachinesField(field)) {
            // Will be filled by selectedMachines array
            initialFormData[field.FieldName] = '';
          } else if (isUsersField(field)) {
            // Will be filled by selectedUsers array
            initialFormData[field.FieldName] = '';
          } else if (isShiftField(field)) {
            // Will be filled by shift dropdown
            initialFormData[field.FieldName] = '';
          } else {
            initialFormData[field.FieldName] = field.Default || '';
          }
        }
      });
      // If we are restoring after returning from a picker (template unchanged),
      // do NOT touch existing form values. This prevents any accidental clears.
      if (!preserveSelections) {
        setFormData(initialFormData);
      }
    } catch (e: any) {
      console.error('❌ Failed to load template details:', e);
      setDetailsError(e?.message || 'Failed to load template details');
    } finally {
      setDetailsLoading(false);
    }

    // Load categories for this template
    setCategoriesLoading(true);
    try {
      const data = await fetchActionCategories(template.Name);
      setCategories(data);
      console.log('✅ Loaded categories:', data.length);
      if (isReturningFromPicker.current && !scrollRestoredRef.current) {
        logScroll('Post categories load: triggering restore');
        setTimeout(() => restoreScrollIfNeeded(), 50);
      }
    } catch (e: any) {
      console.error('❌ Failed to load categories:', e);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: FormValue) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const updateAttachmentByKey = (
    fieldName: string,
    key: string,
    updater: (att: UploadAttachment) => UploadAttachment
  ) => {
    setFormData((prev) => {
      const existing = prev[fieldName];
      if (!Array.isArray(existing)) return prev;
      const next = existing.map((att) => (att.key === key ? updater(att) : att));
      return { ...prev, [fieldName]: next };
    });
  };

  const handlePickDocument = async (field: ActionTemplateField) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
      if ((result as any).type === 'cancel' || (result as any).canceled) return;

      const assets = (result as any).assets || [];
      if (!Array.isArray(assets) || assets.length === 0) return;

      const newAttachments = assets.map((asset: any) => ({
        key: `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        uri: asset.uri,
        name: asset.name || 'attachment',
        type: asset.mimeType || (asset as any).type || 'application/octet-stream',
        source: 'file' as const,
        uploading: false,
        uploaded: false,
      }));

      setFormData((prev) => {
        const existing = prev[field.FieldName];
        const list = Array.isArray(existing) ? existing : [];
        return { ...prev, [field.FieldName]: [...list, ...newAttachments] };
      });
    } catch (e: any) {
      if (__DEV__) console.debug('Failed to pick documents', e);
      Alert.alert('Upload failed', e?.message || 'Could not pick files.');
    }
  };

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission required', 'Please allow camera access to take a photo.');
      return false;
    }
    return true;
  };

  const handleCapturePhoto = async (field: ActionTemplateField) => {
    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.6,
      });
      if (result.canceled) return;

      const assets = result.assets || [];
      if (!Array.isArray(assets) || assets.length === 0) return;

      const newAttachments = assets.map((asset) => ({
        key: `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
        source: 'camera' as const,
        uploading: false,
        uploaded: false,
      }));

      setFormData((prev) => {
        const existing = prev[field.FieldName];
        const list = Array.isArray(existing) ? existing : [];
        return { ...prev, [field.FieldName]: [...list, ...newAttachments] };
      });
    } catch (e: any) {
      if (__DEV__) console.debug('Failed to capture photo', e);
      Alert.alert('Camera error', e?.message || 'Could not capture a photo.');
    }
  };

  const handlePickFromGallery = async (field: ActionTemplateField) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo library permission required', 'Please allow access to your photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.6,
      });
      if (result.canceled) return;

      const assets = result.assets || [];
      if (!Array.isArray(assets) || assets.length === 0) return;

      const newAttachments = assets.map((asset) => ({
        key: `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
        source: 'gallery' as const,
        uploading: false,
        uploaded: false,
      }));

      setFormData((prev) => {
        const existing = prev[field.FieldName];
        const list = Array.isArray(existing) ? existing : [];
        return { ...prev, [field.FieldName]: [...list, ...newAttachments] };
      });
    } catch (e: any) {
      if (__DEV__) console.debug('Failed to pick from gallery', e);
      Alert.alert('Gallery error', e?.message || 'Could not pick photos.');
    }
  };

  const handleRemoveAttachment = (field: ActionTemplateField, key: string) => {
    setFormData((prev) => {
      const existing = prev[field.FieldName];
      if (!Array.isArray(existing)) return prev;
      const next = existing.filter((att) => att.key !== key);
      return { ...prev, [field.FieldName]: next };
    });
  };

  const handleSaveAction = async () => {
    if (!selectedTemplate) return;

    // Validation
    if (selectedMachines.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one machine.');
      return;
    }

    // Find status and category fields from template
    const statusField = selectedTemplate.fields.find(isStatusField);
    const categoryField = selectedTemplate.fields.find(isCategoryField);

    const statusValue = statusField ? formData[statusField.FieldName] : undefined;
    if (!statusValue || statusValue === 'Select Status') {
      Alert.alert('Validation Error', 'Please select a status.');
      return;
    }

    const categoryValue = categoryField ? formData[categoryField.FieldName] : undefined;
    if (!categoryValue || categoryValue === 'Select category') {
      Alert.alert('Validation Error', 'Please select a category.');
      return;
    }

    if (!actionName || actionName.trim() === '') {
      Alert.alert('Validation Error', 'Please enter an action name.');
      return;
    }

    // Preflight debug: capture mappings and anomalies
    const statusValueDbg = statusField ? formData[statusField.FieldName] : undefined;
    const categoryValueDbg = categoryField ? formData[categoryField.FieldName] : undefined;
    const dueDateDbg = formData.DueDate;
    const shiftsDbg = formData.ShiftId;
    const thingIdsDbg = selectedMachines.map((m) => m.MachineId);
    const userIdsDbg = selectedUsers.map((u) => u.Id);
    if (__DEV__) {
      console.log('🔎 Preflight:', {
        templateId: selectedTemplate.Id,
        templateName: selectedTemplate.Name,
        statusField: statusField?.FieldName,
        statusValue: statusValueDbg,
        categoryField: categoryField?.FieldName,
        categoryValue: categoryValueDbg,
        dueDate: dueDateDbg,
        shiftId: shiftsDbg,
        thingIds: thingIdsDbg,
        userIds: userIdsDbg,
      });
      if (!thingIdsDbg?.length) console.warn('⚠️ No ThingIds will be sent');
      if (!statusValueDbg) console.warn('⚠️ StatusId missing');
      if (!categoryValueDbg && categoryField) console.warn('⚠️ CategoryId missing');
    }

    setSubmitting(true);

    try {
      let mediaIds: number[] = [];

      // Handle media uploads
      for (const [fieldName, value] of Object.entries(formData)) {
        if (Array.isArray(value) && value.length > 0 && 'uri' in value[0]) {
          const attachments = value as UploadAttachment[];
          const uploadedMediaIds: number[] = [];

          for (const att of attachments) {
            // Skip if already uploaded
            if (att.uploading || att.uploaded) {
              if (att.uploaded && !att.error && att.mediaId) {
                uploadedMediaIds.push(att.mediaId);
              }
              continue;
            }

            try {
              updateAttachmentByKey(fieldName, att.key, (a) => ({
                ...a,
                uploading: true,
              }));

              const result = await uploadTaskMedia(att);
              const first = Array.isArray(result) ? result[0] : null;

              if (first?.IsValid) {
                uploadedMediaIds.push(first.Id);
                updateAttachmentByKey(fieldName, att.key, (a) => ({
                  ...a,
                  uploading: false,
                  uploaded: true,
                  remoteUrl: first.SourceLink,
                  previewUrl: first.PreviewLink,
                  mediaId: first.Id,
                }));
              } else {
                throw new Error('Upload validation failed');
              }
            } catch (e: any) {
              updateAttachmentByKey(fieldName, att.key, (a) => ({
                ...a,
                uploading: false,
                uploaded: false,
                error: e?.message || 'Upload failed',
              }));
              throw new Error(`Failed to upload ${att.name}: ${e?.message}`);
            }
          }

          mediaIds = [...mediaIds, ...uploadedMediaIds];
        }
      }

      // Determine the machine ID to use for the API endpoint
      const targetMachineId = selectedMachines[0].MachineId;

      // StatusId should be a number
      let statusId: number;
      if (typeof statusValue === 'number') {
        statusId = statusValue;
      } else {
        statusId = 1; // Default to Open
      }

      // Build API payload
      const labelField = selectedTemplate.fields.find(isLabelField);
      const labelValueRaw = labelField ? formData[labelField.FieldName] : undefined;
      const labelIds = Array.isArray(labelValueRaw)
        ? (labelValueRaw as any[]).map((id) => Number(id)).filter((n) => !isNaN(n))
        : labelValueRaw != null && labelValueRaw !== ''
          ? [Number(labelValueRaw)].filter((n) => !isNaN(n))
          : [];

      // Determine which optional fields are valid for this template
      const templateHasStatus = !!selectedTemplate.fields.find(isStatusField);
      const templateHasCategory = !!selectedTemplate.fields.find(isCategoryField);
      const templateHasLabels = !!selectedTemplate.fields.find(isLabelField);
      const templateHasShift = !!selectedTemplate.fields.find(isShiftField);
      const templateHasAssignee = !!selectedTemplate.fields.find(isAssignedToField);
      const templateHasUsers = !!selectedTemplate.fields.find(isUsersField);
      const templateHasDueDate = !!selectedTemplate.fields.find(isDateDueField);
      const templateHasCreatedDate = !!selectedTemplate.fields.find(isDateCreatedField);
      const templateHasUserId = !!selectedTemplate.fields.find(isCreatedByField);
      const templateHasDescription = !!selectedTemplate.fields.find(
        (f) => f.FieldName === 'Description'
      );
      const templateHasDetails = !!selectedTemplate.fields.find((f) => f.FieldName === 'Details');
      const templateHasName = !!selectedTemplate.fields.find((f) => f.FieldName === 'Name');
      const templateHasEmail = !!selectedTemplate.fields.find(
        (f) => f.FieldName === 'HasEmailNotifications'
      );

      const parsedUserId = (() => {
        const raw = formData.UserId as any;
        const num = typeof raw === 'number' ? raw : Number(raw);
        return Number.isFinite(num) ? num : undefined;
      })();

      const parsedShiftId = (() => {
        const raw = formData.ShiftId as any;
        const num = Number(raw);
        return Number.isFinite(num) ? num : undefined;
      })();

      const payload: ActionPayload = {
        TypeId: selectedTemplate.Id,
        // Always include core fields required by API
        Name: templateHasName
          ? actionName || selectedTemplate.Name || ''
          : actionName || selectedTemplate.Name || '',
        Details: templateHasDetails
          ? (formData.Details as string) || ''
          : (formData.Details as string) || '',
        IsActive: formData.IsActive !== false,
        ThingIds: selectedMachines.map((m) => m.MachineId),
        // Conditionally include optional fields only if present in template
        ...(templateHasDescription && { Description: (formData.Description as string) || '' }),
        ...(templateHasCategory && { CategoryId: Number(categoryValue) || 0 }),
        ...(templateHasStatus && { StatusId: statusId }),
        ...(templateHasDueDate && {
          DueDate: formData.DueDate
            ? formData.DueDate instanceof Date
              ? formData.DueDate.toISOString()
              : String(formData.DueDate)
            : undefined,
        }),
        ...(templateHasShift && (parsedShiftId != null ? { ShiftId: parsedShiftId } : {})),
        ...(templateHasUsers && { UserIds: selectedUsers.map((u) => u.Id) }),
        ...(templateHasLabels && { LabelIds: labelIds }),
        ...(mediaIds && mediaIds.length > 0 ? { MediaIds: mediaIds } : {}),
        ...(templateHasUserId && parsedUserId != null ? { UserId: parsedUserId } : {}),
        ...(templateHasCreatedDate && { CreatedDate: new Date().toISOString() }),
        ...(templateHasAssignee && assignedUsers.length > 0
          ? { AssigneeId: assignedUsers[0].Id }
          : {}),
        ...(templateHasEmail && typeof formData.HasEmailNotifications === 'boolean'
          ? { HasEmailNotifications: formData.HasEmailNotifications }
          : {}),
      } as ActionPayload;

      if (__DEV__) {
        console.log('📤 Submitting action with payload:', JSON.stringify(payload, null, 2));
        console.log('🎯 Target machine ID:', targetMachineId);
        console.log('📋 FormData state:', JSON.stringify(formData, null, 2));
        console.log('� Assigned users:', assignedUsers);
        console.log('🤖 Selected machines:', selectedMachines);
        console.log('👥 Selected users:', selectedUsers);
        console.log('🏷️ Labels:', labelIds);
      }

      // Save to API
      let result;
      if (isEditMode && editingActionId) {
        result = await updateAction(editingActionId, payload);
        if (__DEV__) {
          console.debug('✅ Action updated successfully:', result);
        }
        // Navigate back to ActionList with reload flag
        if (__DEV__) console.debug('🔁 Edit mode: navigating back to ActionList');
        navigation.navigate('ActionList', { reload: true } as any);
        return; // Skip alert/reset flow in edit mode
      } else {
        result = await saveAction(targetMachineId, payload);
        if (__DEV__) {
          console.debug('✅ Action saved successfully:', result);
        }
        // Navigate back to ActionList with reload flag
        if (__DEV__) console.debug('🔁 Create mode: navigating back to ActionList');
        navigation.navigate('ActionList', { reload: true } as any);
        return; // Skip alert/reset flow in create mode
      }
    } catch (e: any) {
      console.error('❌ Submission failed', e);
      console.log('❌ Error response:', e?.response?.data);
      console.log('❌ Error status:', e?.response?.status);
      console.log('❌ Error message:', e?.message);
      const errorMessage = e?.response?.data?.message || e?.message || 'Failed to save action.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormField = (field: ActionTemplateField) => {
    const value = formData[field.FieldName];
    const isRequired = field.Mandatory === 'Y';

    // Skip TypeId field - it's defined by the template
    if (isTypeIdField(field)) {
      return null;
    }

    // Created by field (read-only)
    if (isCreatedByField(field)) {
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{String(value || 'Not set')}</Text>
          </View>
        </View>
      );
    }

    // Date created field (read-only, formatted)
    if (isDateCreatedField(field)) {
      const dateValue = value ? new Date(String(value)).toLocaleString() : 'Not set';
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{dateValue}</Text>
          </View>
        </View>
      );
    }

    // Date due field (date picker)
    if (isDateDueField(field)) {
      const dateValue = value ? new Date(String(value)) : null;
      const displayValue = dateValue ? dateValue.toLocaleDateString() : 'Not set';

      // Web platform: use HTML date input
      if (Platform.OS === 'web') {
        const dateInputValue = dateValue ? dateValue.toISOString().split('T')[0] : '';
        return (
          <View key={field.FieldName} style={styles.fieldContainer}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
              {isRequired ? <Text style={styles.required}>*</Text> : null}
            </View>
            <input
              type="date"
              value={dateInputValue}
              onChange={(e: any) => {
                const text = e.target.value;
                if (text) {
                  const selectedDate = new Date(text + 'T00:00:00');
                  setFormData({ ...formData, [field.FieldName]: selectedDate.toISOString() });
                } else {
                  setFormData({ ...formData, [field.FieldName]: '' });
                }
              }}
              placeholder="Select date"
              style={{
                width: '100%',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#D1D5DB',
                borderRadius: '8px',
                paddingLeft: '12px',
                paddingRight: '12px',
                paddingTop: '10px',
                paddingBottom: '10px',
                fontSize: '15px',
                color: '#111827',
                backgroundColor: '#FFFFFF',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </View>
        );
      }

      // Native platforms: use DateTimePicker
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => {
              setDatePickerField(field.FieldName);
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.datePickerButtonText, !dateValue && styles.placeholderText]}>
              {displayValue}
            </Text>
          </TouchableOpacity>
          {showDatePicker && datePickerField === field.FieldName && (
            <>
              <DateTimePicker
                value={dateValue || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  setDatePickerField(null);
                  if (event.type === 'set' && selectedDate) {
                    setFormData({ ...formData, [field.FieldName]: selectedDate.toISOString() });
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerButtonRow}>
                  <TouchableOpacity
                    style={[styles.datePickerActionButton, styles.datePickerCancelButton]}
                    onPress={() => {
                      setShowDatePicker(false);
                      setDatePickerField(null);
                    }}
                  >
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerActionButton, styles.datePickerDoneButton]}
                    onPress={() => {
                      setShowDatePicker(false);
                      setDatePickerField(null);
                    }}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      );
    }

    // Machines field
    if (isMachinesField(field)) {
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                // Save current scroll position before leaving for picker
                isReturningFromPicker.current = true;
                scrollRestoredRef.current = false;
                scrollRestoreAttemptsRef.current = 0;
                logScroll('Navigating to MachinePicker. savedY=%d', savedScrollPosition.current);
                // Persist current Actions2 state snapshot before navigating
                saveActions2State({
                  formData,
                  actionName,
                  selectedMachines,
                  selectedUsers,
                  assignedUser: assignedUsers[0] || null,
                  selectedTemplateId: selectedTemplate?.Id,
                  shifts,
                  scrollY: savedScrollPosition.current,
                });

                navigation.navigate('ActionMachinePicker', {
                  customerId: selectedCustomer?.Id,
                  customerName: selectedCustomer?.Name,
                  plantId: selectedCustomer?.Id,
                  plantName: selectedCustomer?.DisplayName,
                  initialSelected: selectedMachines.map((m) => ({
                    machineId: m.MachineId,
                    name: m.MachineName || m.DisplayName || '',
                    isLine: false,
                    parentLineId: null,
                  })),
                  selectedTemplateId: selectedTemplate?.Id,
                  actionId: editingActionId,
                  actionData: isEditMode ? route.params?.actionData : undefined,
                  returnScrollY: savedScrollPosition.current,
                });
              }}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {selectedMachines.length > 0 ? (
            <View style={styles.selectedItemsContainer}>
              {selectedMachines.map((machine) => (
                <View key={machine.MachineId} style={styles.selectedChip}>
                  <Text style={styles.selectedChipText}>{machine.MachineName}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noSelectionText}>No machines linked</Text>
          )}
        </View>
      );
    }

    // Users field
    if (isUsersField(field)) {
      const hasNoMachines = selectedMachines.length === 0;
      const displayName = (field.DisplayName || field.FieldName).toLowerCase().includes('account')
        ? 'Related to users'
        : field.DisplayName || field.FieldName;
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{displayName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
            {hasNoMachines && <Text style={styles.helperText}> (Select machine first)</Text>}
            {!hasNoMachines && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  // Save current scroll position before leaving for picker
                  isReturningFromPicker.current = true;
                  scrollRestoredRef.current = false;
                  scrollRestoreAttemptsRef.current = 0;
                  logScroll('Navigating to UserPicker. savedY=%d', savedScrollPosition.current);

                  // Persist current state so a remount keeps both assigned/related users
                  saveActions2State({
                    formData,
                    actionName,
                    selectedMachines,
                    selectedUsers,
                    assignedUser: assignedUsers[0] || null,
                    selectedTemplateId: selectedTemplate?.Id,
                    shifts,
                    scrollY: savedScrollPosition.current,
                  });

                  const firstMachine = selectedMachines[0];
                  navigation.navigate('ActionUserPicker', {
                    machineId: firstMachine.MachineId,
                    machineName: firstMachine.MachineName || firstMachine.DisplayName,
                    initialSelected: selectedUsers.map((u) => ({
                      userId: u.Id,
                      username: u.Username || u.Name || '',
                      name: u.Name || u.Username || '',
                    })),
                    customerId: selectedCustomer?.Id,
                    customerName: selectedCustomer?.Name,
                    selectedMachines: selectedMachines.map((m) => ({
                      machineId: m.MachineId,
                      name: m.MachineName || m.DisplayName || '',
                      isLine: false,
                      parentLineId: null,
                    })),
                    selectedTemplateId: selectedTemplate?.Id,
                    actionId: editingActionId,
                    actionData: isEditMode ? route.params?.actionData : undefined,
                    returnScrollY: savedScrollPosition.current,
                    fieldName: field.FieldName,
                    selectionType: 'related',
                  });
                }}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedUsers.length > 0 ? (
            <View style={styles.selectedItemsContainer}>
              {selectedUsers.map((user) => (
                <View key={user.Id} style={styles.selectedChip}>
                  <Text style={styles.selectedChipText}>{user.Name || user.Username}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noSelectionText}>
              {hasNoMachines ? 'Select machine first' : 'No users linked'}
            </Text>
          )}
        </View>
      );
    }

    // Assigned to field (single user selection)
    if (isAssignedToField(field)) {
      const hasNoMachines = selectedMachines.length === 0;
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
            {hasNoMachines && <Text style={styles.helperText}> (Select machine first)</Text>}
            {!hasNoMachines && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  isReturningFromPicker.current = true;
                  scrollRestoredRef.current = false;
                  scrollRestoreAttemptsRef.current = 0;
                  logScroll(
                    'Navigating to UserPicker for Assigned To. savedY=%d',
                    savedScrollPosition.current
                  );

                  // Persist current state so a remount keeps both assigned/related users
                  saveActions2State({
                    formData,
                    actionName,
                    selectedMachines,
                    selectedUsers,
                    assignedUser: assignedUsers[0] || null,
                    selectedTemplateId: selectedTemplate?.Id,
                    shifts,
                    scrollY: savedScrollPosition.current,
                  });

                  const firstMachine = selectedMachines[0];
                  navigation.navigate('ActionUserPicker', {
                    machineId: firstMachine.MachineId,
                    machineName: firstMachine.MachineName || firstMachine.DisplayName,
                    initialSelected:
                      assignedUsers.length > 0
                        ? assignedUsers.map((u) => ({
                            userId: u.Id,
                            username: u.Username || u.Name || '',
                            name: u.Name || u.Username || '',
                          }))
                        : [],
                    customerId: selectedCustomer?.Id,
                    customerName: selectedCustomer?.Name,
                    selectedMachines: selectedMachines.map((m) => ({
                      machineId: m.MachineId,
                      name: m.MachineName || m.DisplayName || '',
                      isLine: false,
                      parentLineId: null,
                    })),
                    selectedTemplateId: selectedTemplate?.Id,
                    actionId: editingActionId,
                    actionData: isEditMode ? route.params?.actionData : undefined,
                    returnScrollY: savedScrollPosition.current,
                    fieldName: field.FieldName,
                    selectionType: 'assigned',
                  });
                }}
              >
                <Text style={styles.addButtonText}>
                  {assignedUsers.length > 0 ? 'Change' : '+ Select'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {assignedUsers.length > 0 ? (
            <View style={styles.selectedItemsContainer}>
              {assignedUsers.map((user) => (
                <View key={user.Id} style={styles.selectedChip}>
                  <Text style={styles.selectedChipText}>{user.Name || user.Username}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noSelectionText}>
              {hasNoMachines ? 'Select machine first' : 'No users assigned'}
            </Text>
          )}
        </View>
      );
    }

    // Upload file field
    if (isUploadFileField(field)) {
      const attachments = Array.isArray(value) ? value : [];
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>
          <View style={styles.uploadRow}>
            <TouchableOpacity style={styles.uploadButton} onPress={() => handlePickDocument(field)}>
              <Text style={styles.uploadButtonText}>Add file</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraButton} onPress={() => handleCapturePhoto(field)}>
              <Text style={styles.cameraIcon}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={() => handlePickFromGallery(field)}
            >
              <Text style={styles.galleryIcon}>🖼️</Text>
            </TouchableOpacity>
          </View>
          {attachments.length ? (
            <View style={styles.attachmentList}>
              {attachments.map((att) => (
                <View key={att.key} style={styles.attachmentChip}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {att.name}
                  </Text>
                  {att.uploading ? (
                    <Text style={styles.attachmentStatus}>Uploading…</Text>
                  ) : att.error ? (
                    <Text style={[styles.attachmentStatus, styles.attachmentStatusError]}>
                      Failed
                    </Text>
                  ) : att.uploaded ? (
                    <Text style={[styles.attachmentStatus, styles.attachmentStatusDone]}>
                      Uploaded
                    </Text>
                  ) : (
                    <Text style={styles.attachmentStatusPending}>Pending</Text>
                  )}
                  <TouchableOpacity onPress={() => handleRemoveAttachment(field, att.key)}>
                    <Text style={styles.attachmentRemove}>x</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    }

    // Shift field
    if (isShiftField(field)) {
      const selectedShift = shifts.find((s) => s.ShiftId === value || s.Id === value);
      const hasNoMachines = selectedMachines.length === 0;

      // Get display name priority: DisplayName > Name > ShiftName > fallback
      const getShiftDisplayName = (shift: any) => {
        return (
          shift.DisplayName || shift.Name || shift.ShiftName || `Shift ${shift.ShiftId || shift.Id}`
        );
      };

      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
            {hasNoMachines && <Text style={styles.helperText}> (Select machine first)</Text>}
          </View>

          {shiftsLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : shiftsError ? (
            <Text style={styles.errorText}>⚠️ {shiftsError}</Text>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.dropdown, hasNoMachines && styles.dropdownDisabled]}
                onPress={() => !hasNoMachines && setShiftDropdownOpen(!shiftDropdownOpen)}
                disabled={hasNoMachines}
              >
                <Text style={[styles.dropdownText, !selectedShift && styles.placeholderText]}>
                  {selectedShift ? getShiftDisplayName(selectedShift) : 'Select shift'}
                </Text>
                <Text style={styles.dropdownArrow}>{shiftDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {shiftDropdownOpen && !hasNoMachines ? (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {shifts.map((shift) => {
                      const shiftId = shift.ShiftId || shift.Id;
                      return (
                        <TouchableOpacity
                          key={shiftId}
                          style={[
                            styles.dropdownItem,
                            value === shiftId && styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            // Store the ShiftId (numeric) for POST, display name to user
                            handleFieldChange(field.FieldName, shiftId);
                            setShiftDropdownOpen(false);
                          }}
                        >
                          <View>
                            <Text style={styles.dropdownItemText}>
                              {getShiftDisplayName(shift)}
                            </Text>
                            {shift.Type && (
                              <Text style={styles.dropdownItemSubtext}>{shift.Type}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </>
          )}
        </View>
      );
    }

    // Status toggle (Open/Closed)
    if (isStatusField(field)) {
      const openStatus = statuses.find(
        (s) => s.Name?.toLowerCase() === 'open' || s.DisplayName?.toLowerCase() === 'open'
      );
      const closedStatus = statuses.find(
        (s) => s.Name?.toLowerCase() === 'closed' || s.DisplayName?.toLowerCase() === 'closed'
      );

      const isOpen = value === openStatus?.Id;
      const statusLabel = isOpen ? 'Open' : 'Closed';

      return (
        <View key={field.FieldName}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>
          <View style={styles.toggleControl}>
            <Text style={styles.toggleValueText}>{statusLabel}</Text>
            <Switch
              value={isOpen}
              onValueChange={(newValue) => {
                const newStatusId = newValue ? openStatus?.Id : closedStatus?.Id;
                if (newStatusId) {
                  handleFieldChange(field.FieldName, newStatusId);
                }
              }}
              trackColor={{ false: '#D1D5DB', true: '#34D399' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      );
    }

    // Category dropdown
    if (isCategoryField(field)) {
      const selectedCategory = categories.find((c) => c.Id === value);
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>

          {categoriesLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              >
                <Text style={[styles.dropdownText, !selectedCategory && styles.placeholderText]}>
                  {selectedCategory?.DisplayName || selectedCategory?.Name || 'Select category'}
                </Text>
                <Text style={styles.dropdownArrow}>{categoryDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {categoryDropdownOpen ? (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.Id}
                        style={[
                          styles.dropdownItem,
                          value === category.Id && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          handleFieldChange(field.FieldName, category.Id);
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {category.DisplayName || category.Name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </>
          )}
        </View>
      );
    }

    // Label dropdown
    if (isLabelField(field)) {
      const selectedLabel = labels.find((l) => l.Id === value);
      return (
        <View key={field.FieldName} style={styles.fieldContainer}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>

          {labelsLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : labelsError ? (
            <Text style={styles.errorText}>⚠️ {labelsError}</Text>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setLabelDropdownOpen(!labelDropdownOpen)}
              >
                <Text style={[styles.dropdownText, !selectedLabel && styles.placeholderText]}>
                  {selectedLabel?.DisplayName || selectedLabel?.Name || 'Select label'}
                </Text>
                <Text style={styles.dropdownArrow}>{labelDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {labelDropdownOpen ? (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {labels.map((label) => (
                      <TouchableOpacity
                        key={label.Id}
                        style={[
                          styles.dropdownItem,
                          value === label.Id && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          handleFieldChange(field.FieldName, label.Id);
                          setLabelDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {label.DisplayName || label.Name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </>
          )}
        </View>
      );
    }

    // Boolean field (toggle)
    if (isBooleanField(field)) {
      const boolValue = Boolean(value);
      return (
        <View key={field.FieldName}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
            {isRequired ? <Text style={styles.required}>*</Text> : null}
          </View>
          <View style={styles.toggleControl}>
            <Text style={styles.toggleValueText}>{boolValue ? 'Yes' : 'No'}</Text>
            <Switch
              value={boolValue}
              onValueChange={(newValue) => handleFieldChange(field.FieldName, newValue)}
              trackColor={{ false: '#D1D5DB', true: '#34D399' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      );
    }

    // Text input (default)
    return (
      <View key={field.FieldName} style={styles.fieldContainer}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{field.DisplayName || field.FieldName}</Text>
          {isRequired ? <Text style={styles.required}>*</Text> : null}
        </View>
        <TextInput
          style={styles.textInput}
          value={String(value || '')}
          onChangeText={(text) => handleFieldChange(field.FieldName, text)}
          placeholder={`Enter ${field.DisplayName || field.FieldName}`}
          placeholderTextColor="#9CA3AF"
          multiline={field.FieldName === 'Details' || field.FieldName === 'Description'}
          numberOfLines={field.FieldName === 'Details' || field.FieldName === 'Description' ? 4 : 1}
        />
      </View>
    );
  };

  const visibleFields =
    selectedTemplate?.fields
      .filter((f) => f.Display === 'Y')
      .sort((a, b) => {
        // Custom reordering: place "Assigned to" right after "Related to machines"
        const aIsMachines = isMachinesField(a);
        const bIsMachines = isMachinesField(b);
        const aIsAssigned = isAssignedToField(a);
        const bIsAssigned = isAssignedToField(b);

        // If comparing machines and assigned, machines should come first
        if (aIsMachines && bIsAssigned) return -1;
        if (aIsAssigned && bIsMachines) return 1;

        // If assigned field is being compared with something else (not machines),
        // check if the other field comes before machines in original order
        if (aIsAssigned && !bIsMachines && !bIsAssigned) {
          const machinesField = selectedTemplate?.fields.find((f) => isMachinesField(f));
          if (machinesField) {
            const bOrder = b.Order || 0;
            const machinesOrder = machinesField.Order || 0;
            // If b comes before machines, b should come before assigned
            if (bOrder < machinesOrder) return 1;
            // If b comes after machines, assigned should come before b
            return -1;
          }
        }
        if (bIsAssigned && !aIsMachines && !aIsAssigned) {
          const machinesField = selectedTemplate?.fields.find((f) => isMachinesField(f));
          if (machinesField) {
            const aOrder = a.Order || 0;
            const machinesOrder = machinesField.Order || 0;
            // If a comes before machines, a should come before assigned
            if (aOrder < machinesOrder) return -1;
            // If a comes after machines, assigned should come before a
            return 1;
          }
        }

        // Default: sort by Order
        return (a.Order || 0) - (b.Order || 0);
      }) || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {templatesLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      ) : templatesError ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>⚠️ {templatesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTemplates}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {!isEditMode && (
            <View style={styles.templateSection}>
              <View style={styles.templateSectionHeader}>
                <Text style={styles.templateSectionTitle}>Action Templates</Text>
              </View>
              <View style={styles.templateGrid}>
                {templates.map((template) => {
                  const isSelected = selectedTemplate?.Id === template.Id;
                  return (
                    <TouchableOpacity
                      key={template.Id}
                      style={[styles.templateCard, isSelected && styles.templateCardActive]}
                      onPress={() => handleSelectTemplate(template)}
                    >
                      <Text style={[styles.templateName, isSelected && styles.templateNameActive]}>
                        {template.DisplayName || template.Name}
                      </Text>
                      {template.Description ? (
                        <Text
                          style={[
                            styles.templateDescription,
                            isSelected && styles.templateDescriptionActive,
                          ]}
                        >
                          {template.Description}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              savedScrollPosition.current = y;
            }}
            onLayout={() => {
              // Removed scroll restoration to fix jumpy/sticky behavior
            }}
            onContentSizeChange={() => {
              // Removed scroll restoration to fix jumpy/sticky behavior
            }}
            scrollEventThrottle={16}
            bounces={false}
            overScrollMode="never"
            scrollEnabled={true}
          >
            {selectedTemplate ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Action Form</Text>
                  <View style={styles.formCard}>
                    {/* Action Name Field */}
                    <View style={styles.fieldContainer}>
                      <View style={styles.fieldLabelRow}>
                        <Text style={styles.fieldLabel}>Action Name</Text>
                        <Text style={styles.required}>*</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={actionName}
                        onChangeText={setActionName}
                        placeholder="Enter action name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    {detailsLoading ? (
                      <View style={styles.inlineLoader}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading form fields...</Text>
                      </View>
                    ) : detailsError ? (
                      <Text style={styles.errorText}>⚠️ {detailsError}</Text>
                    ) : visibleFields.length > 0 ? (
                      <>
                        {visibleFields.map((field, index) => {
                          // Check if this field and the next are both toggle fields (Status or Boolean)
                          const isCurrentToggle = isStatusField(field) || isBooleanField(field);
                          const nextField = visibleFields[index + 1];
                          const isNextToggle =
                            nextField && (isStatusField(nextField) || isBooleanField(nextField));

                          // If this is a toggle and we already rendered it with the previous field, skip it
                          if (index > 0 && isCurrentToggle) {
                            const prevField = visibleFields[index - 1];
                            const isPrevToggle =
                              isStatusField(prevField) || isBooleanField(prevField);
                            if (isPrevToggle) {
                              return null; // Already rendered with previous field
                            }
                          }

                          // If current and next are both toggles, render them side by side
                          if (isCurrentToggle && isNextToggle) {
                            return (
                              <View key={`toggle-pair-${index}`} style={styles.toggleRow}>
                                <View style={styles.toggleHalf}>{renderFormField(field)}</View>
                                <View style={styles.toggleHalf}>{renderFormField(nextField)}</View>
                              </View>
                            );
                          }

                          // Otherwise render normally
                          return renderFormField(field);
                        })}
                      </>
                    ) : (
                      <Text style={styles.noFieldsText}>
                        No fields to display for this template
                      </Text>
                    )}
                  </View>
                </View>
              </>
            ) : null}
          </ScrollView>

          {selectedTemplate && !detailsLoading && visibleFields.length > 0 ? (
            <View style={styles.fixedButtonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleSaveAction}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Update Action' : 'Save Action'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingVertical: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  templateSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  templateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  templateSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#111827',
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateCard: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  templateName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  templateNameActive: {
    color: '#1D4ED8',
  },
  templateDescription: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  templateDescriptionActive: {
    color: '#1E40AF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  toggleHalf: {
    flex: 1,
  },
  'toggleHalf:first-child': {
    marginLeft: 8,
  },
  toggleControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 2,
  },
  toggleValueText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  readOnlyText: {
    fontSize: 15,
    color: '#6B7280',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  dropdownMenu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#DBEAFE',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectorButtonDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  selectorButtonText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  selectorDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorList: {
    maxHeight: 250,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectorItemSelected: {
    backgroundColor: '#DBEAFE',
  },
  selectorItemText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '700',
  },
  selectedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  selectedChipText: {
    fontSize: 13,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  removeChip: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  addButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noSelectionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  datePickerButtonText: {
    fontSize: 15,
    color: '#111827',
  },
  datePickerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  datePickerActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  datePickerCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  datePickerDoneButton: {
    backgroundColor: '#3B82F6',
  },
  datePickerCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  datePickerDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noFieldsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  fixedButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  uploadedFilesContainer: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  uploadedFileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  uploadedFileName: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  removeFileButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  removeFileText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 20,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  uploadButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cameraButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 16,
  },
  galleryButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  galleryIcon: {
    fontSize: 16,
  },
  attachmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  attachmentName: {
    maxWidth: 180,
    fontSize: 13,
    color: '#111827',
  },
  attachmentStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  attachmentStatusError: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  attachmentStatusDone: {
    color: '#15803D',
    fontWeight: '700',
  },
  attachmentStatusPending: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  attachmentRemove: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 4,
  },
});

// Debug log for customer object
