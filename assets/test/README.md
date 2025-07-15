# ECG Player Test Suite

This directory contains comprehensive unit and integration tests for the ECG Player JavaScript module.

## Overview

The test suite provides thorough coverage of the ECG Player functionality, including:

- **Unit Tests**: Testing individual functions and components in isolation
- **Mock Utilities**: Comprehensive mocking for Canvas API, RxJS observables, and ECG data

## Test Structure

### Unit Tests (`/test/ecg_player/`)

#### 1. Data Processing Tests (`data-processing.test.js`)
- ECG data validation and parsing
- Coordinate transformation calculations
- Data index calculations for time-based queries
- Segment precomputation and retrieval
- Error handling for invalid data formats

**Key Test Cases:**
- Valid ECG data processing with multiple leads
- QRS data processing and timestamp calculation
- Boundary condition handling for data index calculations
- Input validation and error handling

#### 2. Animation & Cursor Tests (`animation.test.js`)
- Animation lifecycle management (start, pause, resume, stop)
- Cursor position calculations during playback
- Animation frame processing for single and multi-lead modes
- Playback state preservation across pause/resume cycles
- Loop playback functionality

**Key Test Cases:**
- Toggle playback state changes
- Animation timing calculations
- Cursor position updates during animation
- Data loading for visible time ranges

#### 3. Lead Switching & Display Modes (`lead-switching.test.js`)
- Lead navigation (next/previous, direct selection)
- Display mode switching (single ↔ multi-lead)
- Canvas click handling for lead selection
- Lead grid coordinate calculations
- Form event stream handling

**Key Test Cases:**
- Lead selector visibility in different display modes
- Click-to-switch functionality in multi-lead mode
- Keyboard navigation between leads
- Grid layout calculations for 12-lead ECG

#### 4. QRS Detection & Timing (`qrs-detection.test.js`)
- QRS complex detection during playback
- QRS flash indicator functionality
- Timing accuracy for QRS events
- QRS state management and reset behavior

**Key Test Cases:**
- Accurate QRS detection at correct timestamps
- Flash indicator activation/deactivation
- QRS counter state management
- Integration with animation timing

#### 5. Grid Rendering & Scaling (`grid-rendering.test.js`)
- Medical ECG grid rendering (fine/bold lines)
- Telemetry dot grid rendering
- Grid scaling calculations and display updates
- Theme-aware color management
- Canvas state preservation during changes

**Key Test Cases:**
- Medical grid line drawing with proper spacing
- Grid scale calculations and dimension updates
- Theme color application
- Canvas recreation on scale changes

#### 6. Canvas Management (`canvas-management.test.js`)
- Canvas layer creation and management
- Device pixel ratio handling
- Canvas dimension calculations
- Memory management and cleanup
- Responsive canvas sizing

**Key Test Cases:**
- Three-layer canvas setup (background, waveform, QRS flash)
- Proper canvas scaling for high-DPI displays
- Canvas cleanup on component destruction
- Responsive dimension calculations


## Test Utilities (`/test/utils/test-helpers.js`)

### Mock Data Generators
- `createMockECGData(options)`: Generates synthetic ECG data with configurable parameters
- `createMockBehaviorSubject(initialValue)`: Creates RxJS BehaviorSubject with spy methods
- `createMockFormElement(type, value)`: Creates mock DOM form elements

### Canvas & Animation Mocking
- `createMockCanvas(width, height)`: Creates mock Canvas with 2D context
- `mockAnimationFrame()`: Provides controlled animation frame testing
- `mockTime(startTime)`: Time manipulation utilities for consistent testing

### RxJS Testing Utilities
- `collectEmissions(observable, count)`: Collects multiple emissions from observables
- `waitForEmission(observable)`: Waits for single emission from observable

### ECG-Specific Helpers
- `createMockECGPlayerContext()`: Sets up ECG player test context
- Synthetic ECG signal generation with configurable heart rate and lead count
- QRS detection simulation for testing timing accuracy

## Running Tests

### Unit Tests (Vitest)
```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch

# Run with coverage report
npm run test:unit:coverage

# Run tests with UI
npm run test:unit:ui
```


## Test Configuration

### Vitest Configuration (`vitest.config.js`)
- **Environment**: jsdom for DOM simulation
- **Globals**: Enabled for describe/it/expect without imports
- **Coverage**: Text, JSON, and HTML reports
- **Setup**: Automatic mock setup for Canvas API and DOM


## Best Practices

### Writing Unit Tests
1. **Isolation**: Each test should be independent and not rely on others
2. **Mocking**: Use provided mock utilities for external dependencies
3. **Coverage**: Aim for both positive and negative test cases
4. **Naming**: Use descriptive test names that explain the expected behavior


### Mock Usage
1. **Canvas API**: Use provided canvas mocks for rendering tests
2. **RxJS Streams**: Use BehaviorSubject mocks for reactive state
3. **Time**: Use time mocking utilities for animation testing
4. **ECG Data**: Use synthetic data generators for consistent testing

## Performance Considerations

### Unit Test Performance
- Mocks are lightweight and don't perform actual rendering
- Time manipulation allows fast testing of time-dependent behavior
- Parallel test execution where possible


## Troubleshooting

### Common Issues
1. **Canvas Mock Errors**: Ensure canvas setup is called in beforeEach
2. **Timing Issues**: Use appropriate waits and time mocking
3. **RxJS Subscription Leaks**: Always complete subjects in afterEach

### Debug Strategies
1. **Unit Tests**: Use `console.log` and Vitest's debug mode
2. **Coverage Reports**: Identify untested code paths
3. **Test Isolation**: Run individual tests to isolate issues

## Contributing

When adding new features to the ECG Player:

1. **Add Unit Tests**: Test individual functions and logic
2. **Update Mocks**: Extend mock utilities if needed
3. **Update Documentation**: Keep this README current
4. **Verify Coverage**: Ensure adequate test coverage for new code

## Test Data

The test suite uses synthetic ECG data generated with realistic characteristics:
- 12-lead standard ECG configuration
- Configurable sampling rates (typically 500Hz)
- Synthetic QRS complexes with accurate timing
- Realistic amplitude ranges and noise patterns

This approach ensures consistent, reproducible testing without requiring actual patient data.