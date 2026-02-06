import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Platform, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    cancelAnimation,
    withSequence,
    withSpring
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';

interface Props {
    rolling: boolean;
    result?: number; // 1-6
}

const SIZE = 100;

// --- ANDROID COMPONENT (2D Only) ---
// Uses rotation and scaling to simulate a roll without 3D transforms that crash Android
const DiceAndroid: React.FC<Props> = ({ rolling, result }) => {
    const [displayNum, setDisplayNum] = useState(1);
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (rolling) {
            // Shake animation
            rotation.value = withRepeat(
                withSequence(withTiming(-15, { duration: 80 }), withTiming(15, { duration: 80 })),
                -1,
                true
            );
            scale.value = withRepeat(
                withSequence(withTiming(1.1, { duration: 150 }), withTiming(0.9, { duration: 150 })),
                -1,
                true
            );

            // Cycle numbers to simulate rolling
            const interval = setInterval(() => {
                setDisplayNum(Math.floor(Math.random() * 6) + 1);
            }, 80);
            return () => clearInterval(interval);
        } else {
            // Stop
            rotation.value = withSpring(0);
            scale.value = withSpring(1);
            if (result) setDisplayNum(result);
        }
    }, [rolling, result]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${rotation.value}deg` },
            { scale: scale.value }
        ]
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.face2D, animatedStyle]}>
                <Text style={styles.faceText}>{displayNum}</Text>
            </Animated.View>
        </View>
    );
};

// --- IOS / WEB COMPONENT (True 3D) ---
const Dice3D: React.FC<Props> = ({ rolling, result }) => {
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);
    const rotateZ = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (rolling) {
            // Random spin
            rotateX.value = withRepeat(
                withTiming(360 * 5, { duration: 1500, easing: Easing.linear }),
                -1
            );
            rotateY.value = withRepeat(
                withTiming(360 * 3, { duration: 1500, easing: Easing.linear }),
                -1
            );
            rotateZ.value = withRepeat(
                withTiming(360 * 2, { duration: 1500, easing: Easing.linear }),
                -1
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 200 }),
                    withTiming(0.8, { duration: 200 })
                ),
                -1,
                true
            );
        } else {
            // Stop
            cancelAnimation(rotateX);
            cancelAnimation(rotateY);
            cancelAnimation(rotateZ);
            cancelAnimation(scale);

            // Determine target landing angles
            let tx = 0, ty = 0, tz = 0;
            switch (result) {
                case 1: tx = 0; ty = 0; break;   // Front
                case 2: tx = 90; ty = 0; break;  // Bottom
                case 3: tx = 0; ty = -90; break; // Right
                case 4: tx = 0; ty = 90; break;  // Left
                case 5: tx = -90; ty = 0; break; // Top
                case 6: tx = 180; ty = 0; break; // Back
                default:
                    // Default random if no result passed
                    tx = 0; ty = 0;
            }

            rotateX.value = withSpring(tx);
            rotateY.value = withSpring(ty);
            rotateZ.value = withSpring(tz);
            scale.value = withSpring(1);
        }
    }, [rolling, result]);

    const cubeStyle = useAnimatedStyle(() => ({
        transform: [
            { rotateX: `${rotateX.value}deg` },
            { rotateY: `${rotateY.value}deg` },
            { rotateZ: `${rotateZ.value}deg` },
            { scale: scale.value }
        ]
    }));

    // Face rendering helper
    const renderFace = (val: number, transform: any[]) => (
        <View style={[styles.face, { transform }]}>
            <Text style={styles.faceText}>{val}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.cube, cubeStyle]}>
                {/* Front (1) */}
                {renderFace(1, [{ translateZ: SIZE / 2 }])}
                {/* Back (6) */}
                {renderFace(6, [{ rotateY: '180deg' }, { translateZ: SIZE / 2 }])}
                {/* Right (3) */}
                {renderFace(3, [{ rotateY: '90deg' }, { translateZ: SIZE / 2 }])}
                {/* Left (4) */}
                {renderFace(4, [{ rotateY: '-90deg' }, { translateZ: SIZE / 2 }])}
                {/* Top (5) */}
                {renderFace(5, [{ rotateX: '90deg' }, { translateZ: SIZE / 2 }])}
                {/* Bottom (2) */}
                {renderFace(2, [{ rotateX: '-90deg' }, { translateZ: SIZE / 2 }])}
            </Animated.View>
        </View>
    );
};

// --- MAIN EXPORT ---
export const Dice: React.FC<Props> = (props) => {
    if (Platform.OS === 'android') {
        return <DiceAndroid {...props} />;
    }
    return <Dice3D {...props} />;
};

const styles = StyleSheet.create({
    container: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cube: {
        width: SIZE,
        height: SIZE,
        position: 'relative',
        // 'preserve-3d' is needed for web/iOS but not typed in standard RN ViewStyle
        transformStyle: 'preserve-3d' as 'flat',
    },
    // Shared face style
    face: {
        position: 'absolute',
        width: SIZE,
        height: SIZE,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backfaceVisibility: 'hidden',
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    // Specific style for Android 2D face since it isn't absolute positioned in a 3D context
    face2D: {
        width: SIZE,
        height: SIZE,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    faceText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.primary,
    }
});
