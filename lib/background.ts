// event page.
import {
    getConfig,
    setBadge,
} from './extension';

export function run(){
    chrome.runtime.onStartup.addListener(startup);
    chrome.runtime.onInstalled.addListener(startup);
}

function startup(){
    getConfig()
    .then(setBadge);
}
