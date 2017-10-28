// for content scripts.
import {
    handleInput,
} from './input';
import {
    Config,
} from './config';
import {
    getConfig,
} from './extension';

const handler = (e: Event)=>{
    const ta = e.target as HTMLInputElement;
    handleInput(ta);
};

let state = false;

// enable/disable extension.
export function enable(){
    if (state === false){
        state = true;
        document.addEventListener('input', handler);
    }
}
export function disable(){
    if (state === true){
        state = false;
        document.removeEventListener('input', handler);
    }
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
    // activeになったときに設定をロード（すこしてきとう）
    document.addEventListener('visibilitychange', ()=>{
        if (!document.hidden){
            getConfig()
                .then(({enabled})=>{
                    setEnabled(enabled);
                });
        }
    });
}
