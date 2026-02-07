const vscode = require('vscode');

function activate(context) {
    console.log('ASF Language Extension activated');

    // Register a completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'asf',
        {
            provideCompletionItems(document, position) {
                const completions = [];

                // Add built-in objects
                const builtins = ['Math', 'Array', 'String', 'Object', 'RegExp'];
                builtins.forEach(name => {
                    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
                    item.detail = 'Built-in object';
                    completions.push(item);
                });

                return completions;
            }
        }
    );

    // Register a hover provider
    const hoverProvider = vscode.languages.registerHoverProvider('asf', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);

            const keywords = {
                'fun': 'Function declaration keyword',
                'class': 'Class declaration keyword',
                'let': 'Variable declaration keyword',
                'import': 'Import module keyword',
                'export': 'Export module keyword',
                'if': 'Conditional statement',
                'for': 'Loop statement',
                'while': 'Loop statement',
                'try': 'Exception handling',
                'catch': 'Exception handler',
                'return': 'Return statement',
                'this': 'Current instance reference',
                'super': 'Parent class reference',
                'new': 'Object instantiation'
            };

            if (keywords[word]) {
                return new vscode.Hover(keywords[word]);
            }
        }
    });

    // Register folding range provider
    const foldingProvider = vscode.languages.registerFoldingRangeProvider('asf', {
        provideFoldingRanges(document, context, token) {
            const ranges = [];
            const openBraces = [];

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const text = line.text;

                for (let j = 0; j < text.length; j++) {
                    if (text[j] === '{') {
                        openBraces.push(i);
                    } else if (text[j] === '}' && openBraces.length > 0) {
                        const startLine = openBraces.pop();
                        ranges.push(new vscode.FoldingRange(startLine, i));
                    }
                }
            }

            return ranges;
        }
    });

    context.subscriptions.push(completionProvider, hoverProvider, foldingProvider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
