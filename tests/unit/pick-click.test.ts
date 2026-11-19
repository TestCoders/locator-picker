import { afterEach, describe, expect, it, vi } from 'vitest';
import { PickMode } from '@/shared/pick-mode';

function click(target: Element, button = 0): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button });
  target.dispatchEvent(event);
  return event;
}

// Alle PickModes delen hetzelfde window; een actieve modus uit een vorige test
// zou de klikken van de volgende test afvangen.
const instances: PickMode[] = [];
function createPickMode(options?: ConstructorParameters<typeof PickMode>[1]): PickMode {
  const pickMode = new PickMode(window, options);
  instances.push(pickMode);
  return pickMode;
}

afterEach(() => {
  instances.splice(0).forEach((pickMode) => pickMode.stop());
  document.body.innerHTML = '';
});

describe('PickMode: klikken', () => {
  it('kiest het element onder de muis en zet de modus uit', () => {
    document.body.innerHTML = '<button id="buy">Koop</button>';
    const button = document.getElementById('buy')!;
    const onPick = vi.fn();
    const onDeactivate = vi.fn();
    const pickMode = createPickMode({ onPick, onDeactivate });
    pickMode.start();

    click(button);

    expect(onPick).toHaveBeenCalledExactlyOnceWith(button);
    expect(onDeactivate).toHaveBeenCalledOnce();
    expect(pickMode.active).toBe(false);
  });

  it('voert de klik-actie van de pagina niet uit', () => {
    document.body.innerHTML = '<a href="https://example.com" id="link">Link</a>';
    const link = document.getElementById('link')!;
    const pageListener = vi.fn();
    link.addEventListener('click', pageListener);
    const pickMode = createPickMode();
    pickMode.start();

    const event = click(link);

    expect(event.defaultPrevented).toBe(true);
    expect(pageListener).not.toHaveBeenCalled();
  });

  it('blokkeert ook mousedown en pointerdown', () => {
    document.body.innerHTML = '<div id="menu">Menu</div>';
    const menu = document.getElementById('menu')!;
    const pageListener = vi.fn();
    menu.addEventListener('mousedown', pageListener);
    menu.addEventListener('pointerdown', pageListener);
    const pickMode = createPickMode();
    pickMode.start();

    menu.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    menu.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

    expect(pageListener).not.toHaveBeenCalled();
    expect(pickMode.active).toBe(true);
  });

  it('voorkomt dat een submit-knop het formulier verstuurt', () => {
    document.body.innerHTML = '<form id="f"><button type="submit" id="send">Verstuur</button></form>';
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    document.getElementById('f')!.addEventListener('submit', onSubmit);
    const pickMode = createPickMode();
    pickMode.start();

    click(document.getElementById('send')!);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('kiest niets bij een rechter- of middelklik', () => {
    document.body.innerHTML = '<p id="p">Tekst</p>';
    const onPick = vi.fn();
    const pickMode = createPickMode({ onPick });
    pickMode.start();

    click(document.getElementById('p')!, 1);

    expect(onPick).not.toHaveBeenCalled();
    expect(pickMode.active).toBe(true);
  });

  it('laat klikken na het kiezen weer door naar de pagina', () => {
    document.body.innerHTML = '<button id="b">Knop</button>';
    const button = document.getElementById('b')!;
    const pageListener = vi.fn();
    button.addEventListener('click', pageListener);
    const pickMode = createPickMode();
    pickMode.start();

    click(button);
    click(button);

    expect(pageListener).toHaveBeenCalledOnce();
  });

  it('kan daarna opnieuw gebruikt worden voor een ander element', () => {
    document.body.innerHTML = '<span id="a">A</span><span id="b">B</span>';
    const onPick = vi.fn();
    const pickMode = createPickMode({ onPick });

    pickMode.start();
    click(document.getElementById('a')!);
    pickMode.start();
    click(document.getElementById('b')!);

    expect(onPick.mock.calls.map(([el]) => (el as Element).id)).toEqual(['a', 'b']);
  });
});
