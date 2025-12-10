import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
// Replacing inline SVG with provided bitmap asset to "match uploaded image file"
import aiLogo from '../../assets/ai-logo.png';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { authService } from '../services/authService';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.login(username, password);

      // Navigation will happen automatically via RootNavigator when auth state changes
      // No manual navigation needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // TEMPORARY: Dev bypass - skip auth for testing
  const handleDevBypass = () => {
    navigation.navigate('ProductionDashboard', {});
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.backgroundDark }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Image source={aiLogo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: theme.colors.accent }]}>Automation Intellect</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textInverse }]}>
          Log in to your account
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.accent,
              color: theme.colors.textInverse,
              backgroundColor: theme.colors.primaryActive,
            },
          ]}
          placeholder="Username"
          placeholderTextColor={theme.colors.neutralText}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.accent,
              color: theme.colors.textInverse,
              backgroundColor: theme.colors.primaryActive,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={theme.colors.neutralText}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          onSubmitEditing={handleLogin}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.accent },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* TEMPORARY: Development shortcut - remove before production */}
        <TouchableOpacity style={styles.devLink} onPress={handleDevBypass}>
          <Text style={[styles.devLinkText, { color: theme.colors.accent }]}>
            🔧 Dev: Go to Production (Mock Data)
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
    width: '100%',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.9,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
    width: '100%',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  devLink: {
    marginTop: 24,
    paddingVertical: 8,
  },
  devLinkText: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
});
