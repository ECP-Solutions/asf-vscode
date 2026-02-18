# Changelog

All notable changes for ASF. This file combines the release notes from the project's releases.


## [v1.0.9] - 2026-02-18
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.1.0

## Summary

Major feature release adding comprehensive support for ASF's COM Object Prototype Extension (monkey patching) capabilities introduced in ASF v3.1.2. This release transforms the extension into a full-featured IDE experience for Office automation development.

## Highlights

- **Added**:
    - COM Prototype Method syntax highlighting for `prototype.COM.ObjectType methodName()` declarations.
    - IntelliSense support for 180+ Office COM objects across Excel, Word, PowerPoint, Access, and Outlook.
    - 10 new prototype-specific code snippets: `prototype`, `protorange`, `protoworksheet`, `protodocument`, `protopresentation`, `protoslide`, `protorecordset`, `protomailitem`, and `this`.
    - Prototype method navigation in VS Code outline and symbol browser.
    - Context-aware `this` keyword highlighting within prototype method bodies.
- **Enhanced**:
    - Code completion with `prototype` and `COM` keywords.
    - Hover documentation for prototype snippets with usage examples.
    - TextMate grammar with dedicated prototype parsing patterns.
    - Language support for Office object type recognition.
- **Updated**:
    - README documentation with comprehensive prototype extension examples.
    - Snippet count increased from 20+ to 30+ built-in templates.

**Full Changelog**: https://github.com/ECP-Solutions/asf-vscode/compare/v1.0.8...v1.0.9

---

## [v1.0.8] - 2026-02-11
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.0.8

## Summary

This version is the first to target both developers using the VS Code web and desktop IDE. 

## Highlights

- **Improvements**:
    - Web identifiers have been added to the package definition to allow the extension to run on vscode.dev.

**Full Changelog**: https://github.com/ECP-Solutions/asf-vscode/compare/v1.0.7...v1.0.8

---

## [v1.0.7] - 2026-02-11
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.0.7

## Summary

A hot fix for ASF language file.

## Highlights

- **Fix**:
    - javascript syntax in json file.

**Full Changelog**: https://github.com/ECP-Solutions/asf-vscode/compare/v1.0.6...v1.0.7

---

## [v1.0.6] - 2026-02-10
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.0.6

## Summary

A hot fix for ASF snippets.

## Highlights

- **Fix**:
    - Resolves missing comma inside the `obj` snippet definition array.

**Full Changelog**: https://github.com/ECP-Solutions/asf-vscode/compare/v1.0.5...v1.0.6

---

## [v1.0.5] - 2026-02-08
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.0.5

## Summary

This release focuses on fix ASF IntelliSense

## Highlights

- **Fix**:
    - Various IntelliSense bugs resolved.
- **Updated**:
    - Chagelog file.


**Full Changelog**: https://github.com/ECP-Solutions/asf-vscode/compare/v1.0.4...v1.0.5

---

## [v1.0.4] - 2026-02-08
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.0.4

## Summary

This release adds IntelliSense support.

## Highlights

- **Added**:
    - IntelliSense for real-time syntax checking.

**Full Changelog**: https://github.com/ECP-Solutions/asf-vscode/compare/v1.0.0...v1.0.4

---

## [v1.0.0] - 2026-02-07
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.0.0

## Summary

Initial release of ASF Language Support

## Highlights

- **Added**:
    - Full TextMate syntax highlighting for all ASF language constructs
    - 20+ code snippets covering functions, classes, loops, imports/exports, and more
    - Language configuration with bracket matching, auto-closing, comment toggling, and smart indentation
    - Basic completion provider for built-in objects
    - Folding range support
    - Support for `.vas` file extensions

---
