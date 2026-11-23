(function() {
  'use strict';

  const executionKey = '__DISCORD_QUEST_COMPLETER_RUNNING';
  const previousExecution = window[executionKey];
  if (typeof previousExecution?.cancel === 'function') previousExecution.cancel();

  const execution = {
    cancelled: false,
    cancelWaits: new Set(),
    cancel() {
      this.cancelled = true;
      this.cancelWaits.forEach(cancelWait => cancelWait());
    }
  };
  window[executionKey] = execution;
  sendUpdate('QUEST_DELAY', { remainingMs: 0 });

  function isCancelled() {
    return execution.cancelled || window[executionKey] !== execution;
  }

  function wait(milliseconds) {
    return new Promise(resolve => {
      if (isCancelled()) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        execution.cancelWaits.delete(cancelWait);
        resolve();
      }, milliseconds);
      const cancelWait = () => {
        clearTimeout(timer);
        execution.cancelWaits.delete(cancelWait);
        resolve();
      };
      execution.cancelWaits.add(cancelWait);
    });
  }

  function waitForWebpack(callback) {
    const checkInterval = 100;
    const maxAttempts = 100;
    let attempts = 0;

    const check = () => {
      if (isCancelled()) return;
      if (attempts >= maxAttempts) {
        callback(null);
        return;
      }

      if (typeof window.webpackChunkdiscord_app === 'undefined') {
        attempts++;
        wait(checkInterval).then(check);
        return;
      }

      try {
        const originalJQuery = window.$;
        delete window.$;

        const webpackRequire = window.webpackChunkdiscord_app.push([[Symbol()], {}, (require) => require]);
        window.webpackChunkdiscord_app.pop();

        if (originalJQuery) window.$ = originalJQuery;

        if (!webpackRequire || !webpackRequire.c || Object.keys(webpackRequire.c).length < 10) {
          attempts++;
          wait(checkInterval).then(check);
          return;
        }

        callback(webpackRequire);
      } catch (error) {
        attempts++;
        wait(checkInterval).then(check);
      }
    };

    check();
  }

  function findModule(webpackRequire, filter) {
    for (const module of Object.values(webpackRequire.c)) {
      if (module?.exports) {
        const exports = module.exports;
        if (exports.A && filter(exports.A)) return exports.A;
        if (exports.Ay && filter(exports.Ay)) return exports.Ay;
        if (exports.ZP && filter(exports.ZP)) return exports.ZP;
        if (filter(exports)) return exports;
      }
    }
    return null;
  }

  function sendUpdate(type, data) {
    window.postMessage({
      prefix: 'DISCORD_QUEST_COMPLETER',
      type: type,
      data: data
    }, '*');
  }

  async function runQuestCode(webpackRequire) {
    try {
      const version = window.__QUEST_VERSION || 'unknown';
      if ('__QUEST_VERSION' in window) {
        try { delete window.__QUEST_VERSION; } catch (e) {}
      }

      const delayConfig = window.__QUEST_DELAY_CONFIG || { enabled: true, min: 10, max: 30 };
      if ('__QUEST_DELAY_CONFIG' in window) {
        try { delete window.__QUEST_DELAY_CONFIG; } catch (e) {}
      }

      console.info(`Discord Auto Quest: Initializing... (v${version})`);

      const stores = loadStores(webpackRequire);
      if (!stores) return;

      const activeQuests = getActiveQuests(stores.QuestsStore);
      if (activeQuests.length === 0) {
        console.info("Discord Auto Quest: You don't have any uncompleted active quests!");
        return;
      }

      const questStates = activeQuests.map(quest => initializeQuestState(quest));

      sendUpdate('QUEST_LIST', questStates.map(state => ({
        id: state.quest.id,
        name: state.questName,
        progress: Math.floor(state.currentProgress),
        target: state.secondsNeeded,
        completed: state.completed,
        active: state.active
      })));

      for (let i = 0; i < questStates.length && !isCancelled(); i++) {
        const state = questStates[i];
        if (state.completed) continue;

        state.active = true;
        notifyUI(state, Math.floor(state.currentProgress), state.secondsNeeded, false);

        while (!state.completed && !isCancelled()) {
          const isVideo = state.taskType.startsWith("WATCH_VIDEO");

          if (isVideo) {
            await processVideoStep(state, stores.api);
            if (!state.completed && !isCancelled()) await wait(900 + (Math.random() * 1400));
          } else {
            await processHeartbeatStep(state, stores);
            if (!state.completed && !isCancelled()) await wait(20000 + (Math.random() * 2000));
          }
        }

        if (isCancelled()) return;
        const hasNextQuest = questStates.slice(i + 1).some(s => !s.completed);
        if (delayConfig.enabled && hasNextQuest) {
          const minMs = Math.max(0, Number(delayConfig.min) || 0) * 60000;
          const maxMs = Math.max(minMs, (Number(delayConfig.max) || 0) * 60000);
          const waitMs = minMs + Math.random() * (maxMs - minMs);
          const endTime = Date.now() + waitMs;

          while (Date.now() < endTime && !isCancelled()) {
            const remainingMs = endTime - Date.now();
            sendUpdate('QUEST_DELAY', { remainingMs });
            await wait(Math.min(1000, remainingMs));
          }
          if (isCancelled()) return;
          sendUpdate('QUEST_DELAY', { remainingMs: 0 });
        }
      }
    } catch (error) {
      console.error('Discord Auto Quest: quest loop crashed', error);
    }
  }


  function getActiveQuests(QuestsStore) {
    const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];

    return [...QuestsStore.quests.values()].filter(quest => {
      const isExpired = new Date(quest.config.expiresAt).getTime() <= Date.now();
      const isCompleted = !!quest.userStatus?.completedAt;
      const isEnrolled = !!quest.userStatus?.enrolledAt;
      const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
      const hasSupportedTask = supportedTasks.some(type => taskConfig.tasks[type] !== null);
      
      return isEnrolled && !isCompleted && !isExpired && hasSupportedTask;
    });
  }

  function initializeQuestState(quest) {
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
    const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
    const taskType = supportedTasks.find(type => taskConfig.tasks[type] != null);
    
    const taskData = taskConfig.tasks[taskType];
    const secondsNeeded = taskData?.target ?? 0;
    const currentProgress = quest.userStatus?.progress?.[taskType]?.value ?? quest.userStatus?.streamProgressSeconds ?? 0;

    return {
      quest,
      taskType,
      secondsNeeded,
      currentProgress,
      completed: currentProgress >= secondsNeeded,
      active: false,
      enrolledAt: new Date(quest.userStatus.enrolledAt).getTime(),
      questName: quest.config.messages.questName
    };
  }

  function loadStores(webpackRequire) {
    try {
      const QuestsStore = findModule(webpackRequire, m => m.__proto__?.getQuest);
      const ChannelStore = findModule(webpackRequire, m => m.__proto__?.getAllThreadsForParent);
      const GuildChannelStore = findModule(webpackRequire, m => m.getSFWDefaultChannel);
      const api = findModule(webpackRequire, m => m.Bo?.get || m.tn?.get);

      if (!QuestsStore || !api) return null;

      return { QuestsStore, ChannelStore, GuildChannelStore, api: api.Bo || api.tn || api };
    } catch (error) {
      console.warn('Discord Auto Quest: failed to locate internal Discord stores', error);
      return null;
    }
  }

  const notifyUI = (state, progress, target, completed) => {
    const { quest, active } = state;
    sendUpdate('QUEST_UPDATE', { id: quest.id, name: quest.config.messages.questName, progress, target, completed, active });
  };

  async function processVideoStep(state, api) {
    const { quest, secondsNeeded, currentProgress } = state;
    const speed = 0.7 + Math.random() * 0.8;

    const nextTime = Math.min(secondsNeeded, currentProgress + speed);

    try {
      const res = await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: nextTime } });
      if (isCancelled()) return;

      state.currentProgress = nextTime;
      notifyUI(state, Math.floor(state.currentProgress), secondsNeeded, false);

      if (res.body.completed_at !== null || state.currentProgress >= secondsNeeded) {
        state.completed = true;
        state.active = false;
        notifyUI(state, secondsNeeded, secondsNeeded, true);
        await api.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: secondsNeeded } });
      }
    } catch (error) {
      console.warn(`Discord Auto Quest: video-progress request failed for quest ${quest.id}`, error);
    }
  }

  async function processHeartbeatStep(state, stores) {
    const { api, ChannelStore, GuildChannelStore } = stores;
    const { quest, taskType, secondsNeeded } = state;

    let channelId = ChannelStore?.getSortedPrivateChannels()[0]?.id;
    if (!channelId && GuildChannelStore) {
      const guilds = Object.values(GuildChannelStore.getAllGuilds());
      const voice = guilds.find(g => g?.VOCAL?.length > 0);
      if (voice) channelId = voice.VOCAL[0].channel.id;
    }

    const streamKey = channelId ? `call:${channelId}:1` : `call:${quest.id}:1`;

    try {
      const response = await api.post({
        url: `/quests/${quest.id}/heartbeat`,
        body: { stream_key: streamKey, terminal: false }
      });
      if (isCancelled()) return;

      const serverProgress = response.body?.progress?.[taskType]?.value ?? 0;
      state.currentProgress = serverProgress;
      notifyUI(state, Math.floor(state.currentProgress), secondsNeeded, state.currentProgress >= secondsNeeded);

      if (state.currentProgress >= secondsNeeded) {
        await api.post({
          url: `/quests/${quest.id}/heartbeat`,
          body: { stream_key: streamKey, terminal: true }
        });
        state.completed = true;
        state.active = false;
        notifyUI(state, secondsNeeded, secondsNeeded, true);
      }
    } catch (error) {
      console.warn(`Discord Auto Quest: heartbeat request failed for quest ${quest.id}`, error);
    }
  }

  waitForWebpack(webpackRequire => {
    if (!webpackRequire) {
      if (window[executionKey] === execution) delete window[executionKey];
      return;
    }

    runQuestCode(webpackRequire).finally(() => {
      if (window[executionKey] === execution) delete window[executionKey];
    });
  });
})();
