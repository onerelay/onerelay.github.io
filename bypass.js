console.log('🎮 Discord Quest Completer (REAL TIME)');
delete window.$;
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

if(quests.length === 0) {
    console.log("📭 No active quests!");
} else {
    console.log(`🎯 Found ${quests.length} quest(s)`);
    
    quests.forEach((quest, i) => {
        console.log(`\n[${i+1}] ${quest.config.messages.questName}`);
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
        const secondsNeeded = taskConfig.tasks[taskName].target;
        const secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;
        
        console.log(`📋 Task: ${taskName}`);
        console.log(`📊 Current: ${secondsDone}/${secondsNeeded} seconds`);
        console.log(`⏰ Time needed: ${Math.ceil((secondsNeeded - secondsDone) / 60)} minutes`);
        
        if(secondsDone >= secondsNeeded) {
            console.log("✅ Already completed!");
            return;
        }
        
        if(taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            console.log("🎥 Starting video quest (REAL TIME)...");
            completeVideoQuestRealTime(quest, api, secondsNeeded, secondsDone);
        } else if(taskName === "PLAY_ON_DESKTOP") {
            console.log("🎮 Starting game spoofing...");
            spoofGame(quest);
        } else if(taskName === "STREAM_ON_DESKTOP") {
            console.log("📺 Starting stream spoofing...");
            spoofStream(quest);
        } else if(taskName === "PLAY_ACTIVITY") {
            console.log("🎵 Starting play activity...");
            console.log("ℹ️ This simulates being in a Discord Activity");
            startPlayActivity(quest);
        }
    });
}

function completeVideoQuestRealTime(quest, api, secondsNeeded, secondsDone) {
    let currentProgress = secondsDone;
    
    const complete = async () => {
        while (currentProgress < secondsNeeded) {
            // Progress 1 second per real second
            currentProgress += 1;
            
            try {
                const res = await api.post({
                    url: `/quests/${quest.id}/video-progress`,
                    body: { timestamp: currentProgress }
                });
                
                if(res.body.completed_at) {
                    console.log("✅ Video quest completed!");
                    return;
                }
                
                // Show progress every 30 seconds
                if (currentProgress % 30 === 0 || currentProgress >= secondsNeeded) {
                    console.log(`📊 Progress: ${currentProgress}/${secondsNeeded} seconds`);
                }
                
                if (currentProgress >= secondsNeeded) {
                    console.log("✅ Reached target!");
                    return;
                }
            } catch (e) {
                console.warn("⚠️ Update failed:", e.message);
            }
            
            // Wait 1 REAL second
            await new Promise(r => setTimeout(r, 1000));
        }
    };
    
    complete();
}

// Game spoofing function (same as before, uses Discord's natural heartbeat)
function spoofGame(quest) {
    const applicationId = quest.config.application.id;
    
    api.get({url: `/applications/public?application_ids=${applicationId}`}).then(res => {
        const appData = res.body[0];
        const exeName = appData.executables.find(x => x.os === "win32").name.replace(">","");
        
        const fakeGame = {
            cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
            exeName,
            exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
            hidden: false,
            isLauncher: false,
            id: applicationId,
            name: appData.name,
            pid: Math.floor(Math.random() * 30000) + 1000,
            pidPath: [pid],
            processName: appData.name,
            start: Date.now(),
        };
        
        const realGames = RunningGameStore.getRunningGames();
        const fakeGames = [fakeGame];
        const realGetRunningGames = RunningGameStore.getRunningGames;
        const realGetGameForPID = RunningGameStore.getGameForPID;
        
        RunningGameStore.getRunningGames = () => fakeGames;
        RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
        
        FluxDispatcher.dispatch({
            type: "RUNNING_GAMES_CHANGE", 
            removed: realGames, 
            added: [fakeGame], 
            games: fakeGames
        });
        
        console.log(`✅ Spoofed game: ${appData.name}`);
        
        // Monitor completion
        const unsubscribe = FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", (data) => {
            const progress = data.userStatus?.progress?.PLAY_ON_DESKTOP?.value || 
                           data.userStatus?.streamProgressSeconds || 0;
            const target = quest.config.taskConfig?.tasks?.PLAY_ON_DESKTOP?.target || 
                          quest.config.taskConfigV2?.tasks?.PLAY_ON_DESKTOP?.target || 0;
            
            if (progress % 60 === 0) { // Log every minute
                console.log(`📊 Game progress: ${Math.floor(progress/60)}/${Math.floor(target/60)} minutes`);
            }
            
            if (progress >= target) {
                console.log("✅ Game quest completed! Cleaning up...");
                cleanup();
                unsubscribe();
            }
        });
        
        function cleanup() {
            RunningGameStore.getRunningGames = realGetRunningGames;
            RunningGameStore.getGameForPID = realGetGameForPID;
            FluxDispatcher.dispatch({
                type: "RUNNING_GAMES_CHANGE", 
                removed: [fakeGame], 
                added: [], 
                games: []
            });
            console.log("🔄 Cleanup completed");
        }
        
        // Backup cleanup
        setTimeout(() => {
            cleanup();
            unsubscribe?.();
        }, 30 * 60 * 1000);
        
    }).catch(error => console.error("❌ Game spoof failed:", error));
}

// Play Activity function
function startPlayActivity(quest) {
    let channelId = ChannelStore.getSortedPrivateChannels()[0]?.id;
    if (!channelId) {
        channelId = "@me"; // Default to DM
    }
    
    const streamKey = `call:${channelId}:1`;
    console.log(`🔗 Simulating activity in channel: ${channelId}`);
    
    let lastProgress = quest.userStatus?.progress?.PLAY_ACTIVITY?.value || 0;
    const target = quest.config.taskConfig?.tasks?.PLAY_ACTIVITY?.target || 
                  quest.config.taskConfigV2?.tasks?.PLAY_ACTIVITY?.target || 0;
    
    console.log(`⏰ Will take ${Math.ceil((target - lastProgress) / 60)} minutes`);
    
    const complete = async () => {
        while (lastProgress < target) {
            try {
                const res = await api.post({
                    url: `/quests/${quest.id}/heartbeat`,
                    body: { stream_key: streamKey, terminal: false }
                });
                
                if (res?.body?.progress?.PLAY_ACTIVITY?.value !== undefined) {
                    lastProgress = res.body.progress.PLAY_ACTIVITY.value;
                    
                    // Log every minute
                    if (lastProgress % 60 === 0 || lastProgress >= target) {
                        console.log(`📊 Activity progress: ${lastProgress}/${target} seconds`);
                    }
                }
                
                if (lastProgress >= target) {
                    await api.post({
                        url: `/quests/${quest.id}/heartbeat`,
                        body: { stream_key: streamKey, terminal: true }
                    });
                    console.log("✅ Play activity completed!");
                    return;
                }
                
                // Wait 20 seconds between heartbeats (Discord's normal rate)
                await new Promise(r => setTimeout(r, 20 * 1000));
            } catch (error) {
                console.warn("⚠️ Heartbeat failed, retrying...", error.message);
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    };
    
    complete();
}
