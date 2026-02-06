import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/services/supabase';
import { StorageService } from '@/services/storage';
import { HapticService } from '@/services/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

type Stage = 'menu' | 'host-setup' | 'join-setup' | 'lobby' | 'writing' | 'judging' | 'revealed';

interface VerdictPlayer {
    id: string;
    session_id: string;
    name: string;
    avatar: string | null;
    submission: string;
    justification: string;
    is_host: boolean;
}

/**
 * VerdictScreen Component
 * 
 * The main game controller for the 'Verdict Mode' (AI Judge).
 * Handles the game lifecycle: 
 * 1. Setup (Host/Join)
 * 2. Lobby (Waiting for players)
 * 3. Writing (Inputting options/arguments)
 * 4. Judging (AI processing)
 * 5. Revealed (Displaying the winner)
 * 
 * Uses Supabase for real-time state synchronization between players.
 */
export default function VerdictScreen() {
    const router = useRouter();
    const [stage, setStage] = useState<Stage>('menu');
    const [sessionId, setSessionId] = useState('');
    const [myPlayerId, setMyPlayerId] = useState('');
    const [myName, setMyName] = useState('');
    const [myAvatar, setMyAvatar] = useState<string | null>(null);

    // Game Inputs
    const [option, setOption] = useState('');
    const [justification, setJustification] = useState('');

    // Game State
    const [players, setPlayers] = useState<VerdictPlayer[]>([]);
    const [timeLeft, setTimeLeft] = useState(60);
    const [aiReason, setAiReason] = useState('');
    const [winnerId, setWinnerId] = useState('');
    const [loading, setLoading] = useState(false);

    // Load Profile
    useEffect(() => {
        StorageService.getStats().then(stats => {
            setMyName(stats.username);
            setMyAvatar(stats.avatarUri);
        });
    }, []);

    // Session Polling & Sync
    // This hook manages the real-time connection to Supabase.
    // It listens for INSERT/UPDATE on 'verdict_players' and 'verdict_sessions'.
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (sessionId) {
            // Subscribe to players
            const channel = supabase.channel('verdict_room')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'verdict_players', filter: `session_id=eq.${sessionId}` }, fetchPlayers)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'verdict_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
                    const newStatus = payload.new.status;
                    if (newStatus === 'writing' && stage === 'lobby') startWriting();
                    if (newStatus === 'revealed' && stage !== 'revealed') {
                        setWinnerId(payload.new.winner_id);
                        setAiReason(payload.new.ai_reason);
                        setStage('revealed');
                    }
                })
                .subscribe();

            // Auto-poll backup
            interval = setInterval(() => {
                fetchPlayers();
                checkSessionStatus();
            }, 3000);

            return () => {
                supabase.removeChannel(channel);
                clearInterval(interval);
            }
        }
    }, [sessionId, stage]);

    const fetchPlayers = async () => {
        // Stop updating players if we are already seeing results, so data doesn't disappear when winner leaves
        if (stage === 'revealed') return;
        const { data } = await supabase.from('verdict_players').select('*').eq('session_id', sessionId);
        if (data) setPlayers(data);
    };

    const checkSessionStatus = async () => {
        const { data } = await supabase.from('verdict_sessions').select('*').eq('id', sessionId).single();
        // If session is deleted (e.g. host cancelled), kick everyone out
        if (!data && stage !== 'menu' && stage !== 'join-setup') {
            Alert.alert("Session Ended", "The host has cancelled the session.");
            router.back();
            return;
        }
        if (data) {
            if (data.status === 'writing' && stage === 'lobby') startWriting();
            if (data.status === 'revealed' && stage !== 'revealed') {
                setWinnerId(data.winner_id);
                setAiReason(data.ai_reason);
                setStage('revealed');
            }
        }
    };

    // --- GAME ACTIONS ---

    // --- GAME ACTIONS ---

    /**
     * Creates a new game session.
     * Generates a random 4-char Room ID and creates the 'host' player entry.
     * Moves state to 'lobby'.
     */
    const createSession = async () => {
        setLoading(true);
        const newId = Math.random().toString(36).substring(2, 6).toUpperCase();

        // Create Room
        await supabase.from('verdict_sessions').insert({ id: newId, status: 'waiting' });

        // Add Host
        const { data, error } = await supabase.from('verdict_players').insert({
            session_id: newId,
            name: myName,
            avatar: myAvatar,
            is_host: true
        }).select().single();

        if (error || !data) {
            Alert.alert("Error", "Could not create session. Ensure tables exist.");
            setLoading(false);
            return;
        }

        setSessionId(newId);
        setMyPlayerId(data.id);
        setStage('lobby');
        setLoading(false);
        HapticService.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    /**
     * Joins an existing session using the Room ID.
     * Validates if session exists, then adds current user as a 'guest' player.
     */
    const joinSession = async () => {
        if (sessionId.length < 4) return;
        setLoading(true);
        const { data: session } = await supabase.from('verdict_sessions').select('*').eq('id', sessionId).single();

        if (!session) {
            Alert.alert("Error", "Session not found");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('verdict_players').insert({
            session_id: sessionId,
            name: myName,
            avatar: myAvatar,
            is_host: false
        }).select().single();

        if (error) {
            Alert.alert("Error", "Could not join.");
            setLoading(false);
            return;
        }

        setMyPlayerId(data.id);
        setStage('lobby');
        setLoading(false);
    };

    /**
     * Host-only action to start the game.
     * Updates session status to 'writing', which triggers all clients (via realtime listener)
     * to move to the input stage.
     */
    const startGame = async () => {
        if (players.length < 2) return;
        await supabase.from('verdict_sessions').update({ status: 'writing' }).eq('id', sessionId);
    };

    const handleCancelSession = async () => {
        if (!sessionId) return;
        setLoading(true);
        // Delete session and rely on cascade or clean up manually
        await supabase.from('verdict_sessions').delete().eq('id', sessionId);
        await supabase.from('verdict_players').delete().eq('session_id', sessionId);
        setLoading(false);
        router.back();
    };

    const handleLeaveLobby = async () => {
        if (!sessionId) return;
        await supabase.from('verdict_players').delete().eq('id', myPlayerId);
        router.back();
    };

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startWriting = () => {
        if (stage === 'writing') return; // Prevent double start
        setStage('writing');
        setTimeLeft(60);

        // Start Timer
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    submitVerdict(true); // Auto-submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    /**
     * Submits the user's choice and justification to Supabase.
     * If the user is the Host, it checks if all players have submitted to trigger the AI judgment.
     * @param auto - If true, triggered by timer expiration.
     */
    const submitVerdict = async (auto = false) => {
        // Clear timer immediately to prevent ghost triggers
        if (timerRef.current) clearInterval(timerRef.current);

        if (stage === 'judging') return; // Already submitted
        setStage('judging');

        const textToSubmit = option ? option : "No Option Provided";
        const justToSubmit = justification ? justification : "No Justification";

        await supabase.from('verdict_players').update({
            submission: textToSubmit,
            justification: justToSubmit
        }).eq('id', myPlayerId);

        // If Host, wait for everyone then trigger AI
        if (players.find(p => p.id === myPlayerId)?.is_host) {
            checkAllsubmitted();
        }
    };

    // XP Awarding Effect
    useEffect(() => {
        if (stage === 'revealed') {
            StorageService.incrementRolls();
            HapticService.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [stage]);

    // Host Only: Check if everyone submitted, then judge
    const checkAllsubmitted = async () => {
        // We can do a simple wait/retry or just assume after 60s + buffer we judge
        setTimeout(() => performAIJudgment(), 5000);
    };

    /**
     * AI JUDGE LOGIC
     * 1. Fetches all player submissions.
     * 2. Formats them into a prompt for Gemini AI.
     * 3. Calls the Gemini API to select a winner and generate a witty reason.
     * 4. Updates the session status to 'revealed' with the result.
     */
    const performAIJudgment = async () => {
        const { data: allPlayers } = await supabase.from('verdict_players').select('*').eq('session_id', sessionId);
        if (!allPlayers || allPlayers.length === 0) return;

        let winnerId = allPlayers[0].id; // Default
        let reason = "The judge is silent.";

        // Use .env, fallback to EAS Secrets
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || Constants.expoConfig?.extra?.geminiApiKey;
        if (!apiKey) {
            Alert.alert("Configuration Error", "Gemini API Key is missing.");
            setLoading(false);
            return;
        }

        if (apiKey) {
            console.log("Using Real Gemini AI...");
            try {
                // Construct the "Court Case" for the AI
                const cases = allPlayers.map(p => `Player ID: ${p.id}\nName: ${p.name}\nChoice: ${p.submission}\nArgument: "${p.justification}"`).join('\n\n');

                const prompt = `You are the honorable Judge AI. Decide who provided the most convincing argument.
                
                Here are the cases:
                ${cases}
                
                Rules:
                1. Pick ONE winner based on logic, creativity, and persuasion.
                2. Provide a witty, authoritative, 1-sentence ruling. This ruling MUST summarize the winner's justification key point and explain why it was chosen.
                3. Return ONLY a JSON object: { "winner_id": "...", "reason": "..." }`;

                // 1. AUTO-DISCOVER AVAILABLE MODELS
                const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const listJson = await listResp.json();

                let modelName = 'models/gemini-pro'; // Default fallback

                if (listJson.models) {
                    const usableModel = listJson.models.find((m: any) =>
                        m.name.includes('gemini') &&
                        m.supportedGenerationMethods?.includes('generateContent')
                    );
                    if (usableModel) {
                        modelName = usableModel.name;
                    }
                }

                // 2. CALL THE API WITH FOUND MODEL
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (!response.ok) throw new Error(`Gemini API Error ${response.status}`);

                const json = await response.json();
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) throw new Error("No text generated by AI");

                // Parse the JSON from the AI (clean potential markdown code blocks)
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleanText);

                if (result.winner_id && result.reason) {
                    winnerId = result.winner_id;
                    reason = result.reason;
                }
            } catch (e) {
                console.log("AI SYSTEM FAILED. FALLING BACK TO MOCK.", e);
                // Mock logic handled by default vars
            }

        } else {
            // Mock logic
            let maxScore = 0;
            allPlayers.forEach(p => {
                const score = (p.justification?.length || 0) + Math.random() * 50;
                if (score > maxScore) {
                    maxScore = score;
                    winnerId = p.id;
                }
            });
            const winP = allPlayers.find(p => p.id === winnerId);
            reason = `Mock verdict: ${winP?.name} won. (API Key missing)`;
        }

        await supabase.from('verdict_sessions').update({
            status: 'revealed',
            winner_id: winnerId,
            ai_reason: reason
        }).eq('id', sessionId);
    };

    const leave = async () => {
        if (sessionId) {
            await supabase.from('verdict_players').delete().eq('session_id', sessionId).eq('id', myPlayerId);
            const isHost = players.find(p => p.id === myPlayerId)?.is_host;
            if (isHost) {
                await supabase.from('verdict_sessions').delete().eq('id', sessionId);
            }
        }
        router.back();
    };


    // --- RENDERS ---
    const renderContent = () => {
        if (stage === 'menu') {
            return (
                <View style={styles.centerContent}>
                    <Stack.Screen options={{ title: '', headerLeft: () => null, headerBackVisible: false }} />
                    {/* Image Removed as requested */}
                    <Text style={[styles.title, { marginTop: 60 }]}>The Verdict</Text>
                    <Text style={styles.subtitle}>Let the AI judge your case</Text>

                    <TouchableOpacity style={[styles.actionButton, { marginBottom: 20 }]} onPress={createSession}>
                        <Text style={styles.actionButtonText}>Create Session</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.text }]} onPress={() => setStage('join-setup')}>
                        <Text style={styles.actionButtonText}>Join Session</Text>
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

        if (stage === 'join-setup') {
            const canJoin = sessionId.length === 4;
            return (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centerContent}>
                    {/* Remove headerLeft as requested */}
                    <Stack.Screen options={{ title: '', headerLeft: () => null }} />
                    <Text style={styles.label}>Enter Room Code</Text>
                    <TextInput
                        style={[styles.codeInput, { textAlign: 'center' }]}
                        maxLength={4}
                        placeholder="ABCD"
                        autoCapitalize="characters"
                        onChangeText={t => setSessionId(t.toUpperCase())}
                        placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                        style={[styles.actionButton, !canJoin && { opacity: 0.5 }]}
                        onPress={joinSession}
                        disabled={!canJoin}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.actionButtonText}>Enter Courtroom</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { marginTop: 10, backgroundColor: '#e0e0e0' }]} onPress={() => setStage('menu')}>
                        <Text style={[styles.actionButtonText, { color: Colors.text }]}>Back</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            );
        }

        if (stage === 'lobby') {
            const isHost = players.find(p => p.id === myPlayerId)?.is_host;
            const canStart = isHost && players.length >= 2;

            return (
                <View style={styles.centerContent}>
                    {/* No Back Arrow */}
                    <Stack.Screen options={{ headerLeft: () => null, title: '' }} />

                    <View style={styles.codeBox}>
                        <Text style={styles.codeLabel}>ROOM CODE</Text>
                        <Text style={styles.codeText}>{sessionId}</Text>
                    </View>

                    <Text style={[styles.sectionTitle, { color: Colors.text }]}>Players ({players.length})</Text>
                    <View style={styles.playerGrid}>
                        {players.map(p => (
                            <View key={p.id} style={styles.playerTag}>
                                <Text style={styles.playerText}>{p.name} {p.is_host ? '👑' : ''}</Text>
                            </View>
                        ))}
                    </View>

                    {isHost ? (
                        <>
                            <TouchableOpacity
                                style={[styles.actionButton, { marginTop: 40, opacity: canStart ? 1 : 0.5 }]}
                                onPress={startGame}
                                disabled={!canStart}
                            >
                                <Text style={styles.actionButtonText}>Start Session</Text>
                            </TouchableOpacity>


                        </>
                    ) : (
                        <>
                            <Text style={styles.waitingText}>Please wait</Text>

                        </>
                    )}
                </View>
            );
        }

        if (stage === 'writing') {
            return (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centerContent}>
                    <View style={styles.timerBar}>
                        <Ionicons name="timer-outline" size={24} color={Colors.primary} />
                        <Text style={[styles.timerText, { color: timeLeft < 10 ? 'red' : Colors.text }]}>{timeLeft}s Left</Text>
                    </View>

                    <Text style={styles.label}>Your Option</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Italian Pizza"
                        value={option}
                        onChangeText={setOption}
                        placeholderTextColor="#999"
                    />

                    <Text style={styles.label}>Why is it the best?</Text>
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        placeholder="Convince the Judge..."
                        multiline
                        value={justification}
                        onChangeText={setJustification}
                        placeholderTextColor="#999"
                    />

                    <TouchableOpacity style={styles.actionButton} onPress={() => submitVerdict(false)}>
                        <Text style={styles.actionButtonText}>Submit Evidence</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            );
        }

        if (stage === 'judging') {
            return (
                <View style={styles.centerContent}>
                    <Stack.Screen options={{ headerLeft: () => null, title: '' }} />
                    <Image source={require('@/assets/images/ai-judge.png')} style={{ width: 150, height: 150, borderRadius: 75 }} />
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
                    <Text style={styles.title}>The Judge is deciding...</Text>
                    <Text style={styles.subtitle}>Reviewing evidence...</Text>
                </View>
            );
        }

        if (stage === 'revealed') {
            const winner = players.find(p => p.id === winnerId);
            const amIWinner = winnerId === myPlayerId;

            return (
                <ScrollView contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
                    {/* Hide Back Button */}
                    <Stack.Screen options={{ headerLeft: () => null, title: '' }} />

                    <Image source={require('@/assets/images/ai-judge.png')} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 20 }} />

                    <View style={styles.verdictCard}>
                        <Text style={styles.verdictLabel}>JUDGMENT DELIVERED</Text>
                        <Text style={styles.aiReason}>"{aiReason}"</Text>
                    </View>

                    <View style={[styles.winnerCard, amIWinner ? { borderColor: Colors.success, borderWidth: 2 } : {}]}>
                        <Text style={styles.winnerLabel}>Winner of this case is</Text>
                        <Text style={[styles.winnerName, { fontSize: 32 }]}>{winner?.name}</Text>

                        <Text style={{ fontSize: 16, color: Colors.textSecondary, marginBottom: 5, fontStyle: 'italic' }}>the choice is</Text>

                        <Text style={styles.winnerOption}>{winner?.submission}</Text>
                    </View>

                    <TouchableOpacity style={[styles.actionButton, { marginTop: 30 }]} onPress={leave}>
                        <Text style={styles.actionButtonText}>Leave Court</Text>
                    </TouchableOpacity>
                </ScrollView>
            );
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8F9FE', '#E3F2FD']}
                style={StyleSheet.absoluteFill}
            />
            {/* Default Header Options if not overridden */}
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
    heroImage: {
        width: '100%',
        height: 200,
        marginBottom: 10,
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
        fontSize: 16,
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
    codeInput: {
        backgroundColor: Colors.white,
        width: '100%',
        padding: 20,
        fontSize: 24,
        borderRadius: 12,
        letterSpacing: 8,
        fontWeight: 'bold',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
        color: Colors.text,
    },
    codeBox: {
        backgroundColor: Colors.text,
        padding: 20,
        borderRadius: 16,
        minWidth: 200,
        alignItems: 'center',
        marginBottom: 30,
    },
    codeLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 5,
    },
    codeText: {
        color: Colors.white,
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    playerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    playerTag: {
        backgroundColor: Colors.white,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#eee',
    },
    playerText: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    waitingText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginTop: 40,
        fontStyle: 'italic',
    },
    timerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 10,
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 20,
        alignSelf: 'center',
    },
    timerText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    verdictCard: {
        backgroundColor: '#2c3e50',
        padding: 20,
        borderRadius: 16,
        width: '100%',
        marginBottom: 20,
        alignItems: 'center',
    },
    verdictLabel: {
        color: '#f1c40f',
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 10,
        fontSize: 12,
    },
    aiReason: {
        color: 'white',
        fontSize: 18,
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 24,
    },
    winnerCard: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    winnerLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: 15,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    winnerName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
        color: Colors.text,
    },
    winnerOption: {
        fontSize: 20,
        color: Colors.primary,
        fontWeight: 'bold',
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
