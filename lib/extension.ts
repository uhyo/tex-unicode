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

// set extension badge.
export function setBadge(config: Config): Config{
    chrome.browserAction.setBadgeText({
        text: config.enabled ? 'ON' : '',
    });
    chrome.browserAction.setBadgeBackgroundColor({
        color: config.enabled ? '#007700' : '#FF3333',
    });
    return config;
}
