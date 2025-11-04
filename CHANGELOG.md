# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-11-04

### Added

- Comprehensive test suite with full coverage of fork action functionality
- TypeScript interface definitions for better type safety
- Configuration files: Jest, ESLint, Prettier
- Apache 2.0 LICENSE file
- Configuration options for polling behavior (`pollingIntervalMs`, `maxPollingAttempts`)
- Enhanced error handling with specific messages for 404, 401, and 403 errors
- CHANGELOG.md to track version history

### Changed

- **BREAKING**: Updated `createGitlabForkAction` options interface to include optional polling configuration
- Replaced `any` types with proper TypeScript interfaces (`GitlabForkOptions`, `GitlabProject`)
- Improved error messages to be more user-friendly and actionable
- Updated README.md to accurately describe validation (JSON Schema, not Zod)
- Enhanced package.json with proper metadata (description, keywords, repository, bugs, homepage)
- Added `@backstage/config` as dev dependency for testing

### Fixed

- Type safety issues by removing `any` type usage
- Documentation inaccuracy regarding Zod schema validation
- Missing error context distinction between user and system errors
- Hard-coded polling configuration values

### Security

- Better error handling to avoid exposing system internals to end users
