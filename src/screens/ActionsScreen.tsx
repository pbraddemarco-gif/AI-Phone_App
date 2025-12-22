import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  RootStackParamList,
  ActionMachineSelection,
  ActionUserSelection,
} from '../types/navigation';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadTaskMedia } from '../services/mediaService';
import {
  fetchActionTemplateSummaries,
  fetchActionTemplateDetails,
  ParsedActionTemplate,
  ActionTemplateField,
  ActionTemplateSummary,
  fetchActionCategories,
  ActionCategory,
} from '../services/actionTemplateService';
import { useAppTheme } from '../hooks/useAppTheme';
import { getCurrentUsername } from '../services/tokenStorage';
import { safeLog } from '../utils/logger';

export type ActionsScreenProps = NativeStackScreenProps<RootStackParamList, 'Actions'>;

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

function isBooleanField(field: ActionTemplateField) {
  const defaultVal = (field.Default || '').toString().toLowerCase();
  if (defaultVal === 'true' || defaultVal === 'false') return true;
  return field.FieldName?.toLowerCase().startsWith('is');
}

function isUploadField(field: ActionTemplateField) {
  const name = `${field.DisplayName || ''} ${field.FieldName || ''}`.toLowerCase();
  return name.includes('upload file') || (name.includes('upload') && name.includes('file'));
}

function isRelatedMachinesField(field: ActionTemplateField) {
  const display = (field.DisplayName || '').toLowerCase();
  return display.includes('related to machines');
}

function isRelatedUsersField(field: ActionTemplateField) {
  const display = (field.DisplayName || '').toLowerCase();
  // Match common labels: "Related to Users", "Assign Users", "Users"
  return display.includes('users') && !display.includes('created by');
}

function isCreatedByField(field: ActionTemplateField) {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return display.includes('created by') || fieldName.includes('createdby');
}

function isDateCreatedField(field: ActionTemplateField) {
  const display = (field.DisplayName || '').toLowerCase();
  const fieldName = (field.FieldName || '').toLowerCase();
  return (
    display.includes('date created') ||
    fieldName.includes('datecreated') ||
    (display.includes('created') && display.includes('date'))
  );
}

export default function ActionsScreen({ navigation, route }: ActionsScreenProps) {
  const theme = useAppTheme();
  const routeParams = route.params || {};
  const [contextParams, setContextParams] = useState({
    customerId: routeParams.customerId,
    customerName: routeParams.customerName,
    plantId: routeParams.plantId,
    plantName: routeParams.plantName,
  });
  const [templates, setTemplates] = useState<ActionTemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [templateCache, setTemplateCache] = useState<Record<number, ParsedActionTemplate>>({});
  const [categories, setCategories] = useState<ActionCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, FormValue>>({});
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [linkedMachines, setLinkedMachines] = useState<ActionMachineSelection[]>(
    routeParams.selectedMachines || []
  );
  const [linkedUsers, setLinkedUsers] = useState<ActionUserSelection[]>([]);

  useEffect(() => {
    if (routeParams.selectedMachines !== undefined) {
      setLinkedMachines(routeParams.selectedMachines);
    }
    if (
      routeParams.customerId !== undefined ||
      routeParams.customerName !== undefined ||
      routeParams.plantId !== undefined ||
      routeParams.plantName !== undefined
    ) {
      setContextParams((prev) => ({
        customerId: routeParams.customerId ?? prev.customerId,
        customerName: routeParams.customerName ?? prev.customerName,
        plantId: routeParams.plantId ?? prev.plantId,
        plantName: routeParams.plantName ?? prev.plantName,
      }));
    }
  }, [routeParams.selectedMachines]);

  useFocusEffect(
    React.useCallback(() => {
      const incoming = route.params?.selectedMachines;
      if (incoming !== undefined) {
        setLinkedMachines(incoming);
      }
    }, [route.params])
  );

  useEffect(() => {
    const loadSummaries = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchActionTemplateSummaries();
        setTemplates(data);
      } catch (e: any) {
        if (__DEV__) console.debug('Failed to load action template list', e);
        setError(e?.message || 'Failed to load action templates');
      } finally {
        setLoading(false);
      }
    };
    loadSummaries();
  }, []);

  const selectedTemplate = useMemo(() => {
    if (selectedId == null) return null;
    return templateCache[selectedId] || null;
  }, [selectedId, templateCache]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const relatedField = selectedTemplate.fields.find(isRelatedMachinesField);
    if (!relatedField) return;

    const serialized = JSON.stringify(
      linkedMachines.map((m) => ({
        id: m.machineId,
        name: m.name,
        isLine: m.isLine,
        parentLineId: m.parentLineId ?? null,
      }))
    );

    setFormState((prev) => {
      const current = prev[relatedField.FieldName];
      if (current === serialized) return prev;
      safeLog('debug', 'Actions: machines field updated', {
        field: relatedField.FieldName,
        count: linkedMachines.length,
      });
      return { ...prev, [relatedField.FieldName]: serialized };
    });
  }, [selectedTemplate, linkedMachines]);

  // Keep users field in sync when users change
  useEffect(() => {
    if (!selectedTemplate) return;
    const usersField = selectedTemplate.fields.find(isRelatedUsersField);
    if (!usersField) return;

    const serialized = JSON.stringify(
      linkedUsers.map((u) => ({ id: u.userId, name: u.name, username: u.username || null }))
    );

    setFormState((prev) => {
      const current = prev[usersField.FieldName];
      if (current === serialized) return prev;
      safeLog('debug', 'Actions: users field updated', {
        field: usersField.FieldName,
        count: linkedUsers.length,
      });
      return { ...prev, [usersField.FieldName]: serialized };
    });
  }, [selectedTemplate, linkedUsers]);

  // Clear linked users when machines change or are removed
  // Users are tied to the first machine, so if it changes, clear user selections
  useEffect(() => {
    if (linkedMachines.length === 0 && linkedUsers.length > 0) {
      console.log('🧹 Clearing users because no machines are selected');
      setLinkedUsers([]);
    }
  }, [linkedMachines.length, linkedUsers.length]);

  // Auto-populate Created by field with username from token storage
  useEffect(() => {
    console.log('🔄 Effect triggered: selectedTemplate changed');
    if (!selectedTemplate) {
      console.log('⚠️ No selected template');
      return;
    }

    console.log('🔍 Looking for "Created by" field in', selectedTemplate.fields.length, 'fields');

    const createdByField = selectedTemplate.fields.find(isCreatedByField);
    if (!createdByField) {
      console.log('❌ No "Created by" field found in template');
      return;
    }

    console.log(
      '✅ Found "Created by" field:',
      createdByField.DisplayName,
      '| FieldName:',
      createdByField.FieldName
    );

    const populateUsername = async () => {
      try {
        console.log('🔑 Getting username from storage...');
        const username = await getCurrentUsername();
        console.log('👤 getCurrentUsername returned:', username);

        if (username) {
          console.log(
            '✅ Setting Created by field to:',
            username,
            '| Field:',
            createdByField.FieldName
          );
          setFormState((prev) => {
            const newState = { ...prev, [createdByField.FieldName]: username };
            console.log('📝 Form state updated. Field value:', newState[createdByField.FieldName]);
            return newState;
          });
        } else {
          console.log('❌ Username is null/empty');
        }
      } catch (e) {
        console.error('❌ Error in populateUsername:', e);
      }
    };

    populateUsername();
  }, [selectedTemplate]);

  const visibleFields = useMemo(() => {
    if (!selectedTemplate) return [] as ActionTemplateField[];
    return selectedTemplate.fields
      .filter((f) => f.Display === 'Y')
      .sort((a, b) => (a.Order || 0) - (b.Order || 0));
  }, [selectedTemplate]);

  function buildDefaultState(template: ParsedActionTemplate) {
    const defaults: Record<string, FormValue> = {};
    template.fields.forEach((f) => {
      if (f.Display === 'Y') {
        if (f.FieldName === 'StatusId') {
          defaults[f.FieldName] = 'Select Status';
          return;
        }
        if (f.FieldName === 'CategoryId') {
          defaults[f.FieldName] = 'Select category';
          return;
        }
        if (isUploadField(f)) {
          defaults[f.FieldName] = [];
        } else if (isCreatedByField(f)) {
          // Auto-populate Created by field with username (will be set after token retrieval)
          defaults[f.FieldName] = '';
        } else if (isDateCreatedField(f)) {
          // Auto-populate Date Created field with current date/time
          const now = new Date();
          defaults[f.FieldName] = now.toLocaleString();
        } else {
          const def = (f.Default || '').toString();
          const lower = def.toLowerCase();
          if (lower === 'true' || lower === 'false') {
            defaults[f.FieldName] = lower === 'true';
          } else {
            defaults[f.FieldName] = '';
          }
        }
      }
    });
    return defaults;
  }

  const handleSelectTemplate = async (template: ActionTemplateSummary) => {
    console.log('🎯 Actions: template selected', template.Id, template.Name);
    safeLog('debug', 'Actions: template selected', { id: template.Id, name: template.Name });
    setSelectedId(template.Id);
    setDetailError(null);
    setCategoriesError(null);
    setStatusDropdownOpen(false);
    setCategoryDropdownOpen(false);

    if (templateCache[template.Id]) {
      setFormState(buildDefaultState(templateCache[template.Id]));
      await loadCategories(template.Name);
      return;
    }

    setDetailLoading(true);
    try {
      const detail = await fetchActionTemplateDetails(template.Id);
      if (!detail) {
        setDetailError('Template not found');
        return;
      }
      const hasUsersField = detail.fields.some(isRelatedUsersField);
      const hasMachinesField = detail.fields.some(isRelatedMachinesField);
      console.log(
        '📋 Actions: template fields:',
        detail.fields.map((f) => f.DisplayName)
      );
      console.log('✅ Has users field?', hasUsersField, '| Has machines field?', hasMachinesField);
      safeLog('debug', 'Actions: template detail loaded', {
        fieldCount: detail.fields.length,
        hasUsersField,
        hasMachinesField,
      });
      setTemplateCache((prev) => ({ ...prev, [template.Id]: detail }));
      setFormState(buildDefaultState(detail));
      await loadCategories(template.Name);
    } catch (e: any) {
      if (__DEV__) console.debug('Failed to load template detail', e);
      setDetailError(e?.message || 'Failed to load template fields');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadCategories = async (documentType: string) => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await fetchActionCategories(documentType || 'NOTE');
      setCategories(data);
    } catch (e: any) {
      if (__DEV__) console.debug('Failed to load categories', e);
      setCategoriesError(e?.message || 'Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleChange = (field: ActionTemplateField, value: FormValue) => {
    setFormState((prev) => ({ ...prev, [field.FieldName]: value }));
  };

  const updateAttachmentByKey = (
    fieldName: string,
    key: string,
    updater: (att: UploadAttachment) => UploadAttachment
  ) => {
    setFormState((prev) => {
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

      setFormState((prev) => {
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

      setFormState((prev) => {
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

      setFormState((prev) => {
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
    setFormState((prev) => {
      const existing = prev[field.FieldName];
      if (!Array.isArray(existing)) return prev;
      const next = existing.filter((att) => att.key !== key);
      return { ...prev, [field.FieldName]: next };
    });
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const formStateToSubmit: Record<string, any> = { ...formState };

      for (const [fieldName, value] of Object.entries(formState)) {
        if (Array.isArray(value) && value.length > 0 && 'uri' in value[0]) {
          const attachments = value as UploadAttachment[];
          const uploaded: any[] = [];

          for (const att of attachments) {
            if (att.uploading || att.uploaded) {
              if (att.uploaded && !att.error) {
                uploaded.push({
                  name: att.name,
                  remoteUrl: att.remoteUrl,
                  previewUrl: att.previewUrl,
                  mediaId: att.mediaId,
                });
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
                uploaded.push({
                  name: att.name,
                  remoteUrl: first.SourceLink,
                  previewUrl: first.PreviewLink,
                  mediaId: first.Id,
                });
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

          formStateToSubmit[fieldName] = uploaded;
        }
      }

      Alert.alert('Action saved', 'Form values saved successfully.');
    } catch (e: any) {
      if (__DEV__) console.debug('Submission failed', e);
      setSubmitError(e?.message || 'Failed to submit action');
      Alert.alert('Upload failed', e?.message || 'Failed to upload one or more files.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.muted}>Loading action templates...</Text>
        </View>
      )}

      {error && !loading ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.content}>
          <View style={styles.templateSection}>
            <Text style={styles.sectionTitle}>Templates</Text>
            <View style={styles.templateGrid}>
              {templates.map((item) => {
                const isActive = item.Id === selectedId;
                return (
                  <TouchableOpacity
                    key={item.Id}
                    onPress={() => handleSelectTemplate(item)}
                    style={[styles.templateCard, isActive && styles.templateCardActive]}
                  >
                    <Text style={[styles.templateName, isActive && styles.templateNameActive]}>
                      {item.DisplayName || item.Name}
                    </Text>
                    {item.Description ? (
                      <Text
                        style={[
                          styles.templateDescription,
                          isActive && styles.templateDescriptionActive,
                        ]}
                      >
                        {item.Description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.formContainer}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.card}>
              {detailLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.muted}>Loading template…</Text>
                </View>
              ) : detailError ? (
                <Text style={styles.errorText}>⚠️ {detailError}</Text>
              ) : selectedTemplate ? (
                visibleFields.length > 0 ? (
                  visibleFields.map((field) => {
                    if (isRelatedMachinesField(field)) {
                      return (
                        <View key={field.FieldName} style={styles.fieldRow}>
                          <View style={styles.inlineLabelRow}>
                            <Text style={styles.fieldLabel}>{field.DisplayName}</Text>
                            <TouchableOpacity
                              style={styles.addLink}
                              onPress={() => {
                                safeLog('debug', 'Actions: navigate to machine picker', {
                                  plantId: contextParams.plantId,
                                  preselectedCount: linkedMachines.length,
                                });
                                navigation.navigate('ActionMachinePicker', {
                                  customerId: contextParams.customerId,
                                  customerName: contextParams.customerName,
                                  plantId: contextParams.plantId,
                                  plantName: contextParams.plantName,
                                  initialSelected: linkedMachines,
                                  onSelectMachines: (selections: ActionMachineSelection[]) => {
                                    safeLog('debug', 'Actions: machines selected from picker', {
                                      count: selections.length,
                                      ids: selections.map((m) => m.machineId),
                                    });
                                    setLinkedMachines(selections);
                                  },
                                });
                              }}
                            >
                              <Text style={styles.addLinkText}>+ Add</Text>
                            </TouchableOpacity>
                          </View>
                          {linkedMachines.length ? (
                            <View style={styles.selectionChips}>
                              {linkedMachines.map((m) => (
                                <View key={m.machineId} style={styles.selectionChip}>
                                  <Text style={styles.selectionChipText}>
                                    {m.name}
                                    {m.isLine ? ' (Line)' : ''}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.muted}>No machines linked</Text>
                          )}
                        </View>
                      );
                    }
                    if (isRelatedUsersField(field)) {
                      console.log(
                        '🎨 Rendering users field UI for:',
                        field.DisplayName,
                        '| Machines:',
                        linkedMachines.length
                      );
                      const firstMachine = linkedMachines[0];
                      const hasNoMachine = !firstMachine;
                      return (
                        <View key={field.FieldName} style={styles.fieldRow}>
                          <View style={styles.inlineLabelRow}>
                            <Text style={styles.fieldLabel}>{field.DisplayName}</Text>
                            {hasNoMachine && (
                              <Text style={styles.helperText}>(Add a machine first)</Text>
                            )}
                            <TouchableOpacity
                              style={[styles.addLink, hasNoMachine && styles.addLinkDisabled]}
                              disabled={hasNoMachine}
                              onPress={() => {
                                console.log(
                                  '🖱️ + Add Users button clicked! firstMachine:',
                                  firstMachine
                                );
                                if (!firstMachine) {
                                  Alert.alert(
                                    'Select a machine',
                                    'Please add a machine first to pick users.'
                                  );
                                  return;
                                }
                                console.log(
                                  '👥 Navigating to user picker for machine:',
                                  firstMachine.machineId,
                                  firstMachine.name
                                );
                                safeLog('debug', 'Actions: navigate to user picker', {
                                  machineId: firstMachine.machineId,
                                  machineName: firstMachine.name,
                                  preselectedCount: linkedUsers.length,
                                });
                                navigation.navigate('ActionUserPicker', {
                                  machineId: firstMachine.machineId,
                                  machineName: firstMachine.name,
                                  initialSelected: linkedUsers,
                                  onSelectUsers: (selections: ActionUserSelection[]) => {
                                    safeLog('debug', 'Actions: users selected from picker', {
                                      count: selections.length,
                                      ids: selections.map((u) => u.userId),
                                    });
                                    setLinkedUsers(selections);
                                  },
                                });
                              }}
                            >
                              <Text style={styles.addLinkText}>+ Add</Text>
                            </TouchableOpacity>
                          </View>
                          {linkedUsers.length ? (
                            <View style={styles.selectionChips}>
                              {linkedUsers.map((u) => (
                                <View key={u.userId} style={styles.selectionChip}>
                                  <Text style={styles.selectionChipText}>{u.name}</Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.muted}>No users linked</Text>
                          )}
                        </View>
                      );
                    }
                    // Skip Action Type (TypeId) since it's implied by template
                    if (field.FieldName === 'TypeId') return null;

                    const isBool = isBooleanField(field);
                    const value = formState[field.FieldName];

                    // Custom renderers for specific fields
                    if (field.FieldName === 'StatusId') {
                      return (
                        <View key={field.FieldName} style={styles.fieldRow}>
                          <View style={styles.fieldLabelRow}>
                            <Text style={styles.fieldLabel}>{field.DisplayName}</Text>
                            {field.Mandatory === 'Y' ? (
                              <Text style={styles.required}>*</Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={styles.selectBox}
                            onPress={() => setStatusDropdownOpen((v) => !v)}
                          >
                            <Text
                              style={[
                                styles.selectBoxText,
                                value === 'Select Status' && styles.placeholderText,
                              ]}
                            >
                              {typeof value === 'string' ? value : 'Select Status'}
                            </Text>
                            <Text style={styles.selectBoxArrow}>
                              {statusDropdownOpen ? '▲' : '▼'}
                            </Text>
                          </TouchableOpacity>
                          {statusDropdownOpen ? (
                            <View style={styles.selectDropdown}>
                              {['Open', 'Closed'].map((option) => {
                                const active = value === option;
                                return (
                                  <TouchableOpacity
                                    key={option}
                                    style={[
                                      styles.selectOption,
                                      active && styles.selectOptionActive,
                                    ]}
                                    onPress={() => {
                                      handleChange(field, option);
                                      setStatusDropdownOpen(false);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.selectOptionText,
                                        active && styles.selectOptionTextActive,
                                      ]}
                                    >
                                      {option}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    }

                    if (field.FieldName === 'CategoryId') {
                      const selectedCategory = categories.find((c) => c.Id === value);
                      return (
                        <View key={field.FieldName} style={styles.fieldRow}>
                          <View style={styles.fieldLabelRow}>
                            <Text style={styles.fieldLabel}>{field.DisplayName}</Text>
                            {field.Mandatory === 'Y' ? (
                              <Text style={styles.required}>*</Text>
                            ) : null}
                          </View>
                          {categoriesLoading ? (
                            <View style={styles.inlineCenter}>
                              <ActivityIndicator size="small" color="#007AFF" />
                              <Text style={styles.muted}>Loading categories…</Text>
                            </View>
                          ) : categoriesError ? (
                            <Text style={styles.errorText}>⚠️ {categoriesError}</Text>
                          ) : (
                            <>
                              <TouchableOpacity
                                style={styles.selectBox}
                                onPress={() => setCategoryDropdownOpen((v) => !v)}
                              >
                                <Text
                                  style={[
                                    styles.selectBoxText,
                                    !selectedCategory && styles.placeholderText,
                                  ]}
                                >
                                  {selectedCategory?.DisplayName || 'Select category'}
                                </Text>
                                <Text style={styles.selectBoxArrow}>
                                  {categoryDropdownOpen ? '▲' : '▼'}
                                </Text>
                              </TouchableOpacity>
                              {categoryDropdownOpen ? (
                                <View style={styles.selectDropdown}>
                                  {categories.map((cat) => {
                                    const active = value === cat.Id;
                                    return (
                                      <TouchableOpacity
                                        key={cat.Id}
                                        style={[
                                          styles.selectOption,
                                          active && styles.selectOptionActive,
                                        ]}
                                        onPress={() => {
                                          handleChange(field, cat.Id);
                                          setCategoryDropdownOpen(false);
                                        }}
                                      >
                                        <Text
                                          style={[
                                            styles.selectOptionText,
                                            active && styles.selectOptionTextActive,
                                          ]}
                                        >
                                          {cat.DisplayName || cat.Name}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              ) : null}
                            </>
                          )}
                        </View>
                      );
                    }

                    if (isUploadField(field)) {
                      const attachments = Array.isArray(value) ? value : [];
                      return (
                        <View key={field.FieldName} style={styles.fieldRow}>
                          <View style={styles.fieldLabelRow}>
                            <Text style={styles.fieldLabel}>{field.DisplayName}</Text>
                            {field.Mandatory === 'Y' ? (
                              <Text style={styles.required}>*</Text>
                            ) : null}
                          </View>
                          <View style={styles.uploadRow}>
                            <TouchableOpacity
                              style={styles.uploadButton}
                              onPress={() => handlePickDocument(field)}
                            >
                              <Text style={styles.uploadButtonText}>Add file</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cameraButton}
                              onPress={() => handleCapturePhoto(field)}
                            >
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
                              {attachments.map((att, idx) => (
                                <View key={att.key} style={styles.attachmentChip}>
                                  <Text style={styles.attachmentName} numberOfLines={1}>
                                    {att.name}
                                  </Text>
                                  {att.uploading ? (
                                    <Text style={styles.attachmentStatus}>Uploading…</Text>
                                  ) : att.error ? (
                                    <Text
                                      style={[
                                        styles.attachmentStatus,
                                        styles.attachmentStatusError,
                                      ]}
                                    >
                                      Failed
                                    </Text>
                                  ) : att.uploaded ? (
                                    <Text
                                      style={[styles.attachmentStatus, styles.attachmentStatusDone]}
                                    >
                                      Uploaded
                                    </Text>
                                  ) : (
                                    <Text style={styles.attachmentStatusPending}>Pending</Text>
                                  )}
                                  <TouchableOpacity
                                    onPress={() => handleRemoveAttachment(field, att.key)}
                                  >
                                    <Text style={styles.attachmentRemove}>x</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      );
                    }

                    if (field.FieldName === 'IsActive') {
                      return (
                        <View key={field.FieldName} style={styles.fieldRow}>
                          <View style={styles.fieldLabelRow}>
                            <Text style={styles.fieldLabel}>{field.DisplayName}</Text>
                            {field.Mandatory === 'Y' ? (
                              <Text style={styles.required}>*</Text>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={[styles.togglePill, value ? styles.togglePillOn : undefined]}
                            onPress={() => handleChange(field, !value)}
                          >
                            <View
                              style={[styles.toggleThumb, value ? styles.toggleThumbOn : undefined]}
                            >
                              {value ? <Text style={styles.toggleCheck}>✓</Text> : null}
                            </View>
                            <Text
                              style={[styles.toggleLabel, value ? styles.toggleLabelOn : undefined]}
                            >
                              {value ? 'Yes' : 'No'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                      <View key={field.FieldName} style={styles.fieldRow}>
                        <View style={styles.fieldLabelRow}>
                          <Text style={styles.fieldLabel}>{field.DisplayName}</Text>
                          {field.Mandatory === 'Y' ? <Text style={styles.required}>*</Text> : null}
                        </View>
                        {isBool ? (
                          <View style={styles.switchRow}>
                            <Text style={styles.switchValue}>{value ? 'Yes' : 'No'}</Text>
                            <TouchableOpacity
                              style={styles.switchButton}
                              onPress={() => handleChange(field, !value)}
                            >
                              <Text style={styles.switchButtonText}>{value ? 'ON' : 'OFF'}</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TextInput
                            style={styles.input}
                            placeholder={field.DisplayName}
                            placeholderTextColor="rgba(17,24,39,0.4)"
                            value={typeof value === 'string' ? value : ''}
                            onChangeText={(text) => handleChange(field, text)}
                          />
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.muted}>No fields to display for this template.</Text>
                )
              ) : (
                <Text style={styles.muted}>Select a template to begin.</Text>
              )}
            </View>
          </ScrollView>

          {selectedTemplate && !detailLoading ? (
            <View style={styles.buttonContainer}>
              {submitError ? <Text style={styles.errorText}>⚠️ {submitError}</Text> : null}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitText}>
                  {submitting ? 'Saving & Uploading...' : 'Save Action'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  center: {
    paddingTop: 40,
    alignItems: 'center',
  },
  muted: {
    color: '#6B7280',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  templateSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  templateCard: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  templateCardActive: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  templateName: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  templateNameActive: {
    color: '#1D4ED8',
  },
  templateDescription: {
    marginTop: 4,
    color: '#4B5563',
    fontSize: 10,
    textAlign: 'center',
  },
  templateDescriptionActive: {
    color: '#1F2937',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  required: {
    color: '#DC2626',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  switchValue: {
    fontSize: 14,
    color: '#111827',
  },
  switchButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#111827',
    borderRadius: 6,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    marginTop: 0,
    backgroundColor: '#3788d8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  statusChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  statusChipText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#1D4ED8',
  },
  inlineCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  categoryChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#1D4ED8',
  },
  selectBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  selectBoxText: {
    fontSize: 14,
    color: '#111827',
  },
  selectBoxArrow: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  selectDropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 6,
    overflow: 'hidden',
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectOptionActive: {
    backgroundColor: '#DBEAFE',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#111827',
  },
  selectOptionTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  addLink: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  addLinkDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
  },
  addLinkText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  placeholderText: {
    color: '#9CA3AF',
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
  selectionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectionChip: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectionChipText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    marginTop: 4,
  },
  togglePillOn: {
    backgroundColor: '#BBF7D0',
    borderColor: '#22C55E',
  },
  toggleThumb: {
    width: 28,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleThumbOn: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  toggleCheck: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  toggleLabelOn: {
    color: '#166534',
  },
});
