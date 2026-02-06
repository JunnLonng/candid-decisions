import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { Place } from '../services/places';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    place: Place;
    onRefresh: () => void;
    locked?: boolean; // In case we want to "lock" a choice later
}

export const CandidateRow: React.FC<Props> = ({ place, onRefresh, locked }) => {
    return (
        <View style={styles.container}>
            <View style={styles.info}>
                <Text style={styles.name}>{place.name}</Text>
                <Text style={styles.details}>{place.rating}★ • {place.distance}</Text>
            </View>

            {!locked && (
                <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    details: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    refreshButton: {
        padding: 8,
    },
});
