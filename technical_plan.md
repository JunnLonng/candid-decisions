# Candid Decisions Implementation Plan (Technical)

## 1. Data Strategy: "How do we decide?"
- **Flow**: Home -> **Decision Mode Selection** (Dice Roll or Verdict) -> **Input** -> **Result**.
- **Manual Input**: The user enters 2-6 custom options (e.g., "KFC", "Pasta").
- **Validation**: User must enter at least 2 options to proceed.
- **Rationale**: Removes dependency on costly external APIs (Google Places) and allows for flexible choices beyond just registered restaurants.

## 2. Decision Mechanics
### A. "Dice Roll" (Random)
- **Mechanic**: Pure RNG.
- **Interaction**: Big "Roll" Button.
- **Animation**: 3D CSS-style transform or Reanimated physics.

### B. "Verdict Mode" (AI Judge)
- **Mechanic**: AI analyzes user-provided context/arguments for each option and picks a winner.
- **Integration**: Google Gemini AI (Flash model for speed).
- **Input**: User enters options + optional specific "cravings" or "arguments".
- **Output**: Winner name + Witty reason.

## 3. Data Persistence
- **Storage**: Use `AsyncStorage` (standard React Native local storage) to save:
    - User Stats (Total Rolls, Indecisiveness Level).
    - Settings (Default filters, API Keys if needed).
- **No Login**: Everything stays on the device.

## 4. UI/UX Strategy
- **Home Screen**: Clean, modern card layout. Stats summarized at top, Cards to select Decision Mode.
- **Theme**: Energetic Red/Orange.
- **Verdict UI**: Chat-like or Courtroom-themed result display.

## 5. Technology Stack
- **Framework**: React Native (Expo).
- **AI**: Google Generative AI SDK (@google/generative-ai).
- **Env Logic**: API Keys stored in `.env`, handled via `expo-constants` or direct process.env in dev.

## 6. Security Strategy
- **Audit Process**: Automated search for hardcoded secrets ("AIza", "SUPABASE_KEY") before major releases.
- **Environment Management**: Strict separation of config using `.env` files (e.g., `process.env.EXPO_PUBLIC_*`).
- **Data Privacy**: No persistent storage of user input sent to AI; processed in-memory only.

