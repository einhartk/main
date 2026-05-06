export class InputHandler {
  constructor() {
    this._pendingClick = null;
    this._pendingRightClick = null;
    this._interactPressed = false;
    this._toggleUpgradePanelPressed = false;
    this._upgradeSlotPressed = null;
    this._useConsumablePressed = null;
    this._skillKeysPressed = new Set();
    this._enterRaidPressed = false;
    this._returnToTownPressed = false;
    this._mouseX = 0;
    this._mouseY = 0;

    window.addEventListener('mousemove', (e) => {
      this._mouseX = e.clientX;
      this._mouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this._pendingClick = { x: e.clientX, y: e.clientY };
      } else if (e.button === 2) {
        this._pendingRightClick = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('contextmenu', (e) => {
      if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') this._interactPressed = true;
      if (e.code === 'KeyI') this._toggleUpgradePanelPressed = true;
      if (e.code === 'KeyR') this._enterRaidPressed = true;
      if (e.code === 'Escape') this._returnToTownPressed = true;

      if (e.code === 'Digit1') this._useConsumablePressed = 1;
      if (e.code === 'Digit2') this._useConsumablePressed = 2;
      if (e.code === 'Digit3') this._useConsumablePressed = 3;
      if (e.code === 'Digit4') this._useConsumablePressed = 4;

      // Upgrade slot keys (when upgrade panel is open)
      if (e.key === '1' && e.shiftKey) {
        this._upgradeSlotPressed = 'weapon';
        console.log('Shift+1 pressed - weapon upgrade');
      }
      if (e.key === '2' && e.shiftKey) {
        this._upgradeSlotPressed = 'armor';
        console.log('Shift+2 pressed - armor upgrade');
      }
      if (e.key === '3' && e.shiftKey) {
        this._upgradeSlotPressed = 'accessory';
        console.log('Shift+3 pressed - accessory upgrade');
      }

      const skillKey = e.code.toLowerCase().replace('key', '');
      if (['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'v', 'z', 'x'].includes(skillKey)) {
        this._skillKeysPressed.add(skillKey);
      }
    });

    window.addEventListener('keyup', (e) => {
      const skillKey = e.code.toLowerCase().replace('key', '');
      if (['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'v', 'z', 'x'].includes(skillKey)) {
        this._skillKeysPressed.delete(skillKey);
      }
    });
  }

  consumeClick() {
    const v = this._pendingClick;
    this._pendingClick = null;
    return v;
  }

  consumeRightClick() {
    const v = this._pendingRightClick;
    this._pendingRightClick = null;
    return v;
  }

  consumeInteractPressed() {
    const v = this._interactPressed;
    this._interactPressed = false;
    return v;
  }

  consumeToggleUpgradePanelPressed() {
    const v = this._toggleUpgradePanelPressed;
    this._toggleUpgradePanelPressed = false;
    return v;
  }

  consumeUpgradeSlotPressed() {
    const v = this._upgradeSlotPressed;
    this._upgradeSlotPressed = null;
    return v;
  }

  consumeUseConsumablePressed() {
    const v = this._useConsumablePressed;
    this._useConsumablePressed = null;
    return v;
  }

  consumeSkillKeysPressed() {
    const keys = Array.from(this._skillKeysPressed);
    this._skillKeysPressed.clear();
    return keys;
  }

  consumeEnterRaidPressed() {
    const v = this._enterRaidPressed;
    this._enterRaidPressed = false;
    return v;
  }

  consumeReturnToTownPressed() {
    const v = this._returnToTownPressed;
    this._returnToTownPressed = false;
    return v;
  }

  getMousePosition() {
    return { x: this._mouseX, y: this._mouseY };
  }
}
