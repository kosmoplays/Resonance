import os
import plistlib
import re

print("Iniciando parche definitivo para iOS...")

# 1. Modificar Info.plist directamente (Bypass total de xcodegen)
plist_path = 'src-tauri/gen/apple/resonance_iOS/Info.plist'
if os.path.exists(plist_path):
    with open(plist_path, 'rb') as f:
        plist = plistlib.load(f)
    
    if 'UIBackgroundModes' not in plist:
        plist['UIBackgroundModes'] = []
    if 'audio' not in plist['UIBackgroundModes']:
        plist['UIBackgroundModes'].append('audio')
    
    with open(plist_path, 'wb') as f:
        plistlib.dump(plist, f)
    print("✅ Info.plist: Permisos de audio en background inyectados.")
else:
    print(f"❌ Error: No se encontró Info.plist en {plist_path}")

# 2. Modificar main.mm con Reflexión Dinámica (Bypass del Linker de Apple)
main_mm_path = 'src-tauri/gen/apple/Sources/resonance/main.mm'
if os.path.exists(main_mm_path):
    with open(main_mm_path, 'r') as f:
        content = f.read()

    # Inyectar la importación de WebKit si no está
    if '#import <WebKit/WebKit.h>' not in content:
        content = content.replace('#import <UIKit/UIKit.h>', '#import <UIKit/UIKit.h>\n#import <WebKit/WebKit.h>')

    # Código Objective-C dinámico puro (no requiere enlazar AVFoundation)
    injection = """
        // --- FIX RESONANCE INICIO ---
        if ([subview isKindOfClass:[WKWebView class]]) {
            WKWebView *webview = (WKWebView *)subview;
            webview.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
        }

        static BOOL audioConfigured = NO;
        if (!audioConfigured) {
            audioConfigured = YES;
            #pragma clang diagnostic push
            #pragma clang diagnostic ignored "-Wundeclared-selector"
            Class avSessionClass = NSClassFromString(@"AVAudioSession");
            if (avSessionClass) {
                id session = [avSessionClass performSelector:@selector(sharedInstance)];
                if (session) {
                    // Invocar los métodos del hardware vía punteros de C (Indetectable para Xcode)
                    void (*setCategory)(id, SEL, id, id) = (void (*)(id, SEL, id, id))[session methodForSelector:@selector(setCategory:error:)];
                    if (setCategory) setCategory(session, @selector(setCategory:error:), @"AVAudioSessionCategoryPlayback", nil);

                    void (*setActive)(id, SEL, BOOL, id) = (void (*)(id, SEL, BOOL, id))[session methodForSelector:@selector(setActive:error:)];
                    if (setActive) setActive(session, @selector(setActive:error:), YES, nil);
                }
            }
            #pragma clang diagnostic pop
        }
        // --- FIX RESONANCE FIN ---
    """

    if '// --- FIX RESONANCE INICIO ---' not in content:
        # Inyectar justo después de la llamada recursiva donde sabemos que existe 'subview'
        content = re.sub(r'(findWebView\(subview\);)', r'\1\n' + injection, content)
        with open(main_mm_path, 'w') as f:
            f.write(content)
        print("✅ main.mm: Código dinámico inyectado. 0 dependencias del linker.")
    else:
        print("⚠️ main.mm ya estaba parcheado.")
else:
    print(f"❌ Error: No se encontró main.mm en {main_mm_path}")