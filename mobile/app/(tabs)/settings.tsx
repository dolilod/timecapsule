import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Text, View } from '@/components/Themed';
import {
  getDefaultChild,
  updateChildProfile,
  isValidEmail,
  calculateDayNumber,
  calculateAge,
} from '@/services/storage';
import { ChildProfile } from '@/types';

export default function SettingsScreen() {
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthday, setEditBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadChild = useCallback(async () => {
    const defaultChild = await getDefaultChild();
    setChild(defaultChild);
    if (defaultChild) {
      setEditName(defaultChild.name);
      setEditEmail(defaultChild.email);
      setEditBirthday(new Date(defaultChild.birthday));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChild();
    }, [loadChild])
  );

  const validateForm = (): boolean => {
    const newErrors: { name?: string; email?: string } = {};

    if (!editName.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!editEmail.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(editEmail.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!child || !validateForm()) return;

    setIsSaving(true);
    try {
      const updated = await updateChildProfile(child.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        birthday: editBirthday.toISOString(),
      });

      if (updated) {
        setChild(updated);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (child) {
      setEditName(child.name);
      setEditEmail(child.email);
      setEditBirthday(new Date(child.birthday));
    }
    setErrors({});
    setIsEditing(false);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!child) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Child Profile</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={editName}
                onChangeText={(text) => {
                  setEditName(text);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                placeholder="Enter name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Birthday</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>{formatDate(editBirthday)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={editBirthday}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setEditBirthday(selectedDate);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={editEmail}
                onChangeText={(text) => {
                  setEditEmail(text);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                placeholder="child@gmail.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{child.name}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Birthday</Text>
              <Text style={styles.profileValue}>
                {formatDate(new Date(child.birthday))}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Age</Text>
              <Text style={styles.profileValue}>{calculateAge(child.birthday)}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Day</Text>
              <Text style={styles.profileValue}>
                Day {calculateDayNumber(child.birthday)}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{child.email}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gmail</Text>
        <View style={styles.profileCard}>
          <Text style={styles.notConnected}>Not connected</Text>
          <Text style={styles.hint}>Gmail connection coming in Task D</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.profileCard}>
          <Text style={styles.hint}>Notification settings coming in Task C</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  section: {
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  profileLabel: {
    fontSize: 15,
    color: '#666',
  },
  profileValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  notConnected: {
    fontSize: 15,
    color: '#ff9500',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#999',
  },
  form: {
    backgroundColor: 'transparent',
  },
  inputGroup: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
