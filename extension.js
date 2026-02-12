const vscode = require('vscode');

// ═════════════════════════════════════════════════════════════════
//  ACTIVATION
// ═════════════════════════════════════════════════════════════════

function activate(context) {
    // ── Diagnostic Collection ────────────────────────────────────
    const diagCollection = vscode.languages.createDiagnosticCollection('asf');
    context.subscriptions.push(diagCollection);

    // Run validation on open, change, and editor switch
    function triggerValidation(doc) {
        if (doc && doc.languageId === 'asf') {
            validateDocument(doc, diagCollection);
        }
    }

    try {
        if (vscode.window.activeTextEditor) {
            triggerValidation(vscode.window.activeTextEditor.document);
        }
    } catch (e) {
        // extension host not fully ready yet — ignore
    }

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(e => {
            if (e) triggerValidation(e.document);
        }),
        vscode.workspace.onDidChangeTextDocument(e => {
            triggerValidation(e.document);
        }),
        vscode.workspace.onDidCloseTextDocument(doc => {
            diagCollection.delete(doc.uri);
        })
    );

    // ── Hover Provider ───────────────────────────────────────────
    const hoverProvider = vscode.languages.registerHoverProvider('asf', {
        provideHover(document, position) {
            try {
                const range = document.getWordRangeAtPosition(position);
                const parts = [];

            // 1) Diagnostics at hover position
            const diagPart = buildDiagnosticHover(document, position, diagCollection);
            if (diagPart) parts.push(diagPart);

            if (!range) {
                return parts.length > 0 ? new vscode.Hover(parts) : undefined;
            }

            const word = document.getText(range);
            const offset = document.offsetAt(range.start);
            const text = document.getText();
            const stripped = stripStringsAndComments(text);

            // 2) Keyword documentation
            if (RESERVED.has(word)) {
                const kwPart = buildKeywordHover(word);
                if (kwPart) parts.push(kwPart);
            }

            // 3) Code-aware info (user symbols)
            if (!RESERVED.has(word)) {
                const codePart = buildCodeHover(word, offset, text, stripped, document, position);
                if (codePart) parts.push(codePart);
            }

            return parts.length > 0 ? new vscode.Hover(parts) : undefined;
            } catch (e) {
                console.error('ASF hover error:', e);
                return undefined;
            }
        }
    });

    // ── Document Symbol Provider (Outline) ───────────────────────
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider('asf', {
        provideDocumentSymbols(document) {
            try {
                return buildOutlineSymbols(document);
            } catch (e) {
                console.error('ASF outline error:', e);
                return [];
            }
        }
    });

    // ── Completion Provider ──────────────────────────────────────
    const completionProvider = vscode.languages.registerCompletionItemProvider('asf', {
        provideCompletionItems() {
            const items = [];
            const kws = [
                ['fun','Keyword'],['class','Keyword'],['let','Keyword'],['field','Keyword'],
                ['constructor','Keyword'],['static','Keyword'],['extends','Keyword'],
                ['if','Keyword'],['elseif','Keyword'],['else','Keyword'],
                ['for','Keyword'],['while','Keyword'],['switch','Keyword'],
                ['case','Keyword'],['default','Keyword'],
                ['try','Keyword'],['catch','Keyword'],
                ['return','Keyword'],['break','Keyword'],['continue','Keyword'],
                ['import','Keyword'],['export','Keyword'],['from','Keyword'],['as','Keyword'],
                ['new','Keyword'],['typeof','Keyword'],['this','Keyword'],['super','Keyword'],
                ['print','Function'],['true','Value'],['false','Value'],['null','Value']
            ];
            for (const [label, kind] of kws) {
                items.push(new vscode.CompletionItem(label, vscode.CompletionItemKind[kind]));
            }
            for (const name of ['Math','Array','String','Object','RegExp']) {
                const c = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
                c.detail = 'Built-in object';
                items.push(c);
            }
            
            // ── Snippets ──────────────────────────────────────────
            
            // Object literal snippet
            const objSnippet = new vscode.CompletionItem('obj', vscode.CompletionItemKind.Snippet);
            objSnippet.insertText = new vscode.SnippetString('{ ${1:key}: ${2:value} }');
            objSnippet.detail = 'Object literal';
            objSnippet.documentation = new vscode.MarkdownString('Create an object literal with key-value pairs separated by commas:\n```asf\nlet person = { name: "Alice", age: 30 };\n```');
            items.push(objSnippet);
            
            // Multi-property object snippet
            const objMultiSnippet = new vscode.CompletionItem('obj-multi', vscode.CompletionItemKind.Snippet);
            objMultiSnippet.insertText = new vscode.SnippetString('{\n\t${1:key1}: ${2:value1},\n\t${3:key2}: ${4:value2}\n}');
            objMultiSnippet.detail = 'Multi-property object';
            objMultiSnippet.documentation = new vscode.MarkdownString('Create an object with multiple properties:\n```asf\nlet config = {\n\thost: "localhost",\n\tport: 8080,\n\tdebug: true\n};\n```');
            items.push(objMultiSnippet);
            
            // Export list snippet
            const exportSnippet = new vscode.CompletionItem('export-list', vscode.CompletionItemKind.Snippet);
            exportSnippet.insertText = new vscode.SnippetString('export { ${1:name1}, ${2:name2} };');
            exportSnippet.detail = 'Export named items';
            exportSnippet.documentation = new vscode.MarkdownString('Export multiple named items:\n```asf\nexport { Calculator, fibonacci, PI };\n```');
            items.push(exportSnippet);
            
            // Import statement snippet
            const importSnippet = new vscode.CompletionItem('import-named', vscode.CompletionItemKind.Snippet);
            importSnippet.insertText = new vscode.SnippetString('import { ${1:name} } from "${2:module}";');
            importSnippet.detail = 'Import named items';
            importSnippet.documentation = new vscode.MarkdownString('Import named exports from a module:\n```asf\nimport { sum, avg } from "utils";\n```');
            items.push(importSnippet);
            
            // Array literal snippet
            const arraySnippet = new vscode.CompletionItem('arr', vscode.CompletionItemKind.Snippet);
            arraySnippet.insertText = new vscode.SnippetString('[${1:item1}, ${2:item2}]');
            arraySnippet.detail = 'Array literal';
            arraySnippet.documentation = new vscode.MarkdownString('Create an array with comma-separated elements:\n```asf\nlet numbers = [1, 2, 3, 4, 5];\n```');
            items.push(arraySnippet);
            
            return items;
        }
    });

    context.subscriptions.push(hoverProvider, symbolProvider, completionProvider);
}

// ═════════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═════════════════════════════════════════════════════════════════

const RESERVED = new Set([
    'if','elseif','else','for','in','of','while','switch','case','default',
    'break','continue','return','try','catch','fun','class','let','field',
    'constructor','static','extends','import','export','from','as',
    'new','typeof','this','super','print','true','false','null'
]);

const STMT_STARTERS = new Set([
    'if','for','while','switch','try','return','break','continue',
    'let','fun','class','field','import','export','print','constructor','static'
]);

function isIdentifier(s) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) && !RESERVED.has(s);
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ═════════════════════════════════════════════════════════════════
//  STRIP STRINGS & COMMENTS (preserves newlines for position mapping)
// ═════════════════════════════════════════════════════════════════

function stripStringsAndComments(text) {
    const c = text.split('');
    const len = c.length;
    let i = 0;
    const blank = (a, b) => { for (let j = a; j < b && j < len; j++) if (c[j] !== '\n') c[j] = ' '; };

    while (i < len) {
        if (c[i] === '#') {
            const s = i; while (i < len && c[i] !== '\n') i++; blank(s, i); continue;
        }
        if (c[i] === '/' && i+1 < len && c[i+1] === '/') {
            const s = i; while (i < len && c[i] !== '\n') i++; blank(s, i); continue;
        }
        if (c[i] === '/' && i+1 < len && c[i+1] === '*') {
            const s = i; i += 2;
            while (i < len && !(c[i] === '*' && i+1 < len && c[i+1] === '/')) i++;
            i += 2; blank(s, i); continue;
        }
        if (c[i] === '"') {
            const s = i; i++;
            while (i < len && c[i] !== '"' && c[i] !== '\n') { if (c[i] === '\\') i++; i++; }
            if (i < len && c[i] === '"') i++; blank(s, i); continue;
        }
        if (c[i] === "'") {
            const s = i; i++;
            while (i < len && c[i] !== "'" && c[i] !== '\n') { if (c[i] === '\\') i++; i++; }
            if (i < len && c[i] === "'") i++; blank(s, i); continue;
        }
        if (c[i] === '`') {
            const s = i; i++;
            while (i < len) {
                if (c[i] === '\\') { i += 2; continue; }
                if (c[i] === '`') { i++; break; }
                if (c[i] === '$' && i+1 < len && c[i+1] === '{') {
                    i += 2; let d = 1;
                    while (i < len && d > 0) { if (c[i]==='{') d++; else if (c[i]==='}') d--; if (d>0) i++; }
                    if (i < len) i++; continue;
                }
                i++;
            }
            blank(s, i); continue;
        }
        if (c[i] === '@' && i+1 < len && c[i+1] === '(') {
            const s = i; i += 2; let d = 1;
            while (i < len && d > 0) { if (c[i]==='(') d++; else if (c[i]===')') d--; if (d>0) i++; }
            if (i < len) i++; blank(s, i); continue;
        }
        i++;
    }
    return c.join('');
}

// ═════════════════════════════════════════════════════════════════
//  TOKENIZER
// ═════════════════════════════════════════════════════════════════

function tokenize(stripped, document) {
    const tokens = [];
    const re = /\b[a-zA-Z_][a-zA-Z0-9_]*\b|\.\.\.|\|\||&&|<<|>>|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|[{}()\[\];,.:?=+\-*/%!<>|&^~@]/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const pos = document.positionAt(m.index);
        tokens.push({ value: m[0], index: m.index, line: pos.line, char: pos.character, length: m[0].length });
    }
    return tokens;
}

// ═════════════════════════════════════════════════════════════════
//  SEMICOLON VALIDATOR
// ═════════════════════════════════════════════════════════════════

function validateDocument(document, diagCollection) {
    try {
    const text = document.getText();
    const stripped = stripStringsAndComments(text);
    const tokens = tokenize(stripped, document);
    const diagnostics = [];

    if (tokens.length === 0) { diagCollection.set(document.uri, []); return; }

    const len = tokens.length;
    let i = 0;
    const contextStack = [];

    function ctx() { return contextStack.length > 0 ? contextStack[contextStack.length - 1] : 'top'; }
    function at(n) { return n < len ? tokens[n] : null; }

    function skipParens(s) {
        if (s >= len || tokens[s].value !== '(') return s;
        let j = s+1, d = 1;
        while (j < len && d > 0) { if (tokens[j].value==='(') d++; else if (tokens[j].value===')') d--; j++; }
        return j;
    }
    function skipBraces(s) {
        if (s >= len || tokens[s].value !== '{') return s;
        let j = s+1, d = 1;
        while (j < len && d > 0) { if (tokens[j].value==='{') d++; else if (tokens[j].value==='}') d--; j++; }
        return j;
    }
    function skipBrackets(s) {
        if (s >= len || tokens[s].value !== '[') return s;
        let j = s+1, d = 1;
        while (j < len && d > 0) { if (tokens[j].value==='[') d++; else if (tokens[j].value===']') d--; j++; }
        return j;
    }

    function scanExpr(s) {
        let j = s, pD = 0, bkD = 0, brD = 0;
        while (j < len) {
            const v = tokens[j].value;
            if (v==='(') { pD++; j++; continue; }
            if (v===')') { pD--; if (pD<0) return j; j++; continue; }
            if (v==='[') { bkD++; j++; continue; }
            if (v===']') { bkD--; if (bkD<0) return j; j++; continue; }
            if (v==='{') { brD++; j++; continue; }
            if (v==='}') { brD--; if (brD<0) return j; j++; if (brD===0&&pD===0&&bkD===0) return j; continue; }
            if (v===';') return j;
            if (pD===0 && bkD===0 && brD===0 && STMT_STARTERS.has(v)) return j;
            j++;
        }
        return j;
    }

    function report(tok) {
        const range = new vscode.Range(
            new vscode.Position(tok.line, tok.char),
            new vscode.Position(tok.line, tok.char + tok.length)
        );
        const d = new vscode.Diagnostic(range,
            "Missing semicolon ';' after this token. Every statement in ASF must end with ';'.",
            vscode.DiagnosticSeverity.Error);
        d.source = 'ASF';
        d.code = 'missing-semicolon';
        diagnostics.push(d);
    }

    function expect(idx, lastTok) {
        if (idx < len && tokens[idx].value === ';') return idx + 1;
        if (lastTok) report(lastTok);
        return idx;
    }

    function parseBlock() {
        if (i >= len) return i;
        if (tokens[i].value === '{') {
            i++;
            while (i < len && tokens[i].value !== '}') {
                if (tokens[i].value===';') { i++; continue; }
                const before = i;
                parseStmt();
                if (i === before) i++; // safety: skip stuck token
            }
            if (i < len && tokens[i].value === '}') i++;
            return i;
        }
        parseStmt();
        return i;
    }

    function parseStmts() {
        while (i < len) {
            if (tokens[i].value === ';') { i++; continue; }
            if (tokens[i].value === '}') break;
            const before = i;
            parseStmt();
            if (i === before) i++; // safety: skip stuck token
        }
    }

    function parseStmt() {
        if (i >= len) return;
        const v = tokens[i].value;
        switch (v) {
            case 'if': {
                i++; i = skipParens(i); i = parseBlock();
                while (i < len && tokens[i].value === 'elseif') { i++; i = skipParens(i); i = parseBlock(); }
                if (i < len && tokens[i].value === 'else') { i++; i = parseBlock(); }
                i = expect(i, at(i-1)); return;
            }
            case 'for':   i++; i = skipParens(i); i = parseBlock(); i = expect(i, at(i-1)); return;
            case 'while': i++; i = skipParens(i); i = parseBlock(); i = expect(i, at(i-1)); return;
            case 'try': {
                i++; i = parseBlock();
                if (i < len && tokens[i].value === 'catch') { i++; if (i < len && tokens[i].value === '(') i = skipParens(i); i = parseBlock(); }
                i = expect(i, at(i-1)); return;
            }
            case 'switch': i++; i = skipParens(i); i = skipBraces(i); i = expect(i, at(i-1)); return;
            case 'fun': {
                i++;
                if (i < len && isIdentifier(tokens[i].value)) { i++; i = skipParens(i); i = parseBlock(); i = expect(i, at(i-1)); return; }
                i--; i = scanExpr(i); i = expect(i, at(i-1)); return;
            }
            case 'class': {
                i++; if (i<len) i++;
                if (i<len && tokens[i].value==='extends') { i++; if (i<len) i++; }
                if (i<len && tokens[i].value==='{') {
                    i++; contextStack.push('class');
                    while (i<len && tokens[i].value!=='}') {
                        if (tokens[i].value===';') { i++; continue; }
                        const before = i;
                        parseStmt();
                        if (i === before) i++;
                    }
                    contextStack.pop();
                    if (i<len && tokens[i].value==='}') i++;
                }
                i = expect(i, at(i-1)); return;
            }
            case 'export': {
                i++;
                if (i<len && tokens[i].value==='fun') { i++; if(i<len) i++; i=skipParens(i); i=parseBlock(); i=expect(i,at(i-1)); return; }
                if (i<len && tokens[i].value==='default') { i++; i=scanExpr(i); i=expect(i,at(i-1)); return; }
                if (i<len && tokens[i].value==='{') { i=skipBraces(i); i=expect(i,at(i-1)); return; }
                i=scanExpr(i); i=expect(i,at(i-1)); return;
            }
            case 'import': {
                i++;
                while (i<len) {
                    if (tokens[i].value===';') break;
                    if (tokens[i].value==='from') { i++; while(i<len && tokens[i].value!==';' && !STMT_STARTERS.has(tokens[i].value)) i++; break; }
                    i++;
                }
                i=expect(i,at(i-1)); return;
            }
            case 'let': {
                i++; // skip 'let'
                // Walk to ';' while skipping balanced groups
                while (i < len && tokens[i].value !== ';') {
                    if (tokens[i].value === '(') { i = skipParens(i); continue; }
                    if (tokens[i].value === '[') { i = skipBrackets(i); continue; }
                    if (tokens[i].value === '{') { i = skipBraces(i); continue; }
                    if (tokens[i].value === '}') break; // hit enclosing block end
                    i++;
                }
                i = expect(i, at(i-1)); return;
            }
            case 'field': {
                i++;
                while (i<len && tokens[i].value!==';') { if (tokens[i].value==='}') break; i++; }
                i=expect(i,at(i-1)); return;
            }
            case 'return': {
                i++;
                if (i<len && tokens[i].value!==';' && tokens[i].value!=='}') {
                    if (tokens[i].value==='(') i=skipParens(i); else i=scanExpr(i);
                }
                i=expect(i,at(i-1)); return;
            }
            case 'break': case 'continue': i++; i=expect(i,at(i-1)); return;
            case 'print': i++; i=skipParens(i); i=expect(i,at(i-1)); return;
            case 'super': {
                i++; if(i<len && tokens[i].value==='(') i=skipParens(i);
                // postfix chain
                while (i<len) {
                    if (tokens[i].value==='.') { i++; if(i<len) i++; continue; }
                    if (tokens[i].value==='[') { i=skipBrackets(i); continue; }
                    if (tokens[i].value==='(') { i=skipParens(i); continue; }
                    break;
                }
                i=expect(i,at(i-1)); return;
            }
            case 'constructor': i++; i=skipParens(i); i=parseBlock(); return;
            case 'static': i++; if(i<len) i++; i=skipParens(i); i=parseBlock(); return;
            case '[': {
                // possible array destructuring
                let j=i+1,d=1;
                while(j<len&&d>0){if(tokens[j].value==='[')d++;else if(tokens[j].value===']')d--;j++;}
                const closeIdx = j-1;
                if (closeIdx+1<len && tokens[closeIdx+1].value==='=') {
                    i=closeIdx+1; i++; i=scanExpr(i); i=expect(i,at(i-1)); return;
                }
                i=scanExpr(i); i=expect(i,at(i-1)); return;
            }
            default: {
                // class method: ident(params) { ... }
                if (ctx()==='class' && isIdentifier(v) && i+1<len && tokens[i+1].value==='(') {
                    const afterP = skipParens(i+1);
                    if (afterP<len && tokens[afterP].value==='{') { i++; i=skipParens(i); i=parseBlock(); return; }
                }
                i=scanExpr(i); i=expect(i,at(i-1)); return;
            }
        }
    }

    parseStmts();
    validateSeparators(tokens, diagnostics);
    diagCollection.set(document.uri, diagnostics);
    } catch (e) {
        console.error('ASF validation error:', e);
        diagCollection.set(document.uri, []);
    }
}

// ── Separator validation: semicolons not allowed inside (), [], or object {} ──
function validateSeparators(tokens, diagnostics) {
    const len = tokens.length;
    const stack = []; // { type: '('|'['|'{', isBlock: bool }

    for (let t = 0; t < len; t++) {
        const tok = tokens[t];
        const v = tok.value;

        if (v === '(') {
            stack.push({ type: '(', isBlock: false });
        } else if (v === '[') {
            stack.push({ type: '[', isBlock: false });
        } else if (v === '{') {
            // Determine block vs object literal/export list/import list.
            // Object literal follows: = ( [ , : return ? =>
            // Export/import list follows: export import
            // Block follows: ) else try { } or start-of-file / statement keywords
            const prev = t > 0 ? tokens[t - 1].value : null;
            const isObj = (prev === '=' || prev === '(' || prev === '['
                       || prev === ',' || prev === ':' || prev === '?'
                       || prev === 'return' || prev === '+='
                       || prev === '-=' || prev === '*=' || prev === '/='
                       || prev === '%=' || prev === 'export' || prev === 'import');
            stack.push({ type: '{', isBlock: !isObj });
        } else if (v === ')' || v === ']' || v === '}') {
            if (stack.length > 0) stack.pop();
        } else if (v === ';') {
            if (stack.length > 0) {
                const top = stack[stack.length - 1];
                // ';' is wrong inside parens, brackets, or object literals/export lists
                if (top.type === '(' || top.type === '['
                    || (top.type === '{' && !top.isBlock)) {
                    // Check if we're in an export/import context
                    let ctx = top.type === '(' ? 'function arguments/grouping'
                            : top.type === '[' ? 'array elements'
                            : 'object properties';
                    
                    // Look back to see if this is an export/import list
                    if (top.type === '{') {
                        for (let lookback = t - 1; lookback >= 0; lookback--) {
                            const lbVal = tokens[lookback].value;
                            if (lbVal === 'export') {
                                ctx = 'export list';
                                break;
                            } else if (lbVal === 'import') {
                                ctx = 'import list';
                                break;
                            } else if (lbVal === '=' || lbVal === ':' || lbVal === 'return') {
                                ctx = 'object literal';
                                break;
                            }
                        }
                    }
                    
                    const range = new vscode.Range(
                        new vscode.Position(tok.line, tok.char),
                        new vscode.Position(tok.line, tok.char + tok.length)
                    );
                    const d = new vscode.Diagnostic(
                        range,
                        `Unexpected ';' inside ${ctx}. Use ',' to separate elements in ${ctx}.`,
                        vscode.DiagnosticSeverity.Error
                    );
                    d.source = 'ASF';
                    d.code = 'unexpected-semicolon';
                    diagnostics.push(d);
                }
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════
//  HOVER — DIAGNOSTIC ERRORS
// ═════════════════════════════════════════════════════════════════

function buildDiagnosticHover(document, position, diagCollection) {
    const diags = diagCollection.get(document.uri);
    if (!diags || diags.length === 0) return null;

    const hits = [];
    for (const d of diags) {
        if (d.range.contains(position)) hits.push(d);
    }
    if (hits.length === 0) return null;

    let md = '';
    for (let i = 0; i < hits.length; i++) {
        const d = hits[i];
        const icon = d.severity === vscode.DiagnosticSeverity.Error ? '🔴'
                   : d.severity === vscode.DiagnosticSeverity.Warning ? '🟡' : 'ℹ️';
        const label = d.severity === vscode.DiagnosticSeverity.Error ? 'Error'
                    : d.severity === vscode.DiagnosticSeverity.Warning ? 'Warning' : 'Info';

        md += `${icon} **${label}** — \`${d.source||'ASF'}\``;
        if (d.code) md += ` (${d.code})`;
        md += `\n\n${d.message}`;

        // Fix suggestion
        if (d.code === 'missing-semicolon') {
            md += '\n\n💡 **Fix:** Add `;` after this statement. In ASF every statement must end with `;`, including block statements.\n\n';
            md += '```asf\n# ✗ Wrong\nlet x = 10\nif (x > 5) { print(x); }\n\n# ✓ Correct\nlet x = 10;\nif (x > 5) { print(x); };\n```';
        }
        if (d.code === 'unexpected-semicolon') {
            md += '\n\n💡 **Fix:** Replace `;` with `,` to separate elements.\n\n';
            md += '```asf\n# ✗ Wrong\nlet arr = [1; 2; 3];\nprint(a; b; c);\nexport { Calculator; fibonacci };\nlet obj = { x: 1; y: 2 };\n\n# ✓ Correct\nlet arr = [1, 2, 3];\nprint(a, b, c);\nexport { Calculator, fibonacci };\nlet obj = { x: 1, y: 2 };\n```';
        }
        if (i < hits.length - 1) md += '\n\n---\n\n';
    }

    const result = new vscode.MarkdownString(md);
    result.isTrusted = true;
    return result;
}

// ═════════════════════════════════════════════════════════════════
//  HOVER — KEYWORD DOCUMENTATION
// ═════════════════════════════════════════════════════════════════

function buildKeywordHover(word) {
    const DOCS = {
        'fun':         '```asf\nfun name(params) { ... }\n```\n---\nDeclares a named function, or an anonymous function when used as an expression.\n\n**Examples:**\n```asf\nfun greet(name) { print("Hello " + name); };\nlet double = fun(x) { return x * 2; };\n```',
        'class':       '```asf\nclass Name [extends Parent] { ... }\n```\n---\nDeclares a class. Body can contain `field`, `constructor`, methods, and `static` methods.\n\n**Example:**\n```asf\nclass Dog extends Animal {\n    field name, breed;\n    constructor(n, b) { this.name = n; };\n    bark() { print("Woof!"); }\n};\n```',
        'field':       '```asf\nfield name [= default], ...;\n```\n---\nDeclares instance fields inside a class body with optional defaults.\n\n**Example:**\n```asf\nfield x = 0, y = 0, label;\n```',
        'let':         '```asf\nlet name [= value];\n```\n---\nDeclares a variable with an optional initializer.\n\n**Example:**\n```asf\nlet count = 0;\nlet name;\n```',
        'constructor': '```asf\nconstructor(params) { ... }\n```\n---\nClass constructor. Called via `new`. Use `super(args)` for parent.\n\n**Example:**\n```asf\nconstructor(x, y) {\n    super(x);\n    this.y = y;\n}\n```',
        'static':      '```asf\nstatic methodName(params) { ... }\n```\n---\nStatic method on a class, called on the class itself.\n\n**Example:**\n```asf\nstatic create(name) { return new MyClass(name); }\n```',
        'extends':     '*(keyword)* — Specifies parent class for inheritance.\n```asf\nclass Dog extends Animal { ... };\n```',
        'if':          '```asf\nif (expr) { ... }\n[elseif (expr) { ... }]*\n[else { ... }]\n```\n---\nConditional branching with `elseif` chains and `else`.\n\n**Example:**\n```asf\nif (x > 10) {\n    print("big");\n} elseif (x > 0) {\n    print("small");\n} else {\n    print("zero or negative");\n};\n```',
        'elseif':      '*(keyword)* — Alternate branch in an `if` chain.\n```asf\nif (a) { ... } elseif (b) { ... };\n```',
        'else':        '*(keyword)* — Fallback branch when no `if`/`elseif` matched.\n```asf\nif (a) { ... } else { ... };\n```',
        'for':         '```asf\nfor (init, cond, step) { ... }    # C-style\nfor (key in object) { ... }        # key iteration\nfor (item of array) { ... }        # value iteration\n```\n---\nLoop with three forms.\n\n**Example:**\n```asf\nfor (i = 0, i < 10, i = i + 1) { print(i); };\nfor (key in obj) { print(key); };\nfor (item of arr) { print(item); };\n```',
        'while':       '```asf\nwhile (condition) { ... }\n```\n---\nRepeats block while condition is truthy.\n\n**Example:**\n```asf\nwhile (n > 0) { print(n); n = n - 1; };\n```',
        'switch':      '```asf\nswitch (expr) {\n    case value { ... }\n    default { ... }\n}\n```\n---\nMulti-branch conditional.\n\n**Example:**\n```asf\nswitch (color) {\n    case "red" { print("hot"); }\n    default { print("unknown"); }\n};\n```',
        'try':         '```asf\ntry { ... } catch (error) { ... }\ntry { ... } catch { ... }\n```\n---\nException handling. Catch optionally binds the error.\n\n**Example:**\n```asf\ntry { riskyOp(); } catch (e) { print(e); };\n```',
        'catch':       '*(keyword)* — Handles exceptions from the `try` block.\n```asf\ntry { ... } catch (e) { ... };\n```',
        'return':      '```asf\nreturn [expr];\n```\n---\nReturns a value from a function. Returns `null` if bare.\n\n**Example:**\n```asf\nfun max(a, b) { if (a > b) { return a; }; return b; };\n```',
        'break':       '*(keyword)* — Exits the innermost loop or switch.\n```asf\nwhile (true) { if (done) { break; }; };\n```',
        'continue':    '*(keyword)* — Skips to the next loop iteration.\n```asf\nfor (i = 0, i < 10, i = i + 1) { if (i == 5) { continue; }; print(i); };\n```',
        'import':      '```asf\nimport name from "module";\nimport { a, b } from "module";\nimport * as mod from "module";\nimport def, { a } from "module";\n```\n---\nImport from another ASF module (`.vas` file).\n\n**Example:**\n```asf\nimport Math from "stdlib/math";\nimport { sum, avg as average } from "utils";\n```',
        'export':      '```asf\nexport { name [as alias] };\nexport default expr;\nexport fun name(params) { ... };\n```\n---\nExport from the current module.\n\n**Example:**\n```asf\nexport { calc, PI as pi };\nexport default MyClass;\n```',
        'this':        '*(keyword)* — Reference to the current class instance.\n```asf\nconstructor(name) { this.name = name; }\n```',
        'super':       '*(keyword)* — Parent class reference. `super(args)` calls parent constructor.\n```asf\nconstructor(name, age) { super(name); this.age = age; }\n```',
        'new':         '```asf\nnew ClassName(args)\n```\n---\nCreates a new class instance.\n```asf\nlet dog = new Dog("Rex", "Labrador");\n```',
        'typeof':      '```asf\ntypeof expr\n```\n---\nReturns the type as a string.\n```asf\nlet t = typeof 42;       # "number"\n```',
        'print':       '```asf\nprint(arg1, arg2, ...)\n```\n---\nPrints values to output.\n```asf\nprint("Hello", name, "!");\n```',
        'true':        '*(constant)* — Boolean `true` literal.',
        'false':       '*(constant)* — Boolean `false` literal.',
        'null':        '*(constant)* — Represents the absence of a value.',
        'in':          '*(keyword)* — Used in `for (key in object)` loops to iterate over keys.',
        'of':          '*(keyword)* — Used in `for (item of array)` loops to iterate over values.',
        'as':          '*(keyword)* — Creates an alias in `import`/`export` statements.\n```asf\nimport { sum as add } from "math";\n```',
        'from':        '*(keyword)* — Specifies the source module in an `import`.\n```asf\nimport Math from "stdlib/math";\n```',
        'default':     '*(keyword)* — Fallback in `switch`, or used in `export default`.',
        'case':        '*(keyword)* — Branch in a `switch` statement.\n```asf\nswitch (x) { case 1 { print("one"); } };\n```'
    };
    const text = DOCS[word];
    if (!text) return null;
    const md = new vscode.MarkdownString(text);
    md.isTrusted = true;
    return md;
}

// ═════════════════════════════════════════════════════════════════
//  HOVER — CODE-AWARE (user symbols)
// ═════════════════════════════════════════════════════════════════

function buildCodeHover(word, offset, text, stripped, document, position) {
    const results = [];

    findFunctions(word, stripped, text, results);
    findClasses(word, stripped, text, results);
    findLets(word, stripped, text, offset, results);
    findFields(word, stripped, text, results);
    findParams(word, stripped, text, offset, results);
    findForVars(word, stripped, text, offset, results);
    findCatchVars(word, stripped, text, offset, results);
    findImports(word, stripped, text, results);
    findThisAccess(word, stripped, document, position, results);
    findDestructured(word, stripped, text, results);

    if (results.length === 0) return null;
    results.sort((a, b) => {
        const dA = a.off <= offset ? offset - a.off : Infinity;
        const dB = b.off <= offset ? offset - b.off : Infinity;
        return dA - dB;
    });
    const md = new vscode.MarkdownString(results[0].md);
    md.isTrusted = true;
    return md;
}

// ── helpers for brace/paren matching on raw strings ──────────
function matchBrace(src, pos) {
    let d = 1, j = pos + 1;
    while (j < src.length && d > 0) { if (src[j]==='{') d++; else if (src[j]==='}') d--; j++; }
    return j - 1;
}
function matchParen(src, pos) {
    let d = 1, j = pos + 1;
    while (j < src.length && d > 0) { if (src[j]==='(') d++; else if (src[j]===')') d--; j++; }
    return j - 1;
}

function getDocComment(text, declOffset) {
    const before = text.substring(0, declOffset).split('\n');
    const lines = [];
    for (let i = before.length - 1; i >= 0; i--) {
        const t = before[i].trim();
        if (t === '' && lines.length === 0) continue;
        if (t === '' && lines.length > 0) break;
        if (t.startsWith('//') || t.startsWith('#')) {
            lines.unshift(t.replace(/^\/\/\s?/, '').replace(/^#\s?/, ''));
        } else if (t.startsWith('/*') || t.startsWith('*') || t.endsWith('*/')) {
            const c = t.replace(/^\/\*+\s?/,'').replace(/\s?\*+\/$/,'').replace(/^\*\s?/,'');
            if (c) lines.unshift(c);
        } else break;
    }
    return lines.length > 0 ? lines.join('\n') : null;
}

function enclosingClass(stripped, offset) {
    const re = /\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*\{/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const bo = stripped.indexOf('{', m.index + m[0].length - 1);
        const bc = matchBrace(stripped, bo);
        if (offset > bo && offset < bc) return m[1];
    }
    return null;
}

function findFunctions(word, stripped, text, results) {
    const re = new RegExp('\\b(export\\s+)?fun\\s+(' + escapeRegex(word) + ')\\s*\\(', 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const isExp = !!m[1];
        const po = stripped.indexOf('(', m.index + m[0].length - 1);
        const pc = matchParen(stripped, po);
        const params = stripped.substring(po+1, pc).trim();
        const doc = getDocComment(text, m.index);
        let md = `*(function)*\n\n\`\`\`asf\n${isExp?'export ':''}fun ${word}(${params})\n\`\`\``;
        if (doc) md += `\n\n---\n\n${doc}`;
        if (params) {
            const ps = params.split(',').map(p => p.trim());
            if (ps.length > 1 || ps.some(p => p.startsWith('...'))) {
                md += '\n\n**Parameters:**';
                for (const p of ps) md += `\n- \`${p}\`${p.startsWith('...')?' — rest parameter':''}`;
            }
        }
        results.push({ md, off: m.index });
    }
}

function findClasses(word, stripped, text, results) {
    const re = new RegExp('\\bclass\\s+(' + escapeRegex(word) + ')(?:\\s+extends\\s+([a-zA-Z_][a-zA-Z0-9_]*))?\\s*\\{', 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const parent = m[2] || null;
        const bo = stripped.indexOf('{', m.index + m[0].length - 1);
        const bc = matchBrace(stripped, bo);
        const body = stripped.substring(bo+1, bc);
        const doc = getDocComment(text, m.index);

        let md = `*(class)*\n\n\`\`\`asf\nclass ${word}${parent?' extends '+parent:''}\n\`\`\``;
        if (doc) md += `\n\n---\n\n${doc}`;

        // fields
        const fields = [];
        const fre = /\bfield\s+((?:[a-zA-Z_][a-zA-Z0-9_]*(?:\s*=\s*[^,;]*)?(?:\s*,\s*)?)+)/g;
        let fm;
        while ((fm = fre.exec(body)) !== null) {
            const nre = /([a-zA-Z_][a-zA-Z0-9_]*)/g; let nm;
            while ((nm = nre.exec(fm[1])) !== null) fields.push(nm[1]);
        }
        // ctor
        let ctorParams = null;
        const cre = /\bconstructor\s*\(([^)]*)\)/; const cm = cre.exec(body);
        if (cm) ctorParams = cm[1].trim();
        // methods
        const methods = [];
        const mre = /\b(?:(static)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
        let mm;
        while ((mm = mre.exec(body)) !== null) {
            if (mm[2]==='constructor' || RESERVED.has(mm[2])) continue;
            methods.push(`${mm[1]?'static ':''}${mm[2]}(${mm[3].trim()})`);
        }

        if (fields.length||ctorParams!==null||methods.length) {
            md += '\n\n**Members:**';
            if (fields.length) md += `\n- **Fields:** \`${fields.join('`, `')}\``;
            if (ctorParams!==null) md += `\n- **Constructor:** \`constructor(${ctorParams})\``;
            for (const me of methods) md += `\n- \`${me}\``;
        }
        results.push({ md, off: m.index });
    }
}

function findLets(word, stripped, text, hoverOff, results) {
    const re = new RegExp('\\blet\\s+(' + escapeRegex(word) + ')\\b', 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const ls = text.lastIndexOf('\n', m.index)+1;
        let le = text.indexOf('\n', m.index); if (le===-1) le=text.length;
        const line = text.substring(ls, le).trim();
        const si = line.indexOf(';');
        const display = si!==-1 ? line.substring(0,si+1) : line;
        const doc = getDocComment(text, m.index);
        let md = `*(variable)*\n\n\`\`\`asf\n${display}\n\`\`\``;
        if (doc) md += `\n\n---\n\n${doc}`;
        results.push({ md, off: m.index });
    }
}

function findFields(word, stripped, text, results) {
    const re = new RegExp('\\bfield\\s+[^;]*\\b(' + escapeRegex(word) + ')\\b[^;]*;', 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const cls = enclosingClass(stripped, m.index);
        const ls = text.lastIndexOf('\n', m.index)+1;
        let le = text.indexOf('\n', m.index); if (le===-1) le=text.length;
        const line = text.substring(ls, le).trim();
        const si = line.indexOf(';'); const display = si!==-1 ? line.substring(0,si+1) : line;
        let md = cls ? `*(field)* — class \`${cls}\`\n\n` : `*(field)*\n\n`;
        md += `\`\`\`asf\n${display}\n\`\`\``;
        results.push({ md, off: m.index });
    }
}

function findParams(word, stripped, text, hoverOff, results) {
    const re = /\b(?:fun\s+[a-zA-Z_][a-zA-Z0-9_]*|constructor|static\s+[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
        if (!m[1]) continue;
        const ps = m[1].split(',').map(p=>p.trim());
        const names = ps.map(p=>p.replace('...',''));
        if (!names.includes(word)) continue;
        const bo = stripped.indexOf('{', m.index + m[0].length - 1);
        const bc = matchBrace(stripped, bo);
        if (hoverOff >= m.index && hoverOff <= bc) {
            const isRest = ps.some(p => p === '...'+word);
            const sig = stripped.substring(m.index, bo).trim();
            let md = `*(${isRest?'rest parameter':'parameter'})*\n\n\`\`\`asf\n${isRest?'...':''}${word}\n\`\`\`\n\n---\n\nParameter of \`${sig}\``;
            results.push({ md, off: m.index });
        }
    }
}

function findForVars(word, stripped, text, hoverOff, results) {
    const re = new RegExp('\\bfor\\s*\\(\\s*(' + escapeRegex(word) + ')\\s+(?:in|of)\\s+', 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const po = stripped.indexOf('(', m.index);
        const pc = matchParen(stripped, po);
        let be;
        const rest = stripped.substring(pc+1);
        const ns = rest.search(/\S/);
        if (ns===-1) continue;
        const bi = pc+1+ns;
        if (stripped[bi]==='{') be = matchBrace(stripped, bi); else { be = stripped.indexOf(';', bi); if (be===-1) be = stripped.length; }
        if (hoverOff >= m.index && hoverOff <= be) {
            const isIn = /\bin\b/.test(stripped.substring(m.index, pc));
            const kind = isIn ? 'for-in loop variable (key)' : 'for-of loop variable (value)';
            results.push({ md: `*(${kind})*\n\n\`\`\`asf\n${word}\n\`\`\``, off: m.index });
        }
    }
}

function findCatchVars(word, stripped, text, hoverOff, results) {
    const re = new RegExp('\\bcatch\\s*\\(\\s*(' + escapeRegex(word) + ')\\s*\\)\\s*\\{', 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const bo = stripped.indexOf('{', m.index + m[0].length - 1);
        const bc = matchBrace(stripped, bo);
        if (hoverOff >= m.index && hoverOff <= bc) {
            results.push({ md: `*(catch variable)*\n\n\`\`\`asf\n${word}\n\`\`\`\n\n---\n\nBound error variable in a \`try/catch\` block.`, off: m.index });
        }
    }
}

function findImports(word, stripped, text, results) {
    // default: import word from "..."
    const dre = new RegExp('\\bimport\\s+(' + escapeRegex(word) + ')\\s+from\\b', 'g');
    let dm;
    while ((dm = dre.exec(stripped)) !== null) {
        const fi = text.indexOf('from', dm.index);
        let mod = ''; if (fi!==-1) { const af = text.substring(fi+4).match(/\s*["']([^"']+)["']/); if (af) mod = af[1]; }
        results.push({ md: `*(default import)*\n\n\`\`\`asf\nimport ${word} from "${mod}"\n\`\`\`\n\n---\n\nDefault export from \`"${mod}"\``, off: dm.index });
    }
    // named: import { word } or { x as word }
    const nre = /\bimport\s+(?:[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*)?\{([^}]+)\}\s+from\b/g;
    let nm;
    while ((nm = nre.exec(stripped)) !== null) {
        const specs = nm[1];
        const sre = new RegExp('\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s+as\\s+(' + escapeRegex(word) + ')\\b|\\b(' + escapeRegex(word) + ')\\b', 'g');
        let sm;
        while ((sm = sre.exec(specs)) !== null) {
            const orig = sm[1] || sm[3]; const alias = sm[2] || null;
            const fi = text.indexOf('from', nm.index);
            let mod = ''; if (fi!==-1) { const af = text.substring(fi+4).match(/\s*["']([^"']+)["']/); if (af) mod = af[1]; }
            if (alias) {
                results.push({ md: `*(named import)*\n\n\`\`\`asf\nimport { ${orig} as ${word} } from "${mod}"\n\`\`\`\n\n---\n\nImported as \`${word}\`, originally \`${orig}\` in \`"${mod}"\``, off: nm.index });
            } else {
                results.push({ md: `*(named import)*\n\n\`\`\`asf\nimport { ${word} } from "${mod}"\n\`\`\`\n\n---\n\nNamed export from \`"${mod}"\``, off: nm.index });
            }
        }
    }
    // namespace: import * as word from "..."
    const nsre = new RegExp('\\bimport\\s+\\*\\s+as\\s+(' + escapeRegex(word) + ')\\s+from\\b', 'g');
    let nsm;
    while ((nsm = nsre.exec(stripped)) !== null) {
        const fi = text.indexOf('from', nsm.index);
        let mod = ''; if (fi!==-1) { const af = text.substring(fi+4).match(/\s*["']([^"']+)["']/); if (af) mod = af[1]; }
        results.push({ md: `*(namespace import)*\n\n\`\`\`asf\nimport * as ${word} from "${mod}"\n\`\`\`\n\n---\n\nAll exports from \`"${mod}"\` bound as \`${word}\``, off: nsm.index });
    }
}

function findThisAccess(word, stripped, document, position, results) {
    const line = document.lineAt(position.line).text;
    const before = line.substring(0, position.character).trimEnd();
    if (!before.endsWith('this.')) return;
    const off = document.offsetAt(position);
    const cls = enclosingClass(stripped, off);
    if (!cls) return;
    const fre = new RegExp('\\bfield\\s+[^;]*\\b(' + escapeRegex(word) + ')\\b', 'g');
    let fm;
    while ((fm = fre.exec(stripped)) !== null) {
        if (enclosingClass(stripped, fm.index) === cls) {
            results.push({ md: `*(instance field)* — \`${cls}.${word}\`\n\n\`\`\`asf\nthis.${word}\n\`\`\`\n\n---\n\nField declared in class \`${cls}\``, off: fm.index });
            return;
        }
    }
}

function findDestructured(word, stripped, text, results) {
    const re = /\[([^\]]+)\]\s*=/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const names = m[1].split(',').map(n => n.trim().replace('...', ''));
        if (!names.includes(word)) continue;
        const isRest = m[1].includes('...'+word);
        const ls = text.lastIndexOf('\n', m.index)+1;
        let le = text.indexOf('\n', m.index); if (le===-1) le=text.length;
        const line = text.substring(ls, le).trim();
        results.push({ md: `*(${isRest?'rest destructured':'destructured'} variable)*\n\n\`\`\`asf\n${line}\n\`\`\``, off: m.index });
    }
}

// ═════════════════════════════════════════════════════════════════
//  OUTLINE — DOCUMENT SYMBOL PROVIDER
// ═════════════════════════════════════════════════════════════════

function buildOutlineSymbols(document) {
    const text = document.getText();
    const stripped = stripStringsAndComments(text);
    const symbols = [];
    const docLen = text.length;

    function clamp(off) {
        return Math.max(0, Math.min(off, docLen - 1));
    }

    function sym(name, detail, kind, nameOff, startOff, endOff) {
        try {
            const full = new vscode.Range(
                document.positionAt(clamp(startOff)),
                document.positionAt(clamp(endOff + 1))
            );
            const sel = new vscode.Range(
                document.positionAt(clamp(nameOff)),
                document.positionAt(clamp(nameOff + name.length))
            );
            return new vscode.DocumentSymbol(name, detail, kind, full, sel);
        } catch (e) {
            return null;
        }
    }

    function safePush(s) {
        if (s) symbols.push(s);
    }

    // ── class ranges (to skip nested decls) ──────────────────
    const classRanges = [];
    const crRe = /\bclass\s+[a-zA-Z_][a-zA-Z0-9_]*(?:\s+extends\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*\{/g;
    let crM;
    while ((crM = crRe.exec(stripped)) !== null) {
        const bo = stripped.indexOf('{', crM.index + crM[0].length - 1);
        classRanges.push([crM.index, matchBrace(stripped, bo)]);
    }
    function inClass(off) { for (const [s,e] of classRanges) if (off>s&&off<e) return true; return false; }

    // ── fun ranges ───────────────────────────────────────────
    const funRanges = [];
    const frRe = /\bfun\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g;
    let frM;
    while ((frM = frRe.exec(stripped)) !== null) {
        const po = stripped.indexOf('(', frM.index+4);
        const pc = matchParen(stripped, po);
        const ns = stripped.substring(pc+1).search(/\S/);
        if (ns===-1) continue;
        const bi = pc+1+ns;
        if (stripped[bi]!=='{') continue;
        funRanges.push([frM.index, matchBrace(stripped, bi)]);
    }
    function inFun(off) { for (const [s,e] of funRanges) if (off>s&&off<e) return true; return false; }

    // ── Classes ──────────────────────────────────────────────
    const clsRe = /\b(class)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+(extends)\s+([a-zA-Z_][a-zA-Z0-9_]*))?\s*\{/g;
    let clsM;
    while ((clsM = clsRe.exec(stripped)) !== null) {
        const cName = clsM[2], parent = clsM[4]||'';
        const bo = stripped.indexOf('{', clsM.index + clsM[0].length - 1);
        const bc = matchBrace(stripped, bo);
        const nOff = clsM.index + clsM[0].indexOf(cName);
        const cSym = sym(cName, parent?`extends ${parent}`:'', vscode.SymbolKind.Class, nOff, clsM.index, bc);
        if (!cSym) continue;
        const body = stripped.substring(bo+1, bc);
        cSym.children = parseClassMembers(body, bo+1, document);
        safePush(cSym);
    }

    // ── Top-level functions ──────────────────────────────────
    const fnRe = /\b(fun)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let fnM;
    while ((fnM = fnRe.exec(stripped)) !== null) {
        if (inClass(fnM.index)) continue;
        const fName = fnM[2];
        const po = stripped.indexOf('(', fnM.index + fnM[0].length - 1);
        const pc = matchParen(stripped, po);
        const ns = stripped.substring(pc+1).search(/\S/);
        if (ns===-1) continue;
        const bi = pc+1+ns; if (stripped[bi]!=='{') continue;
        const bc = matchBrace(stripped, bi);
        const nOff = fnM.index + fnM[0].indexOf(fName);
        const params = stripped.substring(po+1, pc).trim();
        const bef = stripped.substring(Math.max(0,fnM.index-20), fnM.index);
        const isExp = /\bexport\s*$/.test(bef);
        const detail = (isExp?'export ':'') + (params?`(${params})`:'()');
        safePush(sym(fName, detail, vscode.SymbolKind.Function, nOff, isExp?fnM.index-bef.length+bef.lastIndexOf('export'):fnM.index, bc));
    }

    // ── Top-level let ────────────────────────────────────────
    const letRe = /\b(let)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let letM;
    while ((letM = letRe.exec(stripped)) !== null) {
        if (inClass(letM.index) || inFun(letM.index)) continue;
        const vName = letM[2];
        const nOff = letM.index + letM[0].indexOf(vName);
        let end = stripped.indexOf(';', letM.index); if (end===-1) end = stripped.indexOf('\n', letM.index); if (end===-1) end = stripped.length-1;
        safePush(sym(vName, 'let', vscode.SymbolKind.Variable, nOff, letM.index, end));
    }

    // ── Imports ──────────────────────────────────────────────
    const impRe = /\b(import)\s+(.+?)\s+from\b/g;
    let impM;
    while ((impM = impRe.exec(stripped)) !== null) {
        let label = impM[2].replace(/[{}]/g,'').trim();
        if (label.length>40) label = label.substring(0,37)+'...';
        const fi = text.indexOf('from', impM.index);
        let mod = '';
        if (fi!==-1) { const af = text.substring(fi+4).match(/\s*["']([^"']+)["']/); if (af) mod=af[1]; }
        let end = stripped.indexOf(';', impM.index); if (end===-1) end = impM.index+impM[0].length;
        safePush(sym(label, mod?`from "${mod}"`:'import', vscode.SymbolKind.Module, impM.index, impM.index, end));
    }

    // ── Named exports ────────────────────────────────────────
    const expRe = /\b(export)\s*\{([^}]*)\}/g;
    let expM;
    while ((expM = expRe.exec(stripped)) !== null) {
        const names = expM[2].replace(/\s+as\s+\w+/g,'').trim();
        let end = stripped.indexOf(';', expM.index); if (end===-1) end = expM.index+expM[0].length;
        safePush(sym(`export { ${names} }`, '', vscode.SymbolKind.Namespace, expM.index, expM.index, end));
    }

    symbols.sort((a,b) => a.range.start.compareTo(b.range.start));
    return symbols;
}

function parseClassMembers(body, bodyOffset, document) {
    const members = [];
    const docLen = document.getText().length;

    function clamp(off) {
        return Math.max(0, Math.min(off, docLen - 1));
    }

    function sym(name, detail, kind, nameOff, startOff, endOff) {
        try {
            const full = new vscode.Range(
                document.positionAt(clamp(startOff)),
                document.positionAt(clamp(endOff + 1))
            );
            const sel = new vscode.Range(
                document.positionAt(clamp(nameOff)),
                document.positionAt(clamp(nameOff + name.length))
            );
            return new vscode.DocumentSymbol(name, detail, kind, full, sel);
        } catch (e) {
            return null;
        }
    }

    function safePush(s) {
        if (s) members.push(s);
    }

    // fields
    const fre = /\bfield\s+((?:[a-zA-Z_][a-zA-Z0-9_]*(?:\s*=\s*[^,;]*)?(?:\s*,\s*)?)+)\s*;/g;
    let fm;
    while ((fm = fre.exec(body)) !== null) {
        const nre = /([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let nm;
        while ((nm = nre.exec(fm[1])) !== null) {
            const nOff = bodyOffset + fm.index + fm[0].indexOf(fm[1]) + nm.index;
            safePush(sym(nm[1], 'field', vscode.SymbolKind.Field, nOff, bodyOffset + fm.index, bodyOffset + fm.index + fm[0].length - 1));
        }
    }

    // constructor
    const cre = /\b(constructor)\s*\(/g;
    let cm;
    while ((cm = cre.exec(body)) !== null) {
        const po = body.indexOf('(', cm.index + cm[1].length);
        if (po === -1) continue;
        const pc = matchParen(body, po);
        if (pc >= body.length) continue;
        const bi = body.indexOf('{', pc + 1);
        if (bi === -1) continue;
        const bc = matchBrace(body, bi);
        if (bc >= body.length) continue;
        const params = body.substring(po + 1, pc).trim();
        safePush(sym('constructor', params ? `(${params})` : '()', vscode.SymbolKind.Constructor, bodyOffset + cm.index, bodyOffset + cm.index, bodyOffset + bc));
    }

    // static methods
    const sre = /\b(static)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    let sm;
    while ((sm = sre.exec(body)) !== null) {
        const mName = sm[2];
        const po = body.indexOf('(', sm.index + sm[0].length - 1);
        if (po === -1) continue;
        const pc = matchParen(body, po);
        if (pc >= body.length) continue;
        const bi = body.indexOf('{', pc + 1);
        if (bi === -1) continue;
        const bc = matchBrace(body, bi);
        if (bc >= body.length) continue;
        const params = body.substring(po + 1, pc).trim();
        const nOff = bodyOffset + sm.index + sm[0].indexOf(mName);
        safePush(sym(mName, `static (${params})`, vscode.SymbolKind.Method, nOff, bodyOffset + sm.index, bodyOffset + bc));
    }

    // regular methods
    const mre = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
    let mm;
    while ((mm = mre.exec(body)) !== null) {
        if (mm[1] === 'constructor' || RESERVED.has(mm[1])) continue;
        const before = body.substring(Math.max(0, mm.index - 20), mm.index);
        if (/\bstatic\s*$/.test(before)) continue;
        const po = body.indexOf('(', mm.index + mm[1].length);
        if (po === -1) continue;
        const pc = matchParen(body, po);
        if (pc >= body.length) continue;
        const ns = body.substring(pc + 1).search(/\S/);
        if (ns === -1) continue;
        const bi = pc + 1 + ns;
        if (body[bi] !== '{') continue;
        const bc = matchBrace(body, bi);
        if (bc >= body.length) continue;
        const params = mm[2].trim();
        const nOff = bodyOffset + mm.index;
        safePush(sym(mm[1], params ? `(${params})` : '()', vscode.SymbolKind.Method, nOff, nOff, bodyOffset + bc));
    }

    members.sort((a, b) => a.range.start.compareTo(b.range.start));
    return members;
}

// ═════════════════════════════════════════════════════════════════
function deactivate() {}
module.exports = { activate, deactivate };
