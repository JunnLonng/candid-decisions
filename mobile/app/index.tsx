import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

/**
 * LoadingScreen (Landing Page)
 * 
 * The initial entry point of the application.
 * Displays a branded animation and a 'Let's go' button to enter the main app.
 * Uses `react-native-reanimated` for entrance animations.
 */
export default function LoadingScreen() {
    const router = useRouter();

    const handleStart = () => {
        router.replace('/home');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ImageBackground
                source={require('@/assets/images/loading-bg.png')}
                style={styles.background}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradientOverlay}
                />

                <View style={styles.content}>
                    <Animated.View entering={FadeInUp.delay(300).duration(1000)} style={styles.circleContainer}>
                        <Text style={styles.topCurvedText}>DECIDE • RESOLVE • MOVE ON</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(500).duration(1000)} style={styles.textContainer}>
                        <Text style={styles.welcomeText}>End the Overthinking</Text>
                        <Text style={styles.toText}>and start</Text>
                        <Text style={styles.titleText}>Deciding</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(800).duration(1000)} style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={handleStart}>
                            <Text style={styles.buttonText}>Let's go</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 80,
        paddingHorizontal: 30,
    },
    circleContainer: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    topCurvedText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 4,
    },
    textContainer: {
        marginBottom: 40,
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: '800',
        color: 'white',
        textAlign: 'center',
        marginBottom: -5,
    },
    toText: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: -10,
    },
    titleText: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FF69B4', // Hot pink accent
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#FF4081',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: "#FF4081",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});
