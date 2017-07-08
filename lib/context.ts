import {
    lookupSymbol,
} from './symbols';
import {
    commands,
} from './commands';
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
                            changed: true,
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
class CommandContext extends Context{
    public consume(buf: SourceBuf): ConsumeResult{
        const {
            value,
            inputPosition,
            originalCursorPosition,
        } = buf;

        const cmd = /\\([a-zA-Z]+|_)/y;
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
        const s = lookupSymbol(symb);
        if (s != null){
            // 置換できる
            this.value += s;
            buf.inputPosition += text.length;
            // 置換後のポジションを決定
            if (inputPosition < originalCursorPosition){
                buf.cursorPosition += s.length - text.length;
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
                    changed,
                } = r2;
                if (blockComplete){
                    // 中身に対してコマンドを適用
                    const l = value.length;
                    for (let i = 0; i < l; i++){
                        const c = value[i];
                        this.value += com[c] || c;
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
            if (blockComplete){
                let value2 = '';
                const l = value.length;
                for (let i = 0; i < l; i++){
                    const c = value[i];
                    value2 += this.convert(c) || c;
                }
                value = value2;
            }else{
                value = this.startchar + '{' + value;
            }
            this.value += value;
            return {
                consumed: true,
                changed: true,
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
class SupContext extends SingleCharContext{
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
class SubContext extends SingleCharContext{
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
class BlockContext extends PlainContext{

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
