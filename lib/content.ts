// for content scripts.
import {
    handleInput,
} from './input';
import {
    Config,
} from './config';

const handler = (e: Event)=>{
    const ta = e.target as HTMLInputElement;
    handleInput(ta);
};

// enable/disable extension.
export function enable(){
    document.addEventListener('input', handler);
}
export function disable(){
    document.removeEventListener('input', handler);
}

export function setEnabled(enabled: boolean){
    if (enabled){
        enable();
    } else {
        disable();
    }
}

export function run(){
    // 設定を読み込む
    chrome.storage.local.get('enabled', (items)=>{
        const {
            enabled,
        } = items;
        if (enabled === true || enabled == null){
            // 有効になっているか未設定の場合は有効化する
            enable();
        }
    });
    // popupからの通知
    chrome.runtime.onMessage.addListener(({enabled}: Config)=>{
        // enablednessが変わった
        setEnabled(enabled);
    });
}
