import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase, Match } from '@/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';

import { StorageService } from '@/services/storage';
import { HapticService } from '@/services/haptics';

type Stage = 'menu' | 'host-setup' | 'join-setup' | 'waiting' | 'playing' | 'revealed';
type Move = 'rock' | 'paper' | 'scissors';

// 3D Assets
const rockImg = require('@/assets/images/rock-3d.png');
const paperImg = require('@/assets/images/paper-3d.png');
const scissorsImg = require('@/assets/images/scissors-3d.png');

export default function RPSScreen() {
    const router = useRouter();
    const [stage, setStage] = useState<Stage>('menu');
    const [gameId, setGameId] = useState('');

    // User Inputs
    const [myName, setMyName] = useState('');
    const [myFood, setMyFood] = useState('');

    // Load username automatically
    useEffect(() => {
        StorageService.getStats().then(stats => {
            if (stats.username) {
                setMyName(stats.username);
            }
        });
    }, []);

    const [role, setRole] = useState<'host' | 'guest' | null>(null);
    const [matchData, setMatchData] = useState<Match | null>(null);
    const [loading, setLoading] = useState(false);

    // Auto-polling backup (runs every 3s)
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (gameId && (stage === 'waiting' || stage === 'playing')) {
            interval = setInterval(() => {
                checkStatusManual(gameId);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [gameId, stage]);

    useEffect(() => {
        return () => {
            supabase.removeAllChannels();
        };
    }, []);

    // --- HOST FLOW ---
    const createGame = async () => {
        if (!myFood.trim() || !myName.trim()) {
            Alert.alert("Missing Info", "Please ensure your name is set in profile and enter a choice.");
            return;
        }
        setLoading(true);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Cleanup old games
        supabase.from('matches').delete().eq('status', 'revealed').lt('created_at', yesterday.toISOString()).then(() => { });
        supabase.from('matches').delete().eq('status', 'waiting').lt('created_at', yesterday.toISOString()).then(() => { });

        const newId = Math.random().toString(36).substring(2, 6).toUpperCase();

        const { error } = await supabase
            .from('matches')
            .insert({
                id: newId,
                host_name: myName,
                host_food: myFood,
                status: 'waiting'
            });

        setLoading(false);

        if (error) {
            Alert.alert("Error", "Could not create game. Ensure table has host_name column.");
            console.error(error);
            return;
        }

        setRole('host');
        setGameId(newId);
        setStage('waiting');
        subscribeToGame(newId);
    };

    // --- JOIN FLOW ---
    const joinGame = async () => {
        if (!gameId.trim() || !myFood.trim() || !myName.trim()) {
            Alert.alert("Missing Info", "Enter Game ID and your Choice.");
            return;
        }
        setLoading(true);

        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .eq('id', gameId.toUpperCase())
            .single();

        if (error || !data) {
            setLoading(false);
            Alert.alert("Not Found", "Game not found.");
            return;
        }

        if (data.status !== 'waiting') {
            setLoading(false);
            Alert.alert("Full", "Game is already in progress.");
            return;
        }

        const { error: updateError } = await supabase
            .from('matches')
            .update({
                guest_name: myName,
                guest_food: myFood,
                status: 'playing'
            })
            .eq('id', gameId.toUpperCase());

        setLoading(false);

        if (updateError) {
            Alert.alert("Error", "Could not join.");
            return;
        }

        setRole('guest');
        setStage('playing');
        subscribeToGame(gameId.toUpperCase());
    };

    // Manual backup check
    const checkStatusManual = async (id: string) => {
        const { data } = await supabase.from('matches').select('*').eq('id', id).single();
        if (data) {
            setMatchData(data);
            handleGameUpdate(data);
        }
    };

    const subscribeToGame = (id: string) => {
        supabase
            .channel('game_updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
                (payload) => {
                    const newMatch = payload.new as Match;
                    setMatchData(newMatch);
                    handleGameUpdate(newMatch);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    checkStatusManual(id);
                }
            });
    };

    const handleGameUpdate = (match: Match) => {
        if (role === 'host' && match.status === 'playing' && stage === 'waiting') {
            setStage('playing');
            HapticService.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        if (match.host_move && match.guest_move) {
            const winner = determineWinner(match.host_move as Move, match.guest_move as Move);
            setResult(winner, match);
            setStage('revealed');
        }
    };

    const submitMove = async (move: Move) => {
        if (!gameId) return;
        HapticService.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updateField = role === 'host' ? { host_move: move } : { guest_move: move };
        await supabase.from('matches').update(updateField).eq('id', gameId);
    };

    const determineWinner = (m1: Move, m2: Move): 'host' | 'guest' | 'tie' => {
        if (m1 === m2) return 'tie';
        if ((m1 === 'rock' && m2 === 'scissors') ||
            (m1 === 'paper' && m2 === 'rock') ||
            (m1 === 'scissors' && m2 === 'paper')) {
            return 'host';
        }
        return 'guest';
    };

    const [finalWinner, setFinalWinner] = useState<'host' | 'guest' | 'tie' | null>(null);

    const setResult = (w: 'host' | 'guest' | 'tie', match: Match) => {
        setFinalWinner(w);
        if (w !== 'tie') HapticService.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const renderMoveButton = (move: Move, imageSource: any, label: string, colors: [string, string]) => (
        <TouchableOpacity activeOpacity={0.9} style={styles.moveButtonWrapper} onPress={() => submitMove(move)}>
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moveButtonGradient}
            >
                <Image source={imageSource} style={styles.moveIcon} resizeMode="contain" />
                <Text style={styles.moveText}>{label}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderContent = () => {
        if (stage === 'menu') {
            return (
                <View style={styles.centerContent}>
                    <Text style={styles.title}>Rock-Paper-Scissor!</Text>
                    <Text style={styles.subtitle}>Winner decides!</Text>

                    <TouchableOpacity style={[styles.actionButton, { marginBottom: 20 }]} onPress={() => setStage('host-setup')}>
                        <Text style={styles.actionButtonText}>Create Game</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.text }]} onPress={() => setStage('join-setup')}>
                        <Text style={styles.actionButtonText}>Join Game</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.returnButton, { marginTop: 15, shadowColor: '#546E7A' }]}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#78909C', '#546E7A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.returnGradient}
                        >
                            <Text style={styles.returnText}>Return to Main Menu</Text>
                            <Ionicons name="home-outline" size={24} color="#FFF" style={{ marginLeft: 10 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            );
        }

        if (stage === 'host-setup') {
            return (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centerContent}>
                    <Text style={styles.title}>Host Game</Text>
                    <Text style={styles.label}>What is your choice?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Option A"
                        value={myFood}
                        onChangeText={setMyFood}
                        placeholderTextColor="#999"
                    />
                    {loading ? <ActivityIndicator color={Colors.primary} /> : (
                        <TouchableOpacity style={styles.actionButton} onPress={createGame}>
                            <Text style={styles.actionButtonText}>Let's go!</Text>
                        </TouchableOpacity>
                    )}
                </KeyboardAvoidingView>
            );
        }

        if (stage === 'join-setup') {
            return (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centerContent}>
                    <Text style={styles.title}>Join Game</Text>
                    <Text style={styles.label}>Enter 4-Letter Code:</Text>
                    <TextInput
                        style={[styles.input, { textAlign: 'center', letterSpacing: 5, fontWeight: 'bold' }]}
                        placeholder="ABCD"
                        value={gameId}
                        onChangeText={t => setGameId(t.toUpperCase())}
                        maxLength={4}
                        autoCapitalize="characters"
                        placeholderTextColor="#999"
                    />
                    <Text style={styles.label}>What is your choice?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Option B"
                        value={myFood}
                        onChangeText={setMyFood}
                        placeholderTextColor="#999"
                    />
                    {loading ? <ActivityIndicator color={Colors.primary} /> : (
                        <TouchableOpacity style={styles.actionButton} onPress={joinGame}>
                            <Text style={styles.actionButtonText}>Let's go!</Text>
                        </TouchableOpacity>
                    )}
                </KeyboardAvoidingView>
            );
        }

        if (stage === 'waiting') {
            return (
                <View style={styles.centerContent}>
                    <Text style={styles.subtitle}>Share this code:</Text>
                    <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{gameId}</Text>
                    </View>
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 30 }} />
                    <Text style={{ marginTop: 10, color: Colors.textSecondary, textAlign: 'center' }}>
                        Waiting for opponent to join...
                    </Text>
                </View>
            );
        }

        if (stage === 'playing') {
            const myMove = role === 'host' ? matchData?.host_move : matchData?.guest_move;
            const opponentName = role === 'host' ? matchData?.guest_name : matchData?.host_name;

            if (myMove) {
                return (
                    <View style={styles.centerContent}>
                        <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
                        <Text style={styles.title}>Move Locked!</Text>
                        <Text style={styles.subtitle}>Waiting for move...</Text>
                    </View>
                );
            }

            return (
                <View style={styles.centerContent}>
                    <Text style={styles.title}>Pick Your Move</Text>
                    <View style={styles.movesContainer}>
                        {renderMoveButton('rock', rockImg, 'Rock', ['#4facfe', '#00f2fe'])}
                        {renderMoveButton('paper', paperImg, 'Paper', ['#fbc2eb', '#a6c1ee'])}
                        {renderMoveButton('scissors', scissorsImg, 'Scissors', ['#fa709a', '#fee140'])}
                    </View>
                </View>
            );
        }

        if (stage === 'revealed' && matchData) {
            const isWinner = (finalWinner === 'host' && role === 'host') ||
                (finalWinner === 'guest' && role === 'guest');
            const winningFood = finalWinner === 'host' ? matchData.host_food : matchData.guest_food;
            const winnerName = finalWinner === 'host' ? matchData.host_name : matchData.guest_name;

            return (
                <View style={styles.centerContent}>
                    {finalWinner === 'tie' ? (
                        <>
                            <Ionicons name="git-compare" size={80} color={Colors.textSecondary} />
                            <Text style={styles.resultTitle}>IT'S A TIE!</Text>
                            <Text style={styles.subtitle}>Both craved conflict.</Text>
                            <Text style={styles.subtitle}>Both chose {matchData.host_move?.toUpperCase()}</Text>

                            <TouchableOpacity activeOpacity={0.9} style={styles.exitButtonWrapper} onPress={finishGame}>
                                <LinearGradient
                                    colors={['#FF4081', '#F50057']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.gradientButton}
                                >
                                    <Text style={styles.actionButtonText}>Done</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Ionicons
                                name={isWinner ? "trophy" : "sad-outline"}
                                size={80}
                                color={isWinner ? Colors.success : Colors.error}
                            />

                            <Text style={[styles.resultTitle, { color: isWinner ? Colors.success : Colors.error }]}>
                                {isWinner ? "VICTORY!" : "DEFEAT..."}
                            </Text>

                            <Text style={[styles.label, { textAlign: 'center', width: '100%', marginLeft: 0 }]}>{winnerName} chose</Text>
                            <Text style={[styles.winningFood, { color: Colors.text }]}>
                                {winningFood}
                            </Text>

                            <TouchableOpacity activeOpacity={0.9} style={[styles.exitButtonWrapper, { marginTop: 30 }]} onPress={finishGame}>
                                <LinearGradient
                                    colors={['#FF4081', '#F50057']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.gradientButton}
                                >
                                    <Text style={styles.actionButtonText}>Done</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            );
        }
    };

    // --- CLEANUP ---
    const finishGame = async () => {
        if (gameId) {
            supabase.from('matches').delete().eq('id', gameId).then(({ error }) => {
                if (error) console.log("Cleanup error (might already be deleted):", error.message);
            });
        }
        router.dismissAll();
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8F9FE', '#E3F2FD']}
                style={StyleSheet.absoluteFill}
            />
            <Stack.Screen options={{ title: '', headerTransparent: true, headerBackTitle: 'Back', headerTintColor: Colors.text }} />
            <SafeAreaView style={styles.container}>
                {renderContent()}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        // backgroundColor: Colors.surface, // REMOVED to show Gradient
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 30,
        textAlign: 'center',
        fontWeight: '500',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
        marginLeft: 4,
        alignSelf: 'flex-start',
        width: '100%',
    },
    input: {
        backgroundColor: Colors.white,
        width: '100%',
        padding: 15,
        borderRadius: 12,
        fontSize: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
        color: Colors.text,
    },
    actionButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    actionButtonText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 18,
    },
    codeBox: {
        backgroundColor: Colors.text,
        padding: 20,
        borderRadius: 16,
        minWidth: 200,
        alignItems: 'center',
    },
    codeText: {
        color: Colors.white,
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: 8,
    },
    movesContainer: {
        gap: 20,
        width: '100%',
    },
    moveButtonWrapper: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
        borderRadius: 20,
        overflow: 'hidden', // Added for gradient border radius correctness
    },
    moveButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center', // Changed to center to align icon and text vertically
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 20,
        justifyContent: 'flex-start',
    },
    moveIcon: {
        width: 60,
        height: 60,
    },
    moveText: {
        color: Colors.white,
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 30,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    resultTitle: {
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 10,
    },
    winningFood: {
        fontSize: 36,
        fontWeight: 'bold',
        color: Colors.primary,
        marginVertical: 10,
        textAlign: 'center',
    },
    exitButtonWrapper: {
        borderRadius: 30,
        marginTop: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    gradientButton: {
        paddingHorizontal: 50,
        paddingVertical: 15,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    returnButton: {
        borderRadius: 30,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
        width: '100%',
    },
    returnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 30,
        width: '100%',
    },
    returnText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
