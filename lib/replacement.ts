import {
    lookupSymbol,
} from './symbols';
import {
    Context,
    PlainContext,
    SourceBuf,
} from './context';

export interface ReplaceResult{
    /**
     * Value after replacement.
     */
    value: string;
    /**
     * Cursor position after replacement.
     */
    position: number;
    /**
     * Flag whether change occurred
     */
    changed: boolean;
}

/**
 * Perform replacement on given value.
 */
export function runReplace(value: string, position: number): ReplaceResult{

    const plain = /\\[a-zA-Z]+|_|\^/g;

    // initial context
    const c: Array<Context> = [
        new PlainContext(),
    ];
    const buf: SourceBuf = {
        value,
        inputPosition: 0,
        originalCursorPosition: position,
        cursorPosition: position,
    };

    let result = '';
    let changed = false;

    while (c.length > 0){
        const currentContext = c[0];
        const obj = currentContext.consume(buf);
        const {
            close,
        } = obj;
        if (close){
            // このcontextは役目を終えた
            result += currentContext.value;
            c.shift();
        }
        changed = changed || obj.changed;
    }
    return {
        value: result,
        position: buf.cursorPosition,
        changed,
    };
}

