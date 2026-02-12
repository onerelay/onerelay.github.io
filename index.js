document.addEventListener('DOMContentLoaded', function() {
    const codeContent = `delete window.$;
let wp = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();

let ApplicationStreamingStore = Object.values(wp.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.Z;
let RunningGameStore, QuestsStore, ChannelStore, GuildChannelStore, FluxDispatcher, api;

if(!ApplicationStreamingStore) {
    ApplicationStreamingStore = Object.values(wp.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata)?.exports.A;
    RunningGameStore = Object.values(wp.c).find(x => x?.exports?.Ay?.getRunningGames)?.exports.Ay;
    QuestsStore = Object.values(wp.c).find(x => x?.exports?.A?.__proto__?.getQuest)?.exports.A;
    ChannelStore = Object.values(wp.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent)?.exports.A;
    GuildChannelStore = Object.values(wp.c).find(x => x?.exports?.Ay?.getSFWDefaultChannel)?.exports.Ay;
    FluxDispatcher = Object.values(wp.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue)?.exports.h;
    api = Object.values(wp.c).find(x => x?.exports?.Bo?.get)?.exports.Bo;
} else {
    RunningGameStore = Object.values(wp.c).find(x => x?.exports?.ZP?.getRunningGames)?.exports.ZP;
    QuestsStore = Object.values(wp.c).find(x => x?.exports?.Z?.__proto__?.getQuest)?.exports.Z;
    ChannelStore = Object.values(wp.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent)?.exports.Z;
    GuildChannelStore = Object.values(wp.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel)?.exports.ZP;
    FluxDispatcher = Object.values(wp.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue)?.exports.Z;
    api = Object.values(wp.c).find(x => x?.exports?.tn?.get)?.exports.tn;	
}

const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
let quests = [...QuestsStore.quests.values()].filter(x => 
    x.userStatus?.enrolledAt && 
    !x.userStatus?.completedAt && 
    new Date(x.config.expiresAt).getTime() > Date.now() && 
    supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y))
);

if (quests.length > 0) {
    quests = [quests[0]];
}

async function runSingleQuest() {
    if(quests.length === 0) {
        console.log("📭 No active quests found!");
        return;
    }

    const quest = quests[0];
    console.log(\`🚀 Starting Quest: \${quest.config.messages.questName}\`);
    
    await processSingleQuest(quest);
    
    console.log(\`✅ Quest Finished!\`);
}

function processSingleQuest(quest) {
    return new Promise(async (resolve, reject) => {
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
        const secondsNeeded = taskConfig.tasks[taskName].target;
        const secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        
        console.log(\`📋 Task: \${taskName}\`);
        console.log(\`📊 Starting at: \${secondsDone}/\${secondsNeeded} seconds\`);
        
        if(secondsDone >= secondsNeeded) {
            console.log("✅ Already completed!");
            resolve();
            return;
        }
        
        if(taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            await completeVideoQuestRealTime(quest, api, secondsNeeded, secondsDone);
            resolve();
        } else if(taskName === "PLAY_ON_DESKTOP") {
            console.log("🎮 Starting game spoofing...");
            await spoofGame(quest, taskName, resolve);
        } else if(taskName === "STREAM_ON_DESKTOP") {
            console.log("📺 Starting stream spoofing...");
            await spoofGame(quest, taskName, resolve); 
        } else if(taskName === "PLAY_ACTIVITY") {
            console.log("🎵 Starting play activity...");
            await startPlayActivity(quest);
            resolve();
        } else {
            resolve();
        }
    });
}

function completeVideoQuestRealTime(quest, api, secondsNeeded, secondsDone) {
    return new Promise(async (resolve) => {
        let currentProgress = secondsDone;
        while (currentProgress < secondsNeeded) {
            currentProgress += 1;
            try {
                const res = await api.post({
                    url: \`/quests/\${quest.id}/video-progress\`,
                    body: { timestamp: currentProgress }
                });
                if(res.body.completed_at) { resolve(); return; }
                
                if (currentProgress % 5 === 0) {
                    const percent = ((currentProgress / secondsNeeded) * 100).toFixed(1);
                    console.log(\`🎬 Video Progress: \${currentProgress}/\${secondsNeeded}s (\${percent}%)\`);
                }
                
                if (currentProgress >= secondsNeeded) { resolve(); return; }
            } catch (e) {
                console.warn("⚠️ Update failed, retrying...");
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    });
}

function spoofGame(quest, taskName, resolveCallback) {
    const applicationId = quest.config.application.id;
    const target = quest.config.taskConfig?.tasks?.[taskName]?.target || 
                  quest.config.taskConfigV2?.tasks?.[taskName]?.target || 0;
    
    console.log(\`🎯 Target: \${target} seconds\`);
    console.log(\`⚠️ Discord may reset progress if server doesn't detect the actual game running\`);
    
    api.get({url: \`/applications/public?application_ids=\${applicationId}\`}).then(res => {
        const appData = res.body[0];
        const exeName = appData.executables.find(x => x.os === "win32")?.name.replace(">","") || appData.name + ".exe";
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const startTime = Date.now() - (Math.floor(Math.random() * 60000));
        
        const fakeGame = {
            cmdLine: \`"C:\\\\Program Files\\\\\${appData.name}\\\\\${exeName}"\`,
            exeName,
            exePath: \`C:\\\\Program Files\\\\\${appData.name}\\\\\${exeName}\`,
            hidden: false,
            isLauncher: false,
            id: applicationId,
            name: appData.name,
            pid: pid,
            pidPath: [pid],
            processName: exeName.replace(".exe", ""),
            start: startTime,
            focused: true, 
            lastFocused: Date.now(),
            windowHandle: { value: Math.floor(Math.random() * 100000) + 10000 },
            windowTitle: appData.name,
            platform: "win32",
            type: 0
        };
        
        const realGames = RunningGameStore.getRunningGames();
        const fakeGames = [fakeGame];
        const realGetRunningGames = RunningGameStore.getRunningGames;
        const realGetGameForPID = RunningGameStore.getGameForPID;
        const realGetCandidateGames = RunningGameStore.getCandidateGames;
        
        RunningGameStore.getRunningGames = () => fakeGames;
        RunningGameStore.getCandidateGames = () => fakeGames;
        RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
        
        FluxDispatcher.dispatch({
            type: "RUNNING_GAMES_CHANGE", 
            removed: realGames, 
            added: [fakeGame], 
            games: fakeGames
        });
        
        console.log(\`✅ Spoofed game: \${appData.name}\`);
        console.log(\`📡 Waiting for Discord heartbeats...\`);
        
        const focusInterval = setInterval(() => {
            fakeGame.lastFocused = Date.now();
        }, 1000);
        
        const heartbeatListener = (data) => {
            const eventQuestId = data.questId || data.quest_id;
            if(eventQuestId && eventQuestId !== quest.id) return;

            let progress = data.userStatus?.progress?.[taskName]?.value;
            
            if (progress !== undefined) {
                const percent = ((progress / target) * 100).toFixed(1);
                console.log(\`📈 Progress: \${progress}/\${target} seconds (\${percent}%)\`);
                
                if (progress >= target) {
                    cleanup();
                    FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", heartbeatListener);
                    console.log(\`🎉 Quest completed!\`);
                    resolveCallback();
                }
            }
        };

        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", heartbeatListener);
        
        function cleanup() {
            clearInterval(focusInterval);
            RunningGameStore.getRunningGames = realGetRunningGames;
            RunningGameStore.getGameForPID = realGetGameForPID;
            RunningGameStore.getCandidateGames = realGetCandidateGames;
            
            FluxDispatcher.dispatch({
                type: "RUNNING_GAMES_CHANGE", 
                removed: [fakeGame], 
                added: [], 
                games: []
            });
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", heartbeatListener);
        }
        
        const maxTime = 15 * 60 * 1000; 
        setTimeout(() => {
            console.log("⏰ Time limit reached. Stopping...");
            cleanup();
            resolveCallback();
        }, maxTime);
        
    }).catch(error => {
        console.error("❌ Game spoof failed:", error);
        resolveCallback();
    });
}

function startPlayActivity(quest) {
    return new Promise(async (resolve) => {
        let channelId = ChannelStore.getSortedPrivateChannels()[0]?.id || "@me";
        const streamKey = \`call:\${channelId}:1\`;
        
        let lastProgress = quest.userStatus?.progress?.PLAY_ACTIVITY?.value || 0;
        const target = quest.config.taskConfig?.tasks?.PLAY_ACTIVITY?.target || 
                      quest.config.taskConfigV2?.tasks?.PLAY_ACTIVITY?.target || 0;
        
        console.log(\`⏰ Target: \${target} seconds\`);
        
        while (lastProgress < target) {
            try {
                const res = await api.post({
                    url: \`/quests/\${quest.id}/heartbeat\`,
                    body: { stream_key: streamKey, terminal: false }
                });
                
                if (res?.body?.progress?.PLAY_ACTIVITY?.value !== undefined) {
                    lastProgress = res.body.progress.PLAY_ACTIVITY.value;
                    const percent = ((lastProgress / target) * 100).toFixed(1);
                    console.log(\`📈 Activity Progress: \${lastProgress}/\${target} seconds (\${percent}%)\`);
                }
                
                if (lastProgress >= target) {
                    await api.post({
                        url: \`/quests/\${quest.id}/heartbeat\`,
                        body: { stream_key: streamKey, terminal: true }
                    });
                    resolve();
                    return;
                }
                await new Promise(r => setTimeout(r, 20 * 1000));
            } catch (error) {
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    });
}

runSingleQuest();`;

    function copyToClipboard() {
        const textArea = document.createElement('textarea');
        textArea.value = codeContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const copyButton = document.getElementById('copyButton');
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '✅ Copied!';
        copyButton.classList.add('copied');
        
        setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.classList.remove('copied');
        }, 2000);
    }

    function downloadCode() {
        const element = document.createElement('a');
        const file = new Blob([codeContent], {type: 'text/javascript'});
        element.href = URL.createObjectURL(file);
        element.download = 'discord-quest-automation.js';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    function printPage() {
        window.print();
    }

    document.getElementById('copyButton').addEventListener('click', copyToClipboard);
    document.getElementById('downloadButton').addEventListener('click', downloadCode);
    document.getElementById('printButton').addEventListener('click', printPage);
    
    const codeElement = document.getElementById('codeBlock');
    codeElement.innerHTML = highlightCode(codeContent);
});

function highlightCode(code) {
    return code
        .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
        .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>')
        .replace(/\b(const|let|var|function|async|await|return|new|if|else|try|catch|while|for|in|of)\b/g, '<span class="keyword">$&</span>')
        .replace(/\b(console|document|window|Date|Math|Object|Array|Promise|Symbol|Set|Map)\b/g, '<span class="builtin">$&</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span class="constant">$&</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$&</span>')
        .replace(/(\$\{.*?\})/g, '<span class="template">$&</span>')
        .replace(/(\.\w+)/g, '<span class="property">$&</span>');
}
