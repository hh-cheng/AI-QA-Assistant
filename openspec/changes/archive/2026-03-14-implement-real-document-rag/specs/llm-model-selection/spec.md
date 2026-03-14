## ADDED Requirements

### Requirement: Users can choose from supported answer models only
The system SHALL allow each authenticated user to choose an answer model from a server-defined allowlist of provider/model combinations.

#### Scenario: Supported model is saved
- **WHEN** an authenticated user selects a supported model
- **THEN** the system persists that model as the user's QA model preference

#### Scenario: Unsupported model is rejected
- **WHEN** an authenticated user attempts to save a model outside the allowlist
- **THEN** the system rejects the request and SHALL NOT persist the preference

### Requirement: Advanced provider controls are not user-configurable
The system SHALL NOT expose temperature, API key, base URL, timeout, or token limit controls in the user QA settings UI.

#### Scenario: Settings UI is simplified
- **WHEN** an authenticated user opens QA settings
- **THEN** the UI presents model selection without editable advanced provider fields

### Requirement: Answer generation uses the saved model preference
The system SHALL use the authenticated user's saved supported model preference, or a server-defined default when no preference exists, when generating answers through official provider APIs.

#### Scenario: Chat answer uses selected model
- **WHEN** an authenticated user sends a QA message after selecting a supported model
- **THEN** the backend calls the official provider API corresponding to that saved model preference for final answer generation
