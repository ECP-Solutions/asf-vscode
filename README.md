# ASF Language Support

A comprehensive Visual Studio Code extension providing rich language support for the **Advanced Scripting Framework (ASF)** — a modern, JavaScript-like scripting language implemented entirely in VBA that transforms VBA into a powerful script host.

ASF brings first-class functions, closures, classes, modules, template literals, destructuring, spread/rest operators, nullish coalescing, regular expressions, COM object prototype extension, and much more to the VBA ecosystem. This extension makes writing ASF code a first-class experience inside VS Code.

## Features

### Syntax Highlighting

Full TextMate grammar covering every construct in the ASF language (up to ASF v3.2.0):

- **Keywords & control flow** — `if`, `elseif`, `else`, `for`/`in`/`of`, `while`, `switch`/`case`/`default`, `try`/`catch`, `return`, `break`, `continue`
- **Declarations** — `let`, `fun` (named and anonymous, with parameters and `...rest`), `class`, `extends`, `field`, `constructor`, `static`, class method names
- **Prototype extensions** — `prototype.COM.ObjectType methodName()` and `export prototype.COM...`
- **Module system** — `import` (default, named, aliased, namespace `* as`, mixed, side-effect `import './lib.vas';`), `export { }`, `export default`, `export fun`, module paths
- **Literals** — numbers, `'...'` and `"..."` strings (which may span lines) with escape sequences, `true`, `false`, `null`, `undefined`
- **Template strings** — backtick strings with `${expression}` interpolation, including nested templates and object literals inside `${}`
- **Regular expressions** — regex strings such as `` `/(\d{3})-(\d{4})/g` `` and the pattern of `regex(...)`, `.init(...)` and `.setPattern(...)`: groups, named groups, lookarounds, classes, quantifiers, anchors, backreferences and flags
- **VBA expressions** — `@(VBA_EXPR)` blocks, with nested parentheses, highlighted as embedded VBA-Expressions code
- **Operators** — arithmetic, `^` (power), `&` (concatenation), comparison, logical, `??` (nullish coalescing), shifts, ternary, spread, and every compound assignment (`+=`, `-=`, `*=`, `/=`, `%=`, `^=`, `&=`, `|=`, `<<=`, `>>=`)
- **Host arguments** — `$1`, `$2`, ... placeholders
- **Built-ins** — `print`, `range`, `flatten`, `clone`, `isArray`, `isNumeric`, `foreach`, `regex`, `cwd`, `scwd`, the `Math` object, and the built-in array, string, object and regex methods
- **`option base`**, object literal keys, member access, `this`/`super`
- **Comments** — line (`//`), Python-style (`#`) and block (`/* */`)
- JavaScript syntax that ASF does not have (`===`, `!==`, `=>`) is marked as invalid

![ASF](/assets/ASF.png)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FECP-Solutions%2Fasf-vscode.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FECP-Solutions%2Fasf-vscode?ref=badge_shield)

### IntelliSense

- **Completions** that follow the context:
  - after `.`: the methods of arrays, strings, objects and regex engines (the type is inferred from the variable's initializer: `[...]`, `'...'`, `{...}`, `regex(...)`, `new Class(...)`), the `Math` members, a class's fields and methods (inherited ones included) after `this.` or an instance, static methods after a class name, the exports of a namespace import, and declared prototype methods on COM objects
  - after `prototype.COM.`: 140+ Office COM object types from Excel, Word, PowerPoint, Access and Outlook
  - after `new`: classes
  - inside `import { }`: the names the module exports; inside `export { }`: the local names
  - inside an import path: `.vas` files and folders next to the current file
  - elsewhere: parameters of the enclosing functions, variables, functions, classes, imports, `$n` placeholders, built-in functions and keywords
- **Hover documentation** for keywords, built-in functions, `Math`, every built-in method, `$n` placeholders, COM types, module paths (with the module's exports), and your own functions, classes, methods, fields, parameters, variables and imports, including the comments written above their declarations
- **Signature help** for built-in functions and methods, `Math` functions, your functions and methods, imported functions, `new Class(...)` and `super(...)`
- **Go to Definition** for variables, parameters, functions, classes, class members, prototype methods, imported names (into the other module) and module paths
- **Clickable import paths** (document links)
- **Outline** — classes with their fields, constructor and methods, functions, prototype methods, top-level variables, imports and exports
- **Folding** — blocks, arrays, argument lists, block comments, runs of line comments, multi-line strings, import groups and `// #region` / `// #endregion` (or `# region` / `# endregion`) markers

### Diagnostics

Errors are reported while you type, with a hover explaining the fix:

- **Missing `;`** after a statement (an error: ASF splits statements on `;` only) or after a block statement (a warning: the compiler logs one). As in ASF, `;` is optional before a closing `}` and after the last statement of the script.
- **`;` instead of `,`** inside arguments, arrays, object literals, import/export lists and `for (init, cond, step)` headers
- **Unbalanced brackets** and **unterminated** strings, templates, block comments and `@(...)` expressions
- **String pitfalls** caused by the ASF tokenizer, which turns every `"` into `'` before reading a script:
  - a `"` inside a `'...'` string, or a `'` inside a `"..."` string, ends the string early
  - a `"` in a template (or an escaped `\"`) becomes `'`
  - an escape such as `'\d'` loses its backslash (write `'\\d'` or use a backtick string)
- **JavaScript habits ASF does not support** — `===`/`!==`, arrow functions, `const`/`var`, `function`, `else if` (ASF writes `elseif`), exponent (`1e5`) and hex (`0xFF`) numbers
- **`option base`** with a value other than 0 or 1
- **Imports** — a relative module path that does not exist next to the file, a named import the module does not export, or a default import from a module without `export default`

### Code Snippets

More than 60 snippets, among them:

| Prefix            | Description                          |
|-------------------|--------------------------------------|
| `fun` / `funr`    | Function declaration (with rest parameter) |
| `afun`            | Anonymous function expression        |
| `class` / `classx`| Class (with fields, or with `extends`) |
| `field`, `method`, `static`, `ctor` | Class members        |
| `if`, `ife`, `ifel` | If, if-else, if-elseif-else        |
| `for`, `forin`, `forof`, `while` | Loops                   |
| `switch`, `case`  | Switch statement and case clause     |
| `try`, `tryc`     | Try-catch (with or without an error variable) |
| `let`, `ret`, `print` | Statements                       |
| `obj`, `objl`, `arr` | Object and array literals         |
| `dest`, `destr`, `spread` | Destructuring and spread      |
| `nullish`, `tern` | `??` and ternary expressions         |
| `tpl`             | Template literal                     |
| `regex`, `rel`    | Regex engine and regex literal string |
| `map`, `filter`, `reduce`, `foreach` | Array methods      |
| `imp`, `impn`, `impns`, `impm`, `imps` | Default, named, namespace, mixed and side-effect imports |
| `module`          | `scwd(wd)` followed by an import     |
| `exp`, `expd`, `expf`, `expp` | Named, default, function and prototype exports |
| `option`          | `option base`                        |
| `vba`             | VBA expression `@(...)`              |
| `region`          | Foldable region                      |
| `prototype`       | COM prototype method definition      |
| `protorange`, `protolistrow`, `protoworksheet` | Excel prototype methods |
| `protodocument`   | Word Document prototype method       |
| `protopresentation`, `protoslide` | PowerPoint prototype methods |
| `protorecordset`  | Access Recordset prototype method    |
| `protomailitem`   | Outlook MailItem prototype method    |
| `this`            | COM object property access via `this` |

### Language Configuration

- **Bracket matching and colorization** — `{}`, `[]`, `()`
- **Auto-closing pairs** — braces, brackets, parentheses, quotes, backticks, `/* */` and `${}`
- **Surrounding pairs** — select text and wrap it with any bracket or quote
- **Comment toggling** — `Ctrl+/` for line comments, `Shift+Alt+A` for block comments
- **Smart indentation** and `/** ... */` comment continuation

### COM Prototype Extension

Support for ASF's COM object monkey patching syntax (ASF v3.1.2+), including prototype libraries (ASF v3.1.3+):

```javascript
// prototypes.vas
export prototype.COM.Range formatCurrency() {
    this.NumberFormat = '$#,##0.00';
    this.Font.Bold = true;
    return this; // Enable method chaining
};
```

```javascript
// main.vas
scwd(wd);
import './prototypes.vas';   // activates every exported prototype
$1.Range('B2:B10').formatCurrency();
```

## Requirements

No external dependencies are required. The extension works with VS Code **1.80** or later, on the desktop and on vscode.dev.

To actually *run* ASF scripts, you will need:

- Microsoft Excel or Access (as the VBA host), or LibreOffice with the ASF extension
- The ASF runtime library imported into your VBA project
- ASF v3.1.2 or later for COM prototype extension features

See the [ASF documentation](https://ecp-solutions.github.io/ASF/) for setup instructions.

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `asf.diagnostics.enable` | `true` | Check ASF files for errors while you type. |
| `asf.diagnostics.missingSemicolons` | `true` | Report statements not terminated by `;`. |
| `asf.diagnostics.stringPitfalls` | `true` | Warn about quotes and escapes the ASF tokenizer changes. |
| `asf.diagnostics.unresolvedImports` | `true` | Warn about missing modules and names they do not export. |

## Supported File Extensions

| Extension | Description                              |
|-----------|------------------------------------------|
| `.vas`    | ASF script file (can use import/export)  |
| `.asf`    | ASF script file                          |

## Known Issues

- **Type inference is local** — member completions know the type of a variable from its initializer in the same file; parameters, call results and COM objects get the full list of built-in methods.
- **Module paths** — imports are resolved next to the current file. ASF resolves them against `cwd()` at run time, so a script that calls `scwd()` with another folder may see "module not found" warnings; turn them off with `asf.diagnostics.unresolvedImports`.
- **No semantic tokenization yet** — highlighting is TextMate-based.

---

## For more information

- [ASF documentation](https://ecp-solutions.github.io/ASF/)
- [ASF repository](https://github.com/ECP-Solutions/ASF)
- [VS Code Extension API](https://code.visualstudio.com/api)

**Enjoy!**


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FECP-Solutions%2Fasf-vscode.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FECP-Solutions%2Fasf-vscode?ref=badge_large)