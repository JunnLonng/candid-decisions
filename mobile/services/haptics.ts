import * as Haptics from 'expo-haptics';
import { StorageService } from './storage';

/**
 * HapticService
 * 
 * Provides a wrapper around expo-haptics that respects the user's vibration settings.
 */
export const HapticService = {
    /**
     * Trigger impact feedback if vibration is enabled.
     */
    impactAsync: async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
        const settings = await StorageService.getSettings();
        if (settings.vibration) {
            await Haptics.impactAsync(style);
        }
    },

    /**
     * Trigger notification feedback if vibration is enabled.
     */
    notificationAsync: async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
        const settings = await StorageService.getSettings();
        if (settings.vibration) {
            await Haptics.notificationAsync(type);
        }
    },

    /**
     * Trigger selection feedback if vibration is enabled.
     */
    selectionAsync: async () => {
        const settings = await StorageService.getSettings();
        if (settings.vibration) {
            await Haptics.selectionAsync();
        }
    }
};
