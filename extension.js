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
            const hoverParts = [];

            // ── 1. Diagnostics at this position ─────────────
            const diagHover = getDiagnosticHover(document, position, diagnosticCollection);
            if (diagHover) {
                hoverParts.push(diagHover);
            }

            if (!range) {
                // No word under cursor — still return diagnostics if any
                if (hoverParts.length > 0) {
                    return new vscode.Hover(hoverParts);
                }
                return;
            }

            const word = document.getText(range);
            const offset = document.offsetAt(range.start);
            const text = document.getText();
            const stripped = stripStringsAndComments(text);

            // ── 2. Keyword hover ────────────────────────────
            if (isReserved(word)) {
                const keywordHover = getKeywordHover(word);
                if (keywordHover) {
                    hoverParts.push(keywordHover);
                }
            }

            // ── 3. Code-aware hover ─────────────────────────
            if (!isReserved(word)) {
                const codeHover = getCodeHover(word, offset, text, stripped, document, position);
                if (codeHover) {
                    hoverParts.push(codeHover);
                }
            }

            if (hoverParts.length > 0) {
                return new vscode.Hover(hoverParts);
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

    // ── Document Symbol Provider (Outline panel) ──────────────
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider('asf', {
        provideDocumentSymbols(document) {
            return extractSymbols(document);
        }
    });

    context.subscriptions.push(hoverProvider, completionProvider, symbolProvider);
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
        const range = new vscode.Range(
            new vscode.Position(tok.line, tok.char),
            new vscode.Position(tok.line, tok.char + tok.length)
        );
        const diag = new vscode.Diagnostic(
            range,
            "Missing semicolon ';' after this token. Every statement in ASF must end with ';'.",
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

// ─────────────────────────────────────────────────────────────────
//  Document Symbol Provider — powers the Outline panel
// ─────────────────────────────────────────────────────────────────

function extractSymbols(document) {
    const text = document.getText();
    const stripped = stripStringsAndComments(text);
    const symbols = [];

    // We use regex scanning on the stripped text (no strings/comments)
    // to find declarations and their brace-delimited bodies.

    // ── Helper: find matching '}' from a given '{' offset ────
    function findMatchingBrace(src, openPos) {
        let depth = 1;
        let j = openPos + 1;
        while (j < src.length && depth > 0) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            j++;
        }
        return j - 1; // index of closing '}'
    }

    // ── Helper: find matching ')' from a given '(' offset ────
    function findMatchingParen(src, openPos) {
        let depth = 1;
        let j = openPos + 1;
        while (j < src.length && depth > 0) {
            if (src[j] === '(') depth++;
            else if (src[j] === ')') depth--;
            j++;
        }
        return j - 1; // index of closing ')'
    }

    // ── Helper: create a DocumentSymbol ──────────────────────
    function makeSymbol(name, detail, kind, startOffset, endOffset) {
        const startPos = document.positionAt(startOffset);
        const endPos = document.positionAt(endOffset + 1);
        const fullRange = new vscode.Range(startPos, endPos);
        const nameStart = document.positionAt(startOffset);
        const nameEnd = document.positionAt(startOffset + name.length);
        // For selectionRange, find the actual name position
        const sym = new vscode.DocumentSymbol(
            name,
            detail,
            kind,
            fullRange,
            fullRange
        );
        return sym;
    }

    // ── Helper: find name position for accurate selectionRange ──
    function makeSymbolAt(name, detail, kind, nameOffset, startOffset, endOffset) {
        const fullStart = document.positionAt(startOffset);
        const fullEnd = document.positionAt(endOffset + 1);
        const fullRange = new vscode.Range(fullStart, fullEnd);
        const selStart = document.positionAt(nameOffset);
        const selEnd = document.positionAt(nameOffset + name.length);
        const selRange = new vscode.Range(selStart, selEnd);
        return new vscode.DocumentSymbol(name, detail, kind, fullRange, selRange);
    }

    // ── Parse class members ─────────────────────────────────
    function parseClassMembers(classBody, classBodyOffset) {
        const members = [];

        // ── field declarations: field name [= expr][, name [= expr]]* ;
        const fieldRegex = /\bfield\s+((?:[a-zA-Z_][a-zA-Z0-9_]*(?:\s*=\s*[^,;]*)?(?:\s*,\s*)?)+)\s*;/g;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(classBody)) !== null) {
            const fieldList = fieldMatch[1];
            const fieldStartOffset = classBodyOffset + fieldMatch.index;
            const fieldEndOffset = fieldStartOffset + fieldMatch[0].length - 1;

            // Split individual field names
            const nameRegex = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
            let nameMatch;
            let isFirst = true;
            while ((nameMatch = nameRegex.exec(fieldList)) !== null) {
                const fname = nameMatch[1];
                const nameOff = classBodyOffset + fieldMatch.index +
                                fieldMatch[0].indexOf(fieldList) + nameMatch.index;
                const sym = makeSymbolAt(
                    fname,
                    'field',
                    vscode.SymbolKind.Field,
                    nameOff,
                    isFirst ? fieldStartOffset : nameOff,
                    fieldEndOffset
                );
                members.push(sym);
                isFirst = false;
            }
        }

        // ── constructor(params) { ... }
        const ctorRegex = /\b(constructor)\s*\(/g;
        let ctorMatch;
        while ((ctorMatch = ctorRegex.exec(classBody)) !== null) {
            const ctorStart = classBodyOffset + ctorMatch.index;
            const parenOpen = classBody.indexOf('(', ctorMatch.index + ctorMatch[1].length);
            if (parenOpen === -1) continue;
            const parenClose = findMatchingParen(classBody, parenOpen);
            const braceOpen = classBody.indexOf('{', parenClose);
            if (braceOpen === -1) continue;
            const braceClose = findMatchingBrace(classBody, braceOpen);
            const ctorEnd = classBodyOffset + braceClose;

            const params = classBody.substring(parenOpen + 1, parenClose).trim();
            const sym = makeSymbolAt(
                'constructor',
                params ? `(${params})` : '()',
                vscode.SymbolKind.Constructor,
                ctorStart,
                ctorStart,
                ctorEnd
            );
            members.push(sym);
        }

        // ── static name(params) { ... }
        const staticRegex = /\b(static)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let staticMatch;
        while ((staticMatch = staticRegex.exec(classBody)) !== null) {
            const methodName = staticMatch[2];
            const stmtStart = classBodyOffset + staticMatch.index;
            const nameOff = classBodyOffset + staticMatch.index +
                            staticMatch[0].indexOf(methodName);
            const parenOpen = classBody.indexOf('(', staticMatch.index + staticMatch[0].length - 1);
            if (parenOpen === -1) continue;
            const parenClose = findMatchingParen(classBody, parenOpen);
            const braceOpen = classBody.indexOf('{', parenClose);
            if (braceOpen === -1) continue;
            const braceClose = findMatchingBrace(classBody, braceOpen);
            const endOff = classBodyOffset + braceClose;

            const params = classBody.substring(parenOpen + 1, parenClose).trim();
            const sym = makeSymbolAt(
                methodName,
                params ? `static (${params})` : 'static ()',
                vscode.SymbolKind.Method,
                nameOff,
                stmtStart,
                endOff
            );
            members.push(sym);
        }

        // ── regular methods: name(params) { ... }
        // Must exclude constructor, static, field, and other keywords
        const methodRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let methodMatch;
        while ((methodMatch = methodRegex.exec(classBody)) !== null) {
            const mName = methodMatch[1];
            // Skip if it's a keyword or already captured
            if (isReserved(mName) || mName === 'constructor') continue;

            // Verify this is a method declaration (followed by params then '{')
            const parenOpen = classBody.indexOf('(', methodMatch.index + mName.length);
            if (parenOpen === -1) continue;
            const parenClose = findMatchingParen(classBody, parenOpen);
            if (parenClose >= classBody.length) continue;

            // Check for '{' after ')'
            const afterParen = classBody.substring(parenClose + 1).search(/\S/);
            if (afterParen === -1) continue;
            const nextCharIdx = parenClose + 1 + afterParen;
            if (classBody[nextCharIdx] !== '{') continue;

            const braceClose = findMatchingBrace(classBody, nextCharIdx);
            const nameOff = classBodyOffset + methodMatch.index;
            const endOff = classBodyOffset + braceClose;

            // Skip if this overlaps with a static declaration
            const beforeMatch = classBody.substring(
                Math.max(0, methodMatch.index - 20), methodMatch.index
            );
            if (/\bstatic\s*$/.test(beforeMatch)) continue;

            const params = classBody.substring(parenOpen + 1, parenClose).trim();
            const sym = makeSymbolAt(
                mName,
                params ? `(${params})` : '()',
                vscode.SymbolKind.Method,
                nameOff,
                nameOff,
                endOff
            );
            members.push(sym);
        }

        // Sort members by position
        members.sort((a, b) => a.range.start.compareTo(b.range.start));
        return members;
    }

    // ── Top-level: class declarations ────────────────────────
    const classRegex = /\b(class)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+extends\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*\{/g;
    let classMatch;
    while ((classMatch = classRegex.exec(stripped)) !== null) {
        const className = classMatch[2];
        const parentClass = classMatch[3] || '';
        const classStart = classMatch.index;
        const braceOpen = stripped.indexOf('{', classMatch.index + classMatch[0].length - 1);
        const braceClose = findMatchingBrace(stripped, braceOpen);
        const nameOff = classMatch.index + classMatch[0].indexOf(className);

        const detail = parentClass ? `extends ${parentClass}` : '';
        const classSym = makeSymbolAt(
            className,
            detail,
            vscode.SymbolKind.Class,
            nameOff,
            classStart,
            braceClose
        );

        // Parse class body for members
        const bodyStart = braceOpen + 1;
        const bodyEnd = braceClose;
        const classBody = stripped.substring(bodyStart, bodyEnd);
        classSym.children = parseClassMembers(classBody, bodyStart);

        symbols.push(classSym);
    }

    // ── Top-level: fun declarations ──────────────────────────
    // Match 'fun name(' but NOT inside class bodies (those are methods)
    const funRegex = /\b(fun)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let funMatch;
    while ((funMatch = funRegex.exec(stripped)) !== null) {
        const funName = funMatch[2];
        const funStart = funMatch.index;

        // Skip if this is inside a class body (check if enclosed in a class range)
        if (isInsideClassRange(funStart)) continue;

        const parenOpen = stripped.indexOf('(', funMatch.index + funMatch[0].length - 1);
        const parenClose = findMatchingParen(stripped, parenOpen);
        const braceSearch = stripped.substring(parenClose + 1).search(/\S/);
        if (braceSearch === -1) continue;
        const braceOpenIdx = parenClose + 1 + braceSearch;
        if (stripped[braceOpenIdx] !== '{') continue;
        const braceClose = findMatchingBrace(stripped, braceOpenIdx);

        const nameOff = funMatch.index + funMatch[0].indexOf(funName);
        const params = stripped.substring(parenOpen + 1, parenClose).trim();

        // Check if preceded by 'export'
        const before = stripped.substring(Math.max(0, funStart - 20), funStart);
        const isExported = /\bexport\s*$/.test(before);
        const detail = isExported
            ? (params ? `export (${params})` : 'export ()')
            : (params ? `(${params})` : '()');

        const sym = makeSymbolAt(
            funName,
            detail,
            vscode.SymbolKind.Function,
            nameOff,
            isExported ? funStart - before.length + before.lastIndexOf('export') : funStart,
            braceClose
        );
        symbols.push(sym);
    }

    // ── Top-level: let declarations ──────────────────────────
    const letRegex = /\b(let)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let letMatch;
    while ((letMatch = letRegex.exec(stripped)) !== null) {
        const varName = letMatch[2];
        const letStart = letMatch.index;

        if (isInsideClassRange(letStart)) continue;
        if (isInsideFunRange(letStart)) continue;
        if (isInsideBlockRange(letStart)) continue;

        const nameOff = letMatch.index + letMatch[0].indexOf(varName);

        // Find end of statement (next ';' or newline)
        let endOff = stripped.indexOf(';', letMatch.index);
        if (endOff === -1) endOff = stripped.indexOf('\n', letMatch.index);
        if (endOff === -1) endOff = stripped.length - 1;

        const sym = makeSymbolAt(
            varName,
            'let',
            vscode.SymbolKind.Variable,
            nameOff,
            letStart,
            endOff
        );
        symbols.push(sym);
    }

    // ── Top-level: import statements ─────────────────────────
    const importRegex = /\b(import)\s+(.+?)\s+from\b/g;
    let importMatch;
    while ((importMatch = importRegex.exec(stripped)) !== null) {
        const importStart = importMatch.index;
        if (isInsideClassRange(importStart)) continue;

        // Extract a readable name from the import clause
        const clause = importMatch[2].trim();
        let importName = clause;
        // Clean up: remove braces, asterisks for display
        importName = importName.replace(/[{}]/g, '').replace(/\*/g, '*').trim();
        if (importName.length > 40) importName = importName.substring(0, 37) + '...';

        let endOff = stripped.indexOf(';', importMatch.index);
        if (endOff === -1) endOff = stripped.indexOf('\n', importMatch.index);
        if (endOff === -1) endOff = importStart + importMatch[0].length;

        // Get the source module from original text (not stripped)
        const fromIdx = text.indexOf('from', importMatch.index);
        let moduleName = '';
        if (fromIdx !== -1) {
            const afterFrom = text.substring(fromIdx + 4).match(/\s*["']([^"']+)["']/);
            if (afterFrom) moduleName = afterFrom[1];
        }

        const sym = makeSymbolAt(
            importName,
            moduleName ? `from "${moduleName}"` : 'import',
            vscode.SymbolKind.Module,
            importStart,
            importStart,
            endOff
        );
        symbols.push(sym);
    }

    // ── Top-level: export statements ─────────────────────────
    // export { ... } and export default (export fun is captured by fun regex)
    const exportNamedRegex = /\b(export)\s*\{([^}]*)\}/g;
    let exportMatch;
    while ((exportMatch = exportNamedRegex.exec(stripped)) !== null) {
        const exportStart = exportMatch.index;
        const names = exportMatch[2].replace(/\s+as\s+\w+/g, '').trim();

        let endOff = stripped.indexOf(';', exportMatch.index);
        if (endOff === -1) endOff = exportStart + exportMatch[0].length;

        const sym = makeSymbolAt(
            `export { ${names} }`,
            '',
            vscode.SymbolKind.Namespace,
            exportStart,
            exportStart,
            endOff
        );
        symbols.push(sym);
    }

    const exportDefaultRegex = /\b(export)\s+(default)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let expDefMatch;
    while ((expDefMatch = exportDefaultRegex.exec(stripped)) !== null) {
        const exportStart = expDefMatch.index;
        // Skip if this is 'export fun' (already captured)
        if (expDefMatch[3] === 'fun') continue;

        let endOff = stripped.indexOf(';', exportStart);
        if (endOff === -1) endOff = exportStart + expDefMatch[0].length;

        const sym = makeSymbolAt(
            `export default ${expDefMatch[3]}`,
            '',
            vscode.SymbolKind.Namespace,
            exportStart,
            exportStart,
            endOff
        );
        symbols.push(sym);
    }

    // ── Range tracking helpers ───────────────────────────────
    // Build ranges for classes and functions to exclude nested declarations

    const classRanges = [];
    const classRangeRegex = /\bclass\s+[a-zA-Z_][a-zA-Z0-9_]*(?:\s+extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*\{/g;
    let crMatch;
    while ((crMatch = classRangeRegex.exec(stripped)) !== null) {
        const bo = stripped.indexOf('{', crMatch.index + crMatch[0].length - 1);
        const bc = findMatchingBrace(stripped, bo);
        classRanges.push([crMatch.index, bc]);
    }

    function isInsideClassRange(offset) {
        for (const [s, e] of classRanges) {
            if (offset > s && offset < e) return true;
        }
        return false;
    }

    const funRanges = [];
    const funRangeRegex = /\bfun\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g;
    let frMatch;
    while ((frMatch = funRangeRegex.exec(stripped)) !== null) {
        const po = stripped.indexOf('(', frMatch.index + 4);
        const pc = findMatchingParen(stripped, po);
        const afterParen = stripped.substring(pc + 1).search(/\S/);
        if (afterParen === -1) continue;
        const bi = pc + 1 + afterParen;
        if (stripped[bi] !== '{') continue;
        const bc = findMatchingBrace(stripped, bi);
        funRanges.push([frMatch.index, bc]);
    }

    function isInsideFunRange(offset) {
        for (const [s, e] of funRanges) {
            if (offset > s && offset < e) return true;
        }
        return false;
    }

    function isInsideBlockRange(offset) {
        return isInsideClassRange(offset) || isInsideFunRange(offset);
    }

    // Sort all symbols by position
    symbols.sort((a, b) => a.range.start.compareTo(b.range.start));
    return symbols;
}

// ─────────────────────────────────────────────────────────────────
//  Hover — Diagnostic errors at position
// ─────────────────────────────────────────────────────────────────

function getDiagnosticHover(document, position, diagnosticCollection) {
    const diagnostics = diagnosticCollection.get(document.uri);
    if (!diagnostics || diagnostics.length === 0) return null;

    const matchingDiags = [];
    for (const diag of diagnostics) {
        if (diag.range.contains(position)) {
            matchingDiags.push(diag);
        }
    }

    if (matchingDiags.length === 0) return null;

    let md = '';
    for (let i = 0; i < matchingDiags.length; i++) {
        const diag = matchingDiags[i];
        const severityIcon = diag.severity === vscode.DiagnosticSeverity.Error ? '🔴'
            : diag.severity === vscode.DiagnosticSeverity.Warning ? '🟡'
            : 'ℹ️';
        const severityLabel = diag.severity === vscode.DiagnosticSeverity.Error ? 'Error'
            : diag.severity === vscode.DiagnosticSeverity.Warning ? 'Warning'
            : 'Info';

        md += `${severityIcon} **${severityLabel}** — \`${diag.source || 'ASF'}\``;
        if (diag.code) {
            md += ` (${diag.code})`;
        }
        md += `\n\n${diag.message}`;

        // Add fix suggestion based on diagnostic code
        const fix = getSuggestion(diag);
        if (fix) {
            md += `\n\n💡 **Fix:** ${fix}`;
        }

        if (i < matchingDiags.length - 1) {
            md += '\n\n---\n\n';
        }
    }

    const result = new vscode.MarkdownString(md);
    result.isTrusted = true;
    return result;
}

function getSuggestion(diag) {
    if (!diag.code) return null;

    const suggestions = {
        'missing-semicolon': 'Add `;` after this statement. In ASF, every statement must be terminated with a semicolon — including block statements like `if`, `for`, `while`, `fun`, and `class`.\n\n```asf\n# ✗ Wrong\nlet x = 10\nif (x > 5) { print(x); }\n\n# ✓ Correct\nlet x = 10;\nif (x > 5) { print(x); };\n```'
    };

    return suggestions[diag.code] || null;
}

// ─────────────────────────────────────────────────────────────────
//  Hover — Keyword documentation
// ─────────────────────────────────────────────────────────────────

function getKeywordHover(word) {
    const docs = {
        'fun':         '```\nfun name(params) { ... }\n```\n\n---\n\nDeclares a named function, or an anonymous function when used as an expression.\n\n**Examples:**\n```\nfun greet(name) { print("Hello " + name); };\n\nlet double = fun(x) { return x * 2; };\n```',
        'class':       '```\nclass Name [extends Parent] { ... }\n```\n\n---\n\nDeclares a class with optional inheritance. Class bodies can contain `field` declarations, a `constructor`, instance methods, and `static` methods.\n\n**Example:**\n```\nclass Dog extends Animal {\n    field name, breed;\n    constructor(n, b) { this.name = n; this.breed = b; }\n    bark() { print("Woof!"); }\n};\n```',
        'field':       '```\nfield name [= default], ...;\n```\n\n---\n\nDeclares one or more instance fields inside a class body. Fields can have optional default values.\n\n**Example:**\n```\nfield x = 0, y = 0, label;\n```',
        'let':         '```\nlet name [= value];\n```\n\n---\n\nDeclares a variable with an optional initializer.\n\n**Example:**\n```\nlet count = 0;\nlet name;\n```',
        'constructor': '```\nconstructor(params) { ... }\n```\n\n---\n\nClass constructor method. Called when creating a new instance with `new`. Use `super(args)` to call the parent constructor.\n\n**Example:**\n```\nconstructor(x, y) {\n    super(x);\n    this.y = y;\n}\n```',
        'static':      '```\nstatic methodName(params) { ... }\n```\n\n---\n\nDeclares a static method on a class, called on the class itself rather than on instances.\n\n**Example:**\n```\nstatic create(name) { return new MyClass(name); }\n```',
        'extends':     '*(keyword)* — Specifies the parent class in a class declaration for inheritance.\n\n**Example:**\n```\nclass Dog extends Animal { ... };\n```',
        'if':          '```\nif (expr) { ... }\n[elseif (expr) { ... }]*\n[else { ... }]\n```\n\n---\n\nConditional branching. Supports `elseif` chains and a final `else` block.\n\n**Example:**\n```\nif (x > 10) {\n    print("big");\n} elseif (x > 0) {\n    print("small");\n} else {\n    print("negative");\n};\n```',
        'elseif':      '*(keyword)* — Alternate condition branch in an `if` chain.\n\n```\nif (a) { ... } elseif (b) { ... };\n```',
        'else':        '*(keyword)* — Fallback branch when no `if`/`elseif` condition matched.\n\n```\nif (a) { ... } else { ... };\n```',
        'for':         '```\nfor (init, cond, step) { ... }    # C-style\nfor (key in object) { ... }        # key iteration\nfor (item of array) { ... }        # value iteration\n```\n\n---\n\nLoop statement with three forms.\n\n**Examples:**\n```\nfor (i = 0, i < 10, i = i + 1) { print(i); };\nfor (key in obj) { print(key); };\nfor (item of arr) { print(item); };\n```',
        'while':       '```\nwhile (condition) { ... }\n```\n\n---\n\nRepeats the block while `condition` is truthy.\n\n**Example:**\n```\nwhile (n > 0) {\n    print(n);\n    n = n - 1;\n};\n```',
        'switch':      '```\nswitch (expr) {\n    case value { ... }\n    default { ... }\n}\n```\n\n---\n\nMulti-branch conditional. Matches `expr` against `case` values.\n\n**Example:**\n```\nswitch (color) {\n    case "red" { print("hot"); }\n    case "blue" { print("cold"); }\n    default { print("unknown"); }\n};\n```',
        'try':         '```\ntry { ... } catch (error) { ... }\ntry { ... } catch { ... }\n```\n\n---\n\nException handling. The `catch` clause optionally binds the error to a variable.\n\n**Example:**\n```\ntry {\n    let result = riskyOperation();\n} catch (e) {\n    print("Error: " + e);\n};\n```',
        'catch':       '*(keyword)* — Handles exceptions thrown in the preceding `try` block.\n\n```\ntry { ... } catch (e) { ... };\n```',
        'return':      '```\nreturn [expr];\nreturn (expr);\n```\n\n---\n\nReturns a value from the current function. If no expression is given, returns `null`.\n\n**Example:**\n```\nfun max(a, b) {\n    if (a > b) { return a; };\n    return b;\n};\n```',
        'break':       '*(keyword)* — Exits the innermost `for`, `while`, or `switch` statement.\n\n```\nwhile (true) {\n    if (done) { break; };\n};\n```',
        'continue':    '*(keyword)* — Skips the rest of the current loop iteration and proceeds to the next one.\n\n```\nfor (i = 0, i < 10, i = i + 1) {\n    if (i == 5) { continue; };\n    print(i);\n};\n```',
        'import':      '```\nimport name from "module";           # default import\nimport { a, b } from "module";       # named imports\nimport * as mod from "module";        # namespace import\nimport def, { a } from "module";      # mixed import\n```\n\n---\n\nImport declarations from another ASF module (`.vas` file).\n\n**Example:**\n```\nimport Math from "stdlib/math";\nimport { sum, avg as average } from "utils";\n```',
        'export':      '```\nexport { name [as alias], ... };     # named exports\nexport default expr;                  # default export\nexport fun name(params) { ... };      # function export\n```\n\n---\n\nExport declarations from the current module.\n\n**Example:**\n```\nexport { calculate, PI as pi };\nexport default MyClass;\nexport fun helper() { ... };\n```',
        'this':        '*(keyword)* — Reference to the current class instance inside a method or constructor.\n\n**Example:**\n```\nconstructor(name) {\n    this.name = name;\n}\n```',
        'super':       '*(keyword)* — Reference to the parent class. Use `super(args)` inside a constructor to call the parent constructor, or `super.method()` to call parent methods.\n\n**Example:**\n```\nconstructor(name, age) {\n    super(name);\n    this.age = age;\n}\n```',
        'new':         '```\nnew ClassName(args)\n```\n\n---\n\nCreates a new instance of a class by calling its constructor.\n\n**Example:**\n```\nlet dog = new Dog("Rex", "Labrador");\n```',
        'typeof':      '```\ntypeof expr\n```\n\n---\n\nReturns the type of the expression as a string.\n\n**Example:**\n```\nlet t = typeof 42;       # "number"\nlet s = typeof "hello";  # "string"\n```',
        'print':       '```\nprint(arg1, arg2, ...)\n```\n\n---\n\nPrints one or more values to the output.\n\n**Example:**\n```\nprint("Hello", name, "!");\n```',
        'true':        '*(constant)* — Boolean `true` literal.',
        'false':       '*(constant)* — Boolean `false` literal.',
        'null':        '*(constant)* — Represents the absence of a value.',
        'in':          '*(keyword)* — Used in `for (key in object)` loops to iterate over keys.',
        'of':          '*(keyword)* — Used in `for (item of array)` loops to iterate over values.',
        'as':          '*(keyword)* — Creates an alias in `import` or `export` statements.\n\n```\nimport { sum as add } from "math";\nexport { calc as calculate };\nimport * as utils from "helpers";\n```',
        'from':        '*(keyword)* — Specifies the source module in an `import` statement.\n\n```\nimport Math from "stdlib/math";\n```',
        'default':     '*(keyword)* — Used in `switch` statements as the fallback case, or in `export default` for default exports.',
        'case':        '*(keyword)* — Defines a branch in a `switch` statement.\n\n```\nswitch (x) {\n    case 1 { print("one"); }\n    case 2 { print("two"); }\n};\n```'
    };

    if (docs[word]) {
        const md = new vscode.MarkdownString(docs[word]);
        md.isTrusted = true;
        return md;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────
//  Hover — Code-aware analysis
// ─────────────────────────────────────────────────────────────────

function getCodeHover(word, offset, text, stripped, document, position) {
    const line = position.line;
    const results = [];

    // Collect all declarations, pick the best match
    findFunctionDecl(word, stripped, text, results);
    findClassDecl(word, stripped, text, results);
    findLetDecl(word, stripped, text, offset, results);
    findFieldDecl(word, stripped, text, results);
    findParamDecl(word, stripped, text, offset, results);
    findForVarDecl(word, stripped, text, offset, results);
    findCatchVarDecl(word, stripped, text, offset, results);
    findImportedSymbol(word, stripped, text, results);
    findPropertyAccess(word, stripped, text, document, position, results);
    findDestructuredVar(word, stripped, text, offset, results);

    if (results.length === 0) return null;

    // Sort: prefer declarations closest to (but before) the hover offset
    results.sort((a, b) => {
        const distA = a.offset <= offset ? offset - a.offset : Infinity;
        const distB = b.offset <= offset ? offset - b.offset : Infinity;
        return distA - distB;
    });

    const best = results[0];
    const md = new vscode.MarkdownString(best.markdown);
    md.isTrusted = true;
    return md;
}

// ── Helper: extract preceding comment block ─────────────────
function extractDocComment(text, declOffset) {
    // Walk backwards from the declaration to find a comment block
    const before = text.substring(0, declOffset);
    const lines = before.split('\n');
    const commentLines = [];

    // Start from the line just before the declaration
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (trimmed === '') {
            // Allow one blank line between comment and declaration
            if (commentLines.length === 0) continue;
            break;
        }
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
            const content = trimmed.replace(/^\/\/\s?/, '').replace(/^#\s?/, '');
            commentLines.unshift(content);
        } else if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.endsWith('*/')) {
            const content = trimmed
                .replace(/^\/\*+\s?/, '')
                .replace(/\s?\*+\/$/, '')
                .replace(/^\*\s?/, '');
            if (content) commentLines.unshift(content);
        } else {
            break;
        }
    }

    return commentLines.length > 0 ? commentLines.join('\n') : null;
}

// ── Helper: find the enclosing class name for an offset ─────
function findEnclosingClass(stripped, offset) {
    const classRegex = /\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*\{/g;
    let match;
    while ((match = classRegex.exec(stripped)) !== null) {
        const braceOpen = stripped.indexOf('{', match.index + match[0].length - 1);
        const braceClose = findMatchingBraceStr(stripped, braceOpen);
        if (offset > braceOpen && offset < braceClose) {
            return match[1];
        }
    }
    return null;
}

function findMatchingBraceStr(src, openPos) {
    let depth = 1;
    let j = openPos + 1;
    while (j < src.length && depth > 0) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') depth--;
        j++;
    }
    return j - 1;
}

function findMatchingParenStr(src, openPos) {
    let depth = 1;
    let j = openPos + 1;
    while (j < src.length && depth > 0) {
        if (src[j] === '(') depth++;
        else if (src[j] === ')') depth--;
        j++;
    }
    return j - 1;
}

// ── Find function declarations ──────────────────────────────
function findFunctionDecl(word, stripped, text, results) {
    const regex = new RegExp('\\b(export\\s+)?fun\\s+(' + escapeRegex(word) + ')\\s*\\(', 'g');
    let match;
    while ((match = regex.exec(stripped)) !== null) {
        const isExported = !!match[1];
        const nameOffset = match.index + match[0].indexOf(word);
        const parenOpen = stripped.indexOf('(', match.index + match[0].length - 1);
        const parenClose = findMatchingParenStr(stripped, parenOpen);
        const params = stripped.substring(parenOpen + 1, parenClose).trim();
        const docComment = extractDocComment(text, match.index);

        let md = `*(function)*\n\n`;
        md += '```asf\n';
        md += isExported ? `export fun ${word}(${params})\n` : `fun ${word}(${params})\n`;
        md += '```';

        if (docComment) {
            md += `\n\n---\n\n${docComment}`;
        }

        // Show parameter list breakdown if there are params
        if (params) {
            const paramNames = params.split(',').map(p => p.trim());
            const hasRest = paramNames.some(p => p.startsWith('...'));
            if (paramNames.length > 1 || hasRest) {
                md += '\n\n**Parameters:**\n';
                for (const p of paramNames) {
                    if (p.startsWith('...')) {
                        md += `\n- \`${p}\` — rest parameter`;
                    } else {
                        md += `\n- \`${p}\``;
                    }
                }
            }
        }

        results.push({ markdown: md, offset: nameOffset });
    }
}

// ── Find class declarations ─────────────────────────────────
function findClassDecl(word, stripped, text, results) {
    const regex = new RegExp('\\bclass\\s+(' + escapeRegex(word) + ')(?:\\s+extends\\s+([a-zA-Z_][a-zA-Z0-9_]*))?\\s*\\{', 'g');
    let match;
    while ((match = regex.exec(stripped)) !== null) {
        const className = match[1];
        const parentClass = match[2] || null;
        const nameOffset = match.index + match[0].indexOf(className);
        const braceOpen = stripped.indexOf('{', match.index + match[0].length - 1);
        const braceClose = findMatchingBraceStr(stripped, braceOpen);
        const classBody = stripped.substring(braceOpen + 1, braceClose);
        const docComment = extractDocComment(text, match.index);

        let md = `*(class)*\n\n`;
        md += '```asf\n';
        md += parentClass ? `class ${className} extends ${parentClass}\n` : `class ${className}\n`;
        md += '```';

        if (docComment) {
            md += `\n\n---\n\n${docComment}`;
        }

        // Summarize class members
        const fields = [];
        const methods = [];
        let hasCtor = false;
        let ctorParams = '';

        // Fields
        const fieldRegex = /\bfield\s+((?:[a-zA-Z_][a-zA-Z0-9_]*(?:\s*=\s*[^,;]*)?(?:\s*,\s*)?)+)/g;
        let fm;
        while ((fm = fieldRegex.exec(classBody)) !== null) {
            const nameRegex = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
            let nm;
            while ((nm = nameRegex.exec(fm[1])) !== null) {
                fields.push(nm[1]);
            }
        }

        // Constructor
        const ctorRegex = /\bconstructor\s*\(([^)]*)\)/g;
        let cm;
        if ((cm = ctorRegex.exec(classBody)) !== null) {
            hasCtor = true;
            ctorParams = cm[1].trim();
        }

        // Methods (including static)
        const methodRegex = /\b(?:(static)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
        let mm;
        while ((mm = methodRegex.exec(classBody)) !== null) {
            if (mm[2] === 'constructor') continue;
            if (isReserved(mm[2])) continue;
            const prefix = mm[1] ? 'static ' : '';
            methods.push(`${prefix}${mm[2]}(${mm[3].trim()})`);
        }

        if (fields.length > 0 || hasCtor || methods.length > 0) {
            md += '\n\n**Members:**\n';
            if (fields.length > 0) {
                md += `\n- **Fields:** \`${fields.join('`, `')}\``;
            }
            if (hasCtor) {
                md += `\n- **Constructor:** \`constructor(${ctorParams})\``;
            }
            for (const m of methods) {
                md += `\n- \`${m}\``;
            }
        }

        results.push({ markdown: md, offset: nameOffset });
    }
}

// ── Find let declarations ───────────────────────────────────
function findLetDecl(word, stripped, text, hoverOffset, results) {
    const regex = new RegExp('\\blet\\s+(' + escapeRegex(word) + ')\\b', 'g');
    let match;
    while ((match = regex.exec(stripped)) !== null) {
        const nameOffset = match.index + match[0].indexOf(word);
        if (nameOffset === hoverOffset) continue; // hovering on the decl itself is fine

        // Get the full declaration line from original text
        const lineStart = text.lastIndexOf('\n', match.index) + 1;
        let lineEnd = text.indexOf('\n', match.index);
        if (lineEnd === -1) lineEnd = text.length;
        const declLine = text.substring(lineStart, lineEnd).trim();

        // Trim to just the 'let ... ;' part
        const semiIdx = declLine.indexOf(';');
        const display = semiIdx !== -1 ? declLine.substring(0, semiIdx + 1) : declLine;

        const docComment = extractDocComment(text, match.index);

        let md = `*(variable)*\n\n`;
        md += `\`\`\`asf\n${display}\n\`\`\``;

        if (docComment) {
            md += `\n\n---\n\n${docComment}`;
        }

        results.push({ markdown: md, offset: nameOffset });
    }
}

// ── Find field declarations ─────────────────────────────────
function findFieldDecl(word, stripped, text, results) {
    const regex = new RegExp('\\bfield\\s+[^;]*\\b(' + escapeRegex(word) + ')\\b[^;]*;', 'g');
    let match;
    while ((match = regex.exec(stripped)) !== null) {
        const nameOffset = match.index + match[0].indexOf(word);
        const className = findEnclosingClass(stripped, match.index);

        // Get the original field declaration line
        const lineStart = text.lastIndexOf('\n', match.index) + 1;
        let lineEnd = text.indexOf('\n', match.index);
        if (lineEnd === -1) lineEnd = text.length;
        const declLine = text.substring(lineStart, lineEnd).trim();
        const semiIdx = declLine.indexOf(';');
        const display = semiIdx !== -1 ? declLine.substring(0, semiIdx + 1) : declLine;

        let md = className ? `*(field)* — in class \`${className}\`\n\n` : `*(field)*\n\n`;
        md += `\`\`\`asf\n${display}\n\`\`\``;

        results.push({ markdown: md, offset: nameOffset });
    }
}

// ── Find function/method parameter declarations ─────────────
function findParamDecl(word, stripped, text, hoverOffset, results) {
    // Find function/method params: fun name(param, param) or constructor(param)
    // or methodName(param) or static name(param)
    const funRegex = /\b(?:fun\s+[a-zA-Z_][a-zA-Z0-9_]*|constructor|static\s+[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
    let match;
    while ((match = funRegex.exec(stripped)) !== null) {
        const params = match[1];
        if (!params) continue;

        const paramList = params.split(',').map(p => p.trim());
        const paramNames = paramList.map(p => p.replace('...', ''));

        if (!paramNames.includes(word)) continue;

        // Check if hover offset is inside this function's body
        const braceOpen = stripped.indexOf('{', match.index + match[0].length - 1);
        const braceClose = findMatchingBraceStr(stripped, braceOpen);

        if (hoverOffset >= match.index && hoverOffset <= braceClose) {
            const isRest = paramList.some(p => p === '...' + word);
            const funcLine = stripped.substring(match.index, braceOpen).trim();

            let md = isRest ? `*(rest parameter)*\n\n` : `*(parameter)*\n\n`;
            md += `\`\`\`asf\n${isRest ? '...' : ''}${word}\n\`\`\``;
            md += `\n\n---\n\nParameter of \`${funcLine}\``;

            results.push({ markdown: md, offset: match.index });
        }
    }
}

// ── Find for-loop variable declarations ─────────────────────
function findForVarDecl(word, stripped, text, hoverOffset, results) {
    // for (ident in expr) or for (ident of expr)
    const forInOfRegex = new RegExp(
        '\\bfor\\s*\\(\\s*(' + escapeRegex(word) + ')\\s+(?:in|of)\\s+', 'g'
    );
    let match;
    while ((match = forInOfRegex.exec(stripped)) !== null) {
        // Determine if hover is inside this for loop
        const parenOpen = stripped.indexOf('(', match.index);
        const parenClose = findMatchingParenStr(stripped, parenOpen);
        // Find block
        const afterParen = stripped.substring(parenClose + 1).search(/\S/);
        if (afterParen === -1) continue;
        const blockStart = parenClose + 1 + afterParen;

        let blockEnd;
        if (stripped[blockStart] === '{') {
            blockEnd = findMatchingBraceStr(stripped, blockStart);
        } else {
            blockEnd = stripped.indexOf(';', blockStart);
            if (blockEnd === -1) blockEnd = stripped.length;
        }

        if (hoverOffset >= match.index && hoverOffset <= blockEnd) {
            const isIn = /\bin\b/.test(stripped.substring(match.index, parenClose));
            const kind = isIn ? 'for-in loop variable (key)' : 'for-of loop variable (value)';

            let md = `*(${kind})*\n\n`;
            md += `\`\`\`asf\n${word}\n\`\`\``;

            results.push({ markdown: md, offset: match.index });
        }
    }
}

// ── Find catch variable declarations ────────────────────────
function findCatchVarDecl(word, stripped, text, hoverOffset, results) {
    const catchRegex = new RegExp(
        '\\bcatch\\s*\\(\\s*(' + escapeRegex(word) + ')\\s*\\)\\s*\\{', 'g'
    );
    let match;
    while ((match = catchRegex.exec(stripped)) !== null) {
        const braceOpen = stripped.indexOf('{', match.index + match[0].length - 1);
        const braceClose = findMatchingBraceStr(stripped, braceOpen);

        if (hoverOffset >= match.index && hoverOffset <= braceClose) {
            let md = `*(catch variable)*\n\n`;
            md += `\`\`\`asf\n${word}\n\`\`\``;
            md += `\n\n---\n\nBound error variable in a \`try/catch\` block.`;

            results.push({ markdown: md, offset: match.index });
        }
    }
}

// ── Find imported symbols ───────────────────────────────────
function findImportedSymbol(word, stripped, text, results) {
    // Default import: import word from "..."
    const defaultRegex = new RegExp(
        '\\bimport\\s+(' + escapeRegex(word) + ')\\s+from\\b', 'g'
    );
    let match;
    while ((match = defaultRegex.exec(stripped)) !== null) {
        const nameOffset = match.index + match[0].indexOf(word);
        // Find module name from original text
        const fromIdx = text.indexOf('from', match.index);
        let moduleName = '';
        if (fromIdx !== -1) {
            const afterFrom = text.substring(fromIdx + 4).match(/\s*["']([^"']+)["']/);
            if (afterFrom) moduleName = afterFrom[1];
        }

        let md = `*(default import)*\n\n`;
        md += `\`\`\`asf\nimport ${word} from "${moduleName}"\n\`\`\``;
        md += `\n\n---\n\nDefault export imported from \`"${moduleName}"\``;

        results.push({ markdown: md, offset: nameOffset });
    }

    // Named import: import { word } from "..." or import { x as word } from "..."
    const namedRegex = /\bimport\s+(?:[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*)?\{([^}]+)\}\s+from\b/g;
    let nm;
    while ((nm = namedRegex.exec(stripped)) !== null) {
        const specifiers = nm[1];
        // Check if word appears as an import name
        const specRegex = new RegExp(
            '\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s+as\\s+(' + escapeRegex(word) + ')\\b|\\b(' + escapeRegex(word) + ')\\b',
            'g'
        );
        let sm;
        while ((sm = specRegex.exec(specifiers)) !== null) {
            const originalName = sm[1] || sm[3];
            const alias = sm[2] || null;
            const isAliased = !!sm[1];

            const fromIdx = text.indexOf('from', nm.index);
            let moduleName = '';
            if (fromIdx !== -1) {
                const afterFrom = text.substring(fromIdx + 4).match(/\s*["']([^"']+)["']/);
                if (afterFrom) moduleName = afterFrom[1];
            }

            let md = `*(named import)*\n\n`;
            if (isAliased) {
                md += `\`\`\`asf\nimport { ${originalName} as ${word} } from "${moduleName}"\n\`\`\``;
                md += `\n\n---\n\nImported as \`${word}\`, originally named \`${originalName}\` in \`"${moduleName}"\``;
            } else {
                md += `\`\`\`asf\nimport { ${word} } from "${moduleName}"\n\`\`\``;
                md += `\n\n---\n\nNamed export imported from \`"${moduleName}"\``;
            }

            results.push({ markdown: md, offset: nm.index });
        }
    }

    // Namespace import: import * as word from "..."
    const nsRegex = new RegExp(
        '\\bimport\\s+\\*\\s+as\\s+(' + escapeRegex(word) + ')\\s+from\\b', 'g'
    );
    let nsm;
    while ((nsm = nsRegex.exec(stripped)) !== null) {
        const fromIdx = text.indexOf('from', nsm.index);
        let moduleName = '';
        if (fromIdx !== -1) {
            const afterFrom = text.substring(fromIdx + 4).match(/\s*["']([^"']+)["']/);
            if (afterFrom) moduleName = afterFrom[1];
        }

        let md = `*(namespace import)*\n\n`;
        md += `\`\`\`asf\nimport * as ${word} from "${moduleName}"\n\`\`\``;
        md += `\n\n---\n\nAll exports from \`"${moduleName}"\` bound as \`${word}\``;

        results.push({ markdown: md, offset: nsm.index });
    }
}

// ── Find property access context (this.x, obj.x) ───────────
function findPropertyAccess(word, stripped, text, document, position, results) {
    const line = document.lineAt(position.line).text;
    const charIdx = position.character;

    // Check if this word is preceded by 'this.'
    const beforeWord = line.substring(0, charIdx).trimEnd();
    if (beforeWord.endsWith('this.')) {
        // Look for a field declaration of this name in the enclosing class
        const offset = document.offsetAt(position);
        const className = findEnclosingClass(stripped, offset);
        if (className) {
            const fieldRegex = new RegExp(
                '\\bfield\\s+[^;]*\\b(' + escapeRegex(word) + ')\\b', 'g'
            );
            let fm;
            while ((fm = fieldRegex.exec(stripped)) !== null) {
                if (findEnclosingClass(stripped, fm.index) === className) {
                    let md = `*(instance field)* — \`${className}.${word}\`\n\n`;
                    md += `\`\`\`asf\nthis.${word}\n\`\`\``;
                    md += `\n\n---\n\nField declared in class \`${className}\``;
                    results.push({ markdown: md, offset: fm.index });
                    return;
                }
            }
        }
    }
}

// ── Find destructured variables: [a, b, ...c] = expr ───────
function findDestructuredVar(word, stripped, text, hoverOffset, results) {
    const regex = /\[([^\]]+)\]\s*=/g;
    let match;
    while ((match = regex.exec(stripped)) !== null) {
        const inner = match[1];
        const names = inner.split(',').map(n => n.trim().replace('...', ''));

        if (!names.includes(word)) continue;

        const isRest = inner.includes('...' + word);
        const nameOffset = match.index;

        // Get the full line from original text
        const lineStart = text.lastIndexOf('\n', match.index) + 1;
        let lineEnd = text.indexOf('\n', match.index);
        if (lineEnd === -1) lineEnd = text.length;
        const declLine = text.substring(lineStart, lineEnd).trim();

        let md = isRest ? `*(rest destructured variable)*\n\n` : `*(destructured variable)*\n\n`;
        md += `\`\`\`asf\n${declLine}\n\`\`\``;

        results.push({ markdown: md, offset: nameOffset });
    }
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deactivate() {}

module.exports = { activate, deactivate };
