import os
import sys
import re

def patch_info_plist():
    print("Buscando Info.plist o project.yml para UIBackgroundModes...")
    gen_dir = os.path.join("src-tauri", "gen", "apple")
    if not os.path.exists(gen_dir):
        print(f"Error: {gen_dir} no existe. Ejecuta tauri ios init primero.")
        sys.exit(1)

    project_yml_path = os.path.join(gen_dir, "project.yml")
    if os.path.exists(project_yml_path):
        with open(project_yml_path, "r", encoding="utf-8") as f:
            content = f.read()

        if "UIBackgroundModes:" not in content:
            print("Inyectando UIBackgroundModes en project.yml...")
            replacement = """    INFOPLIST_KEY_UIBackgroundModes:
      - audio
    INFOPLIST_KEY_"""
            content = re.sub(r'(\s+)INFOPLIST_KEY_', replacement, content, count=1)
            
            # También inyectamos OTHER_LDFLAGS para asegurarnos de que AVFoundation se linkea.
            # En XcodeGen, podemos añadir OTHER_LDFLAGS bajo settings
            if "OTHER_LDFLAGS" not in content:
                print("Inyectando OTHER_LDFLAGS para AVFoundation...")
                # Buscar el bloque de settings base e inyectarlo
                if "settings:" in content:
                    content = content.replace("settings:", "settings:\n  OTHER_LDFLAGS: ['-framework', 'AVFoundation']", 1)
                else:
                    # Si no hay settings globales, lo añadimos al final
                    content += "\nsettings:\n  OTHER_LDFLAGS: ['-framework', 'AVFoundation']\n"
            else:
                # Si ya existe, añadir a la lista
                content = re.sub(r'(OTHER_LDFLAGS:\s*\[)', r'\1\'-framework\', \'AVFoundation\', ', content)
                
            with open(project_yml_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("UIBackgroundModes y Linker Flags añadidos correctamente a project.yml.")
        else:
            print("UIBackgroundModes ya existe en project.yml.")

def patch_swift_code():
    print("Buscando main.mm para inyectar configuración en Objective-C++...")
    gen_dir = os.path.join("src-tauri", "gen", "apple")
    mm_files = []
    
    for root, dirs, files in os.walk(gen_dir):
        for file in files:
            if file.endswith(".mm"):
                mm_files.append(os.path.join(root, file))

    if not mm_files:
        print("Error: No se encontraron archivos .mm en", gen_dir)
        sys.exit(1)

    injected = False
    for path in mm_files:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        if "int main" in content and "AVAudioSession" not in content:
            print(f"Inyectando AVAudioSession y WKWebView fix en {path}...")
            
            headers = """
#import <AVFoundation/AVFoundation.h>
#import <WebKit/WebKit.h>
#import <UIKit/UIKit.h>

// Función para inyectar los fixes en el hilo principal con un ligero retraso
// para permitir que el WKWebView de Wry se instancie.
void applyTauriIOSFixes() {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        // 1. AVAudioSession
        NSError *error = nil;
        [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback mode:AVAudioSessionModeDefault options:AVAudioSessionCategoryOptionMixWithOthers error:&error];
        [[AVAudioSession sharedInstance] setActive:YES error:&error];
        if (error) {
            NSLog(@"Failed to set audio session category: %@", error);
        }
        
        // 2. WKWebView Safe Area (Sin afectar global appearance)
        UIWindow *window = [UIApplication sharedApplication].windows.firstObject;
        if (window) {
            void (^__block findWebView)(UIView *) = ^(UIView *view) {
                if ([view isKindOfClass:[WKWebView class]]) {
                    WKWebView *webView = (WKWebView *)view;
                    if (@available(iOS 11.0, *)) {
                        webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
                    }
                }
                for (UIView *subview in view.subviews) {
                    findWebView(subview);
                }
            };
            findWebView(window);
        }
    });
}
"""
            # Insertar los headers arriba del main
            content = headers + content
            
            # Inyectar la llamada a applyTauriIOSFixes() justo dentro de main
            pattern = r'(int main\s*\([^)]*\)\s*\{)'
            replacement = r'\1\n    applyTauriIOSFixes();\n'
            
            content = re.sub(pattern, replacement, content)
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            injected = True

    if injected:
        print("Código Objective-C parcheado correctamente.")
    else:
        print("Atención: No se inyectaron parches (quizá ya estaban o no se encontró el método main).")

if __name__ == "__main__":
    patch_info_plist()
    patch_swift_code()

