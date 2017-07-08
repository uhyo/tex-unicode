import {
    runReplace,
} from './replacement';

/**
 * elmで起きたinputイベントを処理
 */
export function handleInput(elm: HTMLElement): void{
    const nodes = getSelection(elm);

    for (const t of nodes){
        const {
            value,
            cursor,
        } = t;
        const lastchar =
            cursor > 0 ?
            value.charAt(cursor-1) :
            '';

        if (/^[a-zA-Z]$/.test(lastchar)){
            // 単語の入力中なのでやめる
            return;
        }

        const {
            value: value2,
            position,
            changed,
        } = runReplace(value, cursor);

        if (changed){
            if (t.type === 'input'){
                const input = t.node;
                input.value = value2;
                input.selectionStart = position;
                input.selectionEnd = position;
            }else{
                const {
                    node,
                    range,
                } = t;
                node.textContent = value2;
                // XXX
                const position2 = Math.min(value2.length, position);
                range.setStart(node, position2);
                range.setEnd(node, position2);
            }
        }
    }
}

interface InputSelection{
    type: 'input';
    cursor: number;
    value: string;
    node: HTMLInputElement;
}
interface TextSelection{
    type: 'text';
    cursor: number;
    value: string;
    node: Text;
    range: Range;
}

type Target = InputSelection | TextSelection;

function getSelection(elm: HTMLElement): Array<Target>{
    if (elm.tagName === 'INPUT' || elm.tagName === 'TEXTAREA'){
        const input = elm as HTMLInputElement;
        const {
            value,
            selectionStart,
        } = input;
        return [{
            type: 'input',
            value,
            cursor: selectionStart,
            node: input,
        }];
    }else{
        const {
            textContent,
        } = elm;

        const sel = window.getSelection();
        const range = sel.getRangeAt(0);
        if (range == null){
            return [];
        }

        // テキストノードを収集
        const result: Array<InputSelection> = [];
        collectTexts(elm, range, {
            cursorStart: false,
            cursorEnd: false,
        }, result);
        return result;
    }
}

export interface Flags{
    cursorStart: boolean;
    cursorEnd: boolean;
}
function collectTexts(elm: Node, range: Range, flags: Flags, result: Array<Target>): void{
    if (elm.nodeType === Node.TEXT_NODE){
        // textを発見した
        let check = false;
        let selectionStart = 0;
        if (range.startContainer === elm){
            check = true;
            selectionStart = range.startOffset;
        }else if (flags.cursorStart){
            check = true;
            selectionStart = 0;
        }else if (flags.cursorEnd){
            check = true;
            selectionStart = elm.nodeValue!.length;
        }

        if (check){
            const value = elm.nodeValue || '';
            if (/\S/.test(value)){
                result.push({
                    type: 'text',
                    value,
                    cursor: selectionStart,
                    node: elm as Text,
                    range,
                });
            }
        }
    }else if (elm.nodeType === Node.ELEMENT_NODE){
        // textではないので子を探す
        const {
            childNodes,
        } = elm;
        const l = childNodes.length;

        let selidx: number | null = null;
        let cursorStart = false;
        let cursorEnd = false;
        if (range.startContainer === elm){
            selidx = range.startOffset;
            cursorStart = true;
        }else if (flags.cursorStart){
            selidx = 0;
            cursorStart = true;
        }else if (flags.cursorEnd){
            selidx = l - 1;
            cursorEnd = true;
        }

        if (selidx != null){
            // 探索を決め打ち
            const child = childNodes[selidx];
            if (child == null){
                return;
            }

            collectTexts(child, range, {
                cursorStart,
                cursorEnd,
            }, result);
        }else{
            // 子を全部調べる
            for (let i = 0; i < l; i++){
                const child = childNodes[i];

                collectTexts(child, range, {
                    cursorStart: false,
                    cursorEnd: false,
                }, result);
            }
        }
    }
}
