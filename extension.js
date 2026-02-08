const vscode = require('vscode');

function activate(context) {
    console.log('ASF Language Extension activated');

    // ── Diagnostics ──────────────────────────────────────────────
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('asf');
    context.subscriptions.push(diagnosticCollection);

    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === 'asf') {
        validateDocument(vscode.window.activeTextEditor.document, diagnosticCollection);
    }

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'asf') {
                validateDocument(editor.document, diagnosticCollection);
            }
        }),
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'asf') {
                validateDocument(event.document, diagnosticCollection);
            }
        }),
        vscode.workspace.onDidCloseTextDocument(doc => {
            diagnosticCollection.delete(doc.uri);
        })
    );

    // ── Hover Provider ───────────────────────────────────────────
    const hoverProvider = vscode.languages.registerHoverProvider('asf', {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            if (!range) return;
            const word = document.getText(range);

            const docs = {
                'fun':         '`fun name(params) { ... }`\n\nDeclares a named or anonymous function.',
                'class':       '`class Name [extends Parent] { ... }`\n\nDeclares a class with optional inheritance.',
                'field':       '`field name = value;`\n\nDeclares an instance field inside a class body.',
                'let':         '`let name = value;`\n\nDeclares a variable.',
                'constructor': '`constructor(params) { ... }`\n\nClass constructor method.',
                'static':      '`static method(params) { ... }`\n\nDeclares a static method on a class.',
                'extends':     'Specifies the parent class in a class declaration.',
                'if':          '`if (expr) { ... } [elseif (expr) { ... }] [else { ... }]`\n\nConditional statement.',
                'elseif':      'Alternate condition branch in an if statement.',
                'else':        'Fallback branch in an if statement.',
                'for':         '`for (init, cond, step) { ... }` or `for (x in obj)` or `for (x of arr)`\n\nLoop statement.',
                'while':       '`while (expr) { ... }`\n\nLoop while condition is truthy.',
                'switch':      '`switch (expr) { case val { ... } default { ... } }`\n\nMulti-branch conditional.',
                'try':         '`try { ... } catch (err) { ... }`\n\nException handling.',
                'catch':       'Handles exceptions from a try block.',
                'return':      'Returns a value from a function.',
                'break':       'Exits the current loop or switch case.',
                'continue':    'Skips to the next loop iteration.',
                'import':      '`import name from "module"` or `import { a, b } from "module"`\n\nImport from a module.',
                'export':      '`export { name }` or `export default expr` or `export fun name() { ... }`\n\nExport from a module.',
                'this':        'Reference to the current class instance.',
                'super':       'Reference to the parent class. Use `super(args)` to call parent constructor.',
                'new':         '`new ClassName(args)`\n\nCreates a new class instance.',
                'typeof':      '`typeof expr`\n\nReturns the type of an expression as a string.',
                'print':       '`print(args)`\n\nPrints values to output.',
                'true':        'Boolean true literal.',
                'false':       'Boolean false literal.',
                'null':        'Null literal — represents no value.'
            };

            if (docs[word]) {
                const md = new vscode.MarkdownString(docs[word]);
                return new vscode.Hover(md, range);
            }
        }
    });

    // ── Completion Provider ──────────────────────────────────────
    const completionProvider = vscode.languages.registerCompletionItemProvider('asf', {
        provideCompletionItems() {
            const completions = [];

            const keywords = [
                { label: 'fun',         kind: vscode.CompletionItemKind.Keyword, detail: 'Function declaration' },
                { label: 'class',       kind: vscode.CompletionItemKind.Keyword, detail: 'Class declaration' },
                { label: 'let',         kind: vscode.CompletionItemKind.Keyword, detail: 'Variable declaration' },
                { label: 'field',       kind: vscode.CompletionItemKind.Keyword, detail: 'Class field declaration' },
                { label: 'constructor', kind: vscode.CompletionItemKind.Keyword, detail: 'Class constructor' },
                { label: 'static',      kind: vscode.CompletionItemKind.Keyword, detail: 'Static method modifier' },
                { label: 'extends',     kind: vscode.CompletionItemKind.Keyword, detail: 'Class inheritance' },
                { label: 'if',          kind: vscode.CompletionItemKind.Keyword, detail: 'Conditional statement' },
                { label: 'elseif',      kind: vscode.CompletionItemKind.Keyword, detail: 'Else-if branch' },
                { label: 'else',        kind: vscode.CompletionItemKind.Keyword, detail: 'Else branch' },
                { label: 'for',         kind: vscode.CompletionItemKind.Keyword, detail: 'For loop' },
                { label: 'while',       kind: vscode.CompletionItemKind.Keyword, detail: 'While loop' },
                { label: 'switch',      kind: vscode.CompletionItemKind.Keyword, detail: 'Switch statement' },
                { label: 'case',        kind: vscode.CompletionItemKind.Keyword, detail: 'Switch case' },
                { label: 'default',     kind: vscode.CompletionItemKind.Keyword, detail: 'Switch default' },
                { label: 'try',         kind: vscode.CompletionItemKind.Keyword, detail: 'Try block' },
                { label: 'catch',       kind: vscode.CompletionItemKind.Keyword, detail: 'Catch block' },
                { label: 'return',      kind: vscode.CompletionItemKind.Keyword, detail: 'Return statement' },
                { label: 'break',       kind: vscode.CompletionItemKind.Keyword, detail: 'Break statement' },
                { label: 'continue',    kind: vscode.CompletionItemKind.Keyword, detail: 'Continue statement' },
                { label: 'import',      kind: vscode.CompletionItemKind.Keyword, detail: 'Import module' },
                { label: 'export',      kind: vscode.CompletionItemKind.Keyword, detail: 'Export module' },
                { label: 'from',        kind: vscode.CompletionItemKind.Keyword, detail: 'Import source' },
                { label: 'as',          kind: vscode.CompletionItemKind.Keyword, detail: 'Import/export alias' },
                { label: 'new',         kind: vscode.CompletionItemKind.Keyword, detail: 'Create instance' },
                { label: 'typeof',      kind: vscode.CompletionItemKind.Keyword, detail: 'Type check' },
                { label: 'this',        kind: vscode.CompletionItemKind.Keyword, detail: 'Current instance' },
                { label: 'super',       kind: vscode.CompletionItemKind.Keyword, detail: 'Parent class reference' },
                { label: 'print',       kind: vscode.CompletionItemKind.Function, detail: 'Print to output' },
                { label: 'true',        kind: vscode.CompletionItemKind.Value,   detail: 'Boolean true' },
                { label: 'false',       kind: vscode.CompletionItemKind.Value,   detail: 'Boolean false' },
                { label: 'null',        kind: vscode.CompletionItemKind.Value,   detail: 'Null value' }
            ];

            for (const kw of keywords) {
                const item = new vscode.CompletionItem(kw.label, kw.kind);
                item.detail = kw.detail;
                completions.push(item);
            }

            const builtins = ['Math', 'Array', 'String', 'Object', 'RegExp'];
            for (const name of builtins) {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
                item.detail = 'Built-in object';
                completions.push(item);
            }

            return completions;
        }
    });

    context.subscriptions.push(hoverProvider, completionProvider);
}

// ─────────────────────────────────────────────────────────────────
//  Text Stripping — remove strings, comments, templates, VBA escapes
// ─────────────────────────────────────────────────────────────────

function stripStringsAndComments(text) {
    const chars = text.split('');
    const len = chars.length;
    let i = 0;

    function blank(start, end) {
        for (let j = start; j < end && j < len; j++) {
            if (chars[j] !== '\n') chars[j] = ' ';
        }
    }

    while (i < len) {
        // Hash line comment: #
        if (chars[i] === '#') {
            const start = i;
            while (i < len && chars[i] !== '\n') i++;
            blank(start, i);
            continue;
        }
        // Line comment: //
        if (chars[i] === '/' && i + 1 < len && chars[i + 1] === '/') {
            const start = i;
            while (i < len && chars[i] !== '\n') i++;
            blank(start, i);
            continue;
        }
        // Block comment: /* ... */
        if (chars[i] === '/' && i + 1 < len && chars[i + 1] === '*') {
            const start = i;
            i += 2;
            while (i < len && !(chars[i] === '*' && i + 1 < len && chars[i + 1] === '/')) i++;
            i += 2;
            blank(start, i);
            continue;
        }
        // Double-quoted string
        if (chars[i] === '"') {
            const start = i;
            i++;
            while (i < len && chars[i] !== '"' && chars[i] !== '\n') {
                if (chars[i] === '\\') i++;
                i++;
            }
            if (i < len && chars[i] === '"') i++;
            blank(start, i);
            continue;
        }
        // Single-quoted string
        if (chars[i] === "'") {
            const start = i;
            i++;
            while (i < len && chars[i] !== "'" && chars[i] !== '\n') {
                if (chars[i] === '\\') i++;
                i++;
            }
            if (i < len && chars[i] === "'") i++;
            blank(start, i);
            continue;
        }
        // Template literal
        if (chars[i] === '`') {
            const start = i;
            i++;
            while (i < len) {
                if (chars[i] === '\\') { i += 2; continue; }
                if (chars[i] === '`') { i++; break; }
                if (chars[i] === '$' && i + 1 < len && chars[i + 1] === '{') {
                    i += 2;
                    let braceDepth = 1;
                    while (i < len && braceDepth > 0) {
                        if (chars[i] === '{') braceDepth++;
                        else if (chars[i] === '}') braceDepth--;
                        if (braceDepth > 0) i++;
                    }
                    if (i < len) i++;
                    continue;
                }
                i++;
            }
            blank(start, i);
            continue;
        }
        // VBA escape @(...)
        if (chars[i] === '@' && i + 1 < len && chars[i + 1] === '(') {
            const start = i;
            i += 2;
            let parenDepth = 1;
            while (i < len && parenDepth > 0) {
                if (chars[i] === '(') parenDepth++;
                else if (chars[i] === ')') parenDepth--;
                if (parenDepth > 0) i++;
            }
            if (i < len) i++;
            blank(start, i);
            continue;
        }
        i++;
    }

    return chars.join('');
}

// ─────────────────────────────────────────────────────────────────
//  Tokenizer
// ─────────────────────────────────────────────────────────────────

function tokenize(stripped, document) {
    const tokens = [];
    const tokenRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b|\.\.\.|\|\||&&|<<|>>|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|[{}()\[\];,.:?=+\-*/%!<>|&^~@]/g;
    let match;

    while ((match = tokenRegex.exec(stripped)) !== null) {
        const pos = document.positionAt(match.index);
        tokens.push({
            value: match[0],
            index: match.index,
            line: pos.line,
            char: pos.character,
            length: match[0].length
        });
    }

    return tokens;
}

// ─────────────────────────────────────────────────────────────────
//  Semicolon Validator
// ─────────────────────────────────────────────────────────────────
//
//  ASF grammar rule:
//    <stmts> ::= <stmt> ( ';' <stmt> )* [ ';' ]
//
//  EVERY statement requires a trailing ';', including those
//  that end with a closing '}' block:
//
//    if (x) { ... };
//    for (i in arr) { ... };
//    while (cond) { ... };
//    try { ... } catch (e) { ... };
//    switch (x) { case 1 { ... } };
//    fun name() { ... };
//    class Foo { ... };
//    export fun name() { ... };
//
//  The only places where ';' is NOT expected:
//    - After '{' (opening a block)
//    - Between '}' and continuation keywords: elseif, else, catch
//    - Inside switch bodies between case/default blocks
//    - Inside class bodies between members (constructor, methods,
//      static methods — these are NOT standalone statements)
//    - At file start / empty files
//
// ─────────────────────────────────────────────────────────────────

function validateDocument(document, diagnosticCollection) {
    const text = document.getText();
    const stripped = stripStringsAndComments(text);
    const tokens = tokenize(stripped, document);
    const diagnostics = [];

    if (tokens.length === 0) {
        diagnosticCollection.set(document.uri, []);
        return;
    }

    const len = tokens.length;
    let i = 0;

    const contextStack = []; // 'top' | 'class' | 'switch'

    function currentContext() {
        return contextStack.length > 0 ? contextStack[contextStack.length - 1] : 'top';
    }

    function at(idx) {
        return idx < len ? tokens[idx] : null;
    }

    // Skip a balanced (...) group. Returns index AFTER ')'.
    function skipParens(start) {
        if (start >= len || tokens[start].value !== '(') return start;
        let j = start + 1;
        let depth = 1;
        while (j < len && depth > 0) {
            if (tokens[j].value === '(') depth++;
            else if (tokens[j].value === ')') depth--;
            j++;
        }
        return j;
    }

    // Skip a balanced {...} group. Returns index AFTER '}'.
    function skipBraces(start) {
        if (start >= len || tokens[start].value !== '{') return start;
        let j = start + 1;
        let depth = 1;
        while (j < len && depth > 0) {
            if (tokens[j].value === '{') depth++;
            else if (tokens[j].value === '}') depth--;
            j++;
        }
        return j;
    }

    // Skip a balanced [...] group. Returns index AFTER ']'.
    function skipBrackets(start) {
        if (start >= len || tokens[start].value !== '[') return start;
        let j = start + 1;
        let depth = 1;
        while (j < len && depth > 0) {
            if (tokens[j].value === '[') depth++;
            else if (tokens[j].value === ']') depth--;
            j++;
        }
        return j;
    }

    // Scan an expression at depth 0, stopping at ';', unbalanced '}',
    // or a statement-starting keyword at depth 0.
    function scanExpr(start) {
        let j = start;
        let parenD = 0, bracketD = 0, braceD = 0;

        while (j < len) {
            const v = tokens[j].value;
            if (v === '(') { parenD++; j++; continue; }
            if (v === ')') { parenD--; if (parenD < 0) return j; j++; continue; }
            if (v === '[') { bracketD++; j++; continue; }
            if (v === ']') { bracketD--; if (bracketD < 0) return j; j++; continue; }
            if (v === '{') { braceD++; j++; continue; }
            if (v === '}') {
                braceD--;
                if (braceD < 0) return j;
                j++;
                if (braceD === 0 && parenD === 0 && bracketD === 0) return j;
                continue;
            }
            if (v === ';') return j;
            if (parenD === 0 && bracketD === 0 && braceD === 0 && isStatementStart(v)) {
                return j;
            }
            j++;
        }
        return j;
    }

    // Report missing semicolon at a token position
    function reportMissing(tok) {
        const endChar = tok.char + tok.length;
        const range = new vscode.Range(
            new vscode.Position(tok.line, endChar),
            new vscode.Position(tok.line, endChar)
        );
        const diag = new vscode.Diagnostic(
            range,
            "Missing semicolon ';' at end of statement.",
            vscode.DiagnosticSeverity.Error
        );
        diag.source = 'ASF';
        diag.code = 'missing-semicolon';
        diagnostics.push(diag);
    }

    // Check that token at `idx` is ';'. If not, report on `lastTok`.
    function expectSemicolon(idx, lastTok) {
        if (idx < len && tokens[idx].value === ';') {
            return idx + 1; // consume ';'
        }
        if (lastTok) {
            reportMissing(lastTok);
        }
        return idx;
    }

    // Scan postfix chain: .ident, [expr], (args) after primary
    function scanPostfixChain(start) {
        let j = start;
        while (j < len) {
            if (tokens[j].value === '.') {
                j++;
                if (j < len) j++;
                continue;
            }
            if (tokens[j].value === '[') { j = skipBrackets(j); continue; }
            if (tokens[j].value === '(') { j = skipParens(j); continue; }
            break;
        }
        return j;
    }

    // Find index of matching ']' for '[' at start
    function findMatchingBracket(start) {
        if (start >= len || tokens[start].value !== '[') return start;
        let j = start + 1;
        let depth = 1;
        while (j < len && depth > 0) {
            if (tokens[j].value === '[') depth++;
            else if (tokens[j].value === ']') depth--;
            j++;
        }
        return j - 1;
    }

    // ── Main statement loop ─────────────────────────────────
    function parseStatements() {
        while (i < len) {
            if (tokens[i].value === ';') { i++; continue; }
            if (tokens[i].value === '}') break;
            parseStatement();
        }
    }

    function parseStatement() {
        if (i >= len) return;
        const tok = tokens[i];

        switch (tok.value) {

            // ── if / elseif / else chain ────────────────────
            case 'if':
                parseIfStatement();
                return;

            // ── for ─────────────────────────────────────────
            case 'for':
                i++;
                i = skipParens(i);
                i = parseBlock();
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── while ───────────────────────────────────────
            case 'while':
                i++;
                i = skipParens(i);
                i = parseBlock();
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── try / catch ─────────────────────────────────
            case 'try':
                parseTryStatement();
                return;

            // ── switch ──────────────────────────────────────
            case 'switch':
                i++;
                i = skipParens(i);
                i = skipBraces(i);
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── fun declaration ──────────────────────────────
            case 'fun':
                parseFunDecl();
                return;

            // ── class ───────────────────────────────────────
            case 'class':
                parseClassDecl();
                return;

            // ── export ──────────────────────────────────────
            case 'export':
                parseExportStatement();
                return;

            // ── import ──────────────────────────────────────
            case 'import':
                parseImportStatement();
                return;

            // ── let ─────────────────────────────────────────
            case 'let':
                i++;
                if (i < len) i++; // identifier
                if (i < len && tokens[i].value === '=') {
                    i++;
                    i = scanExpr(i);
                }
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── field (inside class) ────────────────────────
            case 'field':
                i++;
                while (i < len && tokens[i].value !== ';') {
                    if (tokens[i].value === '}') break;
                    i++;
                }
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── return ──────────────────────────────────────
            case 'return':
                i++;
                if (i < len && tokens[i].value !== ';' && tokens[i].value !== '}') {
                    if (tokens[i].value === '(') {
                        i = skipParens(i);
                    } else {
                        i = scanExpr(i);
                    }
                }
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── break / continue ────────────────────────────
            case 'break':
            case 'continue':
                i++;
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── print ───────────────────────────────────────
            case 'print':
                i++;
                i = skipParens(i);
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── super (as expr-stmt) ────────────────────────
            case 'super':
                i++;
                if (i < len && tokens[i].value === '(') {
                    i = skipParens(i);
                }
                i = scanPostfixChain(i);
                i = expectSemicolon(i, at(i - 1));
                return;

            // ── constructor (inside class — no ';') ─────────
            case 'constructor':
                i++;
                i = skipParens(i);
                i = parseBlock();
                return;

            // ── static method (inside class — no ';') ───────
            case 'static':
                i++;
                if (i < len) i++; // method name
                i = skipParens(i);
                i = parseBlock();
                return;

            // ── array destructuring: [a, b, ...c] = expr ────
            case '[': {
                const closeBracket = findMatchingBracket(i);
                if (closeBracket < len && closeBracket + 1 < len &&
                    tokens[closeBracket + 1].value === '=') {
                    i = closeBracket + 1;
                    i++;
                    i = scanExpr(i);
                    i = expectSemicolon(i, at(i - 1));
                    return;
                }
                i = scanExpr(i);
                i = expectSemicolon(i, at(i - 1));
                return;
            }

            // ── expression statement (fallback) ─────────────
            default:
                // Method declaration inside class: name(params) { ... }
                if (currentContext() === 'class' && isIdentifier(tok.value)) {
                    if (i + 1 < len && tokens[i + 1].value === '(') {
                        const afterParen = skipParens(i + 1);
                        if (afterParen < len && tokens[afterParen].value === '{') {
                            i++;
                            i = skipParens(i);
                            i = parseBlock();
                            return;
                        }
                    }
                }
                // General expression statement
                i = scanExpr(i);
                i = expectSemicolon(i, at(i - 1));
                return;
        }
    }

    // ── if statement ────────────────────────────────────────
    // if (expr) block [elseif (expr) block]* [else block] ;
    function parseIfStatement() {
        i++;
        i = skipParens(i);
        i = parseBlock();

        while (i < len && tokens[i].value === 'elseif') {
            i++;
            i = skipParens(i);
            i = parseBlock();
        }
        if (i < len && tokens[i].value === 'else') {
            i++;
            i = parseBlock();
        }

        i = expectSemicolon(i, at(i - 1));
    }

    // ── try statement ───────────────────────────────────────
    // try block catch [(ident)] block ;
    function parseTryStatement() {
        i++;
        i = parseBlock();

        if (i < len && tokens[i].value === 'catch') {
            i++;
            if (i < len && tokens[i].value === '(') {
                i = skipParens(i);
            }
            i = parseBlock();
        }

        i = expectSemicolon(i, at(i - 1));
    }

    // ── fun declaration ─────────────────────────────────────
    // fun name(params) block ;
    function parseFunDecl() {
        i++; // skip 'fun'

        // Named function
        if (i < len && isIdentifier(tokens[i].value)) {
            i++;
            i = skipParens(i);
            i = parseBlock();
            i = expectSemicolon(i, at(i - 1));
            return;
        }

        // Anonymous function as expression
        i--;
        i = scanExpr(i);
        i = expectSemicolon(i, at(i - 1));
    }

    // ── class declaration ───────────────────────────────────
    // class Name [extends Parent] { class-body } ;
    function parseClassDecl() {
        i++; // skip 'class'
        if (i < len) i++; // class name
        if (i < len && tokens[i].value === 'extends') {
            i++;
            if (i < len) i++; // parent name
        }

        if (i < len && tokens[i].value === '{') {
            i++;
            contextStack.push('class');

            while (i < len && tokens[i].value !== '}') {
                if (tokens[i].value === ';') { i++; continue; }
                parseStatement();
            }

            contextStack.pop();
            if (i < len && tokens[i].value === '}') i++;
        }

        i = expectSemicolon(i, at(i - 1));
    }

    // ── export statement ────────────────────────────────────
    function parseExportStatement() {
        i++; // skip 'export'
        if (i >= len) return;

        // export fun name() { ... };
        if (tokens[i].value === 'fun') {
            i++;
            if (i < len) i++; // name
            i = skipParens(i);
            i = parseBlock();
            i = expectSemicolon(i, at(i - 1));
            return;
        }

        // export default expr;
        if (tokens[i].value === 'default') {
            i++;
            i = scanExpr(i);
            i = expectSemicolon(i, at(i - 1));
            return;
        }

        // export { name, name as alias };
        if (tokens[i].value === '{') {
            i = skipBraces(i);
            i = expectSemicolon(i, at(i - 1));
            return;
        }

        i = scanExpr(i);
        i = expectSemicolon(i, at(i - 1));
    }

    // ── import statement ────────────────────────────────────
    function parseImportStatement() {
        i++; // skip 'import'

        while (i < len) {
            const v = tokens[i].value;
            if (v === ';') break;
            if (v === 'from') {
                i++;
                // String was blanked — skip to ';' or next statement
                while (i < len && tokens[i].value !== ';' &&
                       !isStatementStart(tokens[i].value)) {
                    i++;
                }
                break;
            }
            i++;
        }

        i = expectSemicolon(i, at(i - 1));
    }

    // ── block parsing ───────────────────────────────────────
    // <block> ::= '{' <stmts> '}' | <stmt>
    // Returns index AFTER the block.
    function parseBlock() {
        if (i >= len) return i;

        if (tokens[i].value === '{') {
            i++;
            while (i < len && tokens[i].value !== '}') {
                if (tokens[i].value === ';') { i++; continue; }
                parseStatement();
            }
            if (i < len && tokens[i].value === '}') i++;
            return i;
        }

        // Single-statement block
        parseStatement();
        return i;
    }

    // ── Run ─────────────────────────────────────────────────
    parseStatements();

    diagnosticCollection.set(document.uri, diagnostics);
}

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────

function isIdentifier(s) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) && !isReserved(s);
}

function isReserved(s) {
    const reserved = new Set([
        'if', 'elseif', 'else', 'for', 'in', 'of', 'while', 'switch',
        'case', 'default', 'break', 'continue', 'return', 'try', 'catch',
        'fun', 'class', 'let', 'field', 'constructor', 'static', 'extends',
        'import', 'export', 'from', 'as', 'new', 'typeof', 'this', 'super',
        'print', 'true', 'false', 'null'
    ]);
    return reserved.has(s);
}

function isStatementStart(val) {
    const starters = new Set([
        'if', 'for', 'while', 'switch', 'try', 'return', 'break',
        'continue', 'let', 'fun', 'class', 'field', 'import',
        'export', 'print', 'constructor', 'static'
    ]);
    return starters.has(val);
}

function deactivate() {}

module.exports = { activate, deactivate };