// Common functions for Chrome extension.
import {
    Config,
} from './config';

// get current on/off state.
export function getConfig(): Promise<Config> {
    return new Promise((resolve)=>{
        chrome.storage.local.get('enabled', (items)=>{
            // enabledのデフォルトはtrue
            items.enabled = items.enabled === true || items.enabled == null;
            resolve(items as Config);
        });
    });
}

export function setConfig(config: Config): Promise<Config> {
    return new Promise(resolve=>{
        chrome.storage.local.set(config, ()=> resolve(config));
    });
}
