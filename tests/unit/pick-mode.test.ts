import { describe, expect, it, vi } from 'vitest';
import { PickMode } from '@/shared/pick-mode';

function pressEscape(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe('PickMode', () => {
  it('toggle zet de modus aan en weer uit', () => {
    const pickMode = new PickMode(window);
    expect(pickMode.toggle()).toBe(true);
    expect(pickMode.active).toBe(true);
    expect(pickMode.toggle()).toBe(false);
    expect(pickMode.active).toBe(false);
  });

  it('Esc zet de modus uit en meldt dat', () => {
    const onDeactivate = vi.fn();
    const pickMode = new PickMode(window, { onDeactivate });
    pickMode.start();

    const event = pressEscape();

    expect(pickMode.active).toBe(false);
    expect(onDeactivate).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('pagehide zet de modus uit', () => {
    const onDeactivate = vi.fn();
    const pickMode = new PickMode(window, { onDeactivate });
    pickMode.start();

    window.dispatchEvent(new Event('pagehide'));

    expect(pickMode.active).toBe(false);
    expect(onDeactivate).toHaveBeenCalledOnce();
  });

  it('laat na stop() geen listeners achter', () => {
    const onDeactivate = vi.fn();
    const pickMode = new PickMode(window, { onDeactivate });
    pickMode.start();
    pickMode.stop();

    const event = pressEscape();
    window.dispatchEvent(new Event('pagehide'));

    expect(onDeactivate).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('dubbel starten registreert listeners maar één keer', () => {
    const onDeactivate = vi.fn();
    const pickMode = new PickMode(window, { onDeactivate });
    pickMode.start();
    pickMode.start();

    pressEscape();
    pressEscape();

    expect(onDeactivate).toHaveBeenCalledOnce();
  });

  it('laat geen DOM-elementen achter', () => {
    const before = document.documentElement.outerHTML;
    const pickMode = new PickMode(window);
    pickMode.start();
    pickMode.stop();
    expect(document.documentElement.outerHTML).toBe(before);
  });
});
