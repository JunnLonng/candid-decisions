import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface AboutModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose }) => {

    const openLink = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert("Error", "Cannot open this URL: " + url);
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={[styles.modalOverlay, { justifyContent: 'flex-start', paddingTop: 60 }]}>
                <View style={[styles.modalContent, { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 0 }]}>

                    {/* Close X Button */}
                    <TouchableOpacity style={styles.closeX} onPress={onClose}>
                        <Ionicons name="close-circle" size={32} color={Colors.textSecondary} />
                    </TouchableOpacity>

                    <ScrollView contentContainerStyle={{ padding: 30, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                        <Text style={styles.aboutHeader}>About This App 🎲</Text>
                        <Text style={styles.aboutIntro}>
                            Stop the Debate. Start the Decision. Decision-making shouldn't be a chore. Whether you're flying solo or arguing with friends about dinner, this app is designed to resolve deadlocks with a touch of fun.
                        </Text>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Features</Text>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureTitle}>🎲 Dice Roll</Text>
                            <Text style={styles.featureDesc}>The classic solo randomizer. Input up to 6 options and let fate decide.</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureTitle}>✊ Rock-Paper-Scissor (RPS) Duel</Text>
                            <Text style={styles.featureDesc}>Settle a choice based on RPS Duel in real-time. A synchronized duel where the winner’s choice becomes the final verdict.</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureTitle}>⚖️ AI Arbiter (Verdict Mode)</Text>
                            <Text style={styles.featureDesc}>For the big group debates. Submit your justifications and let our neutral AI Judge weigh the arguments to crown a winner.</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>How it’s Built 🛠️</Text>
                        <View style={styles.techRow}>
                            <Text style={styles.techLabel}>Frontend:</Text>
                            <Text style={styles.techValue}>Built with React for a responsive, modern mobile experience for iOS and Android users.</Text>
                        </View>
                        <View style={styles.techRow}>
                            <Text style={styles.techLabel}>Real-time Sync:</Text>
                            <Text style={styles.techValue}>Powered by Supabase, ensuring your duels happen in milliseconds without the lag.</Text>
                        </View>
                        <View style={styles.techRow}>
                            <Text style={styles.techLabel}>AI Logic:</Text>
                            <Text style={styles.techValue}>Utilizes the Gemini API to process natural language justifications for the Verdict mode.</Text>
                        </View>
                        <View style={styles.techRow}>
                            <Text style={styles.techLabel}>Developer:</Text>
                            <Text style={styles.techValue}>Crafted with Gemini (⚡) by JunnLonng.</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Privacy & Safety 🛡️</Text>
                        <Text style={styles.privacyText}>Your privacy is a priority.</Text>
                        <View style={styles.privacyItem}>
                            <Text style={styles.privacyPoint}>• Candid Data:</Text>
                            <Text style={styles.privacyDesc}>We do not store your personal choices or session history.</Text>
                        </View>
                        <View style={styles.privacyItem}>
                            <Text style={styles.privacyPoint}>• AI Privacy:</Text>
                            <Text style={styles.privacyDesc}>Justifications in "Verdict Mode" are sent securely to the Gemini API for one-time processing and are not stored by this app.</Text>
                        </View>
                        <View style={styles.privacyItem}>
                            <Text style={styles.privacyPoint}>• No Tracking:</Text>
                            <Text style={styles.privacyDesc}>No third-party ads or data harvesting.</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Connect with the Dev</Text>
                        <Text style={[styles.aboutIntro, { marginBottom: 15 }]}>Find the source code and my other projects on GitHub:</Text>

                        <TouchableOpacity style={styles.githubButton} onPress={() => openLink('https://github.com/JunnLonng')}>
                            <Ionicons name="logo-github" size={24} color="white" />
                            <Text style={styles.githubText}>github.com/JunnLonng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.closeButton, { marginTop: 40 }]} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 10,
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
    aboutHeader: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 15,
        textAlign: 'center',
    },
    aboutIntro: {
        fontSize: 16,
        color: Colors.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 10,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        marginVertical: 15,
        marginTop: 20,
    },
    featureItem: {
        marginBottom: 15,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    techRow: {
        marginBottom: 10,
    },
    techLabel: {
        fontWeight: 'bold',
        fontSize: 14,
        color: Colors.text,
    },
    techValue: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    privacyText: {
        fontSize: 15,
        color: Colors.text,
        marginBottom: 10,
        fontStyle: 'italic',
    },
    privacyItem: {
        flexDirection: 'row',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    privacyPoint: {
        fontWeight: 'bold',
        color: Colors.text,
        fontSize: 14,
        marginRight: 5,
    },
    privacyDesc: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    githubButton: {
        flexDirection: 'row',
        backgroundColor: '#333',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    githubText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    closeX: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    }
});
