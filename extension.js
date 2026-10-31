const vscode = require('vscode');

// ═════════════════════════════════════════════════════════════════
//  LANGUAGE DATA
// ═════════════════════════════════════════════════════════════════

// Built-in global functions (ASF_VM.cls, EvalExprNode "Call" dispatch)
const BUILTIN_FUNCTIONS = {
    print: {
        params: ['...values'],
        doc: 'Prints values to the output (the Immediate window, and `engine.OUTPUT_`).',
        example: "print('Hello', name, [1, 2, 3]);"
    },
    range: {
        params: ['start', 'end', 'step'],
        signature: 'range([start,] end[, step])',
        doc: 'Returns an array of numbers from `start` (default `0`) up to, but not including, `end`, counting by `step` (default `1`, may be negative).',
        example: 'range(5);          // [0, 1, 2, 3, 4]\nrange(1, 6);       // [1, 2, 3, 4, 5]\nrange(10, 0, -2);  // [10, 8, 6, 4, 2]'
    },
    flatten: {
        params: ['array', 'depth'],
        signature: 'flatten(array[, depth])',
        doc: 'Flattens nested arrays. Without `depth` every level is flattened.',
        example: 'flatten([1, [2, [3, 4]]]);     // [1, 2, 3, 4]\nflatten([1, [2, [3, 4]]], 1);  // [1, 2, [3, 4]]'
    },
    clone: {
        params: ['value'],
        doc: 'Returns a deep copy of an array or object.',
        example: 'let copy = clone(original);'
    },
    isArray: {
        params: ['value'],
        doc: 'Returns `true` when the value is an array.',
        example: "isArray([1, 2]);  // true\nisArray('a');     // false"
    },
    isNumeric: {
        params: ['value'],
        doc: 'Returns `true` when the value is a number or a numeric string.',
        example: "isNumeric('42');     // true\nisNumeric('hello');  // false"
    },
    foreach: {
        params: ['collection', 'callback'],
        doc: 'Calls `callback(value, index, array)` for each array element, or `callback(value, key)` for each object property.',
        example: "foreach(nums, fun(val, idx) { print(idx + ': ' + val); });"
    },
    regex: {
        params: ['pattern', 'ignoreCase', 'multiline', 'dotAll'],
        signature: 'regex([pattern[, ignoreCase[, multiline[, dotAll]]]])',
        doc: 'Creates a regular expression engine. Write the pattern in a backtick string so backslashes are kept as typed.\n\nMethods: `test`, `exec`, `execAll`, `execAt`, `replace`, `split`, `escape`, `init`, `getPattern`/`setPattern`, `getIgnoreCase`/`setIgnoreCase`, `getMultiline`/`setMultiline`, `getDotAll`/`setDotAll`, `getMaxMatchSteps`/`setMaxMatchSteps`.',
        example: "let re = regex(`(\\d+)-(\\d+)`);\nre.exec('Phone: 555-1234');  // ['555-1234', '555', '1234']"
    },
    cwd: {
        params: [],
        doc: 'Returns the current working directory used to resolve relative module paths.',
        example: 'let dir = cwd();'
    },
    scwd: {
        params: ['path'],
        doc: 'Sets the working directory used to resolve relative `import` paths.',
        example: "scwd(wd);\nimport { add } from './math.vas';"
    }
};

const MATH_MEMBERS = {
    PI: { constant: true, doc: 'π, the ratio of a circle\'s circumference to its diameter (3.14159...).' },
    E: { constant: true, doc: 'Euler\'s number, the base of natural logarithms (2.71828...).' },
    abs: { params: ['x'], doc: 'Absolute value of `x`.' },
    acos: { params: ['x'], doc: 'Arccosine of `x`, in radians.' },
    acosh: { params: ['x'], doc: 'Hyperbolic arccosine of `x`.' },
    asin: { params: ['x'], doc: 'Arcsine of `x`, in radians.' },
    asinh: { params: ['x'], doc: 'Hyperbolic arcsine of `x`.' },
    atan: { params: ['x'], doc: 'Arctangent of `x`, in radians.' },
    atan2: { params: ['y', 'x'], doc: 'Angle, in radians, from the X axis to the point `(x, y)`.' },
    atanh: { params: ['x'], doc: 'Hyperbolic arctangent of `x`.' },
    cbrt: { params: ['x'], doc: 'Cube root of `x`.' },
    ceil: { params: ['x'], doc: 'Smallest integer greater than or equal to `x`.' },
    cos: { params: ['x'], doc: 'Cosine of `x` (radians).' },
    cosh: { params: ['x'], doc: 'Hyperbolic cosine of `x`.' },
    exp: { params: ['x'], doc: '`E` raised to the power `x`.' },
    expm1: { params: ['x'], doc: '`exp(x) - 1`.' },
    floor: { params: ['x'], doc: 'Largest integer less than or equal to `x`.' },
    hypot: { params: ['...values'], doc: 'Square root of the sum of the squares of the arguments.' },
    log: { params: ['x'], doc: 'Natural logarithm of `x`. Returns `\'NaN\'` when `x <= 0`.' },
    log10: { params: ['x'], doc: 'Base-10 logarithm of `x`. Returns `\'NaN\'` when `x <= 0`.' },
    log1p: { params: ['x'], doc: 'Natural logarithm of `1 + x`.' },
    log2: { params: ['x'], doc: 'Base-2 logarithm of `x`. Returns `\'NaN\'` when `x <= 0`.' },
    max: { params: ['...values'], doc: 'Largest of the arguments.' },
    min: { params: ['...values'], doc: 'Smallest of the arguments.' },
    pow: { params: ['base', 'exponent'], doc: '`base` raised to `exponent` (same as `base ^ exponent`).' },
    round: { params: ['x'], doc: 'Rounds `x` to the nearest integer with VBA `Round`: halves go to the even integer (`Math.round(2.5)` is `2`).' },
    sign: { params: ['x'], doc: 'Sign of `x`: `-1`, `0` or `1`.' },
    sin: { params: ['x'], doc: 'Sine of `x` (radians).' },
    sinh: { params: ['x'], doc: 'Hyperbolic sine of `x`.' },
    sqrt: { params: ['x'], doc: 'Square root of `x`.' },
    tan: { params: ['x'], doc: 'Tangent of `x` (radians).' },
    tanh: { params: ['x'], doc: 'Hyperbolic tangent of `x`.' }
};

const CB = 'fun(value, index, array)';
const METHODS = {
    array: {
        length: { property: true, doc: 'Number of elements.' },
        map: { params: [CB], doc: 'Returns a new array with the callback result for each element.' },
        filter: { params: [CB], doc: 'Returns a new array with the elements for which the callback returns a truthy value.' },
        reduce: { params: ['fun(acc, value, index, array)', 'initial'], doc: 'Reduces the array to one value. Without `initial` the first element is used.' },
        forEach: { params: [CB], doc: 'Calls the callback for each element.' },
        every: { params: [CB], doc: '`true` when the callback returns a truthy value for every element.' },
        some: { params: [CB], doc: '`true` when the callback returns a truthy value for at least one element.' },
        find: { params: [CB], doc: 'First element for which the callback returns a truthy value.' },
        findIndex: { params: [CB], doc: 'Index (1-based) of the first matching element, or `-1`.' },
        findLast: { params: [CB], doc: 'Last element for which the callback returns a truthy value.' },
        findLastIndex: { params: [CB], doc: 'Index (1-based) of the last matching element, or `-1`.' },
        indexOf: { params: ['value'], doc: 'Index (1-based) of the first occurrence of `value`, or `-1`.' },
        lastIndexOf: { params: ['value'], doc: 'Index (1-based) of the last occurrence of `value`, or `-1`.' },
        includes: { params: ['value'], doc: '`true` when the array contains `value`.' },
        push: { params: ['...items'], doc: 'Appends items to the end of the array (mutates).' },
        pop: { params: [], doc: 'Removes and returns the last element (mutates).' },
        shift: { params: [], doc: 'Removes and returns the first element (mutates).' },
        unshift: { params: ['...items'], doc: 'Inserts items at the start of the array (mutates).' },
        splice: { params: ['start', 'deleteCount', '...items'], doc: 'Removes `deleteCount` elements at `start` (1-based), inserts `items` there and returns the removed elements (mutates).' },
        toSpliced: { params: ['start', 'deleteCount', '...items'], doc: 'Like `splice`, but returns a new array and leaves the original unchanged.' },
        delete: { params: ['index'], doc: 'Removes the element at `index` (1-based) (mutates).' },
        slice: { params: ['start', 'end'], doc: 'Returns the elements from `start` up to, but not including, `end` (1-based; negative values count from the end).' },
        concat: { params: ['...arrays'], doc: 'Returns a new array with the elements of this array followed by those of the arguments.' },
        join: { params: ['separator'], doc: 'Joins the elements into a string (default separator `\', \'`).' },
        toString: { params: [], doc: 'Joins the elements with `\', \'`.' },
        reverse: { params: [], doc: 'Reverses the array in place.' },
        toReversed: { params: [], doc: 'Returns a reversed copy.' },
        sort: { params: ['compareFn'], doc: 'Sorts in place. `compareFn(a, b)` returns a negative number, `0` or a positive number.' },
        toSorted: { params: ['compareFn'], doc: 'Returns a sorted copy.' },
        unique: { params: [], doc: 'Returns a new array without duplicate values.' },
        at: { params: ['index'], doc: 'Element at `index` (1-based); negative values count from the end (`-1` is the last element).' },
        with: { params: ['index', 'value'], doc: 'Returns a copy with the element at `index` (1-based) replaced by `value`.' },
        copyWithin: { params: ['target', 'start', 'end'], doc: 'Copies a sequence of elements within the array (mutates).' },
        entries: { params: [], doc: 'Returns `[index, value]` pairs.' },
        from: { params: ['iterable', 'mapFn'], doc: 'Creates an array from a string or array, optionally mapping each element. Call it on an array: `[].from(\'abc\')`.' },
        of: { params: ['...items'], doc: 'Creates an array from the arguments. Call it on an array: `[].of(1, 2, 3)`.' }
    },
    string: {
        length: { property: true, doc: 'Number of characters.' },
        at: { params: ['index'], doc: 'Character at `index` (0-based); negative values count from the end.' },
        charAt: { params: ['index'], doc: 'Character at `index` (0-based).' },
        charCodeAt: { params: ['index'], doc: 'Character code at `index` (0-based).' },
        concat: { params: ['...strings'], doc: 'Returns the string followed by the arguments.' },
        endsWith: { params: ['search'], doc: '`true` when the string ends with `search`.' },
        startsWith: { params: ['search'], doc: '`true` when the string starts with `search`.' },
        includes: { params: ['search'], doc: '`true` when the string contains `search`.' },
        indexOf: { params: ['search'], doc: 'Position (0-based) of the first occurrence of `search`, or `-1`.' },
        lastIndexOf: { params: ['search'], doc: 'Position (0-based) of the last occurrence of `search`, or `-1`.' },
        fromCharCode: { params: ['code'], doc: 'Returns the character for a character code. Call it on a string: `\'\'.fromCharCode(72)`.' },
        localeCompare: { params: ['other'], doc: 'Returns `-1`, `0` or `1` when the string sorts before, equal to or after `other`.' },
        match: { params: ['pattern'], doc: 'Matches a string or a regex string such as `` `/\\d+/g` ``. With `g`, returns every match; otherwise the first match and its groups.' },
        matchAll: { params: ['pattern'], doc: 'Returns an array with every match (and its groups) of a regex string such as `` `/(\\w)(\\d)/g` ``.' },
        replace: { params: ['pattern', 'replacement'], doc: 'Replaces the first match, or every match of a regex string with the `g` flag. `replacement` may be a string (`$1`, `$<name>`) or `fun(match)`.' },
        replaceAll: { params: ['pattern', 'replacement'], doc: 'Replaces every match. A regex string must have the `g` flag (error 103 otherwise).' },
        split: { params: ['separator', 'limit'], doc: 'Splits the string by a string or regex string, keeping at most `limit` parts.' },
        slice: { params: ['start', 'end'], doc: 'Characters from `start` up to, but not including, `end` (0-based; negative values count from the end).' },
        substring: { params: ['start', 'end'], doc: 'Characters from `start` up to, but not including, `end` (0-based).' },
        padStart: { params: ['length', 'padString'], doc: 'Pads the start of the string to `length` characters.' },
        padEnd: { params: ['length', 'padString'], doc: 'Pads the end of the string to `length` characters.' },
        repeat: { params: ['count'], doc: 'Returns the string repeated `count` times.' },
        toLowerCase: { params: [], doc: 'Lower-case copy.' },
        toUpperCase: { params: [], doc: 'Upper-case copy.' },
        trim: { params: [], doc: 'Removes whitespace from both ends.' },
        trimStart: { params: [], doc: 'Removes whitespace from the start.' },
        trimEnd: { params: [], doc: 'Removes whitespace from the end.' },
        toString: { params: [], doc: 'The string itself.' },
        valueOf: { params: [], doc: 'The string itself.' }
    },
    object: {
        keys: { params: [], doc: 'Array of property names.' },
        values: { params: [], doc: 'Array of property values.' },
        entries: { params: [], doc: 'Array of `[key, value]` pairs.' },
        size: { params: [], doc: 'Number of properties.' },
        length: { params: [], doc: 'Number of properties (alias of `size()`).' },
        hasKey: { params: ['key'], doc: '`true` when the property exists.' },
        has: { params: ['key'], doc: '`true` when the property exists (alias of `hasKey`).' },
        get: { params: ['key', 'default'], doc: 'Property value, or `default` (empty when omitted) when the property is missing.' },
        set: { params: ['key', 'value'], doc: 'Sets a property and returns the object, so calls can be chained.' },
        delete: { params: ['key'], doc: 'Removes a property. Missing properties are ignored.' },
        remove: { params: ['key'], doc: 'Removes a property (alias of `delete`).' },
        clear: { params: [], doc: 'Removes every property.' },
        isEmpty: { params: [], doc: '`true` when the object has no properties.' },
        clone: { params: [], doc: 'Deep copy of the object.' },
        merge: { params: ['other'], doc: 'Copies the properties of `other` into this object, overwriting existing ones (mutates).' },
        forEach: { params: ['fun(value, key)'], doc: 'Calls the callback for each property.' },
        map: { params: ['fun(value, key)'], doc: 'Returns a new object with the same keys and the callback results as values.' },
        filter: { params: ['fun(value, key)'], doc: 'Returns a new object with the properties for which the callback returns a truthy value.' },
        some: { params: ['fun(value, key)'], doc: '`true` when the callback returns a truthy value for at least one property.' },
        every: { params: ['fun(value, key)'], doc: '`true` when the callback returns a truthy value for every property.' }
    },
    regex: {
        test: { params: ['subject'], doc: '`true` when the pattern matches `subject`.' },
        exec: { params: ['subject'], doc: 'First match: an array with the full match followed by the capture groups.' },
        execAll: { params: ['subject'], doc: 'Every match, each as an array of the full match and its groups.' },
        execAt: { params: ['subject', 'startPos'], doc: 'Match starting the search at `startPos` (1-based).' },
        replace: { params: ['subject', 'replacement'], doc: 'Replaces every match in `subject`. `replacement` may use `$1`..`$n` and `$<name>`.' },
        split: { params: ['subject'], doc: 'Splits `subject` at every match.' },
        escape: { params: ['text'], doc: 'Escapes regex metacharacters so `text` matches literally.' },
        init: { params: ['pattern', 'ignoreCase', 'multiline', 'dotAll'], doc: 'Compiles a new pattern. Returns `false` when the pattern is invalid.' },
        getPattern: { params: [], doc: 'Current pattern.' },
        setPattern: { params: ['pattern'], doc: 'Compiles a new pattern, keeping the flags.' },
        getIgnoreCase: { params: [], doc: 'Current case-insensitive flag.' },
        setIgnoreCase: { params: ['value'], doc: 'Sets the case-insensitive flag.' },
        getMultiline: { params: [], doc: 'Current multiline flag (`^`/`$` match at line breaks).' },
        setMultiline: { params: ['value'], doc: 'Sets the multiline flag.' },
        getDotAll: { params: [], doc: 'Current dotAll flag (`.` matches line breaks).' },
        setDotAll: { params: ['value'], doc: 'Sets the dotAll flag.' },
        getMaxMatchSteps: { params: [], doc: 'Step budget of one match attempt.' },
        setMaxMatchSteps: { params: ['steps'], doc: 'Sets the step budget of one match attempt.' }
    }
};
const TYPE_LABELS = { array: 'Array', string: 'String', object: 'Object', regex: 'Regex' };

// Office COM object types that prototype methods can extend
const COM_TYPES = {
    Excel: ['Application', 'Workbook', 'Workbooks', 'Worksheet', 'Worksheets', 'Sheets', 'Range', 'ListObject', 'ListObjects',
        'ListRow', 'ListRows', 'ListColumn', 'ListColumns', 'Chart', 'Charts', 'ChartObject', 'ChartObjects', 'Series',
        'SeriesCollection', 'PivotTable', 'PivotTables', 'PivotField', 'PivotFields', 'PivotCache', 'Shape', 'Shapes',
        'Font', 'Interior', 'Border', 'Borders', 'Name', 'Names', 'Comment', 'Comments', 'Hyperlink', 'Hyperlinks',
        'PageSetup', 'AutoFilter', 'Sort', 'Window', 'Windows'],
    Word: ['Document', 'Documents', 'Selection', 'Paragraph', 'Paragraphs', 'Table', 'Tables', 'Row', 'Rows', 'Column',
        'Columns', 'Cell', 'Cells', 'Section', 'Sections', 'HeaderFooter', 'Field', 'Fields', 'Bookmark', 'Bookmarks',
        'Style', 'Styles', 'Template', 'Find', 'InlineShape', 'InlineShapes', 'FormField', 'FormFields', 'ContentControl',
        'ContentControls', 'Revision', 'Revisions', 'Footnote', 'Footnotes'],
    PowerPoint: ['Presentation', 'Presentations', 'Slide', 'Slides', 'SlideRange', 'Master', 'TextFrame', 'TextRange',
        'PlaceholderFormat', 'SlideShowSettings', 'SlideShowWindow', 'SlideShowView', 'CustomLayout', 'CustomLayouts'],
    Access: ['DoCmd', 'Database', 'Recordset', 'TableDef', 'TableDefs', 'QueryDef', 'QueryDefs', 'Index', 'Indexes',
        'Relation', 'Relations', 'Form', 'Forms', 'Report', 'Reports', 'Control', 'Controls', 'Module', 'Modules',
        'Property', 'Properties', 'Workspace', 'Workspaces'],
    Outlook: ['NameSpace', 'MAPIFolder', 'Folder', 'Folders', 'Items', 'MailItem', 'AppointmentItem', 'ContactItem',
        'TaskItem', 'JournalItem', 'Recipient', 'Recipients', 'Attachment', 'Attachments', 'Account', 'Accounts',
        'Store', 'Stores', 'Inspector', 'Explorer', 'AddressEntry', 'AddressList', 'PropertyAccessor'],
    Office: ['CommandBar', 'CommandBars', 'FileDialog', 'COMAddIn', 'COMAddIns', 'DocumentProperty', 'DocumentProperties',
        'Collection', 'Dictionary']
};
const COM_TYPE_APPS = Object.create(null);
for (const [app, types] of Object.entries(COM_TYPES)) {
    for (const t of types) (COM_TYPE_APPS[t] = COM_TYPE_APPS[t] || []).push(app);
}

const KEYWORD_DOCS = {
    'fun':         '```asf\nfun name(params) { ... };\nfun(params) { ... }\n```\n---\nDeclares a named function, or an anonymous function (closure) when used as an expression. A parameter written `...name` collects the remaining arguments.\n\n**Examples:**\n```asf\nfun greet(name) { print(\'Hello \' + name); };\nlet double = fun(x) { return x * 2; };\nfun sum(...nums) { return nums.reduce(fun(a, b) { return a + b; }, 0); };\n```',
    'class':       '```asf\nclass Name [extends Parent] { ... };\n```\n---\nDeclares a class. The body can contain `field` declarations, a `constructor`, methods and `static` methods.\n\n**Example:**\n```asf\nclass Dog extends Animal {\n    field breed;\n    constructor(name, breed) { super(name); this.breed = breed; }\n    bark() { print(\'Woof!\'); }\n};\n```',
    'field':       '```asf\nfield name [= default], ...;\n```\n---\nDeclares instance fields inside a class body, with optional defaults. Parent fields are initialized first, then the class fields, then the constructor runs.\n\n**Example:**\n```asf\nfield x = 0, y = 0, label;\n```',
    'let':         '```asf\nlet name [= value];\n```\n---\nAssigns a variable. `let` is optional in ASF: `let x = 1;` and `x = 1;` are the same assignment, and functions share the variables of their enclosing scope.',
    'constructor': '```asf\nconstructor(params) { ... }\n```\n---\nClass constructor, run by `new`. Call `super(args)` to run the parent constructor.',
    'static':      '```asf\nstatic methodName(params) { ... }\n```\n---\nMethod of the class itself, called as `ClassName.methodName()`.',
    'extends':     '*(keyword)* — Names the parent class.\n```asf\nclass Dog extends Animal { ... };\n```',
    'if':          '```asf\nif (expr) { ... }\n[elseif (expr) { ... }]*\n[else { ... }];\n```\n---\nConditional branching with `elseif` chains and `else`. End the whole statement with `;`.',
    'elseif':      '*(keyword)* — Alternative branch in an `if` chain (ASF writes it as one word).\n```asf\nif (a) { ... } elseif (b) { ... };\n```',
    'else':        '*(keyword)* — Fallback branch when no `if`/`elseif` matched.\n```asf\nif (a) { ... } else { ... };\n```',
    'for':         '```asf\nfor (let i = 1, i <= n, i += 1) { ... };  // C-style: clauses separated by \',\'\nfor (let key in object) { ... };         // keys or indices\nfor (let item of array) { ... };         // values\n```\n---\nLoop in three forms. Arrays and `for-in` indices are 1-based by default.',
    'while':       '```asf\nwhile (condition) { ... };\n```\n---\nRepeats the block while the condition is truthy.',
    'switch':      '```asf\nswitch (expr) {\n    case value { ... }\n    default { ... }\n};\n```\n---\nMulti-branch conditional. Cases do not fall through, so no `break` is needed.',
    'case':        '*(keyword)* — Branch of a `switch` statement.\n```asf\nswitch (x) { case 1 { print(\'one\'); } };\n```',
    'default':     '*(keyword)* — Fallback branch of a `switch`, or the default export in `export default value;`.',
    'try':         '```asf\ntry { ... } catch (error) { ... };\ntry { ... } catch { ... };\n```\n---\nError handling. `catch` can bind the error to a variable.',
    'catch':       '*(keyword)* — Handles errors raised in the `try` block.\n```asf\ntry { riskyOp(); } catch (e) { print(e); };\n```',
    'return':      '```asf\nreturn [expr];\n```\n---\nReturns a value from a function. At the top level of a script, the value is the result of `engine.Run`/`engine.Execute`.',
    'break':       '*(keyword)* — Exits the innermost loop.',
    'continue':    '*(keyword)* — Skips to the next iteration of the innermost loop.',
    'in':          '*(keyword)* — `for (let key in collection)` iterates over the keys of an object or the indices of an array or string.',
    'of':          '*(keyword)* — `for (let item of collection)` iterates over the values of an array, object or string.',
    'import':      '```asf\nimport name from \'./module.vas\';\nimport { a, b as c } from \'./module.vas\';\nimport * as mod from \'./module.vas\';\nimport def, { a } from \'./module.vas\';\nimport \'./prototypes.vas\';\n```\n---\nImports from another `.vas` module (the extension is optional). Relative paths resolve against `cwd()`, set with `scwd(path)`. Modules run once and are cached. Importing a module activates every prototype it exports.',
    'export':      '```asf\nexport { name [as alias], ... };\nexport default expr;\nexport fun name(params) { ... };\nexport prototype.COM.Type method(params) { ... };\n```\n---\nExports from the current module. An exported prototype is exported as `Type_method`.',
    'from':        '*(keyword)* — Names the module in an `import` statement.',
    'as':          '*(keyword)* — Renames an imported or exported name, or names a namespace import (`import * as mod`).',
    'new':         '```asf\nnew ClassName(args)\n```\n---\nCreates a class instance.',
    'typeof':      '```asf\ntypeof expr\n```\n---\nReturns the type name: `\'number\'`, `\'string\'`, `\'boolean\'`, `\'null\'`, `\'undefined\'`, `\'array\'`, `\'object\'`, `\'function\'`, or `\'object: <TypeName>\'` for VBA/COM objects.',
    'this':        '*(keyword)* — The current class instance, or the COM object inside a `prototype.COM` method.',
    'super':       '*(keyword)* — `super(args)` runs the parent class constructor.',
    'print':       '```asf\nprint(value, ...);\n```\n---\nPrints values to the output.',
    'true':        '*(constant)* — Boolean true.',
    'false':       '*(constant)* — Boolean false.',
    'null':        '*(constant)* — Intentional absence of a value. `??` falls back on `null`.',
    'undefined':   '*(constant)* — The empty value (VBA `Empty`), also the value of unassigned variables. `??` falls back on it.',
    'prototype':   '```asf\nprototype.COM.Type methodName(params) { ... };\n```\n---\nAdds a method to every Office COM object of type `Type`. Inside the body, `this` is the COM object. Requires `engine.AppAccess = True`.',
    'COM':         '*(keyword)* — Part of `prototype.COM.Type methodName(...)`, the COM prototype declaration.',
    'option':      '```asf\noption base 0;\noption base 1;\n```\n---\n*(experimental)* Sets the array index base for the script. ASF arrays are 1-based by default.'
};

// Lookups use words from the document: without a prototype, 'constructor' or 'toString'
// only match the entries defined above
for (const table of [BUILTIN_FUNCTIONS, MATH_MEMBERS, KEYWORD_DOCS, TYPE_LABELS, ...Object.values(METHODS)]) {
    Object.setPrototypeOf(table, null);
}

const RESERVED = new Set([
    'if','elseif','else','for','in','of','while','switch','case','default',
    'break','continue','return','try','catch','fun','class','let','field',
    'constructor','static','extends','import','export','from','as',
    'new','typeof','this','super','print','true','false','null','undefined','prototype'
]);

const STMT_STARTERS = new Set([
    'if','for','while','switch','try','return','break','continue',
    'let','fun','class','field','import','export','print','constructor','static'
]);

const BLOCK_KEYWORDS = new Set(['if','elseif','for','while','switch','catch','return','print','typeof','super','fun','function','case']);

const IDENT = '[A-Za-z_][A-Za-z0-9_]*';

// ═════════════════════════════════════════════════════════════════
//  ACTIVATION
// ═════════════════════════════════════════════════════════════════

function activate(context) {
    const diagCollection = vscode.languages.createDiagnosticCollection('asf');
    context.subscriptions.push(diagCollection);

    const timers = new Map();
    const versions = new Map();

    function triggerValidation(doc, delay) {
        if (!doc || doc.languageId !== 'asf') return;
        const key = doc.uri.toString();
        clearTimeout(timers.get(key));
        timers.set(key, setTimeout(() => {
            timers.delete(key);
            const version = (versions.get(key) || 0) + 1;
            versions.set(key, version);
            validateDocument(doc, diagCollection, () => versions.get(key) === version);
        }, delay));
    }

    try {
        for (const doc of vscode.workspace.textDocuments) triggerValidation(doc, 0);
    } catch (e) {
        // extension host not fully ready yet — ignore
    }

    const selector = { language: 'asf' };
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => triggerValidation(doc, 0)),
        vscode.workspace.onDidChangeTextDocument(e => triggerValidation(e.document, 300)),
        vscode.workspace.onDidSaveTextDocument(doc => {
            // A saved module can change the exports other open files import
            for (const other of vscode.workspace.textDocuments) triggerValidation(other, other === doc ? 0 : 300);
        }),
        vscode.workspace.onDidCloseTextDocument(doc => diagCollection.delete(doc.uri)),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('asf')) {
                for (const doc of vscode.workspace.textDocuments) triggerValidation(doc, 0);
            }
        }),
        vscode.languages.registerHoverProvider(selector, {
            provideHover: (document, position) => guard('hover', () => provideHover(document, position, diagCollection))
        }),
        vscode.languages.registerDocumentSymbolProvider(selector, {
            provideDocumentSymbols: (document) => guard('outline', () => buildOutlineSymbols(document), [])
        }),
        vscode.languages.registerCompletionItemProvider(selector, {
            provideCompletionItems: (document, position) => guard('completion', () => provideCompletions(document, position), [])
        }, '.', '\'', '"', '/'),
        vscode.languages.registerSignatureHelpProvider(selector, {
            provideSignatureHelp: (document, position) => guard('signature help', () => provideSignatureHelp(document, position))
        }, '(', ','),
        vscode.languages.registerDefinitionProvider(selector, {
            provideDefinition: (document, position) => guard('definition', () => provideDefinition(document, position))
        }),
        vscode.languages.registerDocumentLinkProvider(selector, {
            provideDocumentLinks: (document) => guard('links', () => provideDocumentLinks(document), [])
        }),
        vscode.languages.registerFoldingRangeProvider(selector, {
            provideFoldingRanges: (document) => guard('folding', () => provideFoldingRanges(document), [])
        })
    );
}

function guard(what, fn, fallback) {
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            return result.catch(e => { console.error(`ASF ${what} error:`, e); return fallback; });
        }
        return result;
    } catch (e) {
        console.error(`ASF ${what} error:`, e);
        return fallback;
    }
}

function setting(name, fallback) {
    try {
        return vscode.workspace.getConfiguration('asf').get(name, fallback);
    } catch (e) {
        return fallback;
    }
}

// ═════════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═════════════════════════════════════════════════════════════════

function isIdentifier(s) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) && !RESERVED.has(s);
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function md(text) {
    const m = new vscode.MarkdownString(text);
    m.isTrusted = true;
    return m;
}

function lineStartsOf(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
    return starts;
}

function positionAtOffset(lineStarts, offset) {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return new vscode.Position(lo, offset - lineStarts[lo]);
}

function signatureOf(name, entry) {
    if (entry.signature) return entry.signature;
    if (entry.property || entry.constant) return name;
    return `${name}(${(entry.params || []).join(', ')})`;
}

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

// ═════════════════════════════════════════════════════════════════
//  LEXICAL SCAN
//  Blanks strings and comments (keeping newlines for position mapping),
//  records their spans and reports lexical problems. ASF's tokenizer
//  (ASF_Parser.Tokenize) first replaces every " with ', so quotes and
//  escapes follow the rules below.
// ═════════════════════════════════════════════════════════════════

function scanSource(text) {
    const c = text.split('');
    const len = c.length;
    const spans = [];
    const problems = [];
    let i = 0;
    const blank = (a, b) => { for (let j = a; j < b && j < len; j++) if (c[j] !== '\n') c[j] = ' '; };
    const problem = (start, end, code, message, severity) => problems.push({ start, end, code, message, severity });

    while (i < len) {
        const ch = c[i];
        if (ch === '#' || (ch === '/' && c[i+1] === '/')) {
            const s = i; while (i < len && c[i] !== '\n' && c[i] !== '\r') i++;
            spans.push({ kind: 'comment', start: s, end: i }); blank(s, i); continue;
        }
        if (ch === '/' && c[i+1] === '*') {
            const s = i; i += 2;
            while (i < len && !(c[i] === '*' && c[i+1] === '/')) i++;
            if (i >= len) problem(s, s + 2, 'unterminated-comment', "Unterminated block comment: '/*' has no closing '*/'.", 'error');
            i = Math.min(len, i + 2);
            spans.push({ kind: 'blockComment', start: s, end: i }); blank(s, i); continue;
        }
        if (ch === "'" || ch === '"') {
            const s = i; i++;
            let pitfall = null;
            while (i < len && c[i] !== ch) {
                if (c[i] === '\\' && i + 1 < len) {
                    const nx = c[i+1];
                    if (nx === '"' && !pitfall) {
                        pitfall = { start: i, end: i + 2, code: 'double-quote-converted', severity: 'info',
                            message: 'ASF turns every \'"\' into "\'" before reading the script, so this string contains \' instead of ". Use \'\'.fromCharCode(34) for a double quote.' };
                    } else if (!"'\\nrt\"\n".includes(nx)) {
                        problem(i, i + 2, 'dropped-escape', `ASF drops the backslash in '\\${nx}': this string contains '${nx}'. Write '\\\\${nx}', or use a backtick string, which keeps backslashes.`, 'warning');
                    }
                    i += 2; continue;
                }
                const other = ch === "'" ? '"' : "'";
                if (c[i] === other && (!pitfall || pitfall.code === 'double-quote-converted')) {
                    pitfall = { start: i, end: i + 1, code: 'quote-ends-string', severity: 'warning',
                        message: ch === "'"
                            ? 'ASF turns every \'"\' into "\'" before reading the script, so this quote ends the string. Escape it as \\" (it becomes \'), or use a backtick string.'
                            : 'ASF turns the \'"\' delimiters of this string into "\'", so this apostrophe ends the string. Escape it as \\\'.' };
                }
                i++;
            }
            if (i >= len) {
                problem(s, s + 1, 'unterminated-string', 'Unterminated string literal.', 'error');
            } else {
                i++;
            }
            if (pitfall) problem(pitfall.start, pitfall.end, pitfall.code, pitfall.message, pitfall.severity);
            spans.push({ kind: 'string', quote: ch, start: s, end: i, value: text.substring(s + 1, Math.max(s + 1, i - 1)) });
            blank(s, i); continue;
        }
        if (ch === '`') {
            const s = i; i++;
            const subs = [];
            let closed = false;
            while (i < len) {
                if (c[i] === '\\') { i += 2; continue; }
                if (c[i] === '`') { i++; closed = true; break; }
                if (c[i] === '$' && c[i+1] === '{') {
                    const subStart = i + 2;
                    i += 2; let d = 1;
                    while (i < len && d > 0) {
                        if (c[i] === '{') d++;
                        else if (c[i] === '}') d--;
                        else if (c[i] === "'" || c[i] === '"' || c[i] === '`') {
                            // skip nested string literals inside the substitution
                            const q = c[i]; i++;
                            while (i < len && c[i] !== q) { if (c[i] === '\\') i++; i++; }
                        }
                        if (d > 0) i++;
                    }
                    subs.push({ start: subStart, end: Math.min(i, len) });
                    if (i < len) i++;
                    continue;
                }
                i++;
            }
            if (!closed) problem(s, s + 1, 'unterminated-template', 'Unterminated template literal: missing closing backtick.', 'error');
            spans.push({ kind: 'template', start: s, end: i, value: text.substring(s + 1, closed ? i - 1 : i), subs });
            blank(s, i);
            // ${...} holds code: keep it, scanned on its own for nested strings and comments
            for (const sub of subs) {
                const inner = scanSource(text.substring(sub.start, sub.end));
                for (let k = 0; k < inner.stripped.length; k++) c[sub.start + k] = inner.stripped[k];
                for (const sp of inner.spans) spans.push(shiftSpan(sp, sub.start));
                for (const p of inner.problems) problems.push(Object.assign({}, p, { start: p.start + sub.start, end: p.end + sub.start }));
            }
            continue;
        }
        if (ch === '@' && c[i+1] === '(') {
            const s = i; i += 2; let d = 1;
            while (i < len && d > 0) { if (c[i]==='(') d++; else if (c[i]===')') d--; if (d>0) i++; }
            if (i >= len) problem(s, s + 2, 'unterminated-vba-expression', "Unterminated VBA expression: '@(' has no matching ')'.", 'error');
            else i++;
            spans.push({ kind: 'vba', start: s, end: i }); blank(s, i); continue;
        }
        i++;
    }
    return { stripped: c.join(''), spans, problems };
}

function shiftSpan(span, by) {
    const out = Object.assign({}, span, { start: span.start + by, end: span.end + by });
    if (span.subs) out.subs = span.subs.map(s => ({ start: s.start + by, end: s.end + by }));
    return out;
}

// Innermost string/comment span containing an offset. A line comment also
// contains the position at its end, where the cursor sits while typing it.
function spanAt(spans, offset) {
    let best = null;
    for (const s of spans) {
        const inclusiveEnd = s.kind === 'comment';
        if (offset > s.start && (offset < s.end || (inclusiveEnd && offset === s.end))) {
            if (!best || s.end - s.start < best.end - best.start) best = s;
        }
    }
    return best;
}

// True when the offset is in code: outside strings and comments, or inside a ${...} substitution
function isCodeAt(spans, offset) {
    const s = spanAt(spans, offset);
    return !s || (s.kind === 'template' && s.subs.some(x => offset >= x.start && offset <= x.end));
}

// ═════════════════════════════════════════════════════════════════
//  TOKENIZER (for the statement validator)
// ═════════════════════════════════════════════════════════════════

const TOKEN_RE = /\$\d+|\b[a-zA-Z_][a-zA-Z0-9_]*\b|\d+(?:\.\d+)?|\.\.\.|===|!==|=>|\?\?|<<=|>>=|\|\||&&|<<|>>|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|\^=|&=|\|=|[{}()\[\];,.:?=+\-*/%!<>|&^~@]/g;

function tokenize(stripped, document) {
    const tokens = [];
    const re = new RegExp(TOKEN_RE.source, 'g');
    let m;
    while ((m = re.exec(stripped)) !== null) {
        const pos = document.positionAt(m.index);
        tokens.push({ value: m[0], index: m.index, line: pos.line, char: pos.character, length: m[0].length });
    }
    return tokens;
}

// ═════════════════════════════════════════════════════════════════
//  DIAGNOSTICS
// ═════════════════════════════════════════════════════════════════

const SEVERITY = {
    error: () => vscode.DiagnosticSeverity.Error,
    warning: () => vscode.DiagnosticSeverity.Warning,
    info: () => vscode.DiagnosticSeverity.Information
};

function makeDiagnostic(document, start, end, message, code, severity) {
    const d = new vscode.Diagnostic(
        new vscode.Range(document.positionAt(start), document.positionAt(end)),
        message, SEVERITY[severity || 'error']());
    d.source = 'ASF';
    d.code = code;
    return d;
}

function validateDocument(document, diagCollection, isCurrent) {
    if (!setting('diagnostics.enable', true)) { diagCollection.set(document.uri, []); return; }
    let diagnostics = [];
    let text;
    try {
        text = document.getText();
        const scan = scanSource(text);
        const pitfalls = setting('diagnostics.stringPitfalls', true);
        for (const p of scan.problems) {
            if (!pitfalls && ['dropped-escape', 'quote-ends-string', 'double-quote-converted'].includes(p.code)) continue;
            diagnostics.push(makeDiagnostic(document, p.start, p.end, p.message, p.code, p.severity));
        }
        for (const s of scan.spans) {
            if (pitfalls && s.kind === 'template' && s.value.includes('"')) {
                const at = s.start + 1 + s.value.indexOf('"');
                diagnostics.push(makeDiagnostic(document, at, at + 1,
                    'ASF turns every \'"\' into "\'" before reading the script, so this template contains \' instead of ". Use \'\'.fromCharCode(34) for a double quote.',
                    'double-quote-converted', 'info'));
            }
        }
        const tokens = tokenize(scan.stripped, document);
        const balanced = checkBrackets(scan.stripped, document, diagnostics);
        checkUnsupportedSyntax(tokens, scan.stripped, document, diagnostics);
        if (balanced && tokens.length > 0) {
            if (setting('diagnostics.missingSemicolons', true)) checkStatements(tokens, diagnostics);
            validateSeparators(tokens, diagnostics);
        }
    } catch (e) {
        console.error('ASF validation error:', e);
    }
    diagCollection.set(document.uri, diagnostics);

    if (text !== undefined && setting('diagnostics.unresolvedImports', true)) {
        checkImports(document, text).then(extra => {
            if (extra.length > 0 && isCurrent()) diagCollection.set(document.uri, diagnostics.concat(extra));
        }).catch(e => console.error('ASF import check error:', e));
    }
}

// ── Bracket balance ─────────────────────────────────────────────
function checkBrackets(stripped, document, diagnostics) {
    const pairs = { ')': '(', ']': '[', '}': '{' };
    const stack = [];
    let ok = true;
    for (let i = 0; i < stripped.length; i++) {
        const ch = stripped[i];
        if (ch === '(' || ch === '[' || ch === '{') stack.push(i);
        else if (ch in pairs) {
            if (stack.length === 0 || stripped[stack[stack.length - 1]] !== pairs[ch]) {
                diagnostics.push(makeDiagnostic(document, i, i + 1, `Unexpected '${ch}': no matching '${pairs[ch]}'.`, 'unbalanced-bracket'));
                ok = false;
                continue;
            }
            stack.pop();
        }
    }
    for (const i of stack) {
        const close = { '(': ')', '[': ']', '{': '}' }[stripped[i]];
        diagnostics.push(makeDiagnostic(document, i, i + 1, `'${stripped[i]}' is never closed: missing '${close}'.`, 'unbalanced-bracket'));
        ok = false;
    }
    return ok;
}

// ── Syntax ASF does not have (common when coming from JavaScript) ──
function checkUnsupportedSyntax(tokens, stripped, document, diagnostics) {
    const len = tokens.length;
    for (let t = 0; t < len; t++) {
        const tok = tokens[t];
        const v = tok.value;
        const next = t + 1 < len ? tokens[t + 1].value : '';
        const prev = t > 0 ? tokens[t - 1].value : ';';
        const atStmtStart = prev === ';' || prev === '{' || prev === '}';
        let message = null, code = 'unsupported-syntax';
        if (v === '===' || v === '!==') {
            message = `ASF has no '${v}' operator. Use '${v.substring(0, 2)}'.`;
        } else if (v === '=>') {
            message = "ASF has no arrow functions. Write 'fun(params) { return ...; }'.";
        } else if ((v === 'const' || v === 'var') && atStmtStart && isIdentifier(next)) {
            message = `ASF has no '${v}' declarations. Use 'let ${next} = ...;' or a plain assignment.`;
        } else if (v === 'function' && (next === '(' || (isIdentifier(next) && t + 2 < len && tokens[t + 2].value === '('))) {
            message = "ASF declares functions with 'fun', not 'function'.";
        } else if (v === 'else' && next === 'if') {
            message = "ASF writes 'else if' as one word: 'elseif'.";
            code = 'else-if';
        } else if (v === 'option' && next === 'base' && atStmtStart) {
            const val = t + 2 < len ? tokens[t + 2].value : '';
            if (val !== '0' && val !== '1') {
                diagnostics.push(makeDiagnostic(document, tok.index, tokens[Math.min(t + 2, len - 1)].index + tokens[Math.min(t + 2, len - 1)].length,
                    "'option base' accepts 0 or 1; other values are ignored.", 'invalid-option-base', 'warning'));
            }
            continue;
        }
        if (message) diagnostics.push(makeDiagnostic(document, tok.index, tok.index + tok.length, message, code, 'error'));
    }
    // Number forms the tokenizer does not read: 1.5e10 is 1.5 followed by the identifier e10
    const numRe = /\b(\d+(?:\.\d+)?[eE][+-]?\d+|0[xX][0-9A-Fa-f]+)\b/g;
    let m;
    while ((m = numRe.exec(stripped)) !== null) {
        const isHex = /^0[xX]/.test(m[1]);
        diagnostics.push(makeDiagnostic(document, m.index, m.index + m[1].length,
            isHex ? `ASF numbers are decimal: '${m[1]}' is read as 0 followed by the identifier '${m[1].substring(1)}'. Write ${parseInt(m[1], 16)}.`
                  : `ASF numbers have no exponent: '${m[1]}' is read as ${m[1].split(/[eE]/)[0]} followed by an identifier. Write the number in full, or use 10 ^ n.`,
            'unsupported-number', 'warning'));
    }
}

// ── Statement terminators: every statement, block statements included, ends with ';' ──
function checkStatements(tokens, diagnostics) {
    const len = tokens.length;
    let i = 0;
    const contextStack = [];

    function ctx() { return contextStack.length > 0 ? contextStack[contextStack.length - 1] : 'top'; }
    function at(n) { return n >= 0 && n < len ? tokens[n] : null; }

    function skipGroup(s, open, close) {
        if (s >= len || tokens[s].value !== open) return s;
        let j = s + 1, d = 1;
        while (j < len && d > 0) { if (tokens[j].value === open) d++; else if (tokens[j].value === close) d--; j++; }
        return j;
    }
    const skipParens = s => skipGroup(s, '(', ')');
    const skipBraces = s => skipGroup(s, '{', '}');
    const skipBrackets = s => skipGroup(s, '[', ']');

    const CONTINUES = new Set(['.', '(', '[', ')', ']', ',', '+', '-', '*', '/', '%', '^', '&', '|', '&&', '||', '??',
        '==', '!=', '<', '>', '<=', '>=', '<<', '>>', '?', ':']);

    function scanExpr(s) {
        let j = s, pD = 0, bkD = 0, brD = 0;
        while (j < len) {
            const v = tokens[j].value;
            if (v==='(') { pD++; j++; continue; }
            if (v===')') { pD--; if (pD<0) return j; j++; continue; }
            if (v==='[') { bkD++; j++; continue; }
            if (v===']') { bkD--; if (bkD<0) return j; j++; continue; }
            if (v==='{') { brD++; j++; continue; }
            if (v==='}') {
                brD--; if (brD<0) return j; j++;
                // a closed block ends the expression unless the expression goes on (fun(){}.call, {...}.size())
                if (brD===0 && pD===0 && bkD===0 && !(j < len && CONTINUES.has(tokens[j].value))) return j;
                continue;
            }
            if (v===';' && pD===0 && bkD===0 && brD===0) return j;
            // 'fun' can start an expression (return fun() {...}), the other starters cannot
            if (pD===0 && bkD===0 && brD===0 && STMT_STARTERS.has(v) && v !== 'fun' && j > s) return j;
            j++;
        }
        return j;
    }

    // Statements are split on ';' only, so a missing one merges two statements (an error).
    // After a block the compiler still splits the statement and only logs a warning.
    function report(tok) {
        if (!tok) return;
        const afterBlock = tok.value === '}';
        const d = new vscode.Diagnostic(
            new vscode.Range(new vscode.Position(tok.line, tok.char), new vscode.Position(tok.line, tok.char + tok.length)),
            afterBlock
                ? "Missing semicolon ';' after this block. ASF expects every statement, block statements included, to end with ';' (the compiler logs a warning)."
                : "Missing semicolon ';' after this token. Every statement in ASF must end with ';'.",
            afterBlock ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error);
        d.source = 'ASF';
        d.code = 'missing-semicolon';
        diagnostics.push(d);
    }

    // End of statement: ';', the '}' closing the enclosing block, the end of the script,
    // or a braceless body that already ended with ';'
    function expect(idx) {
        if (idx < len && tokens[idx].value === ';') return idx + 1;
        const last = at(idx - 1);
        if (last && last.value === ';') return idx;
        if (idx < len && tokens[idx].value === '}' && ctx() !== 'top') return idx;
        if (idx >= len && last && last.value !== '}') return idx;
        report(last);
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
                if (i === before) i++;
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
            if (tokens[i].value === '}') { i++; continue; }
            const before = i;
            parseStmt();
            if (i === before) i++;
        }
    }

    function withContext(name, fn) {
        contextStack.push(name);
        try { return fn(); } finally { contextStack.pop(); }
    }

    function parseStmt() {
        if (i >= len) return;
        const v = tokens[i].value;
        switch (v) {
            case 'if': {
                i++; i = skipParens(i); i = withContext('block', parseBlock);
                while (i < len && tokens[i].value === 'elseif') { i++; i = skipParens(i); i = withContext('block', parseBlock); }
                if (i < len && tokens[i].value === 'else') { i++; i = withContext('block', parseBlock); }
                i = expect(i); return;
            }
            case 'for': case 'while':
                i++; i = skipParens(i); i = withContext('block', parseBlock); i = expect(i); return;
            case 'try': {
                i++; i = withContext('block', parseBlock);
                if (i < len && tokens[i].value === 'catch') { i++; if (i < len && tokens[i].value === '(') i = skipParens(i); i = withContext('block', parseBlock); }
                i = expect(i); return;
            }
            case 'switch': {
                i++; i = skipParens(i);
                if (i < len && tokens[i].value === '{') {
                    i++;
                    withContext('block', () => {
                        while (i < len && tokens[i].value !== '}') {
                            const t = tokens[i].value;
                            if (t === 'case') {
                                i++;
                                while (i < len && tokens[i].value !== '{' && tokens[i].value !== '}') {
                                    if (tokens[i].value === '(') { i = skipParens(i); continue; }
                                    if (tokens[i].value === '[') { i = skipBrackets(i); continue; }
                                    i++;
                                }
                                i = parseBlock();
                            } else if (t === 'default') {
                                i++; i = parseBlock();
                            } else {
                                i++;
                            }
                        }
                    });
                    if (i < len && tokens[i].value === '}') i++;
                }
                i = expect(i); return;
            }
            case 'fun': {
                i++;
                if (i < len && isIdentifier(tokens[i].value) && at(i + 1) && at(i + 1).value === '(') {
                    i++; i = skipParens(i); i = withContext('block', parseBlock); i = expect(i); return;
                }
                i--; i = scanExpr(i); i = expect(i); return;
            }
            case 'class': {
                i++; if (i<len) i++;
                if (i<len && tokens[i].value==='extends') { i++; if (i<len) i++; }
                if (i<len && tokens[i].value==='{') {
                    i++;
                    withContext('class', () => {
                        while (i<len && tokens[i].value!=='}') {
                            if (tokens[i].value===';') { i++; continue; }
                            const before = i;
                            parseStmt();
                            if (i === before) i++;
                        }
                    });
                    if (i<len && tokens[i].value==='}') i++;
                }
                i = expect(i); return;
            }
            case 'export': {
                i++;
                if (i<len && tokens[i].value==='fun') { parseStmt(); return; }
                if (i<len && tokens[i].value==='prototype') { parseStmt(); return; }
                if (i<len && tokens[i].value==='default') { i++; i=scanExpr(i); i=expect(i); return; }
                if (i<len && tokens[i].value==='{') { i=skipBraces(i); i=expect(i); return; }
                i=scanExpr(i); i=expect(i); return;
            }
            case 'prototype': {
                // prototype.COM.Type method(params) { ... };
                i++;
                while (i < len && tokens[i].value !== '(' && tokens[i].value !== ';' && tokens[i].value !== '{') i++;
                i = skipParens(i); i = withContext('block', parseBlock); i = expect(i); return;
            }
            case 'import': {
                i++;
                while (i<len) {
                    if (tokens[i].value===';') break;
                    if (tokens[i].value==='{') { i = skipBraces(i); continue; }
                    if (tokens[i].value==='from') { i++; while(i<len && tokens[i].value!==';' && !STMT_STARTERS.has(tokens[i].value)) i++; break; }
                    if (STMT_STARTERS.has(tokens[i].value) && tokens[i].value !== 'import') break;
                    i++;
                }
                i=expect(i); return;
            }
            case 'let': {
                i++;
                while (i < len && tokens[i].value !== ';') {
                    if (tokens[i].value === '(') { i = skipParens(i); continue; }
                    if (tokens[i].value === '[') { i = skipBrackets(i); continue; }
                    if (tokens[i].value === '{') { i = skipBraces(i); continue; }
                    if (tokens[i].value === '}') break;
                    if (STMT_STARTERS.has(tokens[i].value) && tokens[i].value !== 'fun') break;
                    i++;
                }
                i = expect(i); return;
            }
            case 'field': {
                i++;
                while (i<len && tokens[i].value!==';') {
                    if (tokens[i].value === '(') { i = skipParens(i); continue; }
                    if (tokens[i].value === '[') { i = skipBrackets(i); continue; }
                    if (tokens[i].value === '{') { i = skipBraces(i); continue; }
                    if (tokens[i].value==='}') break;
                    i++;
                }
                i=expect(i); return;
            }
            case 'option': {
                if (at(i + 1) && at(i + 1).value === 'base') { i += 2; if (i < len && /^\d/.test(tokens[i].value)) i++; i = expect(i); return; }
                i = scanExpr(i); i = expect(i); return;
            }
            case 'return': {
                i++;
                if (i<len && tokens[i].value!==';' && tokens[i].value!=='}') i=scanExpr(i);
                i=expect(i); return;
            }
            case 'break': case 'continue': i++; i=expect(i); return;
            case 'print': i++; i=scanExpr(i); i=expect(i); return;
            case 'constructor': i++; i=skipParens(i); i=withContext('block', parseBlock); return;
            case 'static': {
                i++; if (i<len) i++;
                if (i<len && tokens[i].value==='(') { i=skipParens(i); i=withContext('block', parseBlock); return; }
                i=scanExpr(i); i=expect(i); return;
            }
            default: {
                // class method: ident(params) { ... }
                if (ctx()==='class' && isIdentifier(v) && i+1<len && tokens[i+1].value==='(') {
                    const afterP = skipParens(i+1);
                    if (afterP<len && tokens[afterP].value==='{') { i++; i=skipParens(i); i=withContext('block', parseBlock); return; }
                }
                i=scanExpr(i); i=expect(i); return;
            }
        }
    }

    parseStmts();
}

// ── Separator validation: semicolons not allowed inside (), [], or object {} ──
function validateSeparators(tokens, diagnostics) {
    const len = tokens.length;
    const stack = [];
    // '{' after these tokens opens an object literal (or an import/export list), otherwise a block
    const OBJ_PREV = new Set(['=', '(', '[', ',', ':', '?', '??', '||', '&&', 'return', 'export', 'import',
        '+=', '-=', '*=', '/=', '%=', '^=', '&=', '|=', '...']);

    for (let t = 0; t < len; t++) {
        const tok = tokens[t];
        const v = tok.value;

        if (v === '(') {
            stack.push({ type: '(', isBlock: false });
        } else if (v === '[') {
            stack.push({ type: '[', isBlock: false });
        } else if (v === '{') {
            const prev = t > 0 ? tokens[t - 1].value : null;
            const isObj = OBJ_PREV.has(prev) || (prev === 'default' && t > 1 && tokens[t - 2].value === 'export');
            stack.push({ type: '{', isBlock: !isObj });
        } else if (v === ')' || v === ']' || v === '}') {
            if (stack.length > 0) stack.pop();
        } else if (v === ';') {
            if (stack.length > 0) {
                const top = stack[stack.length - 1];
                if (top.type === '(' || top.type === '[' || (top.type === '{' && !top.isBlock)) {
                    let ctx = top.type === '(' ? 'function arguments/grouping'
                            : top.type === '[' ? 'array elements'
                            : 'object properties';
                    if (top.type === '{') {
                        for (let lookback = t - 1; lookback >= 0; lookback--) {
                            const lbVal = tokens[lookback].value;
                            if (lbVal === 'export') { ctx = 'export list'; break; }
                            if (lbVal === 'import') { ctx = 'import list'; break; }
                            if (lbVal === '=' || lbVal === ':' || lbVal === 'return') { ctx = 'object literal'; break; }
                        }
                    }
                    // 'for (init, cond, step)' uses commas, so a ';' there is the classic C mistake
                    if (top.type === '(') {
                        let d = 0;
                        for (let lb = t - 1; lb >= 0; lb--) {
                            const x = tokens[lb].value;
                            if (x === ')') d++;
                            else if (x === '(') { if (d === 0) { if (lb > 0 && tokens[lb - 1].value === 'for') ctx = 'for loop header'; break; } d--; }
                        }
                    }
                    const d = new vscode.Diagnostic(
                        new vscode.Range(new vscode.Position(tok.line, tok.char), new vscode.Position(tok.line, tok.char + tok.length)),
                        ctx === 'for loop header'
                            ? "Unexpected ';' in a for loop header. ASF separates the clauses with ',': for (let i = 1, i <= n, i += 1)."
                            : `Unexpected ';' inside ${ctx}. Use ',' to separate elements in ${ctx}.`,
                        vscode.DiagnosticSeverity.Error);
                    d.source = 'ASF';
                    d.code = 'unexpected-semicolon';
                    diagnostics.push(d);
                }
            }
        }
    }
}

// ── Imports: relative module paths and the names they export ──
async function checkImports(document, text) {
    const out = [];
    if (document.uri.scheme === 'untitled') return out;
    const symbols = collectSymbols(text);
    for (const imp of symbols.imports) {
        if (!/^\.\.?[\/\\]/.test(imp.path)) continue;
        const uri = resolveModuleUri(document.uri, imp.path);
        if (!uri) continue;
        const info = await readModule(uri);
        if (!info) {
            out.push(makeDiagnostic(document, imp.pathStart, imp.pathEnd,
                `Module '${imp.path}' not found next to this file (${uri.path.split('/').pop()}). ASF resolves relative paths against cwd(), set with scwd().`,
                'module-not-found', 'warning'));
            continue;
        }
        for (const spec of imp.specifiers) {
            if (spec.kind === 'named' && !info.symbols.exports.names.has(spec.imported)) {
                out.push(makeDiagnostic(document, spec.importedStart, spec.importedStart + spec.imported.length,
                    `Module '${imp.path}' does not export '${spec.imported}' (runtime error 9001).`, 'export-not-found', 'warning'));
            } else if (spec.kind === 'default' && !info.symbols.exports.hasDefault) {
                out.push(makeDiagnostic(document, spec.localStart, spec.localStart + spec.local.length,
                    `Module '${imp.path}' has no 'export default'.`, 'export-not-found', 'warning'));
            }
        }
    }
    return out;
}

// ═════════════════════════════════════════════════════════════════
//  SYMBOLS
//  Text-based so it works for the open document and for imported modules.
// ═════════════════════════════════════════════════════════════════

// whitespace is skipped on the raw text: in the stripped text a string literal is blank too
function skipSpaces(text, pos) {
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    return pos;
}

function splitParams(params) {
    return params.split(',').map(p => p.trim()).filter(Boolean);
}

function collectSymbols(text) {
    const scan = scanSource(text);
    const stripped = scan.stripped;
    const result = { text, stripped, spans: scan.spans, functions: [], classes: [], prototypes: [], variables: [],
        imports: [], exports: { names: new Map(), hasDefault: false, defaultName: null, defaultOffset: -1 }, scopes: [] };

    // functions (named)
    let m;
    const fnRe = new RegExp(`\\b(export\\s+)?fun\\s+(${IDENT})\\s*\\(`, 'g');
    while ((m = fnRe.exec(stripped)) !== null) {
        const po = m.index + m[0].length - 1;
        const pc = matchParen(stripped, po);
        const rest = stripped.substring(pc + 1);
        const ns = rest.search(/\S/);
        const bo = ns >= 0 && rest[ns] === '{' ? pc + 1 + ns : -1;
        const fn = {
            name: m[2], params: splitParams(stripped.substring(po + 1, pc)), exported: !!m[1],
            start: m.index, nameOffset: m.index + m[0].lastIndexOf(m[2], m[0].length - 1),
            bodyStart: bo, end: bo >= 0 ? matchBrace(stripped, bo) : pc
        };
        result.functions.push(fn);
        if (fn.exported) result.exports.names.set(fn.name, fn.nameOffset);
    }

    // classes with members
    const clsRe = new RegExp(`\\bclass\\s+(${IDENT})(?:\\s+extends\\s+(${IDENT}))?\\s*\\{`, 'g');
    while ((m = clsRe.exec(stripped)) !== null) {
        const bo = m.index + m[0].length - 1;
        const bc = matchBrace(stripped, bo);
        const cls = { name: m[1], parent: m[2] || null, start: m.index, nameOffset: m.index + m[0].indexOf(m[1], 5),
            bodyStart: bo, end: bc, fields: [], methods: [], ctor: null };
        collectClassMembers(stripped, bo + 1, bc, cls);
        result.classes.push(cls);
    }

    // COM prototypes
    const protoRe = new RegExp(`\\b(export\\s+)?prototype\\s*\\.\\s*COM\\s*\\.\\s*(${IDENT})\\s+(${IDENT})\\s*\\(`, 'g');
    while ((m = protoRe.exec(stripped)) !== null) {
        const po = m.index + m[0].length - 1;
        const pc = matchParen(stripped, po);
        const rest = stripped.substring(pc + 1);
        const ns = rest.search(/\S/);
        const bo = ns >= 0 && rest[ns] === '{' ? pc + 1 + ns : -1;
        const nameOffset = m.index + m[0].lastIndexOf(m[3], m[0].length - 1);
        const proto = { type: m[2], name: m[3], params: splitParams(stripped.substring(po + 1, pc)), exported: !!m[1],
            start: m.index, typeOffset: m.index + m[0].indexOf(m[2], m[0].indexOf('COM') + 3), nameOffset,
            bodyStart: bo, end: bo >= 0 ? matchBrace(stripped, bo) : pc };
        result.prototypes.push(proto);
        if (proto.exported) result.exports.names.set(`${proto.type}_${proto.name}`, nameOffset);
    }

    // function scopes (named, anonymous, methods, prototypes) with their parameters
    const scopeRe = new RegExp(`\\b(fun\\s*(?:${IDENT})?|constructor|prototype\\s*\\.\\s*COM\\s*\\.\\s*${IDENT}\\s+${IDENT}|(?:static\\s+)?${IDENT})\\s*\\(([^()]*)\\)\\s*\\{`, 'g');
    while ((m = scopeRe.exec(stripped)) !== null) {
        const head = m[1].replace(/^static\s+/, '');
        if (BLOCK_KEYWORDS.has(head)) continue;
        const bo = m.index + m[0].length - 1;
        const params = splitParams(m[2]);
        const paramsStart = m.index + m[0].indexOf('(', m[1].length);
        result.scopes.push({ head: m[1], params, paramsStart, start: m.index, bodyStart: bo, end: matchBrace(stripped, bo) });
    }
    // catch variables and for-loop variables behave like scoped names
    const catchRe = new RegExp(`\\bcatch\\s*\\(\\s*(${IDENT})\\s*\\)\\s*\\{`, 'g');
    while ((m = catchRe.exec(stripped)) !== null) {
        const bo = m.index + m[0].length - 1;
        result.scopes.push({ head: 'catch', params: [m[1]], paramsStart: m.index + m[0].indexOf('('), start: m.index, bodyStart: bo, end: matchBrace(stripped, bo), kind: 'catch' });
    }

    // variables: let declarations, plain assignments at statement start, destructuring, loop variables
    const seen = new Set();
    const addVar = (name, offset, kind, initStart) => {
        if (RESERVED.has(name)) return;
        result.variables.push({ name, offset, kind, initStart, first: !seen.has(name) });
        seen.add(name);
    };
    const letRe = new RegExp(`\\blet\\s+(${IDENT})`, 'g');
    while ((m = letRe.exec(stripped)) !== null) {
        const nameOffset = m.index + m[0].length - m[1].length;
        const after = stripped.substring(nameOffset + m[1].length).match(/^\s*=(?!=)/);
        addVar(m[1], nameOffset, 'let', after ? skipSpaces(text, nameOffset + m[1].length + after[0].length) : -1);
    }
    const asnRe = new RegExp(`(^|[;{}(])(\\s*)(${IDENT})\\s*(?:[-+*/%^&|]|<<|>>)?=(?!=)`, 'gm');
    while ((m = asnRe.exec(stripped)) !== null) {
        const nameOffset = m.index + m[1].length + m[2].length;
        if (result.variables.some(v => v.offset === nameOffset)) continue;
        const prevWord = stripped.substring(Math.max(0, nameOffset - 8), nameOffset);
        if (/\b(?:field|static)\s+$/.test(prevWord)) continue;
        const eq = stripped.indexOf('=', nameOffset + m[3].length);
        addVar(m[3], nameOffset, 'assign', skipSpaces(text, eq + 1));
        asnRe.lastIndex = nameOffset + m[3].length;
    }
    const destRe = /(^|[;{}])\s*\[([^\]]+)\]\s*=(?!=)/gm;
    while ((m = destRe.exec(stripped)) !== null) {
        const listStart = m.index + m[0].indexOf('[') + 1;
        const nameRe = new RegExp(`(\\.\\.\\.)?\\s*(${IDENT})`, 'g');
        let nm;
        while ((nm = nameRe.exec(m[2])) !== null) addVar(nm[2], listStart + nm.index + nm[0].length - nm[2].length, nm[1] ? 'rest' : 'destructure', -1);
    }
    const forRe = new RegExp(`\\bfor\\s*\\(\\s*(?:let\\s+)?(${IDENT})\\s+(in|of)\\b`, 'g');
    while ((m = forRe.exec(stripped)) !== null) {
        const nameOffset = m.index + m[0].indexOf(m[1], 4);
        if (!result.variables.some(v => v.offset === nameOffset)) addVar(m[1], nameOffset, m[2] === 'in' ? 'for-in' : 'for-of', -1);
    }
    result.variables.sort((a, b) => a.offset - b.offset);

    // imports and exports
    const impRe = /\bimport\b/g;
    while ((m = impRe.exec(stripped)) !== null) {
        let end = stripped.indexOf(';', m.index);
        if (end === -1) end = text.length;
        const imp = parseImport(text, m.index, end);
        if (imp) result.imports.push(imp);
    }
    const expRe = /\bexport\s*\{([^}]*)\}/g;
    while ((m = expRe.exec(stripped)) !== null) {
        const listStart = m.index + m[0].indexOf('{') + 1;
        const specRe = new RegExp(`(${IDENT})(?:\\s+as\\s+(${IDENT}))?`, 'g');
        let sm;
        while ((sm = specRe.exec(m[1])) !== null) result.exports.names.set(sm[2] || sm[1], listStart + sm.index);
    }
    const defRe = new RegExp(`\\bexport\\s+default\\s+(${IDENT})?`, 'g');
    while ((m = defRe.exec(stripped)) !== null) {
        result.exports.hasDefault = true;
        result.exports.defaultName = m[1] || null;
        result.exports.defaultOffset = m[1] ? m.index + m[0].length - m[1].length : m.index;
    }
    return result;
}

function collectClassMembers(stripped, start, end, cls) {
    const body = stripped.substring(start, end);
    // only look at depth 0 of the class body
    let depth = 0;
    const top = body.split('').map(ch => {
        if (ch === '{') { depth++; return depth === 1 ? '{' : ' '; }
        if (ch === '}') { depth--; return depth === 0 ? '}' : ' '; }
        return depth === 0 ? ch : (ch === '\n' ? '\n' : ' ');
    }).join('');
    let m;
    const fre = /\bfield\s+([^;}]*)/g;
    while ((m = fre.exec(top)) !== null) {
        const listStart = m.index + m[0].length - m[1].length;
        // names follow 'field' or a ',' at depth 0 of the list
        let d = 0, expectName = true;
        for (let k = 0; k < m[1].length; k++) {
            const ch = m[1][k];
            if ('([{'.includes(ch)) d++;
            else if (')]}'.includes(ch)) d--;
            else if (ch === ',' && d === 0) { expectName = true; continue; }
            if (expectName && /[A-Za-z_]/.test(ch)) {
                const name = m[1].substring(k).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
                cls.fields.push({ name, offset: start + listStart + k });
                k += name.length - 1;
                expectName = false;
            } else if (!/\s/.test(ch)) {
                expectName = false;
            }
        }
    }
    const mre = new RegExp(`\\b(?:(static)\\s+)?(${IDENT})\\s*\\(([^()]*)\\)\\s*\\{`, 'g');
    while ((m = mre.exec(top)) !== null) {
        const name = m[2];
        if (BLOCK_KEYWORDS.has(name) || name === 'field') continue;
        const nameOffset = start + m.index + m[0].indexOf(name, m[1] ? 6 : 0);
        const bo = start + m.index + m[0].length - 1;
        const entry = { name, params: splitParams(m[3]), isStatic: !!m[1], offset: nameOffset, start: start + m.index, end: matchBrace(stripped, bo) };
        if (name === 'constructor') cls.ctor = entry; else cls.methods.push(entry);
    }
    const sre = new RegExp(`\\bstatic\\s+(${IDENT})\\s*=`, 'g');
    while ((m = sre.exec(top)) !== null) {
        cls.fields.push({ name: m[1], offset: start + m.index + m[0].indexOf(m[1], 6), isStatic: true });
    }
}

// Parses one import statement from the raw text (strings are needed for the path)
function parseImport(text, start, end) {
    const stmt = text.substring(start, end);
    const imp = { start, end, path: null, pathStart: -1, pathEnd: -1, specifiers: [] };
    let m = stmt.match(/^import\s*(['"`])([^'"`]*)\1/);
    if (m) {
        imp.path = m[2];
        imp.pathStart = start + m[0].indexOf(m[1]) + 1;
        imp.pathEnd = imp.pathStart + m[2].length;
        return imp;
    }
    m = stmt.match(/^import\s+([\s\S]*?)\s*\bfrom\s*(['"`])([^'"`]*)\2/);
    if (!m) return null;
    imp.path = m[3];
    imp.pathStart = start + m[0].lastIndexOf(m[2] + m[3]) + 1;
    imp.pathEnd = imp.pathStart + m[3].length;
    const clause = m[1];
    const clauseStart = start + stmt.indexOf(clause, 6);
    const ns = clause.match(new RegExp(`\\*\\s*as\\s+(${IDENT})`));
    if (ns) {
        imp.specifiers.push({ kind: 'namespace', local: ns[1], localStart: clauseStart + ns.index + ns[0].length - ns[1].length });
    }
    const brace = clause.indexOf('{');
    const def = clause.match(new RegExp(`^(${IDENT})\\s*(?:,|$)`));
    if (def) imp.specifiers.push({ kind: 'default', local: def[1], localStart: clauseStart });
    if (brace >= 0) {
        const close = clause.indexOf('}', brace);
        const list = clause.substring(brace + 1, close >= 0 ? close : clause.length);
        const specRe = new RegExp(`(${IDENT})(?:\\s+as\\s+(${IDENT}))?`, 'g');
        let sm;
        while ((sm = specRe.exec(list)) !== null) {
            const importedStart = clauseStart + brace + 1 + sm.index;
            const local = sm[2] || sm[1];
            imp.specifiers.push({ kind: 'named', imported: sm[1], local, importedStart,
                localStart: sm[2] ? importedStart + sm[0].length - sm[2].length : importedStart });
        }
    }
    return imp;
}

// Names visible at an offset: parameters of the enclosing scopes plus every top-level name
function scopesAt(symbols, offset) {
    return symbols.scopes.filter(s => offset > s.bodyStart && offset < s.end).sort((a, b) => b.bodyStart - a.bodyStart);
}

function enclosingClassAt(symbols, offset) {
    return symbols.classes.find(c => offset > c.bodyStart && offset < c.end) || null;
}

function enclosingPrototypeAt(symbols, offset) {
    return symbols.prototypes.find(p => p.bodyStart >= 0 && offset > p.bodyStart && offset < p.end) || null;
}

// Class plus its ancestors (same document), nearest first
function classChain(symbols, cls) {
    const chain = [];
    const seen = new Set();
    while (cls && !seen.has(cls.name)) {
        chain.push(cls);
        seen.add(cls.name);
        cls = cls.parent ? symbols.classes.find(c => c.name === cls.parent) : null;
    }
    return chain;
}

function getDocComment(text, declOffset) {
    const before = text.substring(0, declOffset).split('\n');
    before.pop(); // text on the declaration line itself
    const lines = [];
    for (let i = before.length - 1; i >= 0; i--) {
        const t = before[i].trim();
        if (t === '') break;
        if (t.startsWith('//') || t.startsWith('#')) {
            lines.unshift(t.replace(/^\/\/\s?/, '').replace(/^#\s?/, ''));
        } else if (t.startsWith('/*') || t.startsWith('*') || t.endsWith('*/')) {
            const c = t.replace(/^\/\*+\s?/,'').replace(/\s?\*+\/$/,'').replace(/^\*\s?/,'');
            if (c) lines.unshift(c);
        } else break;
    }
    return lines.length > 0 ? lines.join('\n') : null;
}

// ═════════════════════════════════════════════════════════════════
//  MODULES
// ═════════════════════════════════════════════════════════════════

const moduleCache = new Map();

function resolveModuleUri(docUri, spec) {
    if (!spec) return null;
    let p = spec.replace(/\\/g, '/');
    if (!/\.[A-Za-z0-9]+$/.test(p)) p += '.vas';
    try {
        if (/^[A-Za-z]:\//.test(p)) return vscode.Uri.file(p);
        if (p.startsWith('/')) return docUri.with({ path: p });
        return vscode.Uri.joinPath(docUri, '..', p);
    } catch (e) {
        return null;
    }
}

async function readModule(uri) {
    const key = uri.toString();
    // prefer the open document, which may hold unsaved changes
    const open = vscode.workspace.textDocuments.find(d => d.uri.toString() === key);
    if (open) {
        const cached = moduleCache.get(key);
        if (cached && cached.version === `doc:${open.version}`) return cached;
        const info = { uri, text: open.getText(), version: `doc:${open.version}` };
        info.symbols = collectSymbols(info.text);
        moduleCache.set(key, info);
        return info;
    }
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        const version = `fs:${stat.mtime}:${stat.size}`;
        const cached = moduleCache.get(key);
        if (cached && cached.version === version) return cached;
        const bytes = await vscode.workspace.fs.readFile(uri);
        const info = { uri, text: new TextDecoder('utf-8').decode(bytes), version };
        info.symbols = collectSymbols(info.text);
        moduleCache.set(key, info);
        return info;
    } catch (e) {
        return null;
    }
}

// Declaration offset of an exported name inside a module
function findExportDeclaration(symbols, name) {
    if (name === 'default') {
        if (!symbols.exports.hasDefault) return -1;
        return symbols.exports.defaultName ? declarationOffset(symbols, symbols.exports.defaultName) : symbols.exports.defaultOffset;
    }
    const proto = symbols.prototypes.find(p => `${p.type}_${p.name}` === name);
    if (proto) return proto.nameOffset;
    const listed = symbols.exports.names.get(name);
    // follow 'export { local as name }' back to the local declaration
    const exportRe = new RegExp(`\\bexport\\s*\\{[^}]*?\\b(${IDENT})\\s+as\\s+${escapeRegex(name)}\\b`);
    const aliased = symbols.stripped.match(exportRe);
    const local = aliased ? aliased[1] : name;
    const decl = declarationOffset(symbols, local);
    return decl >= 0 ? decl : (listed !== undefined ? listed : -1);
}

function declarationOffset(symbols, name) {
    const fn = symbols.functions.find(f => f.name === name);
    if (fn) return fn.nameOffset;
    const cls = symbols.classes.find(c => c.name === name);
    if (cls) return cls.nameOffset;
    const v = symbols.variables.find(x => x.name === name);
    if (v) return v.offset;
    return -1;
}

// ═════════════════════════════════════════════════════════════════
//  CONTEXT HELPERS (what is under / before the cursor)
// ═════════════════════════════════════════════════════════════════

// Expression text before a '.', e.g. "person", "this", "Math", "'abc'", "arr.map(...)"
function receiverBefore(text, stripped, dotOffset) {
    let j = dotOffset - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    if (j < 0) return null;
    const end = j + 1;
    const ch = text[j];
    if (ch === "'" || ch === '"' || ch === '`') return { kind: 'string-literal', text: text.substring(j, end) };
    if (ch === ']' && stripped[j] === ']') {
        // array literal or index: walk back to the matching '['
        let d = 0, k = j;
        for (; k >= 0; k--) { if (stripped[k] === ']') d++; else if (stripped[k] === '[') { d--; if (d === 0) break; } }
        const before = stripped.substring(0, k).trimEnd();
        if (before === '' || /[=(,\[:?{;]$|\breturn$/.test(before)) return { kind: 'array-literal' };
        return { kind: 'index', text: text.substring(k, end) };
    }
    if (ch === '}' && stripped[j] === '}') return { kind: 'object-literal' };
    if (ch === ')' && stripped[j] === ')') {
        let d = 0, k = j;
        for (; k >= 0; k--) { if (stripped[k] === ')') d++; else if (stripped[k] === '(') { d--; if (d === 0) break; } }
        const callee = stripped.substring(0, k).match(new RegExp(`(?:(\\.)\\s*)?(${IDENT})\\s*$`));
        if (callee) return { kind: 'call', name: callee[2], isMethod: !!callee[1] };
        return { kind: 'group' };
    }
    // identifiers are read from the raw text so receivers inside ${...} are found too
    const id = text.substring(0, end).match(/(\$\d+|[A-Za-z_][A-Za-z0-9_]*)$/);
    if (!id) return null;
    const idStart = end - id[1].length;
    if (/\.\s*$/.test(text.substring(0, idStart))) return { kind: 'member', name: id[1] };
    return { kind: 'identifier', name: id[1], start: idStart };
}

const ARRAY_RETURNING = new Set(['map', 'filter', 'slice', 'concat', 'split', 'keys', 'values', 'entries', 'match', 'matchAll',
    'unique', 'toSorted', 'toReversed', 'toSpliced', 'with', 'from', 'of', 'range', 'flatten', 'execAll', 'exec', 'splice', 'sort', 'reverse']);
const STRING_RETURNING = new Set(['toUpperCase', 'toLowerCase', 'trim', 'trimStart', 'trimEnd', 'padStart', 'padEnd', 'repeat',
    'replace', 'replaceAll', 'substring', 'charAt', 'join', 'toString', 'concat', 'cwd', 'escape', 'getPattern', 'fromCharCode']);

// Best-effort type of a receiver: 'array' | 'string' | 'object' | 'regex' | 'math' | {className} | null
function inferType(symbols, recv, offset) {
    if (!recv) return null;
    switch (recv.kind) {
        case 'string-literal': return 'string';
        case 'array-literal': return 'array';
        case 'object-literal': return 'object';
        case 'call':
            if (recv.name === 'regex' && !recv.isMethod) return 'regex';
            if (recv.isMethod && STRING_RETURNING.has(recv.name) && !ARRAY_RETURNING.has(recv.name)) return 'string';
            if (ARRAY_RETURNING.has(recv.name)) return 'array';
            if (!recv.isMethod) {
                const cls = symbols.classes.find(c => c.name === recv.name);
                if (cls) return { className: cls.name };
            }
            return null;
        case 'identifier': {
            const name = recv.name;
            if (name === 'Math') return 'math';
            if (name === 'this') {
                const cls = enclosingClassAt(symbols, offset);
                if (cls) return { className: cls.name };
                const proto = enclosingPrototypeAt(symbols, offset);
                return proto ? { comType: proto.type } : null;
            }
            const ns = symbols.imports.find(imp => imp.specifiers.some(s => s.kind === 'namespace' && s.local === name));
            if (ns) return { namespace: ns.path };
            if (symbols.classes.some(c => c.name === name)) return { classStatic: name };
            // last assignment before the cursor decides
            const assigns = symbols.variables.filter(v => v.name === name && v.offset < offset && v.initStart >= 0);
            const last = assigns[assigns.length - 1];
            if (!last) return null;
            return inferInitializer(symbols, last.initStart);
        }
        default: return null;
    }
}

function inferInitializer(symbols, initStart) {
    const text = symbols.text;
    const ch = text[initStart];
    const span = symbols.spans.find(s => s.start === initStart);
    if (span && (span.kind === 'string' || span.kind === 'template')) return 'string';
    if (ch === '[') return 'array';
    if (ch === '{') return 'object';
    const rest = symbols.stripped.substring(initStart, initStart + 200);
    const nm = rest.match(new RegExp(`^new\\s+(${IDENT})`));
    if (nm) return { className: nm[1] };
    if (/^regex\s*\(/.test(rest)) return 'regex';
    const call = rest.match(new RegExp(`^(${IDENT})\\s*\\(`));
    if (call && ARRAY_RETURNING.has(call[1])) return 'array';
    // x = y.method(...) — use the last method of the chain on this line
    const chain = rest.split(/[;\n]/)[0].match(new RegExp(`\\.\\s*(${IDENT})\\s*\\([^()]*\\)\\s*$`));
    if (chain) {
        if (ARRAY_RETURNING.has(chain[1])) return 'array';
        if (STRING_RETURNING.has(chain[1])) return 'string';
    }
    return null;
}

// ═════════════════════════════════════════════════════════════════
//  COMPLETION
// ═════════════════════════════════════════════════════════════════

function completionItem(label, kind, detail, doc, insertText, sortPrefix) {
    const item = new vscode.CompletionItem(label, kind);
    if (detail) item.detail = detail;
    if (doc) item.documentation = typeof doc === 'string' ? md(doc) : doc;
    if (insertText) item.insertText = insertText;
    if (sortPrefix) item.sortText = sortPrefix + label;
    return item;
}

function callSnippet(name, params) {
    if (!params || params.length === 0) return new vscode.SnippetString(`${name}()`);
    return new vscode.SnippetString(`${name}($0)`);
}

function methodItems(type, filterNames) {
    const items = [];
    const table = METHODS[type];
    for (const [name, entry] of Object.entries(table)) {
        if (filterNames && filterNames.has(name)) continue;
        const kind = entry.property ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Method;
        const item = completionItem(name, kind, `${TYPE_LABELS[type]}: ${signatureOf(name, entry)}`, entry.doc,
            entry.property ? undefined : callSnippet(name, entry.params), '1');
        if (!entry.property && entry.params && entry.params.length) item.command = { command: 'editor.action.triggerParameterHints', title: '' };
        items.push(item);
    }
    return items;
}

function allMethodItems() {
    // one entry per name, listing every type that has it
    const byName = new Map();
    for (const type of Object.keys(METHODS)) {
        for (const [name, entry] of Object.entries(METHODS[type])) {
            if (!byName.has(name)) byName.set(name, []);
            byName.get(name).push({ type, entry });
        }
    }
    const items = [];
    for (const [name, list] of byName) {
        const first = list[0].entry;
        const kind = first.property ? vscode.CompletionItemKind.Property : vscode.CompletionItemKind.Method;
        const doc = list.map(({ type, entry }) => `**${TYPE_LABELS[type]}** \`${signatureOf(name, entry)}\` — ${entry.doc}`).join('\n\n');
        const item = completionItem(name, kind, list.map(x => TYPE_LABELS[x.type]).join(' | ') + ' method', doc,
            first.property ? undefined : callSnippet(name, first.params), '2');
        if (!first.property) item.command = { command: 'editor.action.triggerParameterHints', title: '' };
        items.push(item);
    }
    return items;
}

function classMemberItems(symbols, className, onlyStatic) {
    const items = [];
    const cls = symbols.classes.find(c => c.name === className);
    if (!cls) return items;
    const seen = new Set();
    for (const c of classChain(symbols, cls)) {
        for (const f of c.fields) {
            if (seen.has(f.name) || !!f.isStatic !== !!onlyStatic) continue;
            seen.add(f.name);
            items.push(completionItem(f.name, vscode.CompletionItemKind.Field, `field of ${c.name}`, null, null, '0'));
        }
        for (const me of c.methods) {
            if (seen.has(me.name) || me.isStatic !== !!onlyStatic) continue;
            seen.add(me.name);
            const item = completionItem(me.name, vscode.CompletionItemKind.Method, `${me.isStatic ? 'static ' : ''}${c.name}.${me.name}(${me.params.join(', ')})`,
                null, callSnippet(me.name, me.params), '0');
            items.push(item);
        }
    }
    return items;
}

function prototypeItems(symbols, comType) {
    return symbols.prototypes
        .filter(p => !comType || p.type === comType)
        .map(p => completionItem(p.name, vscode.CompletionItemKind.Method, `prototype.COM.${p.type} ${p.name}(${p.params.join(', ')})`,
            null, callSnippet(p.name, p.params), '0'));
}

function comTypeItems() {
    return Object.keys(COM_TYPE_APPS).map(t => {
        const item = completionItem(t, vscode.CompletionItemKind.Class, `${COM_TYPE_APPS[t].join(', ')} COM object`,
            `**${t}** (${COM_TYPE_APPS[t].join(', ')})\n\nExtend it with a prototype method:\n\`\`\`asf\nprototype.COM.${t} methodName() {\n    // 'this' is the ${t} object\n    return this;\n};\n\`\`\``);
        return item;
    });
}

async function provideCompletions(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const symbols = collectSymbols(text);
    const lineText = document.lineAt(position.line).text;
    const linePrefix = lineText.substring(0, position.character);

    // 1) module path inside an import string
    const pathCtx = linePrefix.match(/\b(?:from|import)\s*(['"`])([^'"`]*)$/);
    if (pathCtx) return modulePathCompletions(document, pathCtx[2], position);

    if (!isCodeAt(symbols.spans, offset)) return undefined;

    // 2) names inside import/export braces
    const before = symbols.stripped.substring(0, offset);
    if (/\bimport\s+(?:[A-Za-z_][A-Za-z0-9_]*\s*,\s*)?\{[^};]*$/.test(before)) {
        const stmtEnd = text.indexOf(';', offset);
        const restText = text.substring(offset, stmtEnd === -1 ? text.length : stmtEnd);
        const from = restText.match(/\bfrom\s*(['"`])([^'"`]*)\1/);
        if (from) {
            const uri = resolveModuleUri(document.uri, from[2]);
            const info = uri ? await readModule(uri) : null;
            if (info) return [...info.symbols.exports.names.keys()].map(n =>
                completionItem(n, vscode.CompletionItemKind.Reference, `export of '${from[2]}'`));
        }
        return [];
    }
    if (/\bexport\s*\{[^};]*$/.test(before)) {
        const names = new Set([...symbols.functions.map(f => f.name), ...symbols.classes.map(c => c.name),
            ...symbols.variables.filter(v => v.first).map(v => v.name)]);
        return [...names].map(n => completionItem(n, vscode.CompletionItemKind.Reference, 'local name'));
    }

    // 3) member access after '.' (not '...' and not a decimal point)
    const dot = linePrefix.match(/(?:^|[^.\d])\.\s*([A-Za-z_][A-Za-z0-9_]*)?$/);
    if (dot) {
        const dotOffset = text.lastIndexOf('.', offset - (dot[1] ? dot[1].length : 0) - 1);
        return memberCompletions(document, symbols, dotOffset, offset);
    }

    // 4) class names after 'new'
    if (/\bnew\s+[A-Za-z_]*$/.test(linePrefix)) {
        const items = symbols.classes.map(c => completionItem(c.name, vscode.CompletionItemKind.Class,
            `class ${c.name}${c.parent ? ' extends ' + c.parent : ''}`, null, callSnippet(c.name, c.ctor ? c.ctor.params : []), '0'));
        for (const imp of symbols.imports) for (const s of imp.specifiers) {
            if (s.kind !== 'namespace') items.push(completionItem(s.local, vscode.CompletionItemKind.Class, `imported from '${imp.path}'`, null, null, '1'));
        }
        return items;
    }

    // 5) everything visible here
    return generalCompletions(symbols, offset);
}

async function memberCompletions(document, symbols, dotOffset, offset) {
    const text = symbols.text;
    // prototype.COM.<Type>
    if (/\bprototype\s*\.\s*COM\s*$/.test(symbols.stripped.substring(0, dotOffset))) return comTypeItems();
    if (/\bprototype\s*$/.test(symbols.stripped.substring(0, dotOffset))) {
        return [completionItem('COM', vscode.CompletionItemKind.Keyword, 'prototype.COM.Type methodName(...)', KEYWORD_DOCS.COM)];
    }
    const recv = receiverBefore(text, symbols.stripped, dotOffset);
    const type = inferType(symbols, recv, offset);
    if (type === 'math') {
        return Object.entries(MATH_MEMBERS).map(([name, e]) => {
            const item = completionItem(name, e.constant ? vscode.CompletionItemKind.Constant : vscode.CompletionItemKind.Function,
                `Math.${signatureOf(name, e)}`, e.doc, e.constant ? undefined : callSnippet(name, e.params), '0');
            if (!e.constant) item.command = { command: 'editor.action.triggerParameterHints', title: '' };
            return item;
        });
    }
    if (typeof type === 'string') return methodItems(type);
    if (type && type.namespace) {
        const uri = resolveModuleUri(document.uri, type.namespace);
        const info = uri ? await readModule(uri) : null;
        if (info) return [...info.symbols.exports.names.keys()].map(n => {
            const fn = info.symbols.functions.find(f => f.name === n);
            return completionItem(n, fn ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Variable,
                fn ? `${n}(${fn.params.join(', ')})` : `export of '${type.namespace}'`, null, fn ? callSnippet(n, fn.params) : null, '0');
        });
        return [];
    }
    if (type && type.className) return classMemberItems(symbols, type.className, false).concat(methodItems('object'));
    if (type && type.classStatic) return classMemberItems(symbols, type.classStatic, true);
    if (type && type.comType) return prototypeItems(symbols, type.comType);
    // unknown receiver (parameters, COM objects, call results): declared prototypes and
    // class methods, then the built-in methods
    const items = prototypeItems(symbols, null);
    const seen = new Set(items.map(x => x.label));
    for (const c of symbols.classes) {
        for (const me of c.methods.filter(x => !x.isStatic && !seen.has(x.name))) {
            seen.add(me.name);
            items.push(completionItem(me.name, vscode.CompletionItemKind.Method, `${c.name}.${me.name}(${me.params.join(', ')})`,
                null, callSnippet(me.name, me.params), '1'));
        }
    }
    return items.concat(allMethodItems().filter(x => !seen.has(x.label)));
}

function generalCompletions(symbols, offset) {
    const items = [];
    const seen = new Set();
    const push = (item) => { if (!seen.has(item.label)) { seen.add(item.label); items.push(item); } };

    for (const scope of scopesAt(symbols, offset)) {
        for (const p of scope.params) {
            const name = p.replace(/^\.\.\./, '');
            push(completionItem(name, vscode.CompletionItemKind.Variable, p.startsWith('...') ? 'rest parameter' : 'parameter', null, null, '0'));
        }
    }
    const cls = enclosingClassAt(symbols, offset);
    if (cls || enclosingPrototypeAt(symbols, offset)) push(completionItem('this', vscode.CompletionItemKind.Keyword, cls ? `instance of ${cls.name}` : 'the COM object', null, null, '0'));
    for (const v of symbols.variables) {
        if (!v.first) continue;
        push(completionItem(v.name, vscode.CompletionItemKind.Variable, v.kind === 'let' ? 'let' : 'variable', null, null, '1'));
    }
    for (const f of symbols.functions) {
        push(completionItem(f.name, vscode.CompletionItemKind.Function, `fun ${f.name}(${f.params.join(', ')})`,
            getDocComment(symbols.text, f.start), callSnippet(f.name, f.params), '1'));
    }
    for (const c of symbols.classes) {
        push(completionItem(c.name, vscode.CompletionItemKind.Class, `class ${c.name}${c.parent ? ' extends ' + c.parent : ''}`, getDocComment(symbols.text, c.start), null, '1'));
    }
    for (const imp of symbols.imports) {
        for (const s of imp.specifiers) {
            push(completionItem(s.local, s.kind === 'namespace' ? vscode.CompletionItemKind.Module : vscode.CompletionItemKind.Reference,
                `${s.kind} import from '${imp.path}'`, null, null, '1'));
        }
    }
    const placeholders = new Set(symbols.stripped.match(/\$\d+/g) || []);
    for (const p of placeholders) push(completionItem(p, vscode.CompletionItemKind.Variable, 'host argument', placeholderDoc(p), null, '1'));

    for (const [name, e] of Object.entries(BUILTIN_FUNCTIONS)) {
        const item = completionItem(name, vscode.CompletionItemKind.Function, signatureOf(name, e), builtinDoc(name, e), callSnippet(name, e.params), '2');
        item.command = { command: 'editor.action.triggerParameterHints', title: '' };
        push(item);
    }
    push(completionItem('Math', vscode.CompletionItemKind.Module, 'Math object', 'Mathematical constants and functions: `Math.PI`, `Math.floor(x)`, `Math.sqrt(x)`, ...', null, '2'));

    for (const kw of ['if', 'elseif', 'else', 'for', 'in', 'of', 'while', 'switch', 'case', 'default', 'break', 'continue', 'return',
        'try', 'catch', 'fun', 'class', 'let', 'field', 'constructor', 'static', 'extends', 'import', 'export', 'from', 'as',
        'new', 'typeof', 'super', 'prototype', 'option', 'true', 'false', 'null', 'undefined']) {
        const kind = ['true', 'false', 'null', 'undefined'].includes(kw) ? vscode.CompletionItemKind.Constant : vscode.CompletionItemKind.Keyword;
        push(completionItem(kw, kind, null, KEYWORD_DOCS[kw] || null, null, '3'));
    }
    return items;
}

async function modulePathCompletions(document, typed, position) {
    const slash = typed.lastIndexOf('/');
    const dirPart = slash >= 0 ? typed.substring(0, slash + 1) : '';
    let dirUri;
    try {
        dirUri = vscode.Uri.joinPath(document.uri, '..', dirPart || '.');
    } catch (e) {
        return [];
    }
    let entries;
    try {
        entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch (e) {
        return [];
    }
    const range = new vscode.Range(position.translate(0, -(typed.length - dirPart.length)), position);
    const items = [];
    const selfName = document.uri.path.split('/').pop();
    if (!dirPart) {
        for (const rel of ['./', '../']) {
            const item = completionItem(rel, vscode.CompletionItemKind.Folder, null, null, null, '0');
            item.range = range;
            item.command = { command: 'editor.action.triggerSuggest', title: '' };
            items.push(item);
        }
    }
    const prefix = dirPart || './';
    for (const [name, type] of entries) {
        if (name.startsWith('.')) continue;
        if (type === vscode.FileType.Directory) {
            const item = completionItem(name + '/', vscode.CompletionItemKind.Folder, null, null, (dirPart ? '' : prefix) + name + '/', '1');
            item.range = range;
            item.command = { command: 'editor.action.triggerSuggest', title: '' };
            items.push(item);
        } else if (/\.(vas|asf)$/i.test(name) && !(dirPart === './' && name === selfName)) {
            const item = completionItem(name, vscode.CompletionItemKind.File, 'ASF module', null, (dirPart ? '' : prefix) + name, '0');
            item.range = range;
            items.push(item);
        }
    }
    return items;
}

// ═════════════════════════════════════════════════════════════════
//  HOVER
// ═════════════════════════════════════════════════════════════════

function builtinDoc(name, e) {
    let s = `\`\`\`asf\n${signatureOf(name, e)}\n\`\`\`\n---\n${e.doc}`;
    if (e.example) s += `\n\n**Example:**\n\`\`\`asf\n${e.example}\n\`\`\``;
    return s;
}

function placeholderDoc(p) {
    const n = p.substring(1);
    return `*(host argument)*\n\n\`\`\`asf\n${p}\n\`\`\`\n---\nArgument #${n} passed by the host:\n\`\`\`vb\nresult = engine.Run(pid, arg1, arg2, ...)\nresult = engine.Execute(path, arg1, arg2, ...)\n\`\`\`\nOffice objects need \`engine.AppAccess = True\`.`;
}

async function provideHover(document, position, diagCollection) {
    const parts = [];
    const diagPart = buildDiagnosticHover(document, position, diagCollection);
    if (diagPart) parts.push(diagPart);

    const range = document.getWordRangeAtPosition(position, /\$\d+|[A-Za-z_][A-Za-z0-9_]*/);
    const text = document.getText();
    const offset = document.offsetAt(position);
    const symbols = collectSymbols(text);

    // module path
    const imp = symbols.imports.find(x => x.path && offset >= x.pathStart && offset <= x.pathEnd);
    if (imp) {
        const uri = resolveModuleUri(document.uri, imp.path);
        const info = uri ? await readModule(uri) : null;
        if (info) {
            const names = [...info.symbols.exports.names.keys()];
            let s = `*(module)* \`${vscode.workspace.asRelativePath(uri)}\``;
            if (names.length) s += `\n\n**Exports:** ${names.map(n => '`' + n + '`').join(', ')}`;
            if (info.symbols.exports.hasDefault) s += `\n\n**Default export:** \`${info.symbols.exports.defaultName || 'expression'}\``;
            if (info.symbols.prototypes.some(p => p.exported)) s += `\n\nImporting it activates its exported prototypes.`;
            parts.push(md(s));
        } else if (uri) {
            parts.push(md(`*(module)* \`${imp.path}\` — not found at \`${vscode.workspace.asRelativePath(uri)}\``));
        }
        return parts.length ? new vscode.Hover(parts) : undefined;
    }
    if (!range || !isCodeAt(symbols.spans, offset)) {
        return parts.length > 0 ? new vscode.Hover(parts) : undefined;
    }

    const word = document.getText(range);
    const wordStart = document.offsetAt(range.start);
    const before = symbols.stripped.substring(0, wordStart);
    const afterDot = /(^|[^.])\.\s*$/.test(before);
    const codePart = afterDot ? memberHover(document, symbols, word, wordStart, before) : wordHover(symbols, word, wordStart, before);
    if (codePart) parts.push(codePart);
    return parts.length > 0 ? new vscode.Hover(parts, range) : undefined;
}

function memberHover(document, symbols, word, wordStart, before) {
    const dotOffset = before.lastIndexOf('.');
    const stripped = symbols.stripped;
    if (/\bprototype\s*\.\s*COM\s*\.\s*$/.test(before) || /\bprototype\s*\.\s*COM\s*$/.test(before.substring(0, dotOffset))) {
        const apps = COM_TYPE_APPS[word];
        return md(`*(COM object type)* \`${word}\`${apps ? ` — ${apps.join(', ')}` : ''}\n\n---\nPrototype methods declared here are added to every \`${word}\` object; inside the body \`this\` is that object.`);
    }
    if (word === 'COM' && /\bprototype\s*\.\s*$/.test(before)) return md(KEYWORD_DOCS.COM);
    const recv = receiverBefore(symbols.text, stripped, dotOffset);
    const type = inferType(symbols, recv, wordStart);
    if (type === 'math' && MATH_MEMBERS[word]) {
        const e = MATH_MEMBERS[word];
        return md(`\`\`\`asf\nMath.${signatureOf(word, e)}\n\`\`\`\n---\n${e.doc}`);
    }
    if (type && type.className) {
        const found = findClassMember(symbols, type.className, word);
        if (found) return md(found.md);
    }
    if (type && type.classStatic) {
        const found = findClassMember(symbols, type.classStatic, word);
        if (found) return md(found.md);
    }
    const protos = symbols.prototypes.filter(p => p.name === word && (!type || !type.comType || p.type === type.comType));
    const lines = protos.map(p => `\`\`\`asf\nprototype.COM.${p.type} ${p.name}(${p.params.join(', ')})\n\`\`\``);
    const types = typeof type === 'string' && METHODS[type] ? [type] : Object.keys(METHODS);
    for (const t of types) {
        const key = Object.keys(METHODS[t]).find(k => k.toLowerCase() === word.toLowerCase());
        if (!key) continue;
        const e = METHODS[t][key];
        lines.push(`**${TYPE_LABELS[t]}** \`${signatureOf(key, e)}\`\n\n${e.doc}`);
    }
    if (lines.length === 0 && type && type.comType) {
        return md(`*(COM member)* \`${type.comType}.${word}\``);
    }
    return lines.length ? md(lines.join('\n\n---\n\n')) : null;
}

function findClassMember(symbols, className, word) {
    const cls = symbols.classes.find(c => c.name === className);
    if (!cls) return null;
    for (const c of classChain(symbols, cls)) {
        const f = c.fields.find(x => x.name === word);
        if (f) return { offset: f.offset, md: `*(${f.isStatic ? 'static field' : 'field'})* \`${c.name}.${word}\`` };
        const me = c.methods.find(x => x.name === word);
        if (me) {
            const doc = getDocComment(symbols.text, me.start);
            return { offset: me.offset, md: `*(${me.isStatic ? 'static method' : 'method'})*\n\n\`\`\`asf\n${c.name}.${word}(${me.params.join(', ')})\n\`\`\`` + (doc ? `\n\n---\n\n${doc}` : '') };
        }
    }
    return null;
}

function wordHover(symbols, word, offset, before) {
    // user symbols first: they shadow built-ins
    const code = buildCodeHover(symbols, word, offset);
    if (code) return code;
    if (/^\$\d+$/.test(word)) return md(placeholderDoc(word));
    if (word === 'base' && /\boption\s+$/.test(before)) return md(KEYWORD_DOCS.option);
    if (KEYWORD_DOCS[word] && (RESERVED.has(word) || word === 'COM' || word === 'option')) return md(KEYWORD_DOCS[word]);
    if (BUILTIN_FUNCTIONS[word]) return md(builtinDoc(word, BUILTIN_FUNCTIONS[word]));
    if (word === 'Math') return md('*(built-in object)* `Math`\n\n---\nConstants `PI` and `E`, and the functions ' + Object.keys(MATH_MEMBERS).filter(k => !MATH_MEMBERS[k].constant).map(k => '`' + k + '`').join(', ') + '.');
    return null;
}

// ── user symbols ─────────────────────────────────────────────
function buildCodeHover(symbols, word, offset) {
    const { text } = symbols;
    const results = [];

    for (const scope of scopesAt(symbols, offset)) {
        const p = scope.params.find(x => x.replace(/^\.\.\./, '') === word);
        if (p) {
            const head = scope.kind === 'catch' ? 'catch' : `${scope.head.replace(/\s+/g, ' ')}(${scope.params.join(', ')})`;
            return md(scope.kind === 'catch'
                ? `*(catch variable)*\n\n\`\`\`asf\n${word}\n\`\`\`\n---\nError caught by the \`try/catch\` block.`
                : `*(${p.startsWith('...') ? 'rest parameter' : 'parameter'})*\n\n\`\`\`asf\n${p}\n\`\`\`\n---\nParameter of \`${head}\``);
        }
    }
    for (const f of symbols.functions.filter(x => x.name === word)) {
        const doc = getDocComment(text, f.start);
        let s = `*(function)*\n\n\`\`\`asf\n${f.exported ? 'export ' : ''}fun ${word}(${f.params.join(', ')})\n\`\`\``;
        if (doc) s += `\n\n---\n\n${doc}`;
        if (f.params.length > 1 || f.params.some(p => p.startsWith('...'))) {
            s += '\n\n**Parameters:**';
            for (const p of f.params) s += `\n- \`${p}\`${p.startsWith('...') ? ' — rest parameter' : ''}`;
        }
        results.push({ md: s, off: f.start });
    }
    for (const c of symbols.classes.filter(x => x.name === word)) {
        const doc = getDocComment(text, c.start);
        let s = `*(class)*\n\n\`\`\`asf\nclass ${word}${c.parent ? ' extends ' + c.parent : ''}\n\`\`\``;
        if (doc) s += `\n\n---\n\n${doc}`;
        if (c.fields.length || c.ctor || c.methods.length) {
            s += '\n\n**Members:**';
            if (c.fields.length) s += `\n- **Fields:** \`${c.fields.map(f => f.name).join('`, `')}\``;
            if (c.ctor) s += `\n- **Constructor:** \`constructor(${c.ctor.params.join(', ')})\``;
            for (const me of c.methods) s += `\n- \`${me.isStatic ? 'static ' : ''}${me.name}(${me.params.join(', ')})\``;
        }
        results.push({ md: s, off: c.start });
    }
    for (const p of symbols.prototypes.filter(x => x.name === word)) {
        results.push({ md: `*(COM prototype method)*\n\n\`\`\`asf\n${p.exported ? 'export ' : ''}prototype.COM.${p.type} ${p.name}(${p.params.join(', ')})\n\`\`\`` +
            (p.exported ? `\n\n---\n\nExported as \`${p.type}_${p.name}\`` : ''), off: p.start });
    }
    const vars = symbols.variables.filter(v => v.name === word);
    if (vars.length && results.length === 0) {
        const v = vars.filter(x => x.offset <= offset).pop() || vars[0];
        const ls = text.lastIndexOf('\n', v.offset) + 1;
        let le = text.indexOf('\n', v.offset); if (le === -1) le = text.length;
        const line = text.substring(ls, le).trim();
        const si = line.indexOf(';');
        const display = si !== -1 ? line.substring(0, si + 1) : line;
        const label = { let: 'variable', assign: 'variable', destructure: 'destructured variable', rest: 'rest destructured variable',
            'for-in': 'for-in loop variable (key)', 'for-of': 'for-of loop variable (value)' }[v.kind];
        const doc = getDocComment(text, v.offset);
        results.push({ md: `*(${label})*\n\n\`\`\`asf\n${display}\n\`\`\`` + (doc ? `\n\n---\n\n${doc}` : ''), off: v.offset });
    }
    for (const imp of symbols.imports) {
        for (const s of imp.specifiers.filter(x => x.local === word)) {
            const what = s.kind === 'namespace' ? `import * as ${word}` : s.kind === 'default' ? `import ${word}`
                : s.imported !== s.local ? `import { ${s.imported} as ${word} }` : `import { ${word} }`;
            const desc = s.kind === 'namespace' ? `Every export of \`'${imp.path}'\`` : s.kind === 'default' ? `Default export of \`'${imp.path}'\``
                : `Export \`${s.imported}\` of \`'${imp.path}'\``;
            results.push({ md: `*(${s.kind} import)*\n\n\`\`\`asf\n${what} from '${imp.path}'\n\`\`\`\n\n---\n\n${desc}`, off: imp.start });
        }
    }
    const cls = enclosingClassAt(symbols, offset);
    if (cls && results.length === 0) {
        const found = findClassMember(symbols, cls.name, word);
        if (found) results.push({ md: found.md, off: found.offset });
    }
    if (results.length === 0) return null;
    results.sort((a, b) => {
        const dA = a.off <= offset ? offset - a.off : Infinity;
        const dB = b.off <= offset ? offset - b.off : Infinity;
        return dA - dB;
    });
    return md(results[0].md);
}

// ── diagnostics under the cursor, with a fix suggestion ──────
function buildDiagnosticHover(document, position, diagCollection) {
    const diags = diagCollection.get(document.uri);
    if (!diags || diags.length === 0) return null;
    const hits = diags.filter(d => d.range.contains(position));
    if (hits.length === 0) return null;

    let s = '';
    hits.forEach((d, i) => {
        const icon = d.severity === vscode.DiagnosticSeverity.Error ? '🔴'
                   : d.severity === vscode.DiagnosticSeverity.Warning ? '🟡' : 'ℹ️';
        const label = d.severity === vscode.DiagnosticSeverity.Error ? 'Error'
                    : d.severity === vscode.DiagnosticSeverity.Warning ? 'Warning' : 'Info';
        s += `${icon} **${label}** — \`${d.source || 'ASF'}\``;
        if (d.code) s += ` (${d.code})`;
        s += `\n\n${d.message}`;
        if (d.code === 'missing-semicolon') {
            s += '\n\n💡 **Fix:** Add `;` after this statement. In ASF every statement must end with `;`, including block statements.\n\n';
            s += '```asf\n// ✗ Wrong\nlet x = 10\nif (x > 5) { print(x); }\n\n// ✓ Correct\nlet x = 10;\nif (x > 5) { print(x); };\n```';
        }
        if (d.code === 'unexpected-semicolon') {
            s += '\n\n💡 **Fix:** Replace `;` with `,` to separate elements.\n\n';
            s += '```asf\n// ✗ Wrong\nlet arr = [1; 2; 3];\nfor (let i = 1; i <= 3; i += 1) { };\n\n// ✓ Correct\nlet arr = [1, 2, 3];\nfor (let i = 1, i <= 3, i += 1) { };\n```';
        }
        if (i < hits.length - 1) s += '\n\n---\n\n';
    });
    return md(s);
}

// ═════════════════════════════════════════════════════════════════
//  SIGNATURE HELP
// ═════════════════════════════════════════════════════════════════

async function provideSignatureHelp(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const symbols = collectSymbols(text);
    const stripped = symbols.stripped;

    // find the unclosed '(' before the cursor and the active argument
    let depth = 0, commas = 0, open = -1;
    for (let k = offset - 1; k >= 0; k--) {
        const ch = stripped[k];
        if (ch === ')' || ch === ']' || ch === '}') depth++;
        else if (ch === '(' || ch === '[' || ch === '{') {
            if (depth === 0) { if (ch === '(') open = k; break; }
            depth--;
        } else if (ch === ',' && depth === 0) commas++;
        else if (ch === ';' && depth === 0) break;
    }
    if (open < 0) return undefined;
    const head = stripped.substring(0, open);
    const callee = head.match(new RegExp(`(?:(new)\\s+|(\\.)\\s*)?(${IDENT})\\s*$`));
    if (!callee) return undefined;
    const name = callee[3];
    if (BLOCK_KEYWORDS.has(name) && name !== 'print' && name !== 'super') return undefined;

    const sigs = [];
    const add = (label, params, doc) => {
        const sig = new vscode.SignatureInformation(label, doc ? md(doc) : undefined);
        sig.parameters = params.map(p => new vscode.ParameterInformation(p));
        sigs.push(sig);
    };

    if (callee[1]) {
        const cls = symbols.classes.find(c => c.name === name);
        if (cls) {
            const ctor = classChain(symbols, cls).map(c => c.ctor).find(Boolean);
            const params = ctor ? ctor.params : [];
            add(`new ${name}(${params.join(', ')})`, params, getDocComment(text, cls.start));
        }
    } else if (callee[2]) {
        const recv = receiverBefore(text, stripped, head.length - callee[0].length + callee[0].indexOf('.'));
        const type = inferType(symbols, recv, offset);
        if (type === 'math' && MATH_MEMBERS[name] && !MATH_MEMBERS[name].constant) {
            add(`Math.${signatureOf(name, MATH_MEMBERS[name])}`, MATH_MEMBERS[name].params, MATH_MEMBERS[name].doc);
        } else {
            if (type && (type.className || type.classStatic)) {
                const cls = symbols.classes.find(c => c.name === (type.className || type.classStatic));
                for (const c of cls ? classChain(symbols, cls) : []) {
                    const me = c.methods.find(x => x.name === name);
                    if (me) { add(`${c.name}.${name}(${me.params.join(', ')})`, me.params, getDocComment(text, me.start)); break; }
                }
            }
            for (const p of symbols.prototypes.filter(x => x.name === name)) {
                add(`prototype.COM.${p.type} ${name}(${p.params.join(', ')})`, p.params);
            }
            const types = typeof type === 'string' && METHODS[type] ? [type] : Object.keys(METHODS);
            for (const t of types) {
                const key = Object.keys(METHODS[t]).find(k => k.toLowerCase() === name.toLowerCase());
                if (key && !METHODS[t][key].property) add(`${TYPE_LABELS[t]}.${signatureOf(key, METHODS[t][key])}`, METHODS[t][key].params, METHODS[t][key].doc);
            }
            if (type && type.namespace) {
                const uri = resolveModuleUri(document.uri, type.namespace);
                const info = uri ? await readModule(uri) : null;
                const fn = info && info.symbols.functions.find(f => f.name === name);
                if (fn) add(`${name}(${fn.params.join(', ')})`, fn.params, getDocComment(info.text, fn.start));
            }
        }
    } else {
        const fn = symbols.functions.find(f => f.name === name);
        if (fn) add(`${name}(${fn.params.join(', ')})`, fn.params, getDocComment(text, fn.start));
        const cls = enclosingClassAt(symbols, offset);
        if (!fn && name === 'super' && cls && cls.parent) {
            const parent = symbols.classes.find(c => c.name === cls.parent);
            const ctor = parent && classChain(symbols, parent).map(c => c.ctor).find(Boolean);
            if (ctor) add(`super(${ctor.params.join(', ')})`, ctor.params, `Constructor of \`${parent.name}\``);
        }
        if (!fn) {
            // functions imported by name or as the default export
            for (const imp of symbols.imports) {
                const spec = imp.specifiers.find(s => s.local === name && s.kind !== 'namespace');
                if (!spec) continue;
                const uri = resolveModuleUri(document.uri, imp.path);
                const info = uri ? await readModule(uri) : null;
                if (!info) continue;
                const exported = spec.kind === 'default' ? info.symbols.exports.defaultName : spec.imported;
                const local = (info.symbols.stripped.match(new RegExp(`\\bexport\\s*\\{[^}]*?\\b(${IDENT})\\s+as\\s+${escapeRegex(exported || '')}\\b`)) || [])[1] || exported;
                const target = info.symbols.functions.find(f => f.name === local);
                if (target) add(`${name}(${target.params.join(', ')})`, target.params, getDocComment(info.text, target.start));
            }
        }
        if (!fn && sigs.length === 0 && BUILTIN_FUNCTIONS[name]) {
            const e = BUILTIN_FUNCTIONS[name];
            add(signatureOf(name, e).replace(/[[\]]/g, ''), e.params, e.doc);
        }
        if (!fn) {
            for (const scope of scopesAt(symbols, offset)) {
                if (scope.params.includes(name)) return undefined;
            }
        }
    }
    if (sigs.length === 0) return undefined;
    const help = new vscode.SignatureHelp();
    help.signatures = sigs;
    help.activeSignature = 0;
    const params = sigs[0].parameters;
    const restIndex = params.findIndex(p => String(p.label).startsWith('...'));
    help.activeParameter = restIndex >= 0 && commas >= restIndex ? restIndex : Math.min(commas, Math.max(0, params.length - 1));
    return help;
}

// ═════════════════════════════════════════════════════════════════
//  GO TO DEFINITION
// ═════════════════════════════════════════════════════════════════

async function provideDefinition(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const symbols = collectSymbols(text);
    // uri is set for a module already loaded by readModule
    const loc = (off, uri) => new vscode.Location(uri || document.uri,
        uri ? positionAtOffset(lineStartsOf(moduleCache.get(uri.toString()).text), off) : document.positionAt(off));

    const imp = symbols.imports.find(x => x.path && offset >= x.pathStart && offset <= x.pathEnd);
    if (imp) {
        const uri = resolveModuleUri(document.uri, imp.path);
        const info = uri ? await readModule(uri) : null;
        return info ? new vscode.Location(uri, new vscode.Position(0, 0)) : undefined;
    }

    const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
    if (!range) return undefined;
    const word = document.getText(range);
    const wordStart = document.offsetAt(range.start);
    if (!isCodeAt(symbols.spans, wordStart)) return undefined;
    const before = symbols.stripped.substring(0, wordStart);

    // inside an import list: jump to the export in the module
    const inImport = symbols.imports.find(x => wordStart >= x.start && wordStart <= x.end);
    if (inImport) {
        const spec = inImport.specifiers.find(s => wordStart === s.localStart || wordStart === s.importedStart);
        if (spec) return importTarget(document, inImport, spec);
    }

    if (/(^|[^.])\.\s*$/.test(before)) {
        const dotOffset = before.lastIndexOf('.');
        const recv = receiverBefore(text, symbols.stripped, dotOffset);
        const type = inferType(symbols, recv, wordStart);
        if (type && (type.className || type.classStatic)) {
            const found = findClassMember(symbols, type.className || type.classStatic, word);
            if (found) return loc(found.offset);
        }
        if (type && type.namespace) {
            const uri = resolveModuleUri(document.uri, type.namespace);
            const info = uri ? await readModule(uri) : null;
            if (info) {
                const off = findExportDeclaration(info.symbols, word);
                if (off >= 0) return loc(off, uri);
            }
        }
        const protos = symbols.prototypes.filter(p => p.name === word);
        if (protos.length) return protos.map(p => loc(p.nameOffset));
        // prototypes and class methods declared in imported modules
        const locations = [];
        for (const c of symbols.classes) {
            const me = c.methods.find(x => x.name === word);
            if (me) locations.push(loc(me.offset));
        }
        for (const imp2 of symbols.imports) {
            const uri = resolveModuleUri(document.uri, imp2.path);
            const info = uri ? await readModule(uri) : null;
            if (!info) continue;
            for (const p of info.symbols.prototypes.filter(x => x.name === word)) locations.push(loc(p.nameOffset, uri));
        }
        return locations.length ? locations : undefined;
    }

    for (const scope of scopesAt(symbols, wordStart)) {
        const idx = scope.params.findIndex(p => p.replace(/^\.\.\./, '') === word);
        if (idx >= 0) {
            const paramText = symbols.stripped.substring(scope.paramsStart);
            const m = paramText.match(new RegExp(`\\b${escapeRegex(word)}\\b`));
            if (m) return loc(scope.paramsStart + m.index);
        }
    }
    const fn = symbols.functions.find(f => f.name === word);
    if (fn) return loc(fn.nameOffset);
    const cls = symbols.classes.find(c => c.name === word);
    if (cls) return loc(cls.nameOffset);
    for (const imp2 of symbols.imports) {
        const spec = imp2.specifiers.find(s => s.local === word);
        if (spec) return importTarget(document, imp2, spec);
    }
    const vars = symbols.variables.filter(v => v.name === word);
    if (vars.length) {
        const v = vars.find(x => x.first) || vars[0];
        return loc(v.offset);
    }
    const enclosing = enclosingClassAt(symbols, wordStart);
    if (enclosing) {
        const found = findClassMember(symbols, enclosing.name, word);
        if (found) return loc(found.offset);
    }
    return undefined;
}

async function importTarget(document, imp, spec) {
    const uri = resolveModuleUri(document.uri, imp.path);
    const info = uri ? await readModule(uri) : null;
    if (!info) return undefined;
    const lineStarts = lineStartsOf(info.text);
    if (spec.kind === 'namespace') return new vscode.Location(uri, new vscode.Position(0, 0));
    const off = findExportDeclaration(info.symbols, spec.kind === 'default' ? 'default' : spec.imported);
    return new vscode.Location(uri, off >= 0 ? positionAtOffset(lineStarts, off) : new vscode.Position(0, 0));
}

// ═════════════════════════════════════════════════════════════════
//  DOCUMENT LINKS (import paths)
// ═════════════════════════════════════════════════════════════════

function provideDocumentLinks(document) {
    const symbols = collectSymbols(document.getText());
    const links = [];
    for (const imp of symbols.imports) {
        if (!imp.path) continue;
        const uri = resolveModuleUri(document.uri, imp.path);
        if (!uri) continue;
        const link = new vscode.DocumentLink(new vscode.Range(document.positionAt(imp.pathStart), document.positionAt(imp.pathEnd)), uri);
        link.tooltip = 'Open module (resolved next to this file)';
        links.push(link);
    }
    return links;
}

// ═════════════════════════════════════════════════════════════════
//  FOLDING
// ═════════════════════════════════════════════════════════════════

function provideFoldingRanges(document) {
    const text = document.getText();
    const scan = scanSource(text);
    const stripped = scan.stripped;
    const ranges = [];
    const add = (startLine, endLine, kind) => { if (endLine > startLine) ranges.push(new vscode.FoldingRange(startLine, endLine, kind)); };

    // brackets: fold up to the line before the closing bracket when it starts that line
    const stack = [];
    for (let i = 0; i < stripped.length; i++) {
        const ch = stripped[i];
        if (ch === '{' || ch === '[' || ch === '(') stack.push(i);
        else if ((ch === '}' || ch === ']' || ch === ')') && stack.length) {
            const open = stack.pop();
            const startLine = document.positionAt(open).line;
            const closePos = document.positionAt(i);
            const lineStartText = document.lineAt(closePos.line).text.substring(0, closePos.character);
            add(startLine, /^\s*$/.test(lineStartText) ? closePos.line - 1 : closePos.line);
        }
    }
    // block comments, multi-line strings and templates
    for (const s of scan.spans) {
        const a = document.positionAt(s.start).line, b = document.positionAt(Math.max(s.start, s.end - 1)).line;
        if (s.kind === 'blockComment') add(a, b, vscode.FoldingRangeKind.Comment);
        else if (s.kind === 'template' || s.kind === 'string') add(a, b);
    }
    // runs of line comments, and #region markers
    const regionStack = [];
    let commentRun = -1;
    for (let line = 0; line < document.lineCount; line++) {
        const t = document.lineAt(line).text.trim();
        if (/^(?:\/\/\s*#?|#)\s*region\b/.test(t)) { regionStack.push(line); commentRun = -1; continue; }
        if (/^(?:\/\/\s*#?|#)\s*endregion\b/.test(t)) {
            if (regionStack.length) add(regionStack.pop(), line, vscode.FoldingRangeKind.Region);
            commentRun = -1; continue;
        }
        const isComment = t.startsWith('//') || t.startsWith('#');
        if (isComment && commentRun < 0) commentRun = line;
        if (!isComment && commentRun >= 0) { add(commentRun, line - 1, vscode.FoldingRangeKind.Comment); commentRun = -1; }
    }
    if (commentRun >= 0) add(commentRun, document.lineCount - 1, vscode.FoldingRangeKind.Comment);
    // consecutive import lines
    let importRun = -1, lastImport = -1;
    for (let line = 0; line < document.lineCount; line++) {
        const t = document.lineAt(line).text.trim();
        if (/^import\b/.test(t)) { if (importRun < 0) importRun = line; lastImport = line; }
        else if (t !== '' && !t.startsWith('//') && !t.startsWith('#') && importRun >= 0) {
            add(importRun, lastImport, vscode.FoldingRangeKind.Imports); importRun = -1;
        }
    }
    if (importRun >= 0) add(importRun, lastImport, vscode.FoldingRangeKind.Imports);
    return ranges;
}

// ═════════════════════════════════════════════════════════════════
//  OUTLINE — DOCUMENT SYMBOL PROVIDER
// ═════════════════════════════════════════════════════════════════

function buildOutlineSymbols(document) {
    const text = document.getText();
    const symbols = collectSymbols(text);
    const stripped = symbols.stripped;
    const out = [];
    const docLen = text.length;
    const clamp = off => Math.max(0, Math.min(off, docLen));

    function sym(name, detail, kind, nameOff, startOff, endOff) {
        try {
            const full = new vscode.Range(document.positionAt(clamp(startOff)), document.positionAt(clamp(endOff + 1)));
            const sel = new vscode.Range(document.positionAt(clamp(nameOff)), document.positionAt(clamp(nameOff + name.length)));
            return new vscode.DocumentSymbol(name, detail, kind, full.contains(sel) ? full : sel, sel);
        } catch (e) {
            return null;
        }
    }
    const push = (list, s) => { if (s) list.push(s); };

    const inBlock = (off, list) => list.some(x => off > x.bodyStart && off < x.end);
    const blocks = [...symbols.classes, ...symbols.functions.filter(f => f.bodyStart >= 0), ...symbols.prototypes.filter(p => p.bodyStart >= 0)];

    for (const p of symbols.prototypes) {
        push(out, sym(p.name, `${p.exported ? 'export ' : ''}COM.${p.type} (${p.params.join(', ')})`, vscode.SymbolKind.Method, p.nameOffset, p.start, p.end));
    }
    for (const c of symbols.classes) {
        const cSym = sym(c.name, c.parent ? `extends ${c.parent}` : '', vscode.SymbolKind.Class, c.nameOffset, c.start, c.end);
        if (!cSym) continue;
        const members = [];
        for (const f of c.fields) push(members, sym(f.name, f.isStatic ? 'static field' : 'field', vscode.SymbolKind.Field, f.offset, f.offset, f.offset + f.name.length - 1));
        if (c.ctor) push(members, sym('constructor', `(${c.ctor.params.join(', ')})`, vscode.SymbolKind.Constructor, c.ctor.offset, c.ctor.start, c.ctor.end));
        for (const me of c.methods) push(members, sym(me.name, `${me.isStatic ? 'static ' : ''}(${me.params.join(', ')})`, vscode.SymbolKind.Method, me.offset, me.start, me.end));
        members.sort((a, b) => a.range.start.compareTo(b.range.start));
        cSym.children = members;
        out.push(cSym);
    }
    for (const f of symbols.functions) {
        if (inBlock(f.start, symbols.classes)) continue;
        push(out, sym(f.name, `${f.exported ? 'export ' : ''}(${f.params.join(', ')})`, vscode.SymbolKind.Function, f.nameOffset, f.start, f.end));
    }
    for (const v of symbols.variables) {
        if (!v.first || inBlock(v.offset, blocks) || ['for-in', 'for-of'].includes(v.kind)) continue;
        let end = stripped.indexOf(';', v.offset); if (end === -1) end = stripped.indexOf('\n', v.offset); if (end === -1) end = stripped.length - 1;
        const isConst = /^[A-Z][A-Z0-9_]*$/.test(v.name);
        push(out, sym(v.name, v.kind === 'let' ? 'let' : '', isConst ? vscode.SymbolKind.Constant : vscode.SymbolKind.Variable, v.offset, v.offset, end));
    }
    for (const imp of symbols.imports) {
        let label = imp.specifiers.length
            ? imp.specifiers.map(s => s.kind === 'namespace' ? `* as ${s.local}` : s.local).join(', ')
            : `'${imp.path}'`;
        if (label.length > 40) label = label.substring(0, 37) + '...';
        push(out, sym(label, imp.specifiers.length ? `from '${imp.path}'` : 'side-effect import', vscode.SymbolKind.Module, imp.start, imp.start, imp.end));
    }
    const expRe = /\bexport\s*\{([^}]*)\}/g;
    let m;
    while ((m = expRe.exec(stripped)) !== null) {
        const names = m[1].replace(/\s+/g, ' ').trim();
        let end = stripped.indexOf(';', m.index); if (end === -1) end = m.index + m[0].length;
        push(out, sym(`export { ${names} }`, '', vscode.SymbolKind.Namespace, m.index, m.index, end));
    }
    if (symbols.exports.hasDefault) {
        const at = stripped.search(/\bexport\s+default\b/);
        let end = stripped.indexOf(';', at); if (end === -1) end = at + 14;
        push(out, sym('export default', symbols.exports.defaultName || '', vscode.SymbolKind.Namespace, at, at, end));
    }

    out.sort((a, b) => a.range.start.compareTo(b.range.start));
    return out;
}

// ═════════════════════════════════════════════════════════════════
function deactivate() {}
module.exports = { activate, deactivate, _internal: { scanSource, collectSymbols, receiverBefore, inferType, parseImport } };
