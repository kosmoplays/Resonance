import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit, listen } from '@tauri-apps/api/event';
import { type } from '@tauri-apps/plugin-os';

const isMobile = type() === 'ios' || type() === 'android';

let miniWindow: WebviewWindow | null = null;

export async function toggleMiniPlayerWindow(isMini: boolean) {
  if (isMobile) return;  try {
    if (isMini) {
      if (!miniWindow) {
        miniWindow = new WebviewWindow('mini-player', {
          url: '/?mini=true',
          width: 320,
          height: 360,
          minWidth: 260,
          minHeight: 280,
          alwaysOnTop: true,
          decorations: false,
          resizable: true,
          title: 'Resonance Mini'
        });
        miniWindow.once('tauri://created', function () {
          console.log('Mini player window created');
        });
        miniWindow.once('tauri://error', function (e) {
          console.error('Error creating mini player window', e);
        });
        
        miniWindow.once('tauri://destroyed', () => {
          miniWindow = null;
          emit('mini-player-closed');
        });
      }
    } else {
      if (miniWindow) {
        await miniWindow.close();
        miniWindow = null;
      }
    }
  } catch (e) {
    console.warn("Tauri window API error", e);
  }
}
