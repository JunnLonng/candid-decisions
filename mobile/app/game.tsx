import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Dice } from '@/components/Dice';
import { StorageService } from '@/services/storage';
import { HapticService } from '@/services/haptics';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface Place {
    id: string;
    name: string;
}

export default function GameScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [candidates, setCandidates] = useState<Place[]>([]);
    const [rolling, setRolling] = useState(false);
    const [result, setResult] = useState<Place | null>(null);
    const [resultIndex, setResultIndex] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (params.candidates) {
            try {
                const parsed = JSON.parse(params.candidates as string);
                setCandidates(parsed);
            } catch (e) {
                Alert.alert("Error", "Invalid game data.");
                router.back();
            }
        }
    }, [params.candidates]);

    const handleRoll = async () => {
        if (rolling) return;

        // Start rolling
        setRolling(true);
        setResult(null);
        setResultIndex(undefined);
        HapticService.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Simulate roll time (e.g. 2 seconds)
        setTimeout(() => {
            finishRoll();
        }, 2000);
    };

    const finishRoll = async () => {
        // Pick winner
        const winnerIdx = Math.floor(Math.random() * candidates.length);
        const winner = candidates[winnerIdx];

        setResultIndex(winnerIdx + 1); // Dice is 1-indexed (1..6)
        setRolling(false);
        setResult(winner);
        HapticService.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Update Stats
        await StorageService.incrementRolls();
    };

    const handleExit = () => {
        // Navigate back to the main Home screen
        router.replace('/home');
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8F9FE', '#E3F2FD']}
                style={StyleSheet.absoluteFill}
            />
            <Stack.Screen options={{
                title: '',
                headerTransparent: true,
                headerTintColor: Colors.text,
                headerBackTitle: 'Back',
            }} />

            <View style={styles.content}>
                {/* Fixed position container for Dice */}
                <View style={styles.diceContainer}>
                    <Dice rolling={rolling} result={resultIndex} />
                </View>

                {/* SHOW WINNER & EXIT BUTTON */}
                {result && !rolling && (
                    <View style={styles.resultContainer}>
                        <Text style={styles.winnerText}>The Decision is:</Text>
                        <Text style={styles.winnerName}>{result.name}</Text>

                        <TouchableOpacity
                            style={styles.exitButtonWrapper}
                            onPress={handleExit}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#FF4081', '#F50057']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.exitText}>Exit to Menu</Text>
                                <Ionicons name="arrow-forward-circle-outline" size={24} color="white" style={{ marginLeft: 8 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ROLL BUTTON */}
                {!rolling && !result && (
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={styles.rollButton}
                            onPress={handleRoll}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#FF4081', '#F50057']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.rollText}>ROLL DICE</Text>
                                <Ionicons name="dice" size={24} color="white" style={{ marginLeft: 10 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.instruction}>Tap to cast your fate</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start', // Align to top to prevent center-shift
        paddingTop: height * 0.3, // Push content down to approx center initially
    },
    diceContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        // Ensure dice is visually anchored
        zIndex: 10,
    },
    controls: {
        alignItems: 'center',
        marginTop: 20, // Add space below dice
    },
    instruction: {
        fontSize: 14,
        color: '#9E9E9E',
        marginTop: 16,
        fontWeight: '500',
    },
    rollButton: {
        shadowColor: '#F50057',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        borderRadius: 30,
    },
    exitButtonWrapper: {
        shadowColor: '#F50057',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, // Slightly less shadow than main action if desired, or same
        shadowRadius: 12,
        elevation: 8,
        borderRadius: 30,
    },
    gradientButton: {
        width: 220,
        height: 64,
        borderRadius: 32,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rollText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.white,
        letterSpacing: 1,
    },

    // Result Styles
    resultContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    winnerText: {
        fontSize: 18,
        color: '#757575',
        marginBottom: 8,
    },
    winnerName: {
        fontSize: 32,
        fontWeight: '900',
        color: Colors.text,
        marginBottom: 30,
        textAlign: 'center',
    },
    exitText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    }
});
