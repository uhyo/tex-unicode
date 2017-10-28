// for popup pages.
import {
    Config,
} from './config';

// get current on/off state.
function getOnOff(): Promise<boolean> {
    return new Promise((resolve)=>{
        chrome.storage.local.get('enabled', (items)=>{
            const {
                enabled,
            } = items;
            resolve(enabled === true || enabled == null);
        });
    });
}

// toggle the on/off setting and return the setting after toggling.
function toggleOnOff(): Promise<boolean> {
    return getOnOff()
    .then(enabled=>{
        return new Promise<boolean>((resolve)=>{
            const changed = enabled === true || enabled == null ? false : true;

            chrome.storage.local.set({
                enabled: changed,
            }, ()=> resolve(changed));
        });
    });
}

// run the popup page script.
export function run(){
    getOnOff()
    .then(enabled=>{
        setStatus(enabled);
    })
    .catch(err=>{
        console.error(err);
    });

    document.getElementById('toggle-button')!.addEventListener('click', ()=>{
        toggleOnOff()
        .then(setStatus)
        .then(enabled=> populate({enabled}));
    }, false);
}

/**
 * Enableness string
 */
function onoffString(enabled: boolean): string{
    return enabled ? '有効' : '無効';
}

function setStatus(enabled: boolean): boolean{
    document.getElementById('main')!.style.opacity = '1';
    document.getElementById('status')!.textContent = onoffString(enabled);
    const tb = document.getElementById('toggle-button')!;
    tb.textContent = `${onoffString(!enabled)}にする`;
    if (enabled){
        tb.classList.add('enabled');
    } else {
        tb.classList.remove('enabled');
    }
    return enabled;
}

/**
 * Populate config to active tabs.
 */
function populate(config: Config): Promise<boolean>{
    return new Promise((resolve)=>{
        chrome.tabs.query({
            active: true,
        }, tabs=>{
            for (const {id} of tabs){
                chrome.tabs.sendMessage(id!, config);
            }
            resolve(config.enabled);
        });
    });
}
