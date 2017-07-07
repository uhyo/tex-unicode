import {
    handleInput,
} from './input';

document.addEventListener('input', e=>{
    const ta = e.target as HTMLInputElement;
    handleInput(ta);
});
