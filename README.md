# ASF Language Support

A comprehensive Visual Studio Code extension providing rich language support for the **Advanced Scripting Framework (ASF)** — a modern, JavaScript-like scripting language implemented entirely in VBA that transforms VBA into a powerful script host.

ASF brings first-class functions, closures, classes, modules, template literals, destructuring, spread/rest operators, and much more to the VBA ecosystem. This extension makes writing ASF code a first-class experience inside VS Code.

## Features

### Syntax Highlighting

Full TextMate grammar covering every construct in the ASF language:

- **Keywords & control flow** — `if`, `elseif`, `else`, `for`, `while`, `switch`, `case`, `try`, `catch`, `return`, `break`, `continue`
- **Declarations** — `let`, `fun`, `class`, `field`, `constructor`, `static`, `extends`
- **Module system** — `import`, `export`, `from`, `as`, `default`
- **Literals** — numbers, single/double-quoted strings with escape sequences, booleans (`true`, `false`), `null`
- **Template strings** — backtick strings with `${expression}` interpolation, fully recursive highlighting
- **VBA escape hatch** — `@(VBA_EXPR)` blocks highlighted as embedded VBA source
- **Operators** — arithmetic, comparison, logical, bitwise, assignment, spread (`...`), ternary (`? :`)
- **Comments** — line (`//`) and block (`/* */`)
- **Classes** — class names, inherited classes, constructors, static methods, and field declarations
- **Functions** — named declarations and anonymous function expressions

### Code Snippets

Over 20 built-in snippets for rapid development:

| Prefix    | Description                          |
|-----------|--------------------------------------|
| `fun`     | Function declaration                 |
| `afun`    | Anonymous function expression        |
| `class`   | Class declaration                    |
| `classx`  | Class with `extends`                 |
| `if`      | If statement                         |
| `ife`     | If-else statement                    |
| `ifel`    | If-elseif-else statement             |
| `for`     | C-style for loop                     |
| `forin`   | For-in loop                          |
| `forof`   | For-of loop                          |
| `while`   | While loop                           |
| `switch`  | Switch statement                     |
| `try`     | Try-catch block                      |
| `let`     | Variable declaration                 |
| `imp`     | Default import                       |
| `impn`    | Named import                         |
| `impns`   | Namespace import (`* as`)            |
| `exp`     | Named export                         |
| `expd`    | Default export                       |
| `dest`    | Array destructuring                  |
| `destr`   | Array destructuring with rest        |
| `print`   | Print statement                      |
| `tpl`     | Template literal                     |
| `vba`     | VBA escape hatch `@(...)`            |

### Language Configuration

- **Bracket matching** — `{}`, `[]`, `()`
- **Auto-closing pairs** — braces, brackets, parentheses, single quotes, double quotes, backticks
- **Surrounding pairs** — select text and wrap with any bracket or quote type
- **Comment toggling** — `Ctrl+/` for line comments, `Shift+Alt+A` for block comments
- **Code folding** — automatic folding on brace blocks plus `// #region` / `// #endregion` markers
- **Smart indentation** — automatic indent/outdent based on braces

### IntelliSense & Editor Support

- **Hover information** — hover over keywords to see quick descriptions
- **Basic completions** — suggestions for built-in objects and language keywords
- **Folding ranges** — intelligent code folding based on block structure

## Requirements

No external dependencies are required. The extension works out of the box with any VS Code installation **1.109.0** or later.

To actually *run* ASF scripts, you will need:

- Microsoft Excel or Access (as the VBA host)
- The ASF runtime library imported into your VBA project

See the [ASF documentation](https://ecp-solutions.github.io/ASF/) for setup instructions.

## Extension Settings

This extension does not currently contribute any configurable settings. 

## Supported File Extensions

| Extension | Description                              |
|-----------|------------------------------------------|
| `.vas`    | ASF script file (can use import/export)  |

## Known Issues

- **VBA escape highlighting** — The `@(VBA_EXPR)` construct uses a simplified matching strategy. Deeply nested parentheses inside the VBA expression may cause the closing delimiter to be detected prematurely.
- **Template string nesting** — Nested template literals (backticks inside `${}` interpolations) may not highlight correctly beyond two levels of depth.
- **No semantic tokenization yet** — Highlighting is purely TextMate-based. Variable scoping, type inference, and cross-file symbol resolution are not yet supported.

## Release Notes

### 1.0.0

Initial release of ASF Language Support:

- Full TextMate syntax highlighting for all ASF language constructs
- 20+ code snippets covering functions, classes, loops, imports/exports, and more
- Language configuration with bracket matching, auto-closing, comment toggling, and smart indentation
- Hover provider with keyword descriptions
- Basic completion provider for built-in objects
- Folding range support
- Support for `.vas` file extensions

---

## For more information

- [Visual Studio Code's Markdown Support](https://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [TextMate Grammar Reference](https://macromates.com/manual/en/language_grammars)

**Enjoy!**
