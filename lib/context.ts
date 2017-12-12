import {
    lookupSymbol,
} from './symbols';
import {
    commands,
} from './commands';
import {
    modifiers,
} from './modifier';
import {
    supTable,
    subTable,
} from './supsub';

// replacement context

export interface SourceBuf{
    value: string;
    inputPosition: number;
    originalCursorPosition: number;
    cursorPosition: number;
}
export interface ConsumeResult{
    /**
     * Consumed something.
     */
    consumed: boolean;
    /**
     * Any change occurred.
     */
    changed: boolean;
}

export interface BlockConsumeResult extends ConsumeResult{
    blockComplete: boolean;
}

export abstract class Context{
    /**
     * Value of this context.
     */
    public value: string = '';

    /**
     * Consume input.
     */
    public abstract consume(buf: SourceBuf): ConsumeResult;


}

abstract class PlainContext extends Context{
    public consume(buf: SourceBuf): BlockConsumeResult{
        const plain = /\\|_|\^|\{|\}/g;

        const {
            value,
            originalCursorPosition,
        } = buf;
        let {
            inputPosition: position,
        } = buf;

        let changed = false;
        let nestlevel = 0;

        while (true){
            plain.lastIndex = position;

            const r = plain.exec(value);
            if (r == null){
                break;
            }

            const text = r[0];
            if (text[0] === '\\'){
                // コマンドかも
                this.value += value.substring(position, r.index);
                buf.inputPosition = r.index;

                // コマンドをアレしてもらう
                const subcontext = new CommandContext();
                const r2 = subcontext.consume(buf);
                position = buf.inputPosition;

                if (!r2.consumed){
                    // 進んでないので\\は無視する
                    this.value += '\\';
                    position = r.index+1;
                }else{
                    this.value += subcontext.value;
                    changed = changed || r2.changed;
                }

            }else if (text === '^'){
                // 上付き
                this.value += value.substring(position, r.index);
                // 次にセット
                buf.inputPosition = r.index + 1;

                const subcontext = new SupContext();
                const rr = runContext(buf, subcontext);

                this.value += rr.value;

                position = buf.inputPosition;
                if (rr.changed && buf.inputPosition <= buf.originalCursorPosition){
                    // ^を消費
                    buf.cursorPosition--;
                }
                changed = changed || rr.changed;
            }else if (text === '_'){
                // 下付き
                this.value += value.substring(position, r.index);
                // _の次にセット
                buf.inputPosition = r.index + 1;

                const subcontext = new SubContext();
                const rr = runContext(buf, subcontext);

                this.value += rr.value;
                position = buf.inputPosition;
                if (rr.changed && buf.inputPosition <= buf.originalCursorPosition){
                    // _を消費
                    buf.cursorPosition--;
                }
                changed = changed || rr.changed;
            }else if (text === '{'){
                // 中括弧のはじまり
                nestlevel++;
                this.value += value.substring(position, r.index + 1);
                position = r.index + 1;
            }else if (text === '}'){
                if (nestlevel > 0){
                    nestlevel--;
                    this.value += value.substring(position, r.index + 1);
                    position = r.index + 1;
                }else{
                    // ブロックが終わってしまったぞ??????
                    this.value += value.substring(position, r.index);
                    position = r.index;
                    if (this.handleBlockEnd()){
                        // 処理したから終わりでいいや
                        buf.inputPosition = position+1;
                        return {
                            consumed: true,
                            changed,
                            blockComplete: true,
                        };
                    }else{
                        // 処理されなかった
                        this.value += '}';
                        position++;
                    }
                }
            }else{
                const p2 = r.index + text.length;
                this.value += value.substring(position, p2);
                position = p2;
            }
        }
        // 後始末
        this.value += value.substring(position);
        position = value.length;
        buf.inputPosition = position;

        return {
            consumed: true,
            changed,
            blockComplete: false,
        };
    }

    protected abstract handleBlockEnd(): boolean;
}

export class GlobalContext extends PlainContext{
    protected handleBlockEnd(){
        return false;
    }
}

/**
 * コマンドを解釈する系context
 */
export class CommandContext extends Context{
    public consume(buf: SourceBuf): ConsumeResult{
        const {
            value,
            inputPosition,
            originalCursorPosition,
        } = buf;

        const cmd = /\\([a-zA-Z]+|[_\'\`\^\"\~\=\.])/y;
        cmd.lastIndex = inputPosition;

        const r = cmd.exec(value);
        if (r == null){
            // マッチしないじゃん
            return {
                consumed: false,
                changed: false,
            };
        }
        const text = r[0];
        const symb = r[1];

        if (/^[\'\`\^\"\~\=\.uvHcdr]$/.test(symb)){
            // modifierだ
            const mof = modifiers[symb];
            if (mof != null){
                const pos = inputPosition + 2;
                const next = value[pos];

                if (next === '{'){
                    // ブロックの置換
                    buf.inputPosition = pos + 1;
                    const subcontext = new BlockContext();
                    const {
                        blockComplete,
                        changed,
                    } = subcontext.consume(buf);
                    const {
                        value,
                    } = subcontext;
                    if (blockComplete){
                        // 中身に対してコマンドを適用？
                        const ch = value[0];
                        const modified = mof[ch];
                        if (modified != null){
                            this.value += modified + value.slice(1);
                            if (pos + 1 < originalCursorPosition){
                                // カーソルは置換されるブロックより右にあるぞ
                                // 文字の置き換え分を加味する
                                buf.cursorPosition += modified.length - 1;
                                // 修飾子とブロックの{}は消えたのでその分を削る
                                buf.cursorPosition -= text.length + 2;
                            }
                            return {
                                consumed: true,
                                changed: true,
                            };
                        }else{
                            // 適用できなかった
                            this.value += value;
                            return {
                                consumed: true,
                                changed,
                            };
                        }
                    }else{
                        // 適用できなかった
                        this.value += text + '{' + value;
                        return {
                            consumed: true,
                            changed: false,
                        };
                    }
                }else{
                    const modified = mof[next];
                    if (modified != null){
                        // 置換に成功！
                        buf.inputPosition = pos + 1;
                        if (inputPosition < originalCursorPosition){
                            buf.cursorPosition += modified.length - text.length - 1;
                        }
                        this.value += modified;
                        return {
                            consumed: true,
                            changed: true,
                        };
                    }
                }
            }
            return {
                consumed: false,
                changed: false,
            };
        }

        const s = lookupSymbol(symb);
        if (s != null && originalCursorPosition !== inputPosition + text.length){
            // 置換できる
            this.value += s;
            // 入力の読んだ距離
            let movelen = text.length;
            if ((value[buf.inputPosition + movelen] === ' ' || value[buf.inputPosition + movelen] === '\u00a0') && buf.inputPosition+movelen+1 === originalCursorPosition){
                // 変換のためにスペースが入力されたと解釈してスペースを消費
                movelen++;
            }

            buf.inputPosition += movelen;
            // 置換後のポジションを決定
            if (inputPosition < originalCursorPosition){
                buf.cursorPosition += s.length - movelen;
            }
            return {
                consumed: true,
                changed: true,
            };
        }
        const com = commands[symb];
        if (com != null){
            // コマンドあるかも
            const nextpos = inputPosition + text.length;
            const next = value[nextpos];
            if (next === '{'){
                buf.inputPosition = nextpos + 1;
                const subcontext = new BlockContext();
                const r2 = subcontext.consume(buf);
                const {
                    value,
                } = subcontext;
                const {
                    blockComplete,
                } = r2;
                let {
                    changed,
                } = r2;

                if (blockComplete){
                    // 中身に対してコマンドを適用

                    // コマンドが消える
                    if (inputPosition < originalCursorPosition){
                        // コマンドと{の分が消える
                        buf.cursorPosition -= Math.min(originalCursorPosition - inputPosition, text.length + 1);
                    }

                    // {の後から
                    let pos2 = nextpos + 1;
                    const l = value.length;
                    for (let i = 0; i < l; i++){
                        const c = value[i];
                        const c2 = com[c] || c;
                        this.value += c2;
                        if (pos2 < originalCursorPosition){
                            buf.cursorPosition += c2.length - c.length;
                        }
                        pos2++;
                        if (com[c]){
                            changed = changed || true;
                        }
                    }
                    // 最後に}の分
                    if (pos2 < originalCursorPosition){
                        buf.cursorPosition--;
                    }

                }else{
                    // コマンドは適用しない
                    this.value += text + '{' + value;
                }
                return {
                    consumed: true,
                    changed,
                };
            }
        }
        // 置換できなかった
        return {
            consumed: false,
            changed: false,
        };
    }
}

/**
 * 1文字の効果範囲がある系context
 */
abstract class SingleCharContext extends Context{
    protected startchar: string;
    constructor(startchar: string){
        super();
        this.startchar = startchar;
    }
    protected abstract convert(char: string): string | undefined;
    public consume(buf: SourceBuf): ConsumeResult{
        const {
            value,
            inputPosition,
            originalCursorPosition,
        } = buf;

        if (value.length <= inputPosition){
            // もう終わりだ
            this.value += this.startchar;
            return {
                consumed: false,
                changed: false,
            };
        }
        const next = value.charAt(inputPosition);

        if (next === '{'){
            // ブロックが始まるような感じがしないでもない
            buf.inputPosition++;
            const subcontext = new BlockContext();
            const r2 = subcontext.consume(buf);
            let {
                value,
            } = subcontext;
            const {
                blockComplete,
            } = r2;
            let {
                changed,
            } = r2;
            if (blockComplete){
                let value2 = '';
                const l = value.length;


                if (inputPosition <= originalCursorPosition){
                    // {を消費
                    buf.cursorPosition--;
                }
                let pos = inputPosition + 1;
                for (let i = 0; i < l; i++){
                    const c = value[i];
                    const conv = this.convert(c);
                    // do not change if not converted.
                    const cv = conv || c;
                    value2 += cv;
                    if (pos < originalCursorPosition){
                        buf.cursorPosition += cv.length - c.length;
                    }
                    pos++;
                    if (conv){
                        changed = changed || true;
                    }
                }
                value = value2;
                // }の分も
                if (pos < originalCursorPosition){
                    buf.cursorPosition--;
                }
            }else{
                value = this.startchar + '{' + value;
            }
            this.value += value;
            return {
                consumed: true,
                changed,
            };
        }else if (next === '\\'){
            // コマンドがアレするかもしれない
            const subcontext = new CommandContext();

            const r2 = subcontext.consume(buf);

            if (r2.consumed){
                // 可能性あり?????
                const {
                    value,
                } = subcontext;
                if (value.length > 0){
                    const char = value[0];
                    this.value += (this.convert(char) || char) + value.slice(1);
                }

                return {
                    consumed: true,
                    changed: true,
                };
            }else{
                // 無意味な\\だった
                this.value += this.startchar + '\\';
                buf.inputPosition++;
                return {
                    consumed: true,
                    changed: false,
                };
            }
        }

        const c = this.convert(next);
        if (c != null){
            // 1文字消費できるわこれ
            this.value += c;
            buf.inputPosition++;
            // 消費した
            if (inputPosition <= originalCursorPosition){
                buf.cursorPosition -= Math.min(originalCursorPosition - inputPosition, next.length - c.length);
            }

            return {
                consumed: true,
                changed: true,
            };
        }else{
            // ない
            this.value += this.startchar;
            return {
                consumed: false,
                changed: false,
            };
        }
    }
}

/**
 * 上付き文字
 */
export class SupContext extends SingleCharContext{
    constructor(){
        super('^');
    }
    protected convert(char){
        return supTable[char];
    }
}
/**
 * 下付き文字
 */
export class SubContext extends SingleCharContext{
    constructor(){
        super('_');
    }
    protected convert(char){
        return subTable[char];
    }
}

/**
 * ブロックがある
 */
export class BlockContext extends PlainContext{

    protected handleBlockEnd(){
        return true;
    }
}






/**
 * Result of runContext.
 */
export interface RunResult{
    /**
     * Produced string.
     */
    value: string;
    /**
     * whether any value is consumed.
     */
    consumed: boolean;
    /**
     * whether any replacement has occurred.
     */
    changed: boolean;
}

/**
 * Contextをrunする
 */
export function runContext(buf: SourceBuf, c: Context): RunResult{
    // contextがなくなるまでchainを回す
    const obj = c.consume(buf);
    const {
        changed,
        consumed,
    } = obj;
    return {
        value: c.value,
        consumed,
        changed,
    };
}
