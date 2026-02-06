import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY = 'DECISION_STATS';
const SETTINGS_KEY = 'DECISION_SETTINGS';

export interface UserStats {
    totalRolls: number;
    lastIndecisiveDate: string | null;
    username: string; // New
    avatarUri: string | null; // New
    level: number; // New
    currentExp: number; // New (0-10)
}

export interface UserSettings {
    maxDistance: number;
    priceLevel: number[];
    vibration: boolean; // New
}

const DEFAULT_STATS: UserStats = {
    totalRolls: 0,
    lastIndecisiveDate: null,
    username: 'Indecisive',
    avatarUri: null,
    level: 1,
    currentExp: 0,
};

const DEFAULT_SETTINGS: UserSettings = {
    maxDistance: 1000,
    priceLevel: [1, 2],
    vibration: true,
};

export const StorageService = {
    getStats: async (): Promise<UserStats> => {
        try {
            const json = await AsyncStorage.getItem(STATS_KEY);
            return json ? { ...DEFAULT_STATS, ...JSON.parse(json) } : DEFAULT_STATS;
        } catch (e) {
            console.error(e);
            return DEFAULT_STATS;
        }
    },

    saveStats: async (stats: UserStats) => {
        try {
            await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
        } catch (e) {
            console.error(e);
        }
    },

    incrementRolls: async () => {
        try {
            const current = await StorageService.getStats();

            // Level Up Logic
            let newExp = current.currentExp + 1;
            let newLevel = current.level;

            if (newExp >= 10) {
                newLevel += 1;
                newExp = 0;
            }

            const updated = {
                ...current,
                totalRolls: current.totalRolls + 1,
                lastIndecisiveDate: new Date().toISOString(),
                level: newLevel,
                currentExp: newExp,
            };
            await StorageService.saveStats(updated);
            return updated;
        } catch (e) {
            console.error(e);
            return DEFAULT_STATS;
        }
    },

    getSettings: async (): Promise<UserSettings> => {
        try {
            const json = await AsyncStorage.getItem(SETTINGS_KEY);
            return json ? JSON.parse(json) : DEFAULT_SETTINGS;
        } catch (e) {
            return DEFAULT_SETTINGS;
        }
    },

    saveSettings: async (settings: UserSettings) => {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },
};
