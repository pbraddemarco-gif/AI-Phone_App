import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { authService } from '../services/authService';
import { CustomerAccount } from '../types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlants, Plant } from '../services/plantService';

const SELECTED_CUSTOMER_KEY = '@selected_customer';

export type CustomerSelectorProps = NativeStackScreenProps<RootStackParamList, 'CustomerSelector'>;

interface CompanyInfo {
  id: number;
  name: string;
}

const CustomerSelectorScreen: React.FC<CustomerSelectorProps> = ({ navigation }) => {
  const theme = useAppTheme();
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [uniqueCompanies, setUniqueCompanies] = useState<CompanyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyInfo | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showPlantDropdown, setShowPlantDropdown] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const accounts = await authService.getCustomerAccounts();
      setCustomers(accounts);

      // Extract unique companies with their IDs
      // Each customer account represents a company with an ID
      const companyMap = new Map<number, string>();
      accounts.forEach((acc) => {
        if (!companyMap.has(acc.Id)) {
          companyMap.set(acc.Id, acc.Name);
        }
      });

      const companies: CompanyInfo[] = Array.from(companyMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setUniqueCompanies(companies);

      // Don't auto-select - let user explicitly choose
    } catch (error) {
      if (__DEV__) console.debug('❌ Failed to load customer accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = async (company: CompanyInfo) => {
    setSelectedCompany(company);
    setShowCompanyDropdown(false);
    setSelectedPlant(null);
    setPlants([]);

    setLoadingPlants(true);
    try {
      const plantList = await getPlants(company.id);
      setPlants(plantList);

      if (plantList.length === 1) {
        const onlyPlant = plantList[0];
        setSelectedPlant(onlyPlant);
        // Create CustomerAccount and navigate
        const customerAccount: CustomerAccount = {
          Id: onlyPlant.Id,
          Name: company.name,
          DisplayName: onlyPlant.DisplayName,
          ParentId: onlyPlant.ClientId,
        };
        await selectCustomer(customerAccount);
        return;
      }
    } catch (error) {
      if (__DEV__) console.debug('❌ Failed to load plants:', error);
      setPlants([]);
    } finally {
      setLoadingPlants(false);
    }
  };

  const handlePlantSelect = (plant: Plant) => {
    setSelectedPlant(plant);
    setShowPlantDropdown(false);
  };

  const handleContinue = async () => {
    if (!selectedPlant || !selectedCompany) return;

    // Create CustomerAccount object combining company and plant info
    const customerAccount: CustomerAccount = {
      Id: selectedPlant.Id, // Plant ID for machine API
      Name: selectedCompany.name, // Company name
      DisplayName: selectedPlant.DisplayName, // Plant display name
      ParentId: selectedPlant.ClientId, // Client ID
    };

    await selectCustomer(customerAccount);
  };

  const selectCustomer = async (customer: CustomerAccount) => {
    try {
      await AsyncStorage.setItem(SELECTED_CUSTOMER_KEY, JSON.stringify(customer));

      navigation.replace('MachineList');
    } catch (error) {
      if (__DEV__) console.debug('❌ Failed to save customer selection:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.neutralText }]}>
            Loading customer accounts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (customers.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            No customer accounts found
          </Text>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => {
              authService.logout();
            }}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Select Customer</Text>
        <Text style={[styles.subtitle, { color: theme.colors.neutralText }]}>
          Choose your company and plant
        </Text>
      </View>

      <View style={styles.content}>
        {/* Company Selector */}
        <Text style={[styles.label, { color: theme.colors.text }]}>Company</Text>
        <TouchableOpacity
          style={[
            styles.dropdown,
            { backgroundColor: theme.colors.backgroundNeutral, borderColor: theme.colors.accent },
          ]}
          onPress={() => setShowCompanyDropdown(true)}
        >
          <Text
            style={[
              styles.dropdownText,
              { color: selectedCompany ? theme.colors.text : theme.colors.neutralText },
            ]}
          >
            {selectedCompany ? selectedCompany.name : 'Select a company...'}
          </Text>
          <Text style={[styles.dropdownArrow, { color: theme.colors.neutralText }]}>▼</Text>
        </TouchableOpacity>

        {/* Plant Selector - shown after company is selected */}
        {selectedCompany && (
          <>
            <Text style={[styles.label, { color: theme.colors.text, marginTop: 24 }]}>
              Plant / Area
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdown,
                {
                  backgroundColor: theme.colors.backgroundNeutral,
                  borderColor: theme.colors.accent,
                },
              ]}
              onPress={() => setShowPlantDropdown(true)}
              disabled={loadingPlants || plants.length === 0}
            >
              <Text
                style={[
                  styles.dropdownText,
                  { color: selectedPlant ? theme.colors.text : theme.colors.neutralText },
                ]}
              >
                {loadingPlants
                  ? 'Loading plants...'
                  : selectedPlant
                    ? selectedPlant.DisplayName
                    : plants.length === 0
                      ? 'No plants available'
                      : 'Select a plant...'}
              </Text>
              {!loadingPlants && plants.length > 0 && (
                <Text style={[styles.dropdownArrow, { color: theme.colors.neutralText }]}>▼</Text>
              )}
              {loadingPlants && <ActivityIndicator size="small" color={theme.colors.accent} />}
            </TouchableOpacity>
          </>
        )}

        {/* Info text */}
        {!selectedCompany && (
          <Text style={[styles.infoText, { color: theme.colors.neutralText }]}>
            Please select a company to view available plants
          </Text>
        )}

        {/* Continue Button */}
        {selectedCompany && selectedPlant && (
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.colors.accent }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue to Machine List</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Company Dropdown Modal */}
      <Modal
        visible={showCompanyDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompanyDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCompanyDropdown(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Company</Text>
            <FlatList
              data={uniqueCompanies}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.companyItem,
                    { backgroundColor: theme.colors.backgroundNeutral },
                    selectedCompany?.id === item.id && styles.companyItemSelected,
                  ]}
                  onPress={() => handleCompanySelect(item)}
                >
                  <Text style={[styles.companyItemText, { color: theme.colors.text }]}>
                    {item.name}
                  </Text>
                  {selectedCompany?.id === item.id && (
                    <Text style={[styles.checkmark, { color: theme.colors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.backgroundNeutral }]}
              onPress={() => setShowCompanyDropdown(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.neutralText }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Plant Dropdown Modal */}
      <Modal
        visible={showPlantDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlantDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlantDropdown(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Select Plant / Area
            </Text>
            <FlatList
              data={plants}
              keyExtractor={(item) => item.Id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.companyItem,
                    { backgroundColor: theme.colors.backgroundNeutral },
                    selectedPlant?.Id === item.Id && styles.companyItemSelected,
                  ]}
                  onPress={() => handlePlantSelect(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.companyItemText, { color: theme.colors.text }]}>
                      {item.DisplayName}
                    </Text>
                    <Text style={[styles.plantSubtext, { color: theme.colors.neutralText }]}>
                      {item.ChildMachinesCount} machines
                    </Text>
                  </View>
                  {selectedPlant?.Id === item.Id && (
                    <Text style={[styles.checkmark, { color: theme.colors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.backgroundNeutral }]}
              onPress={() => setShowPlantDropdown(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.neutralText }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  logoutButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  plantList: {
    paddingBottom: 24,
  },
  plantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  plantName: {
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  companyItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyItemSelected: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  companyItemText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  plantSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CustomerSelectorScreen;
