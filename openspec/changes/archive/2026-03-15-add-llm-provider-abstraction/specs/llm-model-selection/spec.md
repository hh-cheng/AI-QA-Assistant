## MODIFIED Requirements

### Requirement: Users can choose from supported answer models only
The system SHALL allow each authenticated user to choose an answer model from a server-defined allowlist of provider/model combinations and SHALL expose capability metadata for each allowed model.

#### Scenario: Model options include capability metadata
- **WHEN** an authenticated user loads QA model settings
- **THEN** each returned model option includes provider capability metadata
- **AND** that metadata includes whether the model supports streaming

#### Scenario: Supported model is saved
- **WHEN** an authenticated user selects a supported model
- **THEN** the system persists that model as the user's QA model preference

#### Scenario: Unsupported model is rejected
- **WHEN** an authenticated user attempts to save a model outside the allowlist
- **THEN** the system rejects the request and SHALL NOT persist the preference

### Requirement: Answer streaming uses model capabilities
The system SHALL decide whether to use QA streaming based on model capability metadata instead of hard-coded provider-name checks.

#### Scenario: Selected model supports streaming
- **WHEN** an authenticated user selects a model whose capabilities indicate streaming support
- **THEN** the client may initiate the streaming QA route

#### Scenario: Selected model does not support streaming
- **WHEN** an authenticated user selects a model whose capabilities indicate streaming is unavailable
- **THEN** the client uses the non-streaming QA mutation path

#### Scenario: Streaming request reaches the server for a non-streaming model
- **WHEN** a streaming QA request is sent for a selected model without streaming capability
- **THEN** the server rejects the request without attempting provider streaming
