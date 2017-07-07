import {
    lookupSymbol,
} from './symbols';
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
    /**
     * This context should be closed.
     */
    close: boolean;
    /**
     * New context should be created.
     */
    create: Context | undefined;
}

export type ContextType =
    | 'plain'
    | 'sup'
    | 'sub'
;

export abstract class Context{
    /**
     * type of context.
     */
    public abstract readonly type: ContextType;
    /**
     * Value of this context.
     */
    public value: string = '';

    /**
     * Consume input.
     */
    public abstract consume(buf: SourceBuf): ConsumeResult;
}

export class PlainContext extends Context{
    public type: ContextType = 'plain';
    public length = 0;
    public originalLength = 0;
    constructor(){
        super();
    }

    public consume(buf: SourceBuf): ConsumeResult{
        const plain = /\\[a-zA-Z]+|_|\^/g;

        const {
            value,
            originalCursorPosition,
        } = buf;
        let {
            inputPosition: position,
        } = buf;

        let changed = false;

        while (true){
            plain.lastIndex = position;

            const r = plain.exec(value);
            if (r == null){
                break;
            }

            const text = r[0];
            if (text[0] === '\\'){
                // \foobar の形
                const s = lookupSymbol(text.slice(1));
                if (s != null){
                    // 置換が発生

                    this.value += value.substring(position, r.index) + s;
                    position = r.index + text.length;
                    // 置換後のポジション
                    if (r.index < originalCursorPosition){
                        buf.cursorPosition += s.length - text.length;
                    }

                    changed = true;
                }else{
                    // 無視

                    const p2 = r.index + text.length;
                    this.value += value.substring(position, p2);
                    position = p2;
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
            close: true,
            create: undefined,
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
                close: true,
                create: undefined,
            };
        }
        const next = value.charAt(inputPosition);
        const c = this.convert(next);
        if (c != null){
            // 1文字消費できるわこれ
            this.value += c;
            buf.inputPosition++;
            return {
                consumed: true,
                changed: true,
                close: true,
                create: undefined,
            };
        }else{
            // ない
            this.value += this.startchar;
            return {
                consumed: false,
                changed: false,
                close: true,
                create: undefined,
            };
        }
    }
}

/**
 * 上付き文字
 */
class SupContext extends SingleCharContext{
    public type: ContextType = 'sup';
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
    public type: ContextType = 'sub';
    constructor(){
        super('_');
    }
    protected convert(char){
        return subTable[char];
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
    // context chainを用意する
    const contexts: Array<Context> = [
        c,
    ];

    let result = '';
    let changed = false;
    let consumed = false;

    // contextがなくなるまでchainを回す
    while (contexts.length > 0){
        const currentContext = contexts[0];
        const obj = currentContext.consume(buf);
        const {
            close,
        } = obj;
        if (close){
            // このcontextは役目を終えた
            result += currentContext.value;
            contexts.shift();
        }
        changed = changed || obj.changed;
        consumed = consumed || obj.consumed;
    }
    return {
        value: result,
        consumed,
        changed,
    };
}
