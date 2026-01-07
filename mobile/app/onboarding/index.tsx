import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  View,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui';
import { saveChildProfile, isValidEmail } from '@/services/storage';
import { scheduleDailyReminder } from '@/services/notifications';
import { toDateOnlyString } from '@/services/date';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, typography, spacing, componentRadius } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; email?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const childName = name.trim();
      await saveChildProfile({
        name: childName,
        email: email.trim().toLowerCase(),
        birthday: toDateOnlyString(birthday),
      });

      await scheduleDailyReminder(childName);
      router.replace('/(tabs)/compose');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Icon */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.prompt.background },
            ]}
          >
            <FontAwesome name="gift" size={40} color={colors.interactive.primary} />
          </View>
          <Text style={[typography.styles.displayMedium, { color: colors.text.primary }]}>
            Time Capsule
          </Text>
          <Text
            style={[
              typography.styles.body,
              { color: colors.text.secondary, marginTop: spacing[2], textAlign: 'center' },
            ]}
          >
            Create daily memories for your child to open at 18
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text
            style={[
              typography.styles.h2,
              { color: colors.text.primary, marginBottom: spacing[6] },
            ]}
          >
            Add Your Child
          </Text>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                typography.styles.label,
                { color: colors.text.primary, marginBottom: spacing[2] },
              ]}
            >
              Child's Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.primary,
                  borderColor: errors.name ? colors.status.error : colors.border.DEFAULT,
                  borderRadius: componentRadius.input,
                  color: colors.text.primary,
                },
                typography.styles.bodyLarge,
              ]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder="Enter name"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {errors.name && (
              <Text
                style={[
                  typography.styles.bodySmall,
                  { color: colors.status.error, marginTop: spacing[1] },
                ]}
              >
                {errors.name}
              </Text>
            )}
          </View>

          {/* Birthday Picker */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                typography.styles.label,
                { color: colors.text.primary, marginBottom: spacing[2] },
              ]}
            >
              Birthday
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: colors.background.primary,
                  borderColor: colors.border.DEFAULT,
                  borderRadius: componentRadius.input,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[typography.styles.bodyLarge, { color: colors.text.primary }]}>
                {formatDate(birthday)}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View
                style={[
                  styles.datePickerContainer,
                  {
                    backgroundColor: colors.card.backgroundAlt,
                    borderRadius: componentRadius.card,
                  },
                ]}
              >
                <DateTimePicker
                  value={birthday}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setBirthday(selectedDate);
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[
                      styles.datePickerDone,
                      { backgroundColor: colors.interactive.primary },
                    ]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text
                      style={[typography.styles.button, { color: colors.text.inverse }]}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text
              style={[
                typography.styles.label,
                { color: colors.text.primary, marginBottom: spacing[1] },
              ]}
            >
              Child's Email Address
            </Text>
            <Text
              style={[
                typography.styles.bodySmall,
                { color: colors.text.tertiary, marginBottom: spacing[2] },
              ]}
            >
              This is where all memories will be sent
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.primary,
                  borderColor: errors.email ? colors.status.error : colors.border.DEFAULT,
                  borderRadius: componentRadius.input,
                  color: colors.text.primary,
                },
                typography.styles.bodyLarge,
              ]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
              placeholder="child@gmail.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && (
              <Text
                style={[
                  typography.styles.bodySmall,
                  { color: colors.status.error, marginTop: spacing[1] },
                ]}
              >
                {errors.email}
              </Text>
            )}
          </View>

          {/* Submit Button */}
          <View style={{ marginTop: spacing[6] }}>
            <Button
              title={isSubmitting ? 'Creating...' : 'Continue'}
              onPress={handleSubmit}
              size="lg"
              fullWidth
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  form: {},
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    padding: 16,
  },
  dateButton: {
    borderWidth: 1,
    padding: 16,
  },
  datePickerContainer: {
    marginTop: 8,
    overflow: 'hidden',
  },
  datePickerDone: {
    padding: 12,
    alignItems: 'center',
  },
});
