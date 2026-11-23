(function() {
  'use strict';

  let isPanelExpanded = false;
  let expandButtonReference;
  const questStateCache = new Map();
  const LANGUAGE_STORAGE_KEY = 'autoQuestLanguage';
  const LANGUAGES = {
    fr: {
      flag: 'assets/frflag.png',
      label: 'Français',
      activate: 'Activer Auto Quest',
      running: 'Quête(s) en cours...',
      extensionError: 'Erreur extension',
      error: 'Erreur',
      codeExecuted: 'Code exécuté',
      delayLabel: 'Délai aléatoire entre les quêtes',
      between: 'Entre',
      and: 'et',
      minutes: 'min',
      invalidDelay: 'La deuxième valeur doit être supérieure à la première',
      nextQuestIn: '⏳ Prochaine quête dans'
    },
    en: {
      flag: 'assets/gbflag.png',
      label: 'English',
      activate: 'Enable Auto Quest',
      running: 'Quest(s) in progress...',
      extensionError: 'Extension error',
      error: 'Error',
      codeExecuted: 'Code executed',
      delayLabel: 'Random delay between quests',
      between: 'Between',
      and: 'and',
      minutes: 'min',
      invalidDelay: 'The second value must be greater than the first',
      nextQuestIn: '⏳ Next quest in'
    },
    es: {
      flag: 'assets/esflag.png',
      label: 'Español',
      activate: 'Activar Auto Quest',
      running: 'Misiones en curso...',
      extensionError: 'Error de la extensión',
      error: 'Error',
      codeExecuted: 'Código ejecutado',
      delayLabel: 'Retraso aleatorio entre misiones',
      between: 'Entre',
      and: 'y',
      minutes: 'min',
      invalidDelay: 'El segundo valor debe ser mayor que el primero',
      nextQuestIn: '⏳ Próxima misión en'
    }
  };
  let currentLanguage = 'en';

  const STYLES = {
    button: `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      background: white;
      color: black;
      border: none;
      border-radius: 10px;
      padding: 8px 16px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 600;
      width: 220px;
    `,
    icon: `
      width: 15px;
      height: 15px;
    `,
    text: `
      flex: 1;
      text-align: center;
      white-space: nowrap;
    `,
    expandButton: `
      background: rgba(218, 218, 218, 0.1);
      border: 1px solid #eeededff;
      border-radius: 4px;
      color: black;
      cursor: pointer;
      font-size: 12px;
      padding: 2px 7px;
      margin-left: 4px;
      transition: transform 0.3s ease;
      transform: rotate(0deg);
    `,
    panel: `
      position: fixed;
      bottom: 65px;
      right: 20px;
      z-index: 9999;
      background: black;
      color: white;
      border-radius: 10px;
      padding: 16px;
      width: 290px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    `,
    questList: `
      margin-bottom: 5px;
      max-height: 200px;
      overflow-y: auto;
    `,
    questItem: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    `,
    questName: `
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: 8px;
      color: #eee;
    `,
    questProgress: `
      font-family: monospace;
      color: #aaa;
      font-size: 12px;
    `,
    delaySection: `
      margin-top: 12px;
      padding-top: 12px;
      padding-bottom: 0px;
      border-top: 1px solid #333;
    `,
    delayLabel: `
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #eee;
      cursor: pointer;
      user-select: none;
    `,
    delayCheckbox: `
      width: 14px;
      height: 14px;
      accent-color: #5c6fff;
      cursor: pointer;
      flex-shrink: 0;
    `,
    delayInputsOuter: `
      display: grid;
      grid-template-rows: 0fr;
      opacity: 0;
      overflow: hidden;
      transition: grid-template-rows 0.3s ease, opacity 0.25s ease;
    `,
    delayInputsInner: `
      min-height: 0;
      overflow: hidden;
      transform: scale(0.85);
      transform-origin: top;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    `,
    delayInputRow: `
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #aaa;
      padding-top: 10px;
    `,
    delayInput: `
      width: 48px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 4px;
      color: white;
      padding: 4px;
      font-size: 12px;
      text-align: center;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    `,
    delayError: `
      color: #ff5555;
      font-size: 11px;
      margin-top: 4px;
      display: none;
    `,
    delayStatus: `
      font-size: 12px;
      color: #eee;
      background: rgba(67, 181, 129, 0.1);
      border: 1px solid rgba(67, 181, 129, 0.4);
      border-radius: 6px;
      padding: 6px 8px;
      margin-bottom: 8px;
      display: none;
    `
  };

  const DELAY_STORAGE_KEY = 'autoQuestDelayConfig';
  let delayConfig = { enabled: true, min: 10, max: 30 };
  let buttonMessageKey = 'activate';

  function translate(key) {
    return LANGUAGES[currentLanguage][key];
  }

  function loadLanguage() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    chrome.storage.local.get([LANGUAGE_STORAGE_KEY], (result) => {
      if (result && LANGUAGES[result[LANGUAGE_STORAGE_KEY]]) {
        currentLanguage = result[LANGUAGE_STORAGE_KEY];
      }
      applyLanguage();
    });
  }

  function applyLanguage() {
    const buttonLabel = document.querySelector('#DiscordQuestButton .discord-quest-button-label');
    if (buttonLabel) buttonLabel.textContent = translate(buttonMessageKey);

    const delayLabel = document.getElementById('DiscordQuestDelayLabel');
    if (delayLabel) delayLabel.textContent = translate('delayLabel');
    const betweenLabel = document.getElementById('DiscordQuestDelayBetween');
    if (betweenLabel) betweenLabel.textContent = translate('between');
    const andLabel = document.getElementById('DiscordQuestDelayAnd');
    if (andLabel) andLabel.textContent = translate('and');
    const minutesLabel = document.getElementById('DiscordQuestDelayMinutes');
    if (minutesLabel) minutesLabel.textContent = translate('minutes');
    const delayError = document.getElementById('DiscordQuestDelayError');
    if (delayError) delayError.textContent = translate('invalidDelay');

    const languageButton = document.getElementById('DiscordQuestLanguageButton');
    if (languageButton) {
      languageButton.querySelector('img').src = chrome.runtime.getURL(translate('flag'));
      languageButton.title = translate('label');
      languageButton.setAttribute('aria-label', translate('label'));
    }
    const status = document.getElementById('DiscordQuestDelayStatus');
    if (status && status.dataset.remainingMs) {
      updateDelayStatus(Number(status.dataset.remainingMs));
    }
  }

  function setLanguage(language) {
    if (!LANGUAGES[language]) return;
    currentLanguage = language;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [LANGUAGE_STORAGE_KEY]: language });
    }
    applyLanguage();
    const menu = document.getElementById('DiscordQuestLanguageMenu');
    if (menu) menu.style.display = 'none';
  }

  function loadDelayConfig(callback) {
    if (typeof chrome === 'undefined' || !chrome.storage) { callback(delayConfig); return; }
    chrome.storage.local.get([DELAY_STORAGE_KEY], (result) => {
      if (result && result[DELAY_STORAGE_KEY]) {
        delayConfig = { ...delayConfig, ...result[DELAY_STORAGE_KEY] };
      }
      callback(delayConfig);
    });
  }

  function saveDelayConfig() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    chrome.storage.local.set({ [DELAY_STORAGE_KEY]: delayConfig });
  }

  function createQuestButton() {
    if (!window.location.pathname.includes('/quest-home')) {
      removeElements();
      return;
    }
    
    if (document.getElementById('DiscordQuestButton')) {return;}

    const button = document.createElement('div');
    button.id = 'DiscordQuestButton';
    button.style.cssText = STYLES.button;

    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('assets/quest-icon.svg');
    icon.alt = 'Quest Icon';
    icon.style.cssText = STYLES.icon;
    button.appendChild(icon);

    const textLabel = document.createElement('span');
    textLabel.className = 'discord-quest-button-label';
    textLabel.textContent = translate('activate');
    textLabel.style.cssText = STYLES.text;
    button.appendChild(textLabel);

    const expandButton = document.createElement('button');
    const arrowIcon = document.createElement('img');
    arrowIcon.src = chrome.runtime.getURL('assets/expand-arrow.svg');
    arrowIcon.style.cssText = 'width: 10px; height: 10px; display: block; pointer-events: none;';
    expandButton.appendChild(arrowIcon);
    expandButton.style.cssText = STYLES.expandButton + ' padding: 4px; display: flex; align-items: center; justify-content: center;';
    expandButton.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    button.appendChild(expandButton);
    expandButtonReference = expandButton;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    });

    button.addEventListener('click', () => handleButtonClick(button, textLabel, icon, expandButton));

    document.body.appendChild(button);

    if (isPanelExpanded) {
      createExpandedPanel();
    }
  }

  function handleButtonClick(button, textLabel, icon, expandButton) {
    const elements = { button, textLabel, icon, expandButton };

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      updateButtonState(elements, { messageKey: 'extensionError', bgColor: '#ff4444', textColor: 'white', invertIcons: true });
      return;
    }

    chrome.runtime.sendMessage({ action: 'executeQuestCode', delayConfig }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Discord Auto Quest Error:', chrome.runtime.lastError);
        updateButtonState(elements, { messageKey: 'error', bgColor: 'black', textColor: 'white', invertIcons: true });
      } else if (response && response.success) {
        updateButtonState(elements, { messageKey: 'codeExecuted', bgColor: 'black', textColor: 'white', invertIcons: true });
      } else {
        updateButtonState(elements, { messageKey: 'error', bgColor: 'black', textColor: 'white', invertIcons: true });
      }
    });
  }

  function updateButtonState(elements, state) {
    const { button, textLabel, icon, expandButton } = elements;
    const { messageKey, bgColor, textColor, invertIcons } = state;

    buttonMessageKey = messageKey;
    textLabel.textContent = translate(messageKey);
    button.style.background = bgColor;
    button.style.color = textColor;
    
    if (invertIcons) {
      icon.style.filter = 'brightness(0) invert(1)';
      expandButton.style.filter = 'brightness(0) invert(1)';
    }

    setTimeout(() => {
      buttonMessageKey = 'running';
      textLabel.textContent = translate(buttonMessageKey);
      button.style.background = 'white';
      button.style.color = 'black';
      icon.style.filter = '';
      expandButton.style.filter = '';
    }, 2000);
  }

  function createExpandedPanel() {
    if (document.getElementById('DiscordQuestPanel')) {return;}

    if (!document.getElementById('DiscordQuestGlowStyles')) {
      const style = document.createElement('style');
      style.id = 'DiscordQuestGlowStyles';
      style.textContent = `
        @keyframes discordQuestGlow {
          0%, 100% { text-shadow: 0 0 3px rgba(88, 166, 255, 0.7), 0 0 7px rgba(88, 166, 255, 0.4); }
          50% { text-shadow: 0 0 6px rgba(88, 166, 255, 1), 0 0 14px rgba(88, 166, 255, 0.8); }
        }
        .discord-quest-active { color: #fff !important; animation: discordQuestGlow 1.5s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.id = 'DiscordQuestPanel';
    panel.style.cssText = STYLES.panel;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;';

    const title = document.createElement('h3');
    title.textContent = 'Auto Quest';
    title.style.cssText = 'margin: 0; font-size: 16px; font-weight: bold;';
    header.appendChild(title);

    const languageControl = document.createElement('div');
    languageControl.style.cssText = 'position: relative;';

    const languageButton = document.createElement('button');
    languageButton.id = 'DiscordQuestLanguageButton';
    languageButton.type = 'button';
    languageButton.style.cssText = 'width: 30px; height: 24px; display: flex; align-items: center; justify-content: center; padding: 2px; border: 1px solid #444; border-radius: 4px; background: #1e1e1e; cursor: pointer;';
    const selectedFlag = document.createElement('img');
    selectedFlag.style.cssText = 'width: 22px; height: 16px; object-fit: cover;';
    languageButton.appendChild(selectedFlag);
    languageButton.addEventListener('click', () => {
      const menu = document.getElementById('DiscordQuestLanguageMenu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    languageControl.appendChild(languageButton);

    const languageMenu = document.createElement('div');
    languageMenu.id = 'DiscordQuestLanguageMenu';
    languageMenu.style.cssText = 'display: none; position: absolute; top: 28px; right: 0; z-index: 1; padding: 4px; background: #1e1e1e; border: 1px solid #444; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.4);';
    ['fr', 'en', 'es'].forEach(language => {
      const option = document.createElement('button');
      option.type = 'button';
      option.title = LANGUAGES[language].label;
      option.setAttribute('aria-label', LANGUAGES[language].label);
      option.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 30px; height: 24px; padding: 2px; border: 0; background: transparent; cursor: pointer;';
      const flag = document.createElement('img');
      flag.src = chrome.runtime.getURL(LANGUAGES[language].flag);
      flag.style.cssText = 'width: 22px; height: 16px; object-fit: cover;';
      option.appendChild(flag);
      option.addEventListener('click', () => setLanguage(language));
      languageMenu.appendChild(option);
    });
    languageControl.appendChild(languageMenu);
    header.appendChild(languageControl);
    panel.appendChild(header);

    const delayStatus = document.createElement('div');
    delayStatus.id = 'DiscordQuestDelayStatus';
    delayStatus.style.cssText = STYLES.delayStatus;
    panel.appendChild(delayStatus);

    const questListContainer = document.createElement('div');
    questListContainer.id = 'DiscordQuestList';
    questListContainer.style.cssText = STYLES.questList;
    
    if (questStateCache.size > 0) {
      questStateCache.forEach(quest => updateQuestItemUI(questListContainer, quest));
    }
    
    panel.appendChild(questListContainer);

    panel.appendChild(createDelaySection());

    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top: 12px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px;';

    const credit = document.createElement('p');
    credit.style.cssText = 'margin: 0; font-size: 10px; color: #ccc; flex: 1;';
    credit.innerHTML = 'Credits by <a href="https://github.com/nvckai/Discord-Web-Auto-Quest-Extension" target="_blank" style="color: #fff; font-weight: bold; text-decoration: none;">6Together9</a> — Modified by <a href="https://github.com/13MrBlackCat13/Discord-Web-Auto-Quest-Extension" target="_blank" style="color: #fff; font-weight: bold; text-decoration: none;">13MrBlackCat13</a>';
    footer.appendChild(credit);

    const versionLabel = document.createElement('span');
    versionLabel.style.cssText = 'font-size: 9px; color: #fff; opacity: 0.4; white-space: nowrap; flex-shrink: 0;';
    versionLabel.textContent = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) ? `v${chrome.runtime.getManifest().version}` : '';
    footer.appendChild(versionLabel);

    panel.appendChild(footer);

    document.body.appendChild(panel);
    applyLanguage();
  }

  window.addEventListener('message', ({ source, data }) => {
    if (source !== window || !data || data.prefix !== 'DISCORD_QUEST_COMPLETER') { return; }

    const listContainer = document.getElementById('DiscordQuestList');

    if (data.type === 'QUEST_LIST') {
      questStateCache.clear();
      data.data.forEach(q => questStateCache.set(q.id, q));
      if (listContainer) {
        listContainer.innerHTML = ''; 
        data.data.forEach(q => updateQuestItemUI(listContainer, q));
      }
    } else if (data.type === 'QUEST_UPDATE') {
      questStateCache.set(data.data.id, data.data);
      if (listContainer) { updateQuestItemUI(listContainer, data.data); }
    } else if (data.type === 'QUEST_DELAY') {
      updateDelayStatus(data.data.remainingMs);
    }
  });

  function updateDelayStatus(remainingMs) {
    const statusEl = document.getElementById('DiscordQuestDelayStatus');
    if (!statusEl) return;

    if (!remainingMs || remainingMs <= 0) {
      delete statusEl.dataset.remainingMs;
      statusEl.style.display = 'none';
      return;
    }

    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formatted = `${minutes}:${String(seconds).padStart(2, '0')}`;

    statusEl.dataset.remainingMs = remainingMs;
    statusEl.textContent = `${translate('nextQuestIn')} ${formatted}`;
    statusEl.style.display = 'block';
  }

  function updateQuestItemUI(container, quest) {
    let item = document.getElementById(`quest-item-${quest.id}`);
    
    if (!item) {
      item = document.createElement('div');
      item.id = `quest-item-${quest.id}`;
      item.style.cssText = STYLES.questItem;
      item.innerHTML = `
        <span style="${STYLES.questName}" title="${quest.name}">${quest.name}</span>
        <span id="quest-progress-${quest.id}" style="${STYLES.questProgress}"></span>
      `;
      container.appendChild(item);
    }

    const nameSpan = item.querySelector('span');
    if (nameSpan) {
      nameSpan.classList.toggle('discord-quest-active', !!quest.active);
      nameSpan.style.fontWeight = quest.active ? '600' : '';
    }

    const progressSpan = item.querySelector(`#quest-progress-${quest.id}`);
    if (progressSpan) {
      progressSpan.textContent = quest.completed ? '✓' : `${quest.progress}/${quest.target}`;
      progressSpan.style.color = quest.completed ? '#43b581' : '#aaa';
      item.style.opacity = quest.completed ? '0.5' : '1';
    }
  }

  function createDelaySection() {
    const section = document.createElement('div');
    section.style.cssText = STYLES.delaySection;

    const label = document.createElement('label');
    label.style.cssText = STYLES.delayLabel;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'DiscordQuestDelayCheckbox';
    checkbox.style.cssText = STYLES.delayCheckbox;
    label.appendChild(checkbox);
    const delayLabel = document.createElement('span');
    delayLabel.id = 'DiscordQuestDelayLabel';
    delayLabel.textContent = translate('delayLabel');
    label.appendChild(delayLabel);
    section.appendChild(label);

    const outer = document.createElement('div');
    outer.id = 'DiscordQuestDelayInputs';
    outer.style.cssText = STYLES.delayInputsOuter;

    const inner = document.createElement('div');
    inner.style.cssText = STYLES.delayInputsInner;

    const row = document.createElement('div');
    row.style.cssText = STYLES.delayInputRow;

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.min = '0';
    minInput.id = 'DiscordQuestDelayMin';
    minInput.style.cssText = STYLES.delayInput;

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.min = '0';
    maxInput.id = 'DiscordQuestDelayMax';
    maxInput.style.cssText = STYLES.delayInput;

    const betweenLabel = document.createElement('span');
    betweenLabel.id = 'DiscordQuestDelayBetween';
    betweenLabel.textContent = translate('between');
    row.appendChild(betweenLabel);
    row.appendChild(minInput);
    const andLabel = document.createElement('span');
    andLabel.id = 'DiscordQuestDelayAnd';
    andLabel.textContent = translate('and');
    row.appendChild(andLabel);
    row.appendChild(maxInput);
    const minutesLabel = document.createElement('span');
    minutesLabel.id = 'DiscordQuestDelayMinutes';
    minutesLabel.textContent = translate('minutes');
    row.appendChild(minutesLabel);
    inner.appendChild(row);

    const error = document.createElement('div');
    error.id = 'DiscordQuestDelayError';
    error.style.cssText = STYLES.delayError;
    error.textContent = translate('invalidDelay');
    inner.appendChild(error);

    outer.appendChild(inner);
    section.appendChild(outer);

    function setExpanded(expanded) {
      outer.style.gridTemplateRows = expanded ? '1fr' : '0fr';
      outer.style.opacity = expanded ? '1' : '0';
      inner.style.transform = expanded ? 'scale(1)' : 'scale(0.85)';
    }

    function validate() {
      const min = parseFloat(minInput.value);
      const max = parseFloat(maxInput.value);
      const isInvalid = isNaN(min) || isNaN(max) || max <= min;

      [minInput, maxInput].forEach(input => {
        input.style.borderColor = isInvalid ? '#ff5555' : '#444';
        input.style.boxShadow = isInvalid ? '0 0 0 1px rgba(255,85,85,0.4)' : 'none';
      });
      error.style.display = isInvalid ? 'block' : 'none';
      return !isInvalid;
    }

    function persist() {
      delayConfig.enabled = checkbox.checked;
      delayConfig.min = parseFloat(minInput.value) || delayConfig.min;
      delayConfig.max = parseFloat(maxInput.value) || delayConfig.max;
      saveDelayConfig();
    }

    checkbox.addEventListener('change', () => {
      setExpanded(checkbox.checked);
      persist();
    });

    [minInput, maxInput].forEach(input => {
      input.addEventListener('input', () => {
        validate();
        persist();
      });
    });

    loadDelayConfig((config) => {
      checkbox.checked = !!config.enabled;
      minInput.value = config.min;
      maxInput.value = config.max;
      setExpanded(checkbox.checked);
      validate();
    });

    return section;
  }

  function removeElements() {
    const existingButton = document.getElementById('DiscordQuestButton');
    if (existingButton) {existingButton.remove();}
    
    const existingPanel = document.getElementById('DiscordQuestPanel');
    if (existingPanel) {existingPanel.remove();}
  }

  function togglePanel() {
    isPanelExpanded = !isPanelExpanded;
    if (expandButtonReference) {
      expandButtonReference.style.transform = isPanelExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    
    if (isPanelExpanded) {
      createExpandedPanel();
    } else {
      const panel = document.getElementById('DiscordQuestPanel');
      if (panel) {panel.remove();}
    }
  }

  function watchUrlChanges(onChange) {
    let lastUrl = window.location.href;
    const checkForChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        onChange();
      }
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      checkForChange();
    };
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      checkForChange();
    };
    window.addEventListener('popstate', checkForChange);
  }

  function init() {
    loadDelayConfig(() => {});
    loadLanguage();
    createQuestButton();
    watchUrlChanges(createQuestButton);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
