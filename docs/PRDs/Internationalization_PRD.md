# Feature: Internationalization & Localization

## 1. Overview
Support for global users through multilingual UI, content, and keyboard layout personalization.

## 2. Multilingual Support
* **Languages**: Initial support for English, Spanish, French.
* **Content**:
    * Localized wordlists and passages.
    * Architecture to support adding new language packs easily.
* **UI Localization**:
    * All UI strings externalized (i18n).
    * Locale detection based on browser/user settings.

## 3. Keyboard Layouts
* **Layout Profiles**: Support for QWERTY, AZERTY, QWERTZ, Dvorak, Colemak.
* **Visual Hints**:
    * On-screen keyboard overlay adapts to selected layout.
    * "Problem key" highlighting maps correctly to physical keys.
* **Hardware Detection**: Attempt to detect layout and suggest changes.

## 4. Technical Considerations
* **Translation Pipeline**: Automated extraction of strings.
* **Fallbacks**: Graceful fallback to English if translation missing.
