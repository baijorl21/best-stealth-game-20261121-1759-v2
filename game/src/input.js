// Night Vault — input: keyboard state plus mouse clicks for coin throws.
// Keys are tracked as named actions so the game logic never reads raw codes.

export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false,
    sneak: false,
    restartPressed: false,
    pausePressed: false,
    mutePressed: false,
    confirmPressed: false,
    click: null, // { x, y } in canvas coordinates, consumed by the game
    mouseX: 0,
    mouseY: 0,
  };

  const setKey = (code, down) => {
    switch (code) {
      case 'KeyW': case 'ArrowUp': input.up = down; break;
      case 'KeyS': case 'ArrowDown': input.down = down; break;
      case 'KeyA': case 'ArrowLeft': input.left = down; break;
      case 'KeyD': case 'ArrowRight': input.right = down; break;
      case 'ShiftLeft': case 'ShiftRight': input.sneak = down; break;
      case 'KeyR': if (down) input.restartPressed = true; break;
      case 'KeyP': case 'Escape': if (down) input.pausePressed = true; break;
      case 'KeyM': if (down) input.mutePressed = true; break;
      case 'Enter': case 'Space': if (down) input.confirmPressed = true; break;
      default: break;
    }
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    setKey(e.code, true);
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = input.sneak = false;
  });

  const toCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };
  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    input.click = toCanvas(e);
  });

  return input;
}

// One-shot flags (restart, pause, ...) are read once per frame, then cleared.
export function clearOneShots(input) {
  input.restartPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
  input.confirmPressed = false;
  input.click = null;
}
