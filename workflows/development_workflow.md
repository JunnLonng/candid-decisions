---
description: Development workflow for Indecisive Eater (Mobile)
---
# Indecisive Eater Mobile Workflow

## Objective
Build a native iOS/Android app using React Native and Expo.

## Inputs
- `idea.txt`: Feature requirements.
- `docs/gemini_integration.md` (implied): AI logic requirements.

## Process

### Phase 1: Setup
1.  **Initialize**: `npx create-expo-app@latest mobile --template tabs` (using tabs template for easy navigation structure).
2.  **Dependencies**: Install `expo-location`, `expo-sensors`, `expo-haptics`, `@google/generative-ai`, `react-native-dotenv` (or generic env setup).

### Phase 2: Core Logic
1.  **Manual Input**: Input screen for 2-6 items.
2.  **Decision Engines**:
    -   *RNG Engine*: Simple array randomizer.
    -   *AI Engine*: Service to call Gemini API with structured prompt (Options + User Context).
3.  **Data Passing**: Robust navigation params to pass "Candidates" to the "Game/Verdict" screens.

### Phase 3: UI & Animation
1.  **Home Screen**: Stats overview, Mode Selection ("Quick Roll" vs "Judge Me").
2.  **Input Screen**: Shared component for both modes. Dynamic list (Add/Remove items).
3.  **Dice Screen**: 3D Dice Roll animation (Three.js or Reanimated).
4.  **Verdict Screen**: "Thinking..." state -> Result Reveal with AI commentary.

### Phase 4: AI Integration (Verdict Mode)
1.  **API Setup**: Configure `GoogleGenerativeAI` client.
2.  **Prompt Engineering**: Create a focused prompt: "You are a decisive food critic. Choose one option from [List] based on [Context]. Return JSON."
3.  **Fallback**: If API fails or no key, fallback to local RNG with generic messages.

### Phase 5: Security & Final Polish
1.  **Code Audit**: Scan for hardcoded API keys or sensitive data.
2.  **Environment Variables**: Ensure all secrets are in `.env` and accessed via `process.env`.
3.  **Type Safety**: Resolve any remaining TypeScript errors or lint warnings.
4.  **Production Build Check**: Verify app behavior in release mode (or close to it) to ensure no debug-only logic remains.

## Tools
- `npx expo start`: Runs the development server.
- `adb` (Android Debug Bridge): If simulating on Android Emulator.

## Speed & Efficiency Guidelines (Self-Correction)
To accelerate future app creation:
1.  **Atomic Components**: Build generic `Button`, `Input`, and `Card` components *immediately* in Phase 1 to avoid restyling later.
2.  **Mock First, Connect Later**: Hardcode the "AI Response" JSON first. Build the UI around that mock. Only connect the real API once the UI flows perfectly. This avoids API-debugging blockers during UI work.
3.  **Turbo-Console**: Use `console.log` heavily for data-flow verification between screens (e.g., `console.log('Navigating with params:', params)`).
4.  **Fail Gracefully**: For AI features, *always* write the "Offline/Mock" logic first. It acts as a permanent fallback and allows for faster testing.
