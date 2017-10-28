// for popup pages.
import {
    Config,
} from './config';
import {
    getConfig,
    setConfig,
    setBadge,
} from './extension';


// toggle the on/off setting and return the setting after toggling.
async function toggleOnOff(): Promise<Config> {
    const config = await getConfig();
    config.enabled = !config.enabled;
    return await setConfig(config);
}

// run the popup page script.
export function run(){
    getConfig()
    .then(setStatus)
    .catch(err=>{
        console.error(err);
    });

    document.getElementById('toggle-button')!.addEventListener('click', ()=>{
        toggleOnOff()
        .then(setStatus)
        .then(populate)
        .then(setBadge);
    }, false);
}

/**
 * Enableness string
 */
function onoffString(enabled: boolean): string{
    return enabled ? '有効' : '無効';
}

function setStatus(config: Config): Config{
    const {
        enabled,
    } = config;
    document.getElementById('main')!.style.opacity = '1';
    document.getElementById('status')!.textContent = onoffString(enabled);
    const tb = document.getElementById('toggle-button')!;
    tb.textContent = `${onoffString(!enabled)}にする`;
    if (enabled){
        tb.classList.add('enabled');
    } else {
        tb.classList.remove('enabled');
    }
    return config;
}

/**
 * Populate config to active tabs.
 */
function populate(config: Config): Promise<Config>{
    return new Promise((resolve)=>{
        chrome.tabs.query({
            active: true,
        }, tabs=>{
            for (const {id} of tabs){
                chrome.tabs.sendMessage(id!, config);
            }
            resolve(config);
        });
    });
}
