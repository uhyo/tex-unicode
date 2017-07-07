import {
    runReplace,
} from './replacement';

/**
 * elmで起きたinputイベントを処理
 */
export function handleInput(elm: HTMLInputElement): void{
    const {
        selectionStart,
        selectionEnd,
        value,
    } = elm;

    const lastchar =
        selectionStart > 0 ?
            value.charAt(selectionStart-1) :
            '';

    if (/^[a-zA-Z]$/.test(lastchar)){
        // 単語の入力中なのでやめる
        return;
    }

    const {
        value: value2,
        position,
        changed,
    } = runReplace(value, selectionStart);

    if (changed){
        elm.value = value2;
        elm.selectionStart = position;
        elm.selectionEnd = position;
    }
}

