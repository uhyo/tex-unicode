import {
    lookupSymbol,
} from './symbols';

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
}

export type ContextType =
    | 'plain'
;

export abstract class Context{
    /**
     * type of context.
     */
    public abstract readonly type: ContextType;
    /**
     * length of content.
     */
    public abstract readonly length: number;
    /**
     * length of original content.
     */
    public abstract readonly originalLength: number;
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
            }else{
                const p2 = r.index + text.length;
                this.value += value.substring(position, p2);
                position = p2;
            }
        }
        // 後始末
        this.value += value.substring(position);
        position = value.length;
        buf.cursorPosition = position;

        return {
            consumed: true,
            changed,
            close: true,
        };
    }
}
