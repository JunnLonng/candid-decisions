import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

// Simple interface for results
interface SimplePlace {
    id: string;
    name: string;
}

export default function ResultScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [place, setPlace] = useState<SimplePlace | null>(null);

    useEffect(() => {
        if (params.place) {
            setPlace(JSON.parse(params.place as string));
        }
    }, [params.place]);

    if (!place) return null;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Winner!', headerShown: false }} />

            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name="trophy" size={64} color={Colors.secondary} />
                </View>

                <Text style={styles.label}>The Decision Is:</Text>
                <Text style={styles.name}>{place.name}</Text>

                {/* Removed Map Link logic since we don't have addresses anymore */}

                <TouchableOpacity style={styles.homeButton} onPress={() => router.dismissAll()}>
                    <Text style={styles.homeText}>Roll Again / New List</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: Colors.white,
        width: '100%',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 10,
    },
    name: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 40,
    },
    homeButton: {
        padding: 15,
        backgroundColor: Colors.surface,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    homeText: {
        color: Colors.text,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
