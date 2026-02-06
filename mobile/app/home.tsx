import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl, Image, Dimensions, Modal, TextInput, Switch, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { StorageService, UserStats } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { AboutModal } from '@/components/AboutModal';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// Fun titles relative to level
const getLevelTitle = (level: number) => {
    if (level < 2) return "Maybe Muncher";
    if (level < 5) return "Hesitant Hero";
    if (level < 10) return "Choice Champion";
    return "Decision Deity";
};

// Fixed avatars (Emojis with colors)
const FIXED_AVATARS = [
    { id: '1', color: '#FFCDD2', emoji: '🦊' },
    { id: '2', color: '#C8E6C9', emoji: '🐼' },
    { id: '3', color: '#BBDEFB', emoji: '🐳' },
    { id: '4', color: '#FFF9C4', emoji: '🦁' },
];

/**
 * HomeScreen (Dashboard)
 * 
 * The main hub of the application.
 * Features:
 * 1. User Stats & Leveling (XP bar)
 * 2. Navigation to Game Modes (Dice, RPS, Verdict)
 * 3. Settings & About Modal
 * 4. Profile Customization (Avatar & Username)
 */
export default function HomeScreen() {
    const router = useRouter();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [settings, setSettings] = useState<any>(null); // Added settings state
    const [loading, setLoading] = useState(false);

    // UI State
    const [menuVisible, setMenuVisible] = useState(false);
    const [avatarVisible, setAvatarVisible] = useState(false);
    const [aboutVisible, setAboutVisible] = useState(false);

    // Edit Profile State
    const [tempName, setTempName] = useState('');

    const loadData = async () => {
        setLoading(true);
        const [statsData, settingsData] = await Promise.all([
            StorageService.getStats(),
            StorageService.getSettings()
        ]);
        setStats(statsData);
        setSettings(settingsData);
        setTempName(statsData.username);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    /**
     * Navigates to the 'Candidates' screen.
     * This is the entry point for the standard Dice Roll mode.
     */
    const onStart = () => {
        router.push('/candidates');
    };

    // --- AVATAR LOGIC ---
    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your photos to upload an avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && stats) {
            const newStats = { ...stats, avatarUri: result.assets[0].uri };
            await StorageService.saveStats(newStats);
            setStats(newStats);
        }
    };

    const selectFixedAvatar = async (emoji: string, color: string) => {
        if (!stats) return;
        // encode simple svg-like data or just use a specialized string we handle in render
        // For simplicity, we just save the emoji-color string identifier
        const uri = `fixed:${emoji}:${color}`;
        const newStats = { ...stats, avatarUri: uri };
        await StorageService.saveStats(newStats);
        setStats(newStats);
    };

    const saveProfile = async () => {
        if (!stats) return;
        const newStats = { ...stats, username: tempName || 'Indecisive' };
        await StorageService.saveStats(newStats);
        setStats(newStats);
        setAvatarVisible(false);
    };

    const toggleVibration = async (value: boolean) => {
        if (!settings) return;
        const newSettings = { ...settings, vibration: !value }; // Setting says "Disable Vibration", but logic is "vibration: true"
        await StorageService.saveSettings(newSettings);
        setSettings(newSettings);
    };

    // --- RENDER HELPERS ---

    /**
     * Renders the user's avatar.
     * Supports both custom uploaded images (file://) and 
     * preset emoji avatars (fixed:emoji:color).
     */
    const renderAvatar = (uri: string | null, size = 40) => {
        if (uri?.startsWith('file://') || uri?.startsWith('content://')) {
            return <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
        }
        if (uri?.startsWith('fixed:')) {
            const [_, emoji, color] = uri.split(':');
            return (
                <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
                    <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
                </View>
            );
        }
        // Default
        return <Image source={require('@/assets/images/food-icon.png')} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
    };

    if (!stats) return null;

    return (
        <SafeAreaView style={styles.container}>
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <Ionicons name="menu-outline" size={32} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAvatarVisible(true)}>
                    {renderAvatar(stats.avatarUri, 40)}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.greeting}>Hey, {stats.username}</Text>

                {/* --- LEVEL CARD (Replaces Stats) --- */}
                <View style={styles.levelCard}>
                    <View style={styles.levelHeader}>
                        <View>
                            <Text style={styles.levelLabel}>LEVEL {stats.level}</Text>
                            <Text style={styles.levelTitle}>{getLevelTitle(stats.level)}</Text>
                        </View>
                        <View style={styles.xpBadge}>
                            <Text style={styles.xpText}>{stats.currentExp} / 10 XP</Text>
                        </View>
                    </View>

                    {/* EXP BAR */}
                    <View style={styles.expTrack}>
                        <LinearGradient
                            colors={[Colors.primary, Colors.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.expFill, { width: `${(stats.currentExp / 10) * 100}%` }]}
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Choose a mode 👇</Text>

                {/* --- MODES CAROUSEL --- */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modesScroll}>

                    {/* DICE MODE */}
                    <TouchableOpacity activeOpacity={0.9} onPress={onStart}>
                        <LinearGradient
                            colors={['#FF4081', '#F50057']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.modeCard}
                        >
                            <Image source={require('@/assets/images/dice-3d.png')} style={styles.modeImage} resizeMode="contain" />
                            <View style={styles.modeContent}>
                                <Text style={styles.modeTitle}>Dice Roll</Text>
                                <Text style={styles.modeSubtitle}>Leave your options to a dice roll</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* DUEL MODE */}
                    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/rps')}>
                        <LinearGradient
                            colors={['#2c3e50', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.modeCard}
                        >
                            <Image source={require('@/assets/images/rps-mode.png')} style={styles.modeImage} resizeMode="contain" />
                            <View style={styles.modeContent}>
                                <Text style={styles.modeTitle}>Rock Paper Scissor</Text>
                                <Text style={styles.modeSubtitle}>Winner will be the decider</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* VERDICT MODE */}
                    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/verdict')}>
                        <LinearGradient
                            colors={['#6A1B9A', '#4A148C']} // Purple theme for Judge
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.modeCard}
                        >
                            <Image source={require('@/assets/images/verdict-mode.png')} style={styles.modeImage} resizeMode="contain" />
                            <View style={styles.modeContent}>
                                <Text style={styles.modeTitle}>The Verdict</Text>
                                <Text style={styles.modeSubtitle}>Let AI Judge Your Case</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>

            </ScrollView>

            {/* --- SETTINGS MODAL --- */}
            <Modal animationType="slide" transparent={true} visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Settings</Text>

                        <View style={styles.settingRow}>
                            <Text style={styles.settingText}>Disable Vibration</Text>
                            <Switch
                                value={settings ? !settings.vibration : false}
                                onValueChange={(val) => toggleVibration(val)}
                                trackColor={{ false: '#eee', true: Colors.primary }}
                            />
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem} onPress={() => setAvatarVisible(true)}>
                            <Text style={styles.menuText}>Change Username</Text>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem} onPress={() => setAboutVisible(true)}>
                            <Text style={styles.menuText}>About This App</Text>
                            <Ionicons name="information-circle-outline" size={24} color={Colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeButton} onPress={() => setMenuVisible(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- ABOUT MODAL --- */}
            <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />

            {/* --- AVATAR / PROFILE MODAL --- */}
            <Modal animationType="slide" transparent={true} visible={avatarVisible} onRequestClose={() => setAvatarVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        {/* Current Avatar Big */}
                        <TouchableOpacity onPress={handlePickImage} style={{ alignSelf: 'center', marginBottom: 20 }}>
                            {renderAvatar(stats.avatarUri, 100)}
                            <View style={styles.editBadge}>
                                <Ionicons name="camera" size={16} color="white" />
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={tempName}
                            onChangeText={setTempName}
                            placeholder="Enter your name"
                        />

                        <Text style={styles.label}>Choose Avatar</Text>
                        <View style={styles.avatarGrid}>
                            {FIXED_AVATARS.map((av) => (
                                <TouchableOpacity key={av.id} onPress={() => selectFixedAvatar(av.emoji, av.color)}>
                                    <View style={[styles.avatarOption, { backgroundColor: av.color }]}>
                                        <Text style={{ fontSize: 24 }}>{av.emoji}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setAvatarVisible(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        alignItems: 'center',
    },
    avatar: {
        backgroundColor: '#eee',
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 10,
    },
    greeting: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 20,
    },
    levelCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    levelLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.primary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    levelTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
    xpBadge: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    xpText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.textSecondary,
    },
    expTrack: {
        height: 12,
        backgroundColor: '#F0F0F0',
        borderRadius: 6,
        overflow: 'hidden',
    },
    expFill: {
        height: '100%',
        borderRadius: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 15,
    },
    modesScroll: {
        paddingBottom: 20,
        paddingRight: 20,
    },
    modeCard: {
        width: width * 0.75,
        height: 340,
        borderRadius: 30,
        marginRight: 20,
        padding: 25,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    modeImage: {
        width: '100%',
        height: 180,
        borderRadius: 20,
        marginTop: 10,
    },
    modeContent: {
        marginBottom: 10,
    },
    modeTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    modeSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 20,
    },
    arrowBtn: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "black",
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 30,
        minHeight: 400,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    settingText: {
        fontSize: 18,
        color: Colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 10,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    menuText: {
        fontSize: 18,
        color: Colors.text,
    },
    aboutSection: {
        marginTop: 20,
        backgroundColor: '#F9F9F9',
        padding: 20,
        borderRadius: 15,
    },
    aboutTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
    },
    aboutText: {
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    closeButton: {
        marginTop: 30,
        backgroundColor: '#eee',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
    },
    closeButtonText: {
        fontWeight: 'bold',
        color: Colors.text,
    },

    // Profile Styles
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    label: {
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#F5F5F5',
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 25,
    },
    avatarGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    avatarOption: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 10,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        padding: 15,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: Colors.textSecondary,
        fontWeight: '600',
    },


});
