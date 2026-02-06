import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Dimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export interface Place {
    id: string;
    name: string;
}

export default function CandidatesScreen() {
    const router = useRouter();
    const [focusedInput, setFocusedInput] = useState<number | null>(null);

    // Initialize 6 empty slots
    const [inputs, setInputs] = useState<string[]>(['', '', '', '', '', '']);

    const handleTextChange = (text: string, index: number) => {
        const newInputs = [...inputs];
        newInputs[index] = text;
        setInputs(newInputs);
    };

    const clearInput = (index: number) => {
        const newInputs = [...inputs];
        newInputs[index] = '';
        setInputs(newInputs);
    };

    const countValid = inputs.filter(i => i.trim().length > 0).length;
    const canProceed = countValid >= 2;

    const onConfirm = () => {
        const validCandidates = inputs
            .filter(name => name.trim().length > 0)
            .map((name, index) => ({ id: index.toString(), name: name.trim() }));

        if (validCandidates.length < 2) {
            Alert.alert("Need more options", "Please enter at least 2 options to roll the dice!");
            return;
        }

        router.push({
            pathname: '/game',
            params: { candidates: JSON.stringify(validCandidates) }
        });
    };

    const getPlaceholder = (index: number) => {
        const examples = [
            "e.g. Watch a Movie",
            "e.g. Read a Book",
            "e.g. Order Pizza",
            "e.g. Go for a Run",
            "e.g. Call Mom",
            "e.g. Take a Nap"
        ];
        return examples[index] || `Option ${index + 1}`;
    };

    return (
        <View style={styles.mainContainer}>
            <LinearGradient
                colors={['#F8F9FE', '#E3F2FD']}
                style={StyleSheet.absoluteFill}
            />
            <Stack.Screen options={{
                title: '',
                headerTransparent: true,
                headerBackTitle: 'Back',
                headerTintColor: Colors.text
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardContainer}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerSpacer} />

                    <View style={styles.header}>
                        <Text style={styles.title}>Decisions, Decisions...</Text>
                        <Text style={styles.subtitle}>Enter your options below to let fate decide.</Text>

                        <View style={styles.badgeContainer}>
                            <View style={[styles.statusBadge, canProceed ? styles.statusBadgeSuccess : styles.statusBadgePending]}>
                                <Ionicons name={canProceed ? "checkmark-circle" : "information-circle"} size={16} color={canProceed ? "#4CAF50" : "#FF9800"} />
                                <Text style={[styles.statusText, canProceed ? { color: "#4CAF50" } : { color: "#FF9800" }]}>
                                    {canProceed ? "Ready to roll!" : `Add ${2 - countValid} more option${2 - countValid === 1 ? '' : 's'}`}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.formCard}>
                        {inputs.map((value, index) => (
                            <View key={index} style={[
                                styles.inputRow,
                                focusedInput === index && styles.inputRowFocused
                            ]}>
                                <View style={[
                                    styles.numberBadge,
                                    (value.length > 0 || focusedInput === index) && styles.numberBadgeActive
                                ]}>
                                    <Text style={[
                                        styles.numberText,
                                        (value.length > 0 || focusedInput === index) && styles.numberTextActive
                                    ]}>{index + 1}</Text>
                                </View>

                                <TextInput
                                    style={styles.input}
                                    placeholder={getPlaceholder(index)}
                                    placeholderTextColor="#A0A0A0"
                                    value={value}
                                    onChangeText={(text) => handleTextChange(text, index)}
                                    onFocus={() => setFocusedInput(index)}
                                    onBlur={() => setFocusedInput(null)}
                                    autoCapitalize="sentences"
                                />

                                {value.length > 0 && (
                                    <TouchableOpacity onPress={() => clearInput(index)} style={styles.clearButton}>
                                        <Ionicons name="close-circle" size={20} color="#CFD8DC" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.confirmButton, !canProceed && styles.disabledButton]}
                        onPress={onConfirm}
                        disabled={!canProceed}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={canProceed ? ['#FF4081', '#F50057'] : ['#E0E0E0', '#BDBDBD']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={[styles.confirmText, !canProceed && styles.disabledText]}>Let's Roll!</Text>
                            <Ionicons name="dice-outline" size={24} color={canProceed ? Colors.white : '#9E9E9E'} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.confirmButton, { marginTop: 15, shadowColor: '#546E7A' }]}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#78909C', '#546E7A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={styles.confirmText}>Return to Main Menu</Text>
                            <Ionicons name="home-outline" size={24} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    headerSpacer: {
        height: 10,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    badgeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#FFF3E0', // Default pending background
    },
    statusBadgeSuccess: {
        backgroundColor: '#E8F5E9',
    },
    statusBadgePending: {
        backgroundColor: '#FFF3E0',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    formCard: {
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
        borderWidth: 0,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 60,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 2,
    },
    inputRowFocused: {
        borderColor: Colors.primary,
        transform: [{ scale: 1.02 }],
    },
    numberBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    numberBadgeActive: {
        backgroundColor: Colors.primary,
    },
    numberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#9E9E9E',
    },
    numberTextActive: {
        color: '#FFFFFF',
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    clearButton: {
        padding: 8,
    },
    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Reduced from 40
        backgroundColor: 'transparent',
    },
    confirmButton: {
        borderRadius: 20,
        shadowColor: '#F50057',
        shadowOffset: { width: 0, height: 6 }, // Reduced shadow
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    disabledButton: {
        shadowOpacity: 0,
        elevation: 0,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14, // Reduced from 18
        borderRadius: 20,
    },
    confirmText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 10,
    },
    disabledText: {
        color: '#9E9E9E',
    },
    cancelButton: {
        marginTop: 10, // Reduced from 15
        alignItems: 'center',
        padding: 10,
    },
    cancelText: {
        fontSize: 16,
        color: '#757575',
        fontWeight: '600',
    },
});
