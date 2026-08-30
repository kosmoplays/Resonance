#[cfg(desktop)]
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
#[cfg(desktop)]
use std::sync::Mutex;
#[cfg(desktop)]
use tauri::{Manager, State};
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[cfg(desktop)]
struct DiscordState {
    client: Mutex<Option<DiscordIpcClient>>,
}

/// Actualiza el estado de Discord Rich Presence con la canción actual
#[cfg(desktop)]
#[tauri::command]
fn set_discord_status(
    title: String,
    artist: String,
    is_playing: bool,
    image_url: String,
    track_url: String,
    start_time: i64,
    end_time: i64,
    discord: State<'_, DiscordState>,
) {
    if let Ok(mut client_opt) = discord.client.lock() {
        if let Some(client) = client_opt.as_mut() {
            let state_text = if is_playing {
                format!("Por: {}", artist)
            } else {
                "En pausa".to_string()
            };

            let mut activity = activity::Activity::new()
                .details(&title)
                .state(&state_text);

            if !image_url.is_empty() {
                activity = activity.assets(
                    activity::Assets::new()
                        .large_image(&image_url)
                        .large_text(&title),
                );
            }

            if is_playing && start_time > 0 && end_time > 0 {
                activity = activity.timestamps(
                    activity::Timestamps::new().start(start_time).end(end_time),
                );
            }

            if !track_url.is_empty() {
                activity = activity.buttons(vec![activity::Button::new(
                    "Escuchar en SoundCloud",
                    &track_url,
                )]);
            }

            if let Err(_) = client.set_activity(activity.clone()) {
                let _ = client.connect();
                let _ = client.set_activity(activity);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    let mut discord_client = DiscordIpcClient::new("1526555452278702153").unwrap();
    #[cfg(desktop)]
    let _ = discord_client.connect();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init());

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        builder = builder.plugin(tauri_plugin_ios_webview_insets::init());
    }

    #[cfg(desktop)]
    {
        builder = builder
            .manage(DiscordState {
                client: Mutex::new(Some(discord_client)),
            })
            .invoke_handler(tauri::generate_handler![set_discord_status]);
    }

    builder
        .setup(|app| {
            // 🔗 Compartir el almacenamiento del WebView con soundcloud-desktop
            // Esto hace que Resonance arranque con todos los tokens, sesión y datos
            // exactamente igual que el ecosistema original — sin copiar nada.
            #[cfg(desktop)]
            let shared_data_dir = app
                .path()
                .app_local_data_dir()
                .ok()
                .and_then(|p| p.parent().map(|parent| parent.join("com.pablo.soundcloud-desktop")));
            
            #[cfg(not(desktop))]
            let shared_data_dir: Option<std::path::PathBuf> = None;

            let mut builder = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::App("index.html".into()),
            );

            #[cfg(desktop)]
            {
                builder = builder
                    .title("Resonance")
                    .inner_size(1200.0, 800.0)
                    .min_inner_size(950.0, 600.0)
                    .resizable(true)
                    .fullscreen(false);
            }

            // Si ya existe la carpeta de soundcloud-desktop, la reutilizamos
            if let Some(data_dir) = shared_data_dir {
                if data_dir.exists() {
                    builder = builder.data_directory(data_dir);
                }
            }

            builder.build()?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Destroyed => {
                if window.label() == "main" {
                    std::process::exit(0);
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Resonance");
}
