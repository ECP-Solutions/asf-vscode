# Changelog

All notable changes for ASF. This file combines the release notes from the project's releases.


## [v1.1.0] - 2026-10-30
https://github.com/ECP-Solutions/asf-vscode/releases/tag/v1.1.0

## Summary

Language support for every ASF feature up to ASF v3.2.0, and a fix for the language configuration, which v1.0.9 had replaced with a copy of the grammar: comment toggling, bracket matching, auto-closing pairs and indentation rules work again, and the COM prototype grammar is now the one VS Code loads.

## Highlights

- **Fixed**:
    - `language-configuration.json` holds the language configuration again; the grammar lives only in `syntaxes/asf.tmLanguage.json`.
    - The `obj` snippet was missing the comma between its two properties; `afun` was described as an arrow function.
    - Statements inside `switch` cases are checked; `print(...)`, `return (...)` followed by more expression, function literals passed as arguments and braceless bodies no longer report false missing semicolons.
    - `;` is no longer required before a closing `}` or after the last statement of a script, as in ASF. A missing `;` after a block statement is a warning (the compiler logs one), after any other statement an error.
    - The invalid `[yourLanguageId]` configuration default and the `files.associations` default are removed; `.asf` is registered as a file extension instead.
- **Added — syntax highlighting**:
    - `??`, `^=`, `&=`, `|=`, `<<=`, `>>=`, `&` concatenation, `undefined`, `option base`, `$n` host arguments.
    - Side-effect imports (`import './lib.vas';`), `export prototype.COM...`, module paths, `export { a as b }`.
    - Regex strings (`` `/\d+/g` ``, `'/\\d+/g'`) and the patterns passed to `regex()`, `.init()` and `.setPattern()`, with groups, lookarounds, classes, quantifiers, anchors, backreferences and flags.
    - Class bodies: method names, fields, `static` members; function parameters and rest parameters; `catch` variables; object literal keys; member access (keywords after `.` are properties); built-in functions, `Math` and built-in methods.
    - `@(...)` with nested parentheses, `${}` with nested braces and templates, quoted strings spanning lines.
    - `===`, `!==` and `=>` are marked invalid.
- **Added — IntelliSense**:
    - Context-aware completions: built-in array, string, object and regex methods (the type is inferred from the variable's initializer), `Math`, class members after `this.` and instances, static methods, namespace import members, COM types after `prototype.COM.`, classes after `new`, exports inside `import { }`, and `.vas` files inside import paths.
    - Hover documentation for every built-in function, method and `Math` member, keywords, `$n` placeholders, COM types and module paths.
    - Signature help, Go to Definition (across imported modules), clickable import paths and a folding provider (blocks, comments, imports, regions).
- **Added — diagnostics**:
    - Unbalanced brackets; unterminated strings, templates, block comments and `@(...)`.
    - Quotes and escapes the ASF tokenizer changes: `"` inside `'...'`, `'` inside `"..."`, `"` in templates, dropped backslashes such as `'\d'`.
    - `;` in `for` headers, `===`/`!==`, arrow functions, `const`/`var`, `function`, `else if`, exponent and hex numbers, invalid `option base`.
    - Missing relative modules, and imported names the module does not export.
    - Settings to turn each group off: `asf.diagnostics.enable`, `asf.diagnostics.missingSemicolons`, `asf.diagnostics.stringPitfalls`, `asf.diagnostics.unresolvedImports`.
- **Updated**:
    - More than 60 snippets: class members, mixed and side-effect imports, `export fun`, `export prototype`, `option base`, regex, array methods, regions and more. Import snippets use single quotes, as the ASF documentation does.
    - `test/features.vas` shows every construct the extension supports.

**Full Changelog**: https://github.com/ECP-Solutions/asf-vscode/compare/v1.0.9...v1.1.0

---


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
