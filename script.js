// ============================================================
//  ARROWPRINT — Интерпретатор на JavaScript
//  Полный аналог Python-версии с поддержкой ввода
// ============================================================

class ArrowPrint {
    constructor(code, inputHandler, maxSteps = Infinity) {
        this.code = code;
        this.grid = [];
        this.stack = [];
        this.x = 0;
        this.y = 0;
        this.dx = 1;
        this.dy = 0;
        this.output = '';
        this.running = false;
        this.random = Math.random;
        this.inputHandler = inputHandler || (() => '');
        this.waitingForInput = false;
    }

    run() {
        this.prepareGrid();
        if (this.grid.length === 0) return '';

        this.findStart();
        this.running = true;
        this.stepCount = 0;
        this.output = '';

        try {
            while (this.running) {
                const c = this.getChar(this.x, this.y);
                if (c === undefined) break;

                this.executeCommand(c);

                const nx = this.x + this.dx;
                const ny = this.y + this.dy;
                if (this.isValidPos(nx, ny)) {
                    this.x = nx;
                    this.y = ny;
                } else {
                    break;
                }
            }
        } catch (e) {
            this.output += '\n[Error] ' + e.message;
        }

        return this.output;
    }

    prepareGrid() {
        const lines = this.code.split('\n');
        this.grid = [];
        for (const line of lines) {
            if (line.trim()) {
                this.grid.push([...line]);
            }
        }
        this.ensureSize();
    }

    ensureSize() {
        const maxLen = Math.max(...this.grid.map(row => row.length), 0);
        for (const row of this.grid) {
            while (row.length < maxLen) row.push(' ');
        }
    }

    findStart() {
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                const ch = this.grid[y][x];
                if (ch === '>') { this.dx = 1; this.dy = 0; this.x = x; this.y = y; return; }
                if (ch === '<') { this.dx = -1; this.dy = 0; this.x = x; this.y = y; return; }
                if (ch === '^') { this.dx = 0; this.dy = -1; this.x = x; this.y = y; return; }
                if (ch === 'v') { this.dx = 0; this.dy = 1; this.x = x; this.y = y; return; }
            }
        }
        this.x = 0; this.y = 0; this.dx = 1; this.dy = 0;
    }

    getChar(x, y) {
        if (y < 0 || y >= this.grid.length) return undefined;
        if (x < 0 || x >= this.grid[y].length) return undefined;
        return this.grid[y][x];
    }

    isValidPos(x, y) {
        if (y < 0 || y >= this.grid.length) return false;
        if (x < 0 || x >= this.grid[y].length) return false;
        return true;
    }

    ensure(y, x) {
        while (y >= this.grid.length) this.grid.push([]);
        while (x >= this.grid[y].length) this.grid[y].push(' ');
    }

    parseString(text) {
        let result = '';
        let i = 0;
        while (i < text.length) {
            if (text[i] === '\\' && i + 1 < text.length) {
                const esc = text[i + 1];
                if (esc === 'n') result += '\n';
                else if (esc === 't') result += '\t';
                else if (esc === '\\') result += '\\';
                else if (esc === '"') result += '"';
                i += 2;
            } else {
                result += text[i];
                i++;
            }
        }
        return result;
    }

    executeCommand(c) {
        // === НАВИГАЦИЯ ===
        if (c === '>') { this.dx = 1; this.dy = 0; return; }
        if (c === '<') { this.dx = -1; this.dy = 0; return; }
        if (c === '^') { this.dx = 0; this.dy = -1; return; }
        if (c === 'v') { this.dx = 0; this.dy = 1; return; }
        if (c === '/') { const t = this.dx; this.dx = -this.dy; this.dy = -t; return; }
        if (c === '\\') { const t = this.dx; this.dx = this.dy; this.dy = t; return; }

        // === ТЕЛЕПОРТАЦИЯ ===
        if (c === '(') {
            let cx = this.x + this.dx;
            let cy = this.y + this.dy;
            let content = '';
            while (true) {
                this.ensure(cy, cx);
                if (this.getChar(cx, cy) === ')') break;
                content += this.getChar(cx, cy);
                cx += this.dx;
                cy += this.dy;
            }
            content = content.trim();

            if (content.includes(',')) {
                const parts = content.split(',');
                if (parts.length === 2) {
                    let xp = parts[0].trim();
                    let yp = parts[1].trim();
                    if (xp.startsWith('+') || xp.startsWith('-')) {
                        this.x += parseInt(xp);
                    } else {
                        this.x = parseInt(xp);
                    }
                    if (yp.startsWith('+') || yp.startsWith('-')) {
                        this.y += parseInt(yp);
                    } else {
                        this.y = parseInt(yp);
                    }
                    if (this.y >= 0 && this.x >= 0) this.ensure(this.y, this.x);
                }
                this.x = cx; this.y = cy;
                return;
            }

            if (content.includes(':')) {
                const parts = content.split(':');
                const start = parseInt(parts[0].trim()) || 0;
                const end = parseInt(parts[1].trim()) || this.stack.length;
                const step = parseInt(parts[2].trim()) || 1;
                let s = start < 0 ? this.stack.length + start : start;
                let e = end < 0 ? this.stack.length + end : end;
                if (s < 0) s = 0;
                if (e > this.stack.length) e = this.stack.length;
                const sliced = this.stack.slice(s, e).filter((_, i) => i % step === 0);
                this.stack.splice(s, e - s);
                for (const item of sliced) this.stack.push(item);
            } else {
                let idx = parseInt(content);
                if (isNaN(idx)) { this.stack.push(0); return; }
                if (idx < 0) idx = this.stack.length + idx;
                if (idx >= 0 && idx < this.stack.length) {
                    const val = this.stack.splice(idx, 1)[0];
                    this.stack.push(val);
                } else {
                    this.stack.push(0);
                }
            }
            this.x = cx; this.y = cy;
            return;
        }

        // === ИНДЕКСАЦИЯ [ ] ===
        if (c === '[') {
            let cx = this.x + this.dx;
            let cy = this.y + this.dy;
            let idx = '';
            while (true) {
                this.ensure(cy, cx);
                if (this.getChar(cx, cy) === ']') break;
                idx += this.getChar(cx, cy);
                cx += this.dx;
                cy += this.dy;
            }
            idx = idx.trim();

            const hasArrow = (() => {
                const px = this.x - this.dx;
                const py = this.y - this.dy;
                if (py >= 0 && px >= 0 && this.isValidPos(px, py)) {
                    const ch = this.getChar(px, py);
                    return ['>','<','^','v'].includes(ch);
                }
                return false;
            })();

            if (hasArrow) {
                if (idx.includes(':')) {
                    const parts = idx.split(':');
                    const s = parseInt(parts[0].trim()) || 0;
                    const e = parseInt(parts[1].trim()) || this.stack.length;
                    const st = parseInt(parts[2].trim()) || 1;
                    let start = s < 0 ? this.stack.length + s : s;
                    let end = e < 0 ? this.stack.length + e : e;
                    const sliced = this.stack.slice(start, end).filter((_, i) => i % st === 0);
                    this.stack.splice(start, end - start);
                    for (const item of sliced) this.stack.push(item);
                } else {
                    let i = parseInt(idx);
                    if (isNaN(i)) { this.x = cx; this.y = cy; return; }
                    if (i < 0) i = this.stack.length + i;
                    if (i >= 0 && i < this.stack.length) {
                        const val = this.stack.splice(i, 1)[0];
                        this.stack.push(val);
                    }
                }
            } else {
                if (this.stack.length === 0) {
                    this.stack.push('');
                } else {
                    const last = this.stack.pop();
                    if (typeof last === 'string') {
                        if (idx.includes(':')) {
                            const parts = idx.split(':');
                            const s = parseInt(parts[0].trim()) || 0;
                            const e = parseInt(parts[1].trim()) || last.length;
                            const st = parseInt(parts[2].trim()) || 1;
                            let start = s < 0 ? last.length + s : s;
                            let end = e < 0 ? last.length + e : e;
                            this.stack.push(last.slice(start, end).split('').filter((_, i) => i % st === 0).join(''));
                        } else {
                            let i = parseInt(idx);
                            if (isNaN(i)) { this.stack.push(''); return; }
                            if (i < 0) i = last.length + i;
                            if (i >= 0 && i < last.length) {
                                this.stack.push(last[i]);
                            } else {
                                this.stack.push('');
                            }
                        }
                    } else {
                        const sv = String(last);
                        if (idx.includes(':')) {
                            const parts = idx.split(':');
                            const s = parseInt(parts[0].trim()) || 0;
                            const e = parseInt(parts[1].trim()) || sv.length;
                            const st = parseInt(parts[2].trim()) || 1;
                            let start = s < 0 ? sv.length + s : s;
                            let end = e < 0 ? sv.length + e : e;
                            const r = sv.slice(start, end).split('').filter((_, i) => i % st === 0).join('');
                            this.stack.push(isNaN(Number(r)) ? r : Number(r));
                        } else {
                            let i = parseInt(idx);
                            if (isNaN(i)) { this.stack.push(''); return; }
                            if (i < 0) i = sv.length + i;
                            if (i >= 0 && i < sv.length) {
                                this.stack.push(sv[i]);
                            } else {
                                this.stack.push('');
                            }
                        }
                    }
                }
            }
            this.x = cx; this.y = cy;
            return;
        }

        // === ВЫВОД ===
        if (c === '?') {
            if (this.stack.length > 0) {
                const v = this.stack.pop();
                this.output += String(v);
            }
            return;
        }

        // === УДАЛЕНИЕ ===
        if (c === "'") {
            if (this.stack.length > 0) this.stack.pop();
            return;
        }

        // === ДУБЛИРОВАНИЕ ===
        if (c === ':') {
            if (this.stack.length > 0) {
                this.stack.push(this.stack[this.stack.length - 1]);
            }
            return;
        }

        // === ИНВЕРТ ===
        if (c === '~') {
            if (this.stack.length > 0) {
                const v = this.stack.pop();
                if (typeof v === 'number') {
                    this.stack.push(-v);
                } else {
                    this.stack.push(v.split('').reverse().join(''));
                }
            }
            return;
        }

        // === ДЛИНА ===
        if (c === '$') {
            if (this.stack.length > 0) {
                const v = this.stack.pop();
                this.stack.push(String(v).length);
            }
            return;
        }

        // === ВЗРЫВ ===
        if (c === '!') {
            if (this.stack.length > 0) {
                const v = this.stack.pop();
                const sv = String(v);
                for (const ch of sv) {
                    this.stack.push(isNaN(Number(ch)) ? ch : Number(ch));
                }
            }
            return;
        }

        // === СБОРКА ===
        if (c === '_') {
            if (this.stack.length > 0) {
                const tmp = [];
                while (this.stack.length > 0) tmp.push(this.stack.pop());
                tmp.reverse();
                this.stack.push(tmp.join(''));
            }
            return;
        }

        // === МАТЕМАТИКА ===
        if ('+-*;%&|'.includes(c)) {
            if (this.stack.length >= 2) {
                const a = this.stack.pop();
                const b = this.stack.pop();
                
                try {
                    if (c === '+') {
                        if (typeof a === 'string' || typeof b === 'string') {
                            this.stack.push(String(b) + String(a));
                        } else {
                            this.stack.push(b + a);
                        }
                        return;
                    }
                    
                    const an = typeof a === 'number' ? a : Number(a);
                    const bn = typeof b === 'number' ? b : Number(b);
                    
                    if (isNaN(an) || isNaN(bn)) {
                        this.stack.push(0);
                        return;
                    }
                    
                    switch (c) {
                        case '-': this.stack.push(bn - an); break;
                        case '*': this.stack.push(bn * an); break;
                        case ';': this.stack.push(an !== 0 ? bn / an : 0); break;
                        case '%': this.stack.push(an !== 0 ? bn % an : 0); break;
                        case '&': {
                            const strA = String(a);
                            const strB = String(b);
                            
                            if (typeof a === 'number' && typeof b === 'number' && 
                                Number.isFinite(a) && Number.isFinite(b) &&
                                (a % 1 !== 0 || b % 1 !== 0)) {
                                let combined = String(a) + String(b);
                                const parts = combined.split('.');
                                if (parts.length > 2) {
                                    combined = parts[0] + '.' + parts.slice(1).join('');
                                }
                                const num = parseFloat(combined);
                                this.stack.push(isNaN(num) ? combined : num);
                            } else {
                                const result = strB + strA;
                                const num = parseFloat(result);
                                this.stack.push(isNaN(num) ? result : num);
                            }
                            break;
                        }
                        case '|': {
                            this.stack = [];
                            break;
                        }
                    }
                } catch {
                    this.stack.push(0);
                }
            }
            return;
        }

        // === СТЕПЕНЬ (**) ===
        if (c === '*' && this.isValidPos(this.x + 1, this.y) && this.getChar(this.x + 1, this.y) === '*') {
            if (this.stack.length >= 2) {
                const a = this.stack.pop();
                const b = this.stack.pop();
                try {
                    const an = typeof a === 'number' ? a : Number(a);
                    const bn = typeof b === 'number' ? b : Number(b);
                    this.stack.push(Math.pow(bn, an));
                } catch {
                    this.stack.push(0);
                }
            }
            this.x += 1;
            return;
        }

        // === КОРЕНЬ ===
        if (c === '√') {
            if (this.stack.length >= 2) {
                const a = this.stack.pop();
                const b = this.stack.pop();
                try {
                    const an = typeof a === 'number' ? a : Number(a);
                    const bn = typeof b === 'number' ? b : Number(b);
                    this.stack.push(Math.pow(bn, 1 / an));
                } catch {
                    this.stack.push(0);
                }
            } else if (this.stack.length === 1) {
                const v = this.stack.pop();
                try {
                    const vn = typeof v === 'number' ? v : Number(v);
                    this.stack.push(Math.sqrt(vn));
                } catch {
                    this.stack.push(0);
                }
            }
            return;
        }

        // === СТРОКИ ===
        if (c === '"') {
            let s = '';
            let cx = this.x + this.dx;
            let cy = this.y + this.dy;
            while (true) {
                this.ensure(cy, cx);
                if (this.getChar(cx, cy) === '"') break;
                s += this.getChar(cx, cy);
                cx += this.dx;
                cy += this.dy;
            }
            this.stack.push(this.parseString(s));
            this.x = cx; this.y = cy;
            return;
        }

        // === ЧИСЛА ===
        if (c >= '0' && c <= '9') {
            let numStr = c;
            let cx = this.x + this.dx;
            let cy = this.y + this.dy;
            while (true) {
                if (cy < 0 || cx < 0 || cy >= this.grid.length || cx >= this.grid[cy].length) break;
                const ch = this.getChar(cx, cy);
                if (ch >= '0' && ch <= '9') {
                    numStr += ch;
                    cx += this.dx;
                    cy += this.dy;
                } else if (ch === '.') {
                    numStr += '.';
                    cx += this.dx;
                    cy += this.dy;
                    while (true) {
                        if (cy < 0 || cx < 0 || cy >= this.grid.length || cx >= this.grid[cy].length) break;
                        const ch2 = this.getChar(cx, cy);
                        if (ch2 >= '0' && ch2 <= '9') {
                            numStr += ch2;
                            cx += this.dx;
                            cy += this.dy;
                        } else break;
                    }
                    break;
                } else break;
            }
            this.stack.push(numStr.includes('.') ? parseFloat(numStr) : parseInt(numStr));
            this.x = cx - this.dx;
            this.y = cy - this.dy;
            return;
        }

        // === УСЛОВИЯ ===
        if (c === '{') {
            const startX = this.x;
            const startY = this.y;
            let cx = this.x + this.dx;
            let cy = this.y + this.dy;
            let cond = '';
            while (true) {
                this.ensure(cy, cx);
                if (this.getChar(cx, cy) === '}') break;
                cond += this.getChar(cx, cy);
                cx += this.dx;
                cy += this.dy;
            }
            cond = cond.trim();
            let result = false;

            if (cond.startsWith('№')) {
                const rest = cond.slice(1).trim();
                if (rest && this.stack.length > 0) {
                    const last = String(this.stack[this.stack.length - 1]);
                    let substr = rest;
                    if (substr.startsWith('"') && substr.endsWith('"')) substr = substr.slice(1, -1);
                    result = last.toLowerCase().includes(substr.toLowerCase());
                }
            }
            else if (cond.startsWith('==')) {
                const rest = cond.slice(2).trim();
                if (rest && this.stack.length > 0) {
                    const last = this.stack[this.stack.length - 1];
                    if (rest.startsWith('"') && rest.endsWith('"')) {
                        result = String(last) === this.parseString(rest.slice(1, -1));
                    } else {
                        result = Number(last) === Number(rest);
                    }
                } else if (this.stack.length >= 2) {
                    result = String(this.stack[this.stack.length - 2]) === String(this.stack[this.stack.length - 1]);
                }
            }
            else if (cond.startsWith('=')) {
                const rest = cond.slice(1).trim();
                if (rest && this.stack.length > 0) {
                    const last = this.stack[this.stack.length - 1];
                    if (rest.startsWith('"') && rest.endsWith('"')) {
                        result = String(last).toLowerCase() === this.parseString(rest.slice(1, -1)).toLowerCase();
                    } else {
                        result = Number(last) === Number(rest);
                    }
                } else if (this.stack.length >= 2) {
                    const a = this.stack[this.stack.length - 2];
                    const b = this.stack[this.stack.length - 1];
                    result = Number(a) === Number(b);
                }
            }
            else if (cond.startsWith('<')) {
                const rest = cond.slice(1).trim();
                if (rest && this.stack.length > 0) {
                    result = Number(this.stack[this.stack.length - 1]) < Number(rest);
                } else if (this.stack.length >= 2) {
                    result = Number(this.stack[this.stack.length - 2]) < Number(this.stack[this.stack.length - 1]);
                }
            }
            else if (cond.startsWith('>')) {
                const rest = cond.slice(1).trim();
                if (rest && this.stack.length > 0) {
                    result = Number(this.stack[this.stack.length - 1]) > Number(rest);
                } else if (this.stack.length >= 2) {
                    result = Number(this.stack[this.stack.length - 2]) > Number(this.stack[this.stack.length - 1]);
                }
            }
            else if (cond.startsWith(';')) {
                const rest = cond.slice(1).trim();
                if (rest && this.stack.length > 0) {
                    const val = Number(rest);
                    const last = Number(this.stack[this.stack.length - 1]);
                    result = val !== 0 && last % val === 0;
                } else if (this.stack.length >= 2) {
                    const a = Number(this.stack[this.stack.length - 2]);
                    const b = Number(this.stack[this.stack.length - 1]);
                    result = b !== 0 && a % b === 0;
                }
            }
            else {
                if (this.stack.length > 0) {
                    const last = this.stack[this.stack.length - 1];
                    result = Number(last) !== 0 || String(last) !== '';
                }
            }

            if (result) {
                this.x = cx;
                this.y = cy;
            } else {
                this.dx = 0;
                this.dy = 1;
                this.x = startX;
                this.y = startY + 1;
                if (this.y >= 0 && this.x >= 0) this.ensure(this.y, this.x);
            }
            return;
        }

        // === СУММА ===
        if (c === '∑') {
            if (this.stack.length > 0) {
                const nums = [];
                const tmp = [];
                while (this.stack.length > 0) {
                    const v = this.stack.pop();
                    tmp.push(v);
                    if (typeof v === 'number') nums.push(v);
                }
                tmp.reverse();
                for (const v of tmp) this.stack.push(v);
                this.stack.push(nums.reduce((a, b) => a + b, 0));
            }
            return;
        }

        // === ПРОИЗВЕДЕНИЕ ===
        if (c === '∏') {
            if (this.stack.length > 0) {
                const nums = [];
                const tmp = [];
                while (this.stack.length > 0) {
                    const v = this.stack.pop();
                    tmp.push(v);
                    if (typeof v === 'number') nums.push(v);
                }
                tmp.reverse();
                for (const v of tmp) this.stack.push(v);
                this.stack.push(nums.reduce((a, b) => a * b, 1));
            }
            return;
        }

        // === БЕСКОНЕЧНОСТЬ ===
        if (c === '∞') {
            this.stack.push(Infinity);
            return;
        }
        // === ВВОД ===
        if (c === ',') {
            const lang = window.currentLang || 'en';
            const promptText = lang === 'ru' ? 'Введите значение:' : 'Enter value:';
            const input = prompt(promptText);
            if (input === null) {
                this.running = false;
                return;
            }
            const trimmed = input.trim();
            // Печатаем введённое значение в выводе и добавляем перенос строки
            this.output += trimmed + '\n';
            
            if (trimmed === '') {
                this.stack.push('');
            } else if (trimmed.replace('.', '').replace('-', '').match(/^\d+$/)) {
                this.stack.push(trimmed.includes('.') ? parseFloat(trimmed) : parseInt(trimmed));
            } else {
                this.stack.push(trimmed);
            }
            return;
        }
        // === ВЫВОД ASCII ===
        if (c === '₽') {
            if (this.stack.length > 0) {
                const v = this.stack.pop();
                if (typeof v === 'number') {
                    const code = Math.floor(v);
                    if (code >= 0 && code <= 127) {
                        this.stack.push(String.fromCharCode(code));
                    } else {
                        this.stack.push('?');
                    }
                } else if (typeof v === 'string') {
                    if (v.length === 1) {
                        this.stack.push(v.charCodeAt(0));
                    } else {
                        for (let i = v.length - 1; i >= 0; i--) {
                            this.stack.push(v.charCodeAt(i));
                        }
                    }
                } else {
                    this.stack.push(String(v));
                }
            }
            return;
        }

        // === РАНДОМ ===
        if (c === '`') {
            if (this.stack.length >= 2) {
                const b = this.stack.pop();
                const a = this.stack.pop();
                const low = Math.min(Number(a), Number(b));
                const high = Math.max(Number(a), Number(b));
                this.stack.push(Math.floor(this.random() * (high - low + 1)) + low);
            }
            return;
        }

        // === КОММЕНТАРИЙ ===
        if (c === '#') {
            while (this.y < this.grid.length && this.x < this.grid[this.y].length) {
                this.x += this.dx;
                if (this.x < 0 || this.x >= this.grid[this.y].length) break;
            }
            return;
        }

        // === ОСТАНОВКА ===
        if (c === '@') {
            const nx = this.x + this.dx;
            const ny = this.y + this.dy;
            if (this.isValidPos(nx, ny) && this.getChar(nx, ny) === '@') {
                this.running = false;
            }
            return;
        }

        // === ПРЕОБРАЗОВАНИЕ ТИПОВ ===
        if (c === '@') {
            if (this.stack.length === 0) return;
            const v = this.stack.pop();
            const nx = this.x + this.dx;
            const ny = this.y + this.dy;
            if (this.isValidPos(nx, ny)) {
                const mod = this.getChar(nx, ny);
                if (mod === '!') {
                    if (typeof v === 'string') {
                        this.stack.push(v.match(/\d+/g) ? parseInt(v.match(/\d+/g).join('')) : 0);
                    } else {
                        this.stack.push(Math.floor(Number(v)));
                    }
                    this.x = nx; this.y = ny;
                    return;
                }
                if (mod === '$') {
                    this.stack.push(String(v));
                    this.x = nx; this.y = ny;
                    return;
                }
                if (mod === '?') {
                    if (typeof v === 'string') {
                        const match = v.match(/-?\d*\.?\d+/);
                        this.stack.push(match ? parseFloat(match[0]) : 0.0);
                    } else {
                        this.stack.push(Number(v));
                    }
                    this.x = nx; this.y = ny;
                    return;
                }
                if (mod === '~') {
                    if (typeof v === 'number') {
                        this.stack.push(String(v));
                    } else {
                        const sv = String(v);
                        this.stack.push(sv.includes('.') ? parseFloat(sv) : parseInt(sv));
                    }
                    this.x = nx; this.y = ny;
                    return;
                }
                this.stack.push(v);
                this.x = nx; this.y = ny;
                return;
            }
            this.stack.push(v);
            return;
        }

        if (c === ' ') return;
    }
}

// ============================================================
//  ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА (русский/английский)
// ============================================================

const translations = {
    en: {
        tagline: 'An esoteric programming language on a 2D grid',
        run: 'Run',
        clear: 'Clear',
        examples: 'Examples:',
        output: '📤 Output',
        ready: 'Ready',
        running: 'Running...',
        emptyOutput: '(empty output)',
        cleared: 'Output cleared',
        error: '[Error]',
        langBtn: '🇷🇺 Русский',
        inputPrompt: 'Enter value:',
        footer: 'ArrowPrint v1.0 · GitHub · Esolang Wiki',
        exampleNames: {
            'Hello World': 'Hello World',
            'FizzBuzz': 'FizzBuzz',
            'Калькулятор': 'Calculator',
            'Таблица умножения': 'Multiplication Table',
            'Случайное число': 'Random Number',
            'ASCII Table': 'ASCII Table',
            'Сумма 1..N': 'Sum 1..N',
            'Реверс строки': 'Reverse String',
            'Угадай число': 'Guess the Number'
        }
    },
    ru: {
        tagline: 'Эзотерический язык программирования на двумерной сетке',
        run: 'Запустить',
        clear: 'Очистить',
        examples: 'Примеры:',
        output: '📤 Вывод программы',
        ready: 'Готов к запуску',
        running: 'Запуск...',
        emptyOutput: '(пустой вывод)',
        cleared: 'Вывод очищен',
        error: '[Ошибка]',
        langBtn: '🇬🇧 English',
        inputPrompt: 'Введите значение:',
        footer: 'ArrowPrint v1.0 · GitHub · Esolang Wiki',
        exampleNames: {
            'Hello World': 'Hello World',
            'FizzBuzz': 'FizzBuzz',
            'Калькулятор': 'Калькулятор',
            'Таблица умножения': 'Таблица умножения',
            'Случайное число': 'Случайное число',
            'ASCII Table': 'Таблица ASCII',
            'Сумма 1..N': 'Сумма 1..N',
            'Реверс строки': 'Реверс строки',
            'Угадай число': 'Угадай число'
        }
    }
};

let currentLang = 'en';
let isRunning = false;
let inputResolve = null;

document.addEventListener('DOMContentLoaded', function() {
    const codeInput = document.getElementById('codeInput');
    const output = document.getElementById('output');
    const runBtn = document.getElementById('runBtn');
    const clearBtn = document.getElementById('clearBtn');
    const clearOutputBtn = document.getElementById('clearOutputBtn');
    const examplesContainer = document.getElementById('examplesContainer');
    const terminalInput = document.getElementById('terminal-input');
    const inputLine = document.getElementById('input-line');
    if (typeof examples !== 'undefined') {
        for (const [name, code] of Object.entries(examples)) {
            const btn = document.createElement('button');
            btn.className = 'example-btn';
            btn.dataset.exampleKey = name;
            btn.textContent = name;
            btn.addEventListener('click', () => {
                codeInput.value = code;
                runCode();
            });
            examplesContainer.appendChild(btn);
        }
    }

    function setLanguage(lang) {
        currentLang = lang;
        const t = translations[lang];

        document.getElementById('tagline').textContent = t.tagline;
        document.getElementById('runText').textContent = t.run;
        document.getElementById('clearText').textContent = t.clear;
        document.getElementById('examplesLabel').textContent = t.examples;
        document.getElementById('outputLabel').textContent = t.output;
        document.getElementById('readyText').textContent = t.ready;
        document.getElementById('langToggle').textContent = t.langBtn;

        const exampleBtns = document.querySelectorAll('.example-btn');
        exampleBtns.forEach(btn => {
            const key = btn.dataset.exampleKey;
            if (key && t.exampleNames[key]) {
                btn.textContent = t.exampleNames[key];
            }
        });

        localStorage.setItem('arrowprint-lang', lang);
    }

    function toggleLanguage() {
        const newLang = currentLang === 'en' ? 'ru' : 'en';
        setLanguage(newLang);
    }

    document.getElementById('langToggle').addEventListener('click', toggleLanguage);

    const savedLang = localStorage.getItem('arrowprint-lang') || 'en';
    setLanguage(savedLang);

    function handleInput() {
        return new Promise((resolve) => {
            inputResolve = resolve;
            inputLine.style.display = 'flex';
            terminalInput.value = '';
            terminalInput.focus();
            const t = translations[currentLang];
            const prompt = document.querySelector('#input-line .prompt');
            if (prompt) prompt.textContent = '⌨️ ' + t.inputPrompt + ' ';
        });
    }

    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = terminalInput.value;
            inputLine.style.display = 'none';
            if (inputResolve) {
                inputResolve(value);
                inputResolve = null;
            }
            if (isRunning) {
                const event = new CustomEvent('inputReceived', { detail: value });
                document.dispatchEvent(event);
            }
        }
    });

    function runCode() {
        if (isRunning) return;

        const code = codeInput.value;
        const output = document.getElementById('output');
        output.textContent = '';
        output.innerHTML = '<span class="prompt">> </span><span id="readyText">' + translations[currentLang].running + '</span>';

        isRunning = true;

        setTimeout(async () => {
            try {
                const interpreter = new ArrowPrint(code, async () => {
                    const output = document.getElementById('output');
                    const t = translations[currentLang];
                    output.textContent += '\n⌨️ ' + t.inputPrompt + ' ';
                    return await handleInput();
                });

                const result = interpreter.run();
                const output = document.getElementById('output');
                if (result) {
                    output.textContent = result;
                } else {
                    output.textContent = translations[currentLang].emptyOutput;
                }
            } catch (e) {
                const output = document.getElementById('output');
                output.innerHTML = '<span class="error">' + translations[currentLang].error + ' ' + e.message + '</span>';
                console.error(e);
            } finally {
                isRunning = false;
                document.getElementById('input-line').style.display = 'none';
            }
        }, 100);
    }

    runBtn.addEventListener('click', runCode);

    clearBtn.addEventListener('click', () => {
        codeInput.value = '';
    });

    clearOutputBtn.addEventListener('click', () => {
        const output = document.getElementById('output');
        output.textContent = '';
        output.innerHTML = '<span class="prompt">> </span>' + translations[currentLang].cleared;
    });

    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            runCode();
        }
    });

    setTimeout(runCode, 500);
})