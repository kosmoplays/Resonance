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
            
            with open(project_yml_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("UIBackgroundModes añadido correctamente a project.yml.")
        else:
            print("UIBackgroundModes ya existe en project.yml.")

def patch_swift_code():
    print("Buscando AppDelegate o App.swift para inyectar AVAudioSession...")
    gen_dir = os.path.join("src-tauri", "gen", "apple", "Sources")
    swift_files = []
    
    for root, dirs, files in os.walk(gen_dir):
        for file in files:
            if file.endswith(".swift"):
                swift_files.append(os.path.join(root, file))

    if not swift_files:
        print("Error: No se encontraron archivos Swift.")
        sys.exit(1)

    injected = False
    for path in swift_files:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Inyectar AVAudioSession
        if "didFinishLaunchingWithOptions" in content and "AVAudioSession.sharedInstance().setCategory" not in content:
            print(f"Inyectando AVAudioSession en {path}...")
            
            if "import AVFoundation" not in content:
                content = "import AVFoundation\n" + content
                
            pattern = r'(func application\(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?\) -> Bool \{)'
            replacement = r'\1\n        do {\n            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])\n            try AVAudioSession.sharedInstance().setActive(true)\n        } catch {\n            print("Failed to set audio session category. Error: \\(error)")\n        }\n'
            
            content = re.sub(pattern, replacement, content)
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            injected = True
            
        # Inyectar parche local específico para el WKWebView sin tocar appearance()
        if "didFinishLaunchingWithOptions" in content and "findWebView" not in content:
            print(f"Inyectando WKWebView Safe Area override en {path}...")
            pattern = r'(func application\(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\?\) -> Bool \{)'
            replacement = r'\1\n        // Override especifico para el WKWebView generado por Tauri (Wry)\n        DispatchQueue.main.async {\n            if let window = UIApplication.shared.windows.first {\n                func findWebView(in view: UIView) {\n                    if let webView = view as? AnyObject, String(describing: type(of: webView)).contains("WKWebView") {\n                        if #available(iOS 11.0, *) {\n                            if let scrollView = webView.value(forKey: "scrollView") as? UIScrollView {\n                                scrollView.contentInsetAdjustmentBehavior = .never\n                            }\n                        }\n                    }\n                    for subview in view.subviews {\n                        findWebView(in: subview)\n                    }\n                }\n                findWebView(in: window)\n            }\n        }\n'
            
            content = re.sub(pattern, replacement, content)
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            injected = True

    if injected:
        print("Código Swift parcheado correctamente.")
    else:
        print("Atención: No se inyectaron parches (quizá ya estaban o no se encontró el método).")

if __name__ == "__main__":
    patch_info_plist()
    patch_swift_code()
