// for content scripts.
import {
    handleInput,
} from './input';

export function run(){
    document.addEventListener('input', e=>{
        const ta = e.target as HTMLInputElement;
        handleInput(ta);
    });
}
